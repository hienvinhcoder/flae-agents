import { Dictionary } from "../types";

export const vi: Dictionary = {
  common: {
    connectMemory: "Bắt đầu ngay",
    connectMemoryFree: "Bắt đầu miễn phí",
    signIn: "Đăng nhập",
    startFree: "Bắt đầu ngay",
    startTrial: "Dùng thử 14 ngày gói Pro",
    exploreMcp: "Khám phá MCP Server",
    exploreMcpDocs: "Tài liệu & Tích hợp MCP",
    allSystemsOperational: "Đồ thị tri thức hoạt động · Đồng bộ thời gian thực",
    viewArchitecture: "Xem Kiến Trúc Hệ Thống",
    copied: "Đã sao chép vào bộ nhớ tạm",
    copyConfig: "Sao chép cấu hình",
    latency: "Độ trễ trung bình",
    verifiedFact: "Đã xác thực nguồn",
    continuousSync: "Đồng bộ liên tục",
  },
  announcement: {
    tag: "MCP Server v1.4",
    message: "Kết nối bộ nhớ công ty trực tiếp vào Claude, Cursor & ChatGPT.",
    messageMobile: "Đã phát hành MCP Server v1.4.",
    action: "Xem cài đặt",
  },
  nav: {
    product: "Sản phẩm",
    useCases: "Ứng dụng",
    integrations: "Tích hợp",
    forAgents: "Dành cho AI Agents",
    security: "Bảo mật",
    pricing: "Bảng giá",
    signIn: "Đăng nhập",
    startBuildingMemory: "Bắt đầu ngay",
  },
  hero: {
    eyebrow: "NGỮ CẢNH ĐỘNG DÀNH CHO AI",
    titleStart: "AI của bạn không nên ",
    titleHighlight: "phải đoán những gì công ty đã biết.",
    subtitle:
      "FLAE kết nối tài liệu, thảo luận và mã nguồn thành một tầng tri thức sống — giúp ChatGPT, Claude, Cursor và các AI agent trả lời với đúng ngữ cảnh kèm nguồn gốc minh bạch.",
    primaryCta: "Bắt đầu ngay",
    secondaryCta: "Xem câu trả lời thực tế",
    connectorsLabel: "Notion · Slack · Google Drive · GitHub · MCP",
  },
  heroDemo: {
    windowTitle: "Acme Corp / Ngữ Cảnh Công Ty Thời Gian Thực",
    workspaceName: "FLAE Context Inspector",
    statusLabel: "Đồ thị ngữ cảnh đã đồng bộ",
    askerLabel: "Kỹ sư đặt câu hỏi (qua Cursor / Slack)",
    question: "Tài liệu Billing API của chúng ta còn chính xác không?",
    answerTitle: "FLAE Living Context",
    answerStatus: "Không còn nữa.",
    answerDetail:
      "PR #184 đã thay đổi endpoint POST /billing/charge 3 ngày trước và thêm trường bắt buộc currency. Tài liệu Notion hiện tại vẫn đang mô tả schema cũ.",
    staleAlertBadge: "Tài Liệu Có Nguy Cơ Lỗi Thời",
    sourcesTitle: "Bằng Chứng Gốc Có Thể Truy Xuất",
    sources: [
      {
        id: "src-1",
        title: "PR #184: Add currency parameter to charge endpoint",
        source: "GitHub · Pull Request #184",
        timestamp: "Đã merge 3 ngày trước bởi Sarah Chen",
        type: "pr",
        badge: "Đã Đổi Endpoint",
      },
      {
        id: "src-2",
        title: "backend/app/api/v1/billing/routes.py",
        source: "GitHub · nhánh main",
        timestamp: "Commit 9a8c2f1 · Dòng 42-68",
        type: "code",
        badge: "Code Đang Chạy",
      },
      {
        id: "src-3",
        title: "Billing API Reference v1.2",
        source: "Notion · Engineering Wiki",
        timestamp: "Cập nhật 2 tháng trước",
        type: "doc",
        badge: "Tài Liệu Cũ",
      },
    ],
    graph: {
      title: "Đồ Thị Quan Hệ Trực Quan",
      nodes: [
        { id: "pr184", label: "GitHub PR #184", type: "pr" },
        { id: "api", label: "Billing Charge API", type: "api" },
        { id: "code", label: "billing/routes.py", type: "file" },
        { id: "notion", label: "Notion API Docs", type: "doc" },
      ],
      edges: [
        { from: "pr184", to: "api", relation: "thay đổi" },
        { from: "api", to: "code", relation: "triển khai bởi" },
        { from: "api", to: "notion", relation: "tài liệu hóa bởi (chưa cập nhật)" },
      ],
    },
  },
  contextTimeline: {
    badge: "SỰ KHÁC BIỆT CỦA FLAE",
    title: "FLAE liên kết những gì đã diễn ra, không chỉ nơi nó được viết ra.",
    subtitle:
      "Một quyết định có thể khởi nguồn trên Slack, thay đổi qua một PR trên GitHub, nhưng vẫn được ghi chép sai trong Notion. FLAE kết nối các mảnh ghép đó thành một ngữ cảnh nhất quán và truy xuất được.",
    timeline: [
      {
        source: "Slack · #eng-architecture",
        badge: "Quyết Định",
        badgeType: "decision",
        quote: "“Chúng ta sẽ yêu cầu trường currency bắt buộc trên API nạp tiền từ sprint tới.”",
        subtext: "Đồng thuận bởi Lead Architect & PM · 5 ngày trước",
      },
      {
        source: "GitHub · PR #184 Đã Merge",
        badge: "Thay Đổi Code",
        badgeType: "code",
        quote: "“Bổ sung validation trường currency vào schema POST /billing/charge.”",
        subtext: "Triển khai trong routes.py · 3 ngày trước",
      },
      {
        source: "Notion · Tài Liệu Billing",
        badge: "Tài Liệu Gốc",
        badgeType: "doc",
        quote: "“POST /billing/charge nhận amount (int) và customer_id (str).”",
        subtext: "Chỉnh sửa lần cuối 2 tháng trước · ⚠ Chưa cập nhật currency",
      },
    ],
    summary: {
      label: "Hiểu Biết Hiện Tại của FLAE",
      heading: "Billing API v2 đang hoạt động trong production. Tài liệu Notion đã cũ.",
      detail:
        "Khi một kỹ sư hoặc AI assistant đặt câu hỏi về endpoint nạp tiền, FLAE tự động tổng hợp code thực tế và ngữ cảnh PR, đồng thời cảnh báo sự sai lệch trong tài liệu Notion.",
    },
  },
  differentiators: {
    badge: "LỢI THẾ CỐT LÕI",
    title: "Ba lý do tìm kiếm thông thường không đủ đáp ứng",
    subtitle:
      "Tìm kiếm truyền thống chỉ khớp từ khóa. FLAE duy trì một tầng hiểu biết liên tục về các mối quan hệ, sự thay đổi theo thời gian và bằng chứng gốc.",
    pillars: [
      {
        id: "relationships",
        title: "Hiểu mối quan hệ, không chỉ tìm từ khóa",
        description:
          "FLAE hiểu cách con người, dự án, quyết định, tài liệu, API, pull request và mã nguồn liên kết với nhau qua các hệ thống riêng lẻ.",
        visualFlow: ["Con người", "Quyết định", "Dự án", "API", "Hàm code", "PR", "Tài liệu"],
        highlightBadge: "Ngữ Cảnh Dạng Đồ Thị",
      },
      {
        id: "time",
        title: "Biết rõ điều gì thay đổi — và khi nào",
        description:
          "Mỗi dữ kiện đều lưu giữ mốc thời gian và nguồn gốc. Khi thảo luận mới mâu thuẫn với chính sách cũ, FLAE nêu rõ điểm mâu thuẫn thay vì tự ý giả định.",
        visualFlow: ["Handbook 2025", "→ mâu thuẫn / thay thế →", "Trao đổi Slack 2026", "→ triển khai qua →", "PR #184"],
        highlightBadge: "Mốc Thời Gian Đa Tầng",
      },
      {
        id: "evidence",
        title: "Mọi câu trả lời đều có bằng chứng gốc",
        description:
          "Các tuyên bố quan trọng đều dẫn link trực tiếp về luồng trò chuyện Slack, văn bản, commit hoặc pull request ban đầu.",
        visualFlow: ["Câu trả lời", "Trích dẫn chuẩn", "Luồng Slack gốc", "Commit đã xác thực"],
        highlightBadge: "Minh Bạch & Kiểm Chứng Được",
      },
    ],
  },
  techComparison: {
    badge: "TÌM KIẾM VS TÁI TẠO NGỮ CẢNH",
    title: "Tìm kiếm tìm văn bản tương đồng. FLAE tái tạo toàn bộ ngữ cảnh.",
    subtitle:
      "Tìm kiếm ngữ nghĩa truyền thống chia nhỏ văn bản độc lập. FLAE kết nối sự thật, mốc thời gian và nguồn gốc trên toàn bộ hệ thống doanh nghiệp.",
    conventionalHeader: "Tìm Kiếm AI / RAG Truyền Thống",
    flaeHeader: "FLAE Living Context Layer",
    rows: [
      {
        dimension: "Mô Hình Dữ Liệu",
        conventional: "Tìm các đoạn văn bản tương đồng ngữ nghĩa trong không gian vector",
        flae: "Lần theo các quan hệ đa tầng giữa sự kiện, mã nguồn và con người",
      },
      {
        dimension: "Tổng Hợp Đa Nguồn",
        conventional: "Xử lý tài liệu, chat và kho mã nguồn hoàn toàn độc lập",
        flae: "Kết nối bằng chứng chéo giữa Slack, Notion, Drive và GitHub",
      },
      {
        dimension: "Bằng Chứng Xa Rời",
        conventional: "Dễ bỏ sót bằng chứng liên quan nằm ngoài cửa sổ ngữ cảnh ngắn",
        flae: "Dùng cấu trúc đồ thị và văn bản để kiểm tra chéo và phục hồi suy luận",
      },
      {
        dimension: "Đầu Ra & Độ Xác Thực",
        conventional: "Trả về các đoạn văn thô với rủi ro ảo giác thông tin",
        flae: "Trả về ngữ cảnh hoàn chỉnh + đồ thị quan hệ + nguồn gốc xác thực",
      },
    ],
    footnote:
      "Bên dưới hệ thống, FLAE sử dụng cơ chế truy xuất hai chiều Văn bản–Đồ thị: cấu trúc đồ thị giúp định vị bằng chứng văn bản chuẩn xác hơn, trong khi văn bản giúp phục hồi các đường lập luận còn thiếu.",
  },
  agentMemory: {
    badge: "HẠ TẦNG DÀNH CHO AI",
    title: "Một tầng bộ nhớ duy nhất. Cho mọi AI agent.",
    subtitle:
      "Đội ngũ của bạn không cần xây dựng lại ngữ cảnh công ty cho từng trợ lý ảo. FLAE cung cấp một tầng tri thức cập nhật liên tục thông qua MCP và API chuẩn hoá.",
    mcpBadge: "Hỗ Trợ Chuẩn MCP Gốc",
    mcpTitle: "Giao Thức Ngữ Cảnh Chuẩn (Model Context Protocol)",
    mcpSubtitle: "Cung cấp bộ nhớ doanh nghiệp không rào cản cho Claude Desktop, Cursor, ChatGPT và các AI agent nội bộ.",
    connectedAgents: [
      { id: "claude", name: "Claude Desktop", role: "Nghiên cứu & phân tích kiến trúc" },
      { id: "cursor", name: "Cursor / VS Code", role: "Ngữ cảnh mã nguồn & PR ngay trong IDE" },
      { id: "chatgpt", name: "ChatGPT / OpenAI", role: "Trợ lý phòng ban & soạn thảo quy trình" },
      { id: "codex", name: "Codex / Custom Agents", role: "Tự động phân loại issue & review PR" },
    ],
    connectedSources: ["Slack", "Notion", "Google Drive", "GitHub", "Jira", "Linear"],
    capabilities: [
      {
        title: "Nguồn Chân Lý Duy Nhất",
        description: "Chỉ cần cập nhật tài liệu hoặc merge code một lần; mọi trợ lý AI đều lập tức nhận ngữ cảnh mới.",
      },
      {
        title: "Kế Thừa Phân Quyền Doanh Nghiệp",
        description: "Tuân thủ chặt chẽ quyền truy cập sẵn có để AI agent chỉ tiếp cận dữ liệu mà người dùng được phép xem.",
      },
      {
        title: "Không Tốn Chi Phí Huấn Luyện Lại",
        description: "Không cần fine-tuning hay tính toán lại vector embedding tốn kém. FLAE truyền ngữ cảnh có cấu trúc theo thời gian thực.",
      },
    ],
  },
  useCases: {
    badge: "LẬP LUẬN ĐA NGUỒN",
    title: "Hỏi những câu hỏi vốn cần năm người và mười tab trình duyệt.",
    subtitle:
      "FLAE tự động duyệt qua các cuộc thảo luận, pull request, lộ trình phát triển và đặc tả kỹ thuật để tổng hợp câu trả lời kèm đầy đủ nguồn chứng minh.",
    questionLabel: "Câu Hỏi",
    reasoningLabel: "Đường Dẫn Lập Luận",
    evidenceLabel: "Nguồn Dữ Liệu Xác Thực",
    tabs: [
      {
        id: "engineering",
        label: "Kỹ Thuật",
        role: "Kỹ sư phần mềm & Tech Leads",
        question: "Tại sao endpoint /api/users bị thay đổi tuần trước?",
        flaeAnswer:
          "Schema endpoint được cập nhật để hỗ trợ OAuth2 scope theo yêu cầu bảo mật trong kênh Slack #eng-sec, đã triển khai qua PR #312 và tài liệu hóa trong hướng dẫn Auth v2.",
        reasoningChain: ["Slack #eng-sec", "Quyết định bảo mật", "PR #312", "Commit e4f91", "API Docs v2"],
        evidence: ["GitHub PR #312", "routes/auth.py", "Thảo luận Slack #eng-sec (14/10)"],
      },
      {
        id: "product",
        label: "Sản Phẩm",
        role: "Giám đốc sản phẩm & Vận hành",
        question: "Vì sao việc ra mắt app di động bị lùi sang Quý 3?",
        flaeAnswer:
          "Ngày ra mắt được Sarah Chen dời lại vào ngày 12/05 do phụ thuộc vào tiến độ chuyển đổi cổng thanh toán được ghi nhận trong lộ trình Q2 và theo dõi tại issue Linear PAY-402.",
        reasoningChain: ["Tài liệu Lộ trình", "Linear PAY-402", "Sarah Chen (Quyết định)", "Slack #leadership"],
        evidence: ["Notion Q2 Roadmap v3", "Linear PAY-402", "Slack #launch-sync"],
      },
      {
        id: "leadership",
        label: "Lãnh Đạo",
        role: "Nhà sáng lập & Giám đốc kỹ thuật",
        question: "Dự án Atlas hiện đang bị tắc nghẽn bởi điều gì?",
        flaeAnswer:
          "Dự án Atlas đang bị phụ thuộc vào kết quả đánh giá chứng chỉ SOC2 và đang chờ review PR #409 (Tích hợp SSO) do Alex Rivera phụ trách.",
        reasoningChain: ["Jira ATLAS-104", "GitHub PR #409", "Alex Rivera (Phụ trách)", "Báo cáo SOC2"],
        evidence: ["GitHub PR #409", "Jira ATLAS-104", "Drive: Kế hoạch SOC2 2026"],
      },
      {
        id: "onboarding",
        label: "Nhân Sự Mới",
        role: "Nhân viên mới & Chuyển giao công việc",
        question: "Cung cấp cho tôi toàn bộ ngữ cảnh cần thiết để làm việc trên module Billing.",
        flaeAnswer:
          "Module Billing do Team Alpha quản lý (Trưởng nhóm: David Kim). Kiến trúc dựa trên Stripe webhook worker và hàng đợi bất đồng bộ. Thay đổi lớn gần nhất là chuyển đổi Stripe Tax tháng trước.",
        reasoningChain: ["Danh bạ nhóm", "Tài liệu RFC #14", "Các PR Stripe Migration", "Epics đang mở"],
        evidence: ["Notion Tổng quan Billing", "GitHub repo: billing-service", "Slack #team-alpha"],
      },
    ],
  },
  howItWorks: {
    badge: "QUY TRÌNH HOẠT ĐỘNG",
    title: "Từ thông tin rời rạc đến ngữ cảnh AI có thể sử dụng",
    subtitle: "Quy trình 3 bước liên tục biến toàn bộ dữ liệu công ty thành tri thức xác thực.",
    stagePrefix: "Bước",
    steps: [
      {
        step: 1,
        title: "Kết nối các công cụ làm việc của công ty",
        subtitle: "Tích hợp OAuth một chạm",
        description:
          "Kết nối Slack, Notion, Google Drive, GitHub và cơ sở dữ liệu nội bộ trong vài phút với quyền chỉ đọc (Read-Only).",
        bullets: [
          "Tích hợp OAuth an toàn với phạm vi phân quyền chi tiết",
          "Đồng bộ liên tục dạng delta stream mà không cần bảo trì webhook phức tạp",
          "Cách ly dữ liệu nghiêm ngặt và sẵn sàng tuân thủ chuẩn SOC2",
        ],
      },
      {
        step: 2,
        title: "FLAE liên tục xây dựng đồ thị ngữ cảnh",
        subtitle: "Tổng hợp hai chiều Văn bản – Đồ thị",
        description:
          "Tài liệu, hội thoại, mã nguồn, nhân sự và các quyết định trở thành mạng lưới dữ kiện liên kết với nguồn gốc thời gian rõ ràng.",
        bullets: [
          "Trích xuất thực thể, mối quan hệ và quyết định từ các nguồn dữ liệu",
          "Lưu giữ lịch sử thời gian để phát hiện tài liệu có nguy cơ lỗi thời",
          "Đối chiếu chéo giữa commit mã nguồn với tài liệu kiến trúc",
        ],
      },
      {
        step: 3,
        title: "Cung cấp ngữ cảnh đó cho bất kỳ AI nào",
        subtitle: "Hỏi trực tiếp, qua MCP & API",
        description:
          "Đặt câu hỏi trực tiếp trên FLAE, hoặc mở rộng tầng tri thức sang Claude, Cursor, ChatGPT và các AI agent tự động qua MCP.",
        bullets: [
          "Cung cấp sẵn endpoint chuẩn Model Context Protocol (MCP)",
          "Trích dẫn nguồn và đường dẫn lập luận chi tiết trong từng prompt",
          "Cung cấp REST API và Webhook cho các agent nội bộ doanh nghiệp",
        ],
      },
    ],
  },
  integrations: {
    badge: "KẾT NỐI KHÔNG GIAN LÀM VIỆC",
    title: "Kết nối mọi nơi đội ngũ của bạn tạo ra tri thức",
    subtitle:
      "FLAE lập chỉ mục tài liệu, cuộc trò chuyện và mã nguồn mà vẫn bảo toàn nguyên vẹn quyền truy cập phân quyền.",
    filters: {
      all: "Tất cả nguồn",
      docs: "Tài liệu",
      code: "Mã nguồn & Kho code",
      chat: "Giao tiếp & Trao đổi",
    },
    liveSynced: "Đồng bộ liên tục",
    securityBanner: {
      title: "Kế Thừa Phân Quyền Doanh Nghiệp",
      description: "Thành viên chỉ nhận được câu trả lời từ tài liệu và thảo luận mà họ có quyền truy cập.",
      cta: "Tìm hiểu về RBAC & Cách ly dữ liệu",
    },
    items: [
      {
        id: "slack",
        name: "Slack",
        category: "chat",
        description: "Lập chỉ mục các kênh công khai, luồng thảo luận và quyết định được chốt.",
        syncType: "Realtime WebSocket",
        itemsCount: "Đồng bộ trực tiếp",
      },
      {
        id: "notion",
        name: "Notion",
        category: "docs",
        description: "Đồng bộ workspace, wiki phân cấp, bảng lộ trình và cơ sở dữ liệu.",
        syncType: "Delta Webhook",
        itemsCount: "Toàn bộ cấu trúc",
      },
      {
        id: "github",
        name: "GitHub",
        category: "code",
        description: "Lập chỉ mục repositories, PR review, lịch sử commit và issue.",
        syncType: "Webhook + Event API",
        itemsCount: "Mã nguồn & PRs",
      },
      {
        id: "gdrive",
        name: "Google Drive",
        category: "docs",
        description: "Trích xuất ngữ cảnh từ Docs, Sheets, Slides và thư mục chia sẻ.",
        syncType: "Polling liên tục",
        itemsCount: "Tài liệu & Bảng tính",
      },
      {
        id: "mcp",
        name: "Model Context Protocol",
        category: "code",
        description: "Chuẩn mở kết nối FLAE trực tiếp với Claude Desktop, Cursor và IDEs.",
        syncType: "MCP JSON-RPC",
        itemsCount: "Chuẩn hóa",
      },
      {
        id: "linear",
        name: "Linear / Jira",
        category: "docs",
        description: "Lập chỉ mục roadmap, sprint issue, blocker và quyền sở hữu dự án.",
        syncType: "Event Webhook",
        itemsCount: "Lộ trình & Task",
      },
    ],
  },
  architecture: {
    badge: "BẢO MẬT & KIẾN TRÚC",
    title: "Kiểm soát cấp doanh nghiệp, không rò rỉ tri thức",
    subtitle:
      "Thiết kế cho môi trường bảo mật nghiêm ngặt với cách ly tenant tuyệt đối và chế độ chỉ đọc.",
    pillars: [
      {
        title: "Row Level Security (RLS) & Đa Khách Hàng (Multi-tenancy)",
        subtitle: "Ngữ cảnh khách hàng được cô lập bằng mã hóa",
        description:
          "Dữ liệu của từng công ty được phân vùng độc lập trên schema cơ sở dữ liệu và vector partition, đảm bảo không rò rỉ dữ liệu chéo.",
        tags: ["PostgreSQL RLS", "Cách ly Schema", "Không truy cập chéo"],
      },
      {
        title: "Truy Vấn Theo Phân Quyền Thực Tế",
        subtitle: "Kế thừa danh sách quyền (ACL) theo thời gian thực",
        description:
          "Khi nhân viên hoặc AI agent hỏi FLAE, kết quả chỉ được lọc từ các tài nguyên mà người dùng có quyền hợp lệ trên Slack, Drive hay Notion.",
        tags: ["OAuth Scopes", "Lọc ACL Động", "Audit Logging"],
      },
      {
        title: "Không Huấn Luyện Mô Hình Ngoài",
        subtitle: "Dữ liệu tuyệt đối không dùng để train AI công cộng",
        description:
          "Dữ liệu được lập chỉ mục bởi FLAE chỉ tồn tại trong ranh giới bộ nhớ riêng của bạn. Chúng tôi cam kết không dùng dữ liệu nội bộ để huấn luyện mô hình.",
        tags: ["Chuẩn bị SOC2 Type II", "Zero Data Retention", "Kết nối Chỉ Đọc"],
      },
    ],
  },
  pricing: {
    badge: "GÓI DỊCH VỤ & BẢNG GIÁ",
    title: "Bắt đầu xây dựng bộ nhớ công ty ngay hôm nay",
    subtitle: "Mức giá minh bạch, linh hoạt từ startup tăng trưởng nhanh đến tập đoàn lớn.",
    billingToggle: {
      monthly: "Thanh toán theo tháng",
      annual: "Thanh toán theo năm",
      saveBadge: "Tiết kiệm 20%",
    },
    mostPopular: "Phổ biến nhất",
    includedCapabilities: "Tính năng bao gồm",
    foreverFree: "Miễn phí vĩnh viễn",
    perMonth: "/ thành viên / tháng",
    annualBilling: "thanh toán hàng năm",
    plans: [
      {
        id: "starter",
        name: "Starter",
        tagline: "Tầng bộ nhớ thiết yếu cho nhóm nhỏ và startup giai đoạn đầu.",
        price: "0đ",
        period: "Miễn phí vĩnh viễn",
        ctaText: "Bắt đầu miễn phí",
        features: [
          "Tối đa 10 thành viên nhóm",
          "Kết nối Slack, Notion & Google Drive",
          "Truy cập Model Context Protocol (MCP)",
          "Đồ thị quan hệ cơ bản và trích dẫn nguồn gốc",
          "Hỗ trợ qua cộng đồng",
        ],
      },
      {
        id: "pro",
        name: "Team Pro",
        tagline: "Ngữ cảnh công ty độ trung thực cao kèm tích hợp code và cảnh báo tài liệu cũ.",
        price: "$29",
        period: "/ thành viên / tháng",
        ctaText: "Dùng thử 14 ngày gói Pro",
        features: [
          "Không giới hạn số lượng thành viên",
          "Đầy đủ kết nối (Bao gồm GitHub, Linear, Jira)",
          "Tự động phát hiện tài liệu cũ & cảnh báo mâu thuẫn",
          "Không giới hạn truy vấn qua MCP & REST API",
          "Kế thừa phân quyền & RBAC chuyên sâu",
          "Hỗ trợ kỹ thuật ưu tiên 24/7",
        ],
      },
      {
        id: "enterprise",
        name: "Enterprise",
        tagline: "Triển khai riêng biệt, VPC độc lập và cam kết SLA cho ngành yêu cầu bảo mật cao.",
        price: "Liên hệ",
        period: "hợp đồng theo năm",
        ctaText: "Liên hệ tư vấn Enterprise",
        features: [
          "Tùy chọn triển khai VPC riêng / On-premise",
          "Tích hợp SSO tùy chỉnh, SAML & đồng bộ SCIM",
          "Tự mang API Key LLM riêng (BYOK)",
          "Kiến trúc sư giải pháp đồng hành & cam kết SLA",
          "Hỗ trợ xây dựng kết nối riêng theo yêu cầu",
        ],
      },
    ],
  },
  faq: {
    badge: "CÂU HỎI THƯỜNG GẶP",
    title: "Mọi điều bạn cần biết về FLAE",
    subtitle: "Giải đáp rõ ràng về kiến trúc, bảo mật và khả năng tích hợp AI agent.",
    items: [
      {
        question: "FLAE khác gì so với các công cụ tìm kiếm doanh nghiệp như Glean hay Notion AI?",
        answer:
          "Tìm kiếm doanh nghiệp và RAG thông thường chỉ tìm các đoạn văn bản tương đồng dựa trên từ khóa hoặc vector. FLAE xây dựng đồ thị tri thức sống hiểu rõ các mối quan hệ (ví dụ: thảo luận Slack liên quan thế nào đến GitHub PR và trang Notion) và lưu giữ dòng thời gian, giúp phát hiện ngay khi tài liệu bị cũ sau một commit code.",
      },
      {
        question: "Làm thế nào để kết nối các công cụ AI (ChatGPT, Claude, Cursor) với FLAE?",
        answer:
          "FLAE hỗ trợ giao thức chuẩn Model Context Protocol (MCP). Trong các công cụ như Claude Desktop hay Cursor, bạn chỉ cần thêm endpoint MCP của FLAE vào cấu hình. Khi bạn hỏi trong IDE hoặc cửa sổ chat, agent sẽ tự động truy vấn FLAE để lấy ngữ cảnh xác thực.",
      },
      {
        question: "FLAE xử lý thế nào khi hai nguồn thông tin có nội dung mâu thuẫn?",
        answer:
          "FLAE không mặc định xem tin nhắn mới nhất luôn đúng (ví dụ: một câu chat không chính thức trên Slack không thể tự động ghi đè chính sách đã phê duyệt). Thay vào đó, FLAE nhận diện sự sai lệch, hiển thị cả hai bằng chứng kèm thời gian và người phụ trách, đồng thời cảnh báo có nguy cơ mâu thuẫn.",
      },
      {
        question: "FLAE có sử dụng dữ liệu công ty của chúng tôi để huấn luyện AI không?",
        answer:
          "Tuyệt đối không. Dữ liệu của bạn được bảo vệ trong các phân vùng cơ sở dữ liệu cô lập và không bao giờ được dùng để huấn luyện mô hình công cộng. Mọi lệnh gọi LLM đều tuân thủ thỏa thuận không lưu giữ dữ liệu (zero-retention).",
      },
      {
        question: "Mất bao lâu để kết nối không gian làm việc của công ty?",
        answer:
          "Bạn có thể kết nối các nguồn đầu tiên (Notion, Slack, Google Drive, GitHub) trong vòng dưới 5 phút thông qua chuẩn OAuth. Việc lập chỉ mục ban đầu chạy ngầm và đồng bộ liên tục.",
      },
    ],
  },
  footer: {
    ctaBadge: "BẮT ĐẦU NGAY",
    ctaTitleStart: "Cung cấp cho AI ",
    ctaTitleHighlight: "ngữ cảnh còn thiếu.",
    ctaSubtitle:
      "Kết nối không gian làm việc của bạn và biến tri thức sẵn có thành ngữ cảnh mà mọi nhân viên và AI agent đều có thể sử dụng.",
    ctaButton: "Bắt đầu ngay",
    ctaButtonSecondary: "Đặt lịch demo giải pháp",
    ctaNote: "Không yêu cầu thẻ tín dụng · Kết nối nguồn dữ liệu đầu tiên trong vài phút",
    brandSummary:
      "Tầng ngữ cảnh sống kết nối tài liệu, thảo luận và mã nguồn cho đội ngũ và các AI agent.",
    columns: {
      product: {
        title: "Sản phẩm",
        howItWorks: "Quy trình hoạt động",
        whyFlae: "Tại sao chọn FLAE",
        connectors: "Kết nối",
        architecture: "Kiến trúc",
        pricing: "Bảng giá",
      },
      agents: {
        title: "Dành cho AI Agents",
        claude: "Claude Desktop MCP",
        chatgpt: "OpenAI & ChatGPT",
        copilot: "Cursor & IDEs",
        provenance: "API Nguồn gốc",
        openCore: "Open Source Agents",
      },
      security: {
        title: "Bảo mật & Tin cậy",
        rbac: "Phân quyền theo vai trò",
        sync: "Đồng bộ delta liên tục",
        enterprise: "Tiêu chuẩn Enterprise",
        privacy: "Chính sách bảo mật",
        terms: "Điều khoản dịch vụ",
      },
    },
    craftedText: "Dành riêng cho các đội ngũ AI-native",
    allRightsReserved: "FLAE Inc. Bảo lưu mọi quyền.",
  },
};
