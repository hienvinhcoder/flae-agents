---
name: FLAE Agent
colors:
  surface: '#fbf8ff'
  surface-dim: '#dad9e3'
  surface-bright: '#fbf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f2fd'
  surface-container: '#eeedf7'
  surface-container-high: '#e8e7f1'
  surface-container-highest: '#e3e1ec'
  on-surface: '#1a1b22'
  on-surface-variant: '#3c4a42'
  inverse-surface: '#2f3038'
  inverse-on-surface: '#f1effa'
  outline: '#6c7a71'
  outline-variant: '#bbcabf'
  surface-tint: '#006c49'
  primary: '#006c49'
  on-primary: '#ffffff'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#4edea3'
  secondary: '#59605d'
  on-secondary: '#ffffff'
  secondary-container: '#dae1dd'
  on-secondary-container: '#5d6461'
  tertiary: '#a43a3a'
  on-tertiary: '#ffffff'
  tertiary-container: '#fc7c78'
  on-tertiary-container: '#711419'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#dde4e0'
  secondary-fixed-dim: '#c1c8c4'
  on-secondary-fixed: '#161d1b'
  on-secondary-fixed-variant: '#414846'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3af'
  on-tertiary-fixed: '#410005'
  on-tertiary-fixed-variant: '#842225'
  background: '#fbf8ff'
  on-background: '#1a1b22'
  surface-variant: '#e3e1ec'
  surface-main: '#F4FBF7'
  surface-card: '#FFFFFF'
  text-heading: '#18181B'
  text-body: '#3F3F46'
  status-active: '#10B981'
  status-pending: '#F59E0B'
  status-approval: '#EF4444'
  border-subtle: '#E4E4E7'
typography:
  headline-xl:
    fontFamily: Outfit
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  margin-page: 2rem
  gutter-grid: 1.5rem
  padding-card: 1.25rem
  stack-gap: 0.75rem
  agent-feed-gap: 1rem
---

## Brand & Style
The design system for FLAE Agent is built on an **Agent-First** philosophy, reimagining the enterprise dashboard as a collaborative workspace where AI agents and humans coexist. The brand personality is professional yet approachable, tailored specifically for SMB owners who require clarity and reliability without the cold complexity of traditional SaaS.

The visual style is **Modern / Minimalist** with a focus on **Tonal Layering**. It utilizes generous whitespace, a soft "Mint" canvas, and vibrant green accents to create a sense of growth and activity. Every interface element is designed to feel like a "briefing"—concise, actionable, and trustworthy. The system prioritizes "Human-in-the-Loop" interactions, ensuring that while the agents are powerful, the user always feels in control through clear status indicators and conversational card layouts.

