# Postmortem INC-2026-04-12 — Khang Minh không tìm được SKU

Nguồn: Notion `Incidents / INC-2026-04-12` — xuất bản 2026-04-14
Khách bị ảnh hưởng: Công ty TNHH Thương mại Khang Minh (KH-KM-019)
Thời lượng: 3 giờ 12 phút, bắt đầu 2026-04-12 08:05 ICT
Pager: Võ Minh Tâm

## Hiện tượng

Nhân sự kho VSIP 1, Bình Dương không tìm được SKU trên ShelfFlow. Tồn kho trên báo cáo vẫn còn. DockSync lịch cửa vẫn mở.

## Nguyên nhân gốc

Rollout ADR-014 ngày 2026-04-01 chuyển search sang pgvector. Tenant KH-KM-019 chưa được rebuild index. Không phải sự cố AWS. Nhật An Logistics (KH-NA-007) không bị ảnh hưởng vì index tenant khác đã rebuild.

## Chuỗi liên quan

Khách Khang Minh → tenant KH-KM-019 → rollout ADR-014 (phê duyệt bởi Lê Hà An) → index pgvector thiếu → kho Bình Dương không search được SKU.

## Hành động

Rebuild index KH-KM-019. Bổ sung checklist rollout: mọi tenant phải rebuild trước khi tuyên bố xong ADR-014.

<!-- luminaops-chunking-corpus -->
## Phụ lục vận hành A — 08-incident-2026-04-khang-minh

08-incident-2026-04-khang-minh-A bước 01. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-A bước 02. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-A bước 03. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-A bước 04. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-A bước 05. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-A bước 06. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-A bước 07. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-A bước 08. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.

## Phụ lục vận hành B — 08-incident-2026-04-khang-minh

08-incident-2026-04-khang-minh-B bước 01. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-B bước 02. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-B bước 03. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-B bước 04. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-B bước 05. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-B bước 06. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-B bước 07. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-B bước 08. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.

## Phụ lục vận hành C — 08-incident-2026-04-khang-minh

08-incident-2026-04-khang-minh-C bước 01. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-C bước 02. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-C bước 03. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-C bước 04. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-C bước 05. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-C bước 06. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-C bước 07. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-C bước 08. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.

## Phụ lục vận hành D — 08-incident-2026-04-khang-minh

08-incident-2026-04-khang-minh-D bước 01. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-D bước 02. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-D bước 03. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-D bước 04. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-D bước 05. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-D bước 06. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-D bước 07. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-D bước 08. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.

## Phụ lục vận hành E — 08-incident-2026-04-khang-minh

08-incident-2026-04-khang-minh-E bước 01. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-E bước 02. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-E bước 03. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-E bước 04. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-E bước 05. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-E bước 06. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-E bước 07. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-E bước 08. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.

## Phụ lục vận hành F — 08-incident-2026-04-khang-minh

08-incident-2026-04-khang-minh-F bước 01. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-F bước 02. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-F bước 03. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-F bước 04. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-F bước 05. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-F bước 06. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-F bước 07. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
08-incident-2026-04-khang-minh-F bước 08. Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập theo tenant. Nhân sự không dùng số liệu doanh thu, không suy nguyên nhân sự cố từ AWS, và không sửa SLA đã ký. Checklist này chỉ áp dụng nội bộ LuminaOps.
