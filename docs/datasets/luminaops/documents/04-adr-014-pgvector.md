# ADR-014: Chuyển tìm kiếm nội bộ ShelfFlow từ Elasticsearch sang pgvector

Nguồn: Notion `Engineering / ADR-014` — quyết định 2026-02-20
Trạng thái: Accepted
Người phê duyệt: Lê Hà An (CTO)
Người đề xuất: Võ Minh Tâm (SRE)

## Quyết định

Tìm kiếm SKU trong ShelfFlow chuyển từ Elasticsearch sang PostgreSQL pgvector. Mỗi tenant có index riêng. Rollout production: 2026-04-01.

## Lý do

Giảm chi phí vận hành cụm Elastic và gom vector search vào Postgres đã dùng cho dữ liệu nghiệp vụ.

## Hệ quả

Sau rollout, mọi tenant phải rebuild index pgvector. Tenant chưa rebuild sẽ không tìm được SKU dù dữ liệu tồn kho vẫn còn.

<!-- luminaops-chunking-corpus -->
## Phụ lục kỹ thuật rebuild index từng tenant

ADR014-rebuild bước 01. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
ADR014-rebuild bước 02. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
ADR014-rebuild bước 03. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
ADR014-rebuild bước 04. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
ADR014-rebuild bước 05. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
ADR014-rebuild bước 06. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
ADR014-rebuild bước 07. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
ADR014-rebuild bước 08. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
ADR014-rebuild bước 09. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
ADR014-rebuild bước 10. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
ADR014-rebuild bước 11. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
ADR014-rebuild bước 12. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
ADR014-rebuild bước 13. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
ADR014-rebuild bước 14. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
ADR014-rebuild bước 15. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
ADR014-rebuild bước 16. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
ADR014-rebuild bước 17. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
ADR014-rebuild bước 18. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
ADR014-rebuild bước 19. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
ADR014-rebuild bước 20. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.

Marker kỹ thuật: ADR014-OVERSIZE-PROBE.
## Phụ lục rollback Elasticsearch

ADR014-rollback bước 01. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
ADR014-rollback bước 02. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
ADR014-rollback bước 03. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
ADR014-rollback bước 04. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
ADR014-rollback bước 05. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
ADR014-rollback bước 06. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
ADR014-rollback bước 07. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
ADR014-rollback bước 08. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