## Colors
The palette is dominated by the **Primary Vibrant Green (#10B981)**, which represents the "Active" and "Reliable" state of the AI workforce. This is supported by a **Soft Mint (#F4FBF7)** foundation that reduces eye strain and provides a modern alternative to pure white or gray backgrounds.

- **Primary:** Used for the most important actions (CTAs) and active agent states.
- **Surface:** The background is Mint, while functional cards and interaction areas are pure white to provide depth.
- **Status Tones:** A semantic set is used to communicate agent reliability: Green for *Active/Resolved*, Amber for *Pending/Waiting*, and Red for *Approval Required/Critical*.
- **Neutrals:** Zinc and Slate tones are used for typography and borders to maintain a professional, grounded feel.

## Typography
The typographic system uses a dual-font approach to balance brand character with functional utility:

- **Outfit (Headings):** Used for titles, agent names, and high-level summaries. Its geometric nature feels modern and innovative.
- **Plus Jakarta Sans (Body & UI):** Chosen for its exceptional legibility in Vietnamese. It is used for chat logs, document previews, and form fields.

**Language Support:** Ensure all weights are loaded with the Vietnamese character set. Line heights are slightly increased (1.5x for body) to accommodate the diacritics common in Vietnamese text without overcrowding the line.

## Layout & Spacing
The layout follows a **Fluid Grid** model with a "Workspace" structure. Instead of a standard dashboard, the interface is centered around a "Briefing Feed"—a vertical stream of conversational cards.

- **Desktop:** A fixed side navigation (collapsed or slim) with a fluid content area. The content area uses a maximum width of 1440px to prevent text lines from becoming too long.
- **Mobile:** Transition to a single-column stack. Margins reduce to 1rem.
- **Rhythm:** An 8px base grid is used. Elements within a "Conversation Card" use tighter spacing (12px), while the gap between different agent activities is larger (24px) to denote context switches.

## Elevation & Depth
Depth in the design system is achieved through **Tonal Layers**, **Ambient Shadows**, and **Glassmorphism** rather than heavy borders.

1.  **Level 0 (Foundation):** The Soft Mint surface (`#F4FBF7`).
2.  **Level 1 (Cards/Containers):** Pure white surfaces (`#FFFFFF`) with a very soft, diffused shadow (0px 4px 20px rgba(0, 0, 0, 0.04)). This elevates "Agent Briefings" from the background.
3.  **Level 2 (Interaction/Popovers/Modals):** Active elements like dropdowns, hovering cards, or modal overlays use a slightly deeper shadow (0px 10px 30px rgba(16, 185, 129, 0.08)) and integrate **Glassmorphism** (backdrop blur 10-20px with subtle 1px white/0.2 border) to indicate they are "closer" to the user and create multi-layer depth.

**Agent Visibility:** AI-generated "Drafts" should use a subtle dashed border instead of a shadow to indicate their "unverified" or "ghost" state.

## Shapes
The shape language is soft and approachable.
- **Cards & Primary Containers:** Use a 16px (`rounded-xl`) corner radius.
- **Buttons & Input Fields:** Use an 8px (`rounded-lg`) corner radius.
- **Status Tags/Chips:** Use a fully pill-shaped (rounded-full) radius to distinguish them from interactive buttons.

This high level of roundedness reinforces the "friendly" and "human-centric" philosophy of the AI Workforce.

## Components

### Buttons
- **Primary:** Background `#10B981`, white text, 8px radius. Subtle scale-down effect on click.
- **Secondary:** White background with a 1px Zinc-200 border.
- **Ghost:** No background, primary color text for low-priority agent actions.

### Conversational Cards
The core unit of the UI. Must feature:
- An "Agent Avatar" (Chat, Analyst, or Voice).
- A timestamp and channel icon (Zalo, FB, Web).
- A clear "Status Badge" in the top right.
- Actionable buttons at the bottom (e.g., "Phê duyệt", "Chỉnh sửa").

### Status Indicators
Small, high-contrast badges used throughout the system:
- **Active (Hoạt động):** Primary Green.
- **Pending (Đang chờ):** Amber.
- **Approval Required (Cần duyệt):** Red background with white text to demand attention.

### Input Fields
- Soft borders (1px Zinc-200) that transition to 2px Primary Green on focus.
- Placeholder text in Zinc-400.
- Labels in `label-md` (Outfit) for clear hierarchy.

### Agent Briefing Feed
A vertical stack of cards with a "connector line" on the left side, visually linking the agent's sequence of thoughts or actions into a single audit log.

## Anti-patterns (Những điều cần tránh)
- **Excessive Animation:** Tránh lạm dụng quá nhiều hiệu ứng hoạt hình gây rườm rà.
- **Dark Mode by Default:** Tránh việc ép buộc giao diện mặc định là Chế độ ban đêm (Dark Mode) nếu không có tùy chọn thay đổi.

## Pre-Delivery Checklist
Để đảm bảo chất lượng UI/UX theo chuẩn hệ thống:
- [ ] Không dùng biểu tượng cảm xúc (emoji) làm icon (chỉ sử dụng SVG từ Heroicons/Lucide).
- [ ] Đảm bảo có class `cursor-pointer` trên tất cả các thành phần có thể nhấp chuột.
- [ ] Các trạng thái `:hover` phải có hiệu ứng chuyển đổi mượt mà (`duration-150` đến `duration-300`).
- [ ] Chế độ sáng (Light mode): Độ tương phản văn bản/nền tối thiểu là 4.5:1.
- [ ] Các trạng thái khi `:focus` phải hiển thị viền/nền rõ ràng hỗ trợ điều hướng bằng bàn phím.
- [ ] Tôn trọng thiết lập CSS `prefers-reduced-motion` của trình duyệt.
- [ ] Responsive hoàn thiện hiển thị tốt trên các mốc kích thước: 375px, 768px, 1024px, 1440px.