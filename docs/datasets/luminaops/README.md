# LuminaOps — dataset đánh giá FLAE

Corpus công ty giả lập (SaaS WMS Việt Nam) để chấm **ingestion / chunk / fusion / retriever / câu trả lời** của FLAE.

`demo-app` chỉ là tham chiếu logic TGS, không phải hệ thống được chấm. Gold trong thư mục này là nguồn sự thật offline.

## Cấu trúc

```
docs/datasets/luminaops/
  README.md
  gold.json              # documents + questions + spans + hops + answers
  documents/01-…12-*.md  # 12 nguồn (Drive / Notion / Slack / upload)
```

Phiên bản: `2026-09-11.v2`. Đổi gold, độ dài tài liệu, hoặc nghĩa metric thì tăng version.

Mỗi nguồn **> 2400 token** (cl100k), dài hơn `fixed_size=1200` và `semantic_target=900` của TGS/FLAE. Test chạy `ChunkingService` thật: fixed phải tách ≥2 chunk; semantic tách theo `##`.

| Probe | Document | Luật TGS được chốt |
|---|---|---|
| `oversized_section` | ADR-014 | Một mục `##` > 900 token → một base chunk riêng |
| `hard_limit_unit` | Hợp đồng Khang Minh | Bảng cửa dock > 500 token → chunk sau **không** nhận overlap từ bảng |

Phụ lục sau marker `<!-- luminaops-chunking-corpus -->` chỉ để đủ độ dài; **span gold nằm ở phần đầu**, không đổi.

## Thang câu hỏi

| Mức | ID | Việc retriever/answer phải làm |
|---|---|---|
| L1 | `l1-01`…`l1-06` | Trích 1 span hiện hành (trụ sở/CEO lấy bản 2026-06, không lấy handbook cũ) |
| L2 | `l2-01`…`l2-06` | So sánh hoặc ghép 2 nguồn |
| L3 | `l3-01`…`l3-08` | Multi-hop (incident→ADR, DockSync, nhầm tên Khang, timeline) |
| L4 | `l4-01`…`l4-04` | Không bịa doanh thu; không cite `topic-summary-pseudo`; không coi handbook là hiện tại |

`topic-summary-pseudo` là distractor: lặp tên riêng, bịa AWS outage. Mọi câu gắn `forbidden_doc_ids` gồm doc này.

## Chấm offline (bắt buộc)

```bash
uv run --project backend pytest backend/tests/evaluation/test_luminaops_dataset.py -q
```

Schema: `app.evaluation.luminaops`. Span gold phải là chuỗi con nguyên văn của file nguồn. `gold.json` → `chunking` khớp `rag_settings` / `demo-app` (`1200/100`, `900/150`, `hard_limit=500`).

Khi có runner FLAE: ingest 12 document → retrieve từng `question` → so `supporting_doc_ids`, `expected_hops`, `forbidden_doc_ids`, rồi so `gold_answer` (khớp nghĩa, không cần khớp từng chữ).

## LangSmith (tuỳ chọn, không phải nguồn sự thật)

FLAE đã có `LangSmithClientAdapter` và `evaluate()` (`langsmith>=0.8.9`). Có thể mirror `gold.json`:

- `inputs`: `{ "question", "difficulty" }`
- `outputs` / reference: `{ "gold_answer", "supporting_doc_ids", "expected_hops", "forbidden_doc_ids", "answerable" }`

Code evaluator (deterministic): document coverage, hop recovery, forbidden-doc rejection.  
LLM-as-judge: chỉ cho độ trung thực câu trả lời so với span — không được ghi đè điểm coverage/ACL.

