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

Không gắn LangSmith vào đường runtime retrieval. Thiếu API key thì bỏ qua mirror. Lưu ý: `.env.example` dùng `LANGCHAIN_API_KEY`; `langsmith_is_configured()` đang kiểm tra `LANGSMITH_API_KEY` — cần thống nhất khi viết runner.

Tài liệu: [Evaluate an application](https://docs.langchain.com/langsmith/evaluate-llm-application), [Code evaluators](https://docs.langchain.com/langsmith/code-evaluator-sdk).

## TGS logic parity (không nằm ở corpus này)

Tham số và invariant thuật toán (chunk 1200/100 hoặc semantic 900/150, fusion threshold 3, G2T/T2G, hệ số scoring) đối chiếu `demo-app` qua fixture như `backend/tests/evaluation/fixtures/tgs_ingestion_parity.json`, tách khỏi điểm QA LuminaOps.
