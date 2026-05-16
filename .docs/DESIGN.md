# Green Growth Design System (FLAE Agent)

## 1. Design Philosophy
- **AI-First & Conversational:** Giao diện tối giản, tập trung vào luồng hội thoại và các đề xuất từ AI (như Morning Briefing, Inbox AI Draft).
- **Human-in-control:** Các hành động do AI đề xuất phải rõ ràng, dễ dàng phân biệt được với hệ thống cốt lõi và luôn đi kèm thao tác phê duyệt (Approve/Reject/Edit).
- **Realtime & Reliable:** Cảm giác mượt mà, phản hồi ngay lập tức. Sử dụng hiệu ứng chuyển động mượt mà (smooth transitions) để hạn chế cảm giác trễ từ hệ thống.
- **Premium & Modern:** Ứng dụng Glassmorphism nhẹ và các đường bo góc mềm mại nhằm tạo cảm giác chuyên nghiệp, đáng tin cậy nhưng vẫn cực kỳ thân thiện với doanh nghiệp vừa và nhỏ (SMBs).

## 2. Color Palette
Bộ màu được thiết kế để nhấn mạnh sự tăng trưởng (Growth/Green), tính công nghệ và sự thông minh của AI (Glow/Accent).

| Role | Color Name | Hex Code | Usage |
|------|------------|----------|-------|
| **Primary** | Fresh Green | `#00C27A` | Nút bấm chính (Primary Button), trạng thái active, các thành phần tương tác chính. |
| **Accent Glow** | Neon Lime | `#B9FF3B` | Điểm nhấn AI (AI Sparkles), nút tính năng AI, hiệu ứng hover đặc biệt, các gợi ý quan trọng từ Agent. |
| **Dark Green** | Deep Forest | `#062E24` | Tiêu đề (Headings), văn bản chính (body text) cần độ tương phản cao, nền cho các thành phần Dark Mode/Sidebar. |
| **Background** | Mint White | `#F3FBF7` | Màu nền tổng thể của ứng dụng, tạo cảm giác không gian mở, sạch sẽ và làm nổi bật nội dung. |
| **Surface** | White | `#FFFFFF` | Nền của các thẻ nội dung (cards), modal, dropdowns, kết hợp với shadow tinh tế. |
| **Muted/Border** | Soft Green | `#D1EAE0` | Đường viền (borders), đường phân cách (dividers), văn bản phụ trợ/ghi chú (muted text). |

## 3. Typography
Sử dụng các font chữ không chân (sans-serif) tối ưu hóa cho giao diện Web/App, mang lại cảm giác công nghệ, cao cấp và rõ ràng.

- **Heading Font:** `Plus Jakarta Sans` - Mang lại cảm giác công nghệ, hiện đại, sắc nét cho các tiêu đề báo cáo, tên module.
- **Body Font:** `Inter` - Tối ưu cho khả năng đọc (readability) trên các dashboard nhiều dữ liệu và màn hình chat.
- **CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap');
```
- **Usage (Tailwind):**
  - Headings: `font-heading text-dark-green tracking-tight`
  - Body: `font-sans text-dark-green/80`

## 4. UI/UX Patterns & Guidelines (ui-ux-pro-max)

### Key Effects & AI Elements
- **AI Interactions (Glow Effect):** Sử dụng màu Accent Glow (`#B9FF3B`) kết hợp với hiệu ứng tỏa sáng (`box-shadow: 0 0 10px rgba(185, 255, 59, 0.4)`) cho các nút "Generate", "AI Draft", hoặc viền của thẻ đề xuất từ Analyst Agent.
- **Hover States:** Chuyển đổi màu sắc hoặc độ mờ (opacity) mượt mà (`transition-all duration-200 ease-in-out`). Không sử dụng hiệu ứng phóng to (scale transforms) làm dịch chuyển bố cục (layout shift).
- **Glassmorphism:** Dùng nền trắng với độ mờ (`bg-white/80` hoặc `bg-white/90`) kết hợp `backdrop-blur-md` cho các sticky header, floating navbar hoặc AI tooltips để giao diện thoáng, không che khuất dữ liệu.
- **Border Radius:** Sử dụng góc bo tròn lớn (`rounded-xl` hoặc `rounded-2xl`) cho các thẻ (cards) báo cáo, Morning Briefing, và bọt thoại (chat bubbles) để giao diện mềm mại, thân thiện.

### Layout & Component Rules
- **Omnichannel Inbox:** Bố cục 3 cột tối ưu (Danh sách chat -> Cửa sổ chat -> Profile Khách hàng & AI Suggestions). Tin nhắn nháp (AI Draft) phải có UI khác biệt rõ rệt (ví dụ: viền `#00C27A` dashed, background `#F3FBF7`) kèm theo các nút Approve/Edit/Reject.
- **Morning Briefing:** Trình bày dưới dạng Feed dọc thân thiện. Cảnh báo (Alerts) từ Analyst Agent cần sử dụng các icon cảnh báo với màu Primary hoặc phối hợp với Accent Glow để thu hút sự chú ý.
- **My Agent Team:** Các thẻ Agent phải hiển thị rõ trạng thái hoạt động thông qua Status Dot (Xanh lá `#00C27A` cho Active, Vàng/Đỏ cho lỗi hoặc cần thiết lập).

### Anti-patterns (Tuyệt đối tránh)
- ❌ **Không sử dụng Emojis làm icon:** Thay thế toàn bộ bằng SVG icons chuẩn mực, nhất quán (khuyên dùng **Lucide Icons** hoặc **Heroicons**).
- ❌ **Không dùng bóng đổ (shadows) quá gắt:** Tránh dùng shadow màu `#000000` thuần. Thay vào đó, sử dụng shadow có tone Dark Green với độ mờ thấp (ví dụ: `shadow-[0_4px_20px_rgba(6,46,36,0.05)]`).
- ❌ **Không để giao diện chật chội (Cluttered):** Quản lý khoảng trắng (whitespace) tốt, padding/margin rộng rãi (`p-6` hoặc `p-8` cho thẻ lớn) để người dùng dễ đọc báo cáo và duyệt tin nhắn.

## 5. Pre-Delivery Checklist
Trước khi bàn giao UI code, luôn kiểm tra các hạng mục sau:

- [ ] Không có emojis dùng làm UI icons (đã thay bằng Lucide/Heroicons SVG).
- [ ] Tất cả các thành phần tương tác (nút, link, thẻ) đều có `cursor-pointer`.
- [ ] Các trạng thái hover cung cấp phản hồi trực quan với hiệu ứng chuyển đổi mượt (150-300ms).
- [ ] Độ tương phản màu chữ trong Light Mode đạt chuẩn (tối thiểu 4.5:1), văn bản chính sử dụng Deep Forest (`#062E24`), không dùng màu xám quá nhạt gây khó đọc.
- [ ] Trạng thái focus hiển thị rõ ràng, hỗ trợ điều hướng bằng bàn phím (accessibility).
- [ ] Các thẻ có thuộc tính trong suốt (Glassmorphism) phải nhìn rõ nội dung trên nền Mint White (`#F3FBF7`).
- [ ] Giao diện responsive linh hoạt, không bị vỡ hoặc cuộn ngang (horizontal scroll) trên các thiết bị mobile (375px), tablet (768px), desktop (1024px, 1440px).
