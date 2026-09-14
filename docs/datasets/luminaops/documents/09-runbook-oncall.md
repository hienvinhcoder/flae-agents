# Runbook on-call — sự cố search ShelfFlow

Nguồn: upload nội bộ `Runbooks / search-outage.md` — 2026-04-02 (sau ADR-014)

1. Khi CS nhận báo cáo “không tìm được SKU”, tạo P1 và page SRE on-call lead Võ Minh Tâm.
2. Kiểm tra tenant id. Không giả định mọi khách cùng một index.
3. Nếu sự cố kéo dài quá 30 phút, escalate cho CTO Lê Hà An.
4. Sau ADR-014, bước bắt buộc: xác nhận index pgvector của tenant đã rebuild. Elasticsearch không còn là đường search production.
5. Không lấy bản tóm tắt chủ đề nội bộ làm bằng chứng nguyên nhân.

<!-- luminaops-chunking-corpus -->
## Phụ lục vận hành A — 09-runbook-oncall

09-runbook-oncall-A bước 01. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-A bước 02. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-A bước 03. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-A bước 04. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-A bước 05. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-A bước 06. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-A bước 07. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-A bước 08. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.

## Phụ lục vận hành B — 09-runbook-oncall

09-runbook-oncall-B bước 01. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-B bước 02. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-B bước 03. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-B bước 04. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-B bước 05. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-B bước 06. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-B bước 07. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-B bước 08. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.

## Phụ lục vận hành C — 09-runbook-oncall

09-runbook-oncall-C bước 01. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-C bước 02. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-C bước 03. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-C bước 04. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-C bước 05. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-C bước 06. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-C bước 07. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-C bước 08. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.

## Phụ lục vận hành D — 09-runbook-oncall

09-runbook-oncall-D bước 01. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-D bước 02. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-D bước 03. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-D bước 04. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-D bước 05. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-D bước 06. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-D bước 07. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-D bước 08. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.

## Phụ lục vận hành E — 09-runbook-oncall

09-runbook-oncall-E bước 01. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-E bước 02. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-E bước 03. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-E bước 04. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-E bước 05. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-E bước 06. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-E bước 07. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-E bước 08. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.

## Phụ lục vận hành F — 09-runbook-oncall

09-runbook-oncall-F bước 01. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-F bước 02. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-F bước 03. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-F bước 04. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-F bước 05. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-F bước 06. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-F bước 07. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
09-runbook-oncall-F bước 08. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