Không gắn LangSmith vào đường runtime retrieval. Về API key: CLI ở mục [Live LangSmith eval](#live-langsmith-eval-internal) nhận cả `LANGSMITH_API_KEY` và `LANGCHAIN_API_KEY`; thiếu cả hai thì CLI **thoát mã lỗi**, không im lặng bỏ qua mirror.

Tài liệu: [Evaluate an application](https://docs.langchain.com/langsmith/evaluate-llm-application), [Code evaluators](https://docs.langchain.com/langsmith/code-evaluator-sdk).

## Live LangSmith eval (internal)

CLI nội bộ để mirror gold lên LangSmith và chấm **retriever thật** trên một workspace dùng một lần. Không phải đường runtime sản phẩm; không thay pytest offline.

### `mirror` vs `run`

| Lệnh | Cần `--kb-id`? | Việc làm |
|---|---|---|
| `mirror` | Không | Đồng bộ gold → dataset LangSmith `flae-luminaops-<version>`. Không gọi retrieve, không ghi điểm. Dùng sau khi sửa gold hoặc trước khi mở LangSmith UI. |
| `run` | **Có** | Luôn mirror gold trước, rồi retrieve live + code evaluators → experiment LangSmith. Không có KB đã ingest corpus thì không chấm được. |

### Điều kiện trước khi `run`

1. Tạo **workspace dùng một lần** (eval tenant / KB nội bộ — không phải workspace khách hàng production).
2. Ingest đủ **12 file** trong `documents/*.md`, mỗi file gắn `source_external_id=<doc_id>` đúng với `documents[].doc_id` trong `gold.json` (ví dụ `handbook`, `adr-014`, `contract-khang-minh`, …).
3. Lấy UUID workspace đó làm `--kb-id`.

### Lệnh

```bash
uv run --project backend flae-evaluate-luminaops mirror
uv run --project backend flae-evaluate-luminaops run --kb-id <workspace-uuid>
```

### Biến môi trường

Cần một trong hai: `LANGSMITH_API_KEY` hoặc `LANGCHAIN_API_KEY` (alias trong `.env.example`). Thiếu cả hai → CLI thoát mã `1` cho **cả `mirror` và `run`**; không im lặng bỏ qua.

### Xem kết quả trên LangSmith

- **Dataset:** `flae-luminaops-<version>` (version lấy từ `gold.json`, hiện tại `2026-09-11.v2` → `flae-luminaops-2026-09-11.v2`).
- **Experiment prefix:** `flae-luminaops-<version>-current` (CLI in `experiment_prefix=…` khi xong).
- Mở LangSmith → Datasets / Experiments để xem điểm từng câu.

### Metric có điểm ở phase 1

| Metric | Phase 1 | Ghi chú |
|---|---|---|
| `document_coverage` | Có điểm | Chunk `source_document_id` được resolve sang `source_external_id` của revision `searchable`, rồi so với `supporting_doc_ids`. |
| `forbidden_rejection` | Có điểm | Cùng tập doc id đã resolve. |
| `hop_recovery` | **Bỏ qua (`null`)** | Retriever hiện chưa phát ra evidence doc cho từng hop (`get_path_details` chỉ trả entity/segment), nên đường live không gửi `hop_evidence_doc_ids` và evaluator trả `None`. Chỉ khi retriever surface được hop evidence thì metric này mới có điểm. |

Nếu output của một câu có `unmapped_raw_values`, đó là `source_document_id` hoặc tên tài liệu mà retriever trả về nhưng không map được sang `doc_id` gold — thường là dấu hiệu ingest thiếu/sai `source_external_id`.

Thiết kế chi tiết: [`docs/superpowers/specs/2026-09-16-luminaops-langsmith-live-eval-design.md`](../../superpowers/specs/2026-09-16-luminaops-langsmith-live-eval-design.md).

### An toàn

**Không** truyền `--kb-id` trỏ tới workspace khách hàng production. Chỉ dùng KB eval đã ingest đủ 12 tài liệu LuminaOps ở trên.

## TGS logic parity (không nằm ở corpus này)

Tham số và invariant thuật toán (chunk 1200/100 hoặc semantic 900/150, fusion threshold 3, G2T/T2G, hệ số scoring) đối chiếu `demo-app` qua fixture như `backend/tests/evaluation/fixtures/tgs_ingestion_parity.json`, tách khỏi điểm QA LuminaOps.
