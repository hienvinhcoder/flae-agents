---
name: create-plans
description: Tự động phân rã file Idea thành 3 bản vẽ kiến trúc chi tiết (Design, Frontend, Backend).
triggers:
  - "/plans"
---

# 🎯 NHIỆM VỤ CỐT LÕI (TECHNICAL PROJECT MANAGER)
Hệ thống vừa nhận được yêu cầu quy hoạch kiến trúc cho tính năng: **$ARGUMENTS**
Nhiệm vụ của bạn là đọc ý tưởng thô và tự động phân rã thành 3 bản vẽ kỹ thuật chuyên sâu. Tuyệt đối KHÔNG viết mã nguồn (source code) ở bước này.

## 📥 1. NẠP NGUỒN CHÂN LÝ VÀ HIẾN PHÁP (INPUTS)
1. **Idea Gốc:** Đọc file `.docs/features/[feature_name]/IDEAS.md`. Nếu file này không tồn tại, DỪNG LẠI NGAY và báo lỗi: *"Không tìm thấy file ý tưởng `.docs/features/[feature_name]/IDEAS.md`."*
2. **Hiến pháp Hệ thống:** Đọc file `AGENTS.md`.
3. **Bối cảnh Dự án (Project Context):** BẮT BUỘC đọc các file tài liệu kiến trúc hiện tại của dự án để đảm bảo bản vẽ thiết kế bám sát kiến trúc tổng thể:
   - **Backend:** Đọc `docs/backend/index.md` và các file cấu trúc liên quan.
   - **Frontend:** Đọc `docs/frontend/index.md` và các file cấu trúc liên quan.
4. **Tiêu chuẩn Thi công:** Đọc lướt qua các file trong `.agents/skills/` để hiểu định dạng code mà thợ thi công yêu cầu.

## 🖨️ 2. QUY TRÌNH GHI FILE TỰ ĐỘNG (OUTPUTS)
Dựa vào nguồn dữ liệu trên, BẮT BUỘC tạo và lưu nội dung vào 3 file vật lý dưới đây. KHÔNG in toàn bộ nội dung file ra khung chat.

- 📄 **Design Brief:** Tạo file `.docs/features/[feature_name]/DESIGN-BRIEF.md` (Mô tả Layout, Component Tree, Tailwind Vibe).
- 📄 **Frontend Plan:** Tạo file `.docs/features/[feature_name]/FRONTEND-PLAN.md` (Phân định Server/Client Components, State, Data Fetching).
- 📄 **Backend Plan:** Tạo file `.docs/features/[feature_name]/BACKEND-PLAN.md` (BẮT BUỘC đọc file skill `.agents/skills/plan-backend/SKILL.md` để hiểu rõ quy chuẩn xây dựng Backend Plan, bao gồm Database Schema, API Contract và Architecture).

## ⚖️ 3. QUY TẮC RÀ SOÁT CHÉO
- Cấu trúc JSON trả về ở `Backend Plan` PHẢI KHỚP 100% với dữ liệu mà `Frontend Plan` cần để render.

## ✅ 4. NGHIỆM THU
In ra bảng thông báo:
*"✅ Đã rải xong 3 bản vẽ thiết kế cho feature \`$ARGUMENTS\`. Nội dung đã được lưu tại \`.docs/features/[feature_name]/\`."*