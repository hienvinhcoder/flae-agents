# Product Requirements Document (PRD) — FLAE

- **Trạng thái:** Draft
- **Phạm vi tài liệu:** MVP
- **Nguyên tắc traceability:** Mã `FR-xx` và `NFR-xx` trong tài liệu này là định danh ổn định. Các tài liệu kiến trúc, kế hoạch triển khai và trạng thái sau này phải tham chiếu đúng các mã này; không tái sử dụng mã đã bỏ.
- **Tài liệu kỹ thuật tham chiếu:** [TGS-RAG — Text-Graph Synergy: A Bidirectional Verification and Completion Framework for RAG](https://arxiv.org/html/2605.05643v1)

## 1. Context & Problem Statement

Các coding agent như Claude Code, Codex hoặc Antigravity có thể đọc code và thực hiện tác vụ kỹ thuật, nhưng khi được đưa vào môi trường doanh nghiệp, chúng thường không có đủ ngữ cảnh nghiệp vụ để đưa ra kết quả đúng. Ngữ cảnh cần thiết không nằm ở một nơi duy nhất mà bị phân tán giữa tài liệu nội bộ, Google Drive, Notion, Slack, HubSpot và các nguồn dữ liệu khác. Nội dung ở các nguồn này cũng thay đổi theo thời gian, nên việc sao chép thủ công vào prompt vừa tốn công, vừa dễ thiếu hoặc sử dụng dữ liệu đã cũ.

Hệ quả là agent có thể hiểu sai mục tiêu sản phẩm, bỏ sót quyết định đã được thống nhất, đề xuất thay đổi trái với quy trình nội bộ hoặc tạo ra câu trả lời có vẻ hợp lý nhưng không được chứng minh bằng dữ liệu doanh nghiệp. Nhân sự phải lặp lại việc thu thập và giải thích ngữ cảnh cho từng agent, làm giảm lợi ích của tự động hóa và khiến chất lượng đầu ra phụ thuộc vào người viết prompt.

FLAE giải quyết vấn đề này bằng cách cung cấp một nền tảng thu thập tài liệu do người dùng tải lên hoặc đồng bộ từ các hệ thống bên ngoài, sau đó xây dựng một knowledge base thống nhất. Knowledge base phải kết hợp nội dung văn bản, knowledge graph và liên kết hai chiều giữa graph với nguồn văn bản theo hướng tiếp cận TGS-RAG. Mục tiêu của liên kết này là để graph hỗ trợ chọn lại bằng chứng văn bản, đồng thời văn bản hỗ trợ xác nhận hoặc khôi phục các đường suy luận trên graph. Knowledge base sau đó được cung cấp cho agent qua MCP để agent có thể truy xuất ngữ cảnh doanh nghiệp trực tiếp thay vì yêu cầu người dùng sao chép thủ công.

MVP tập trung vào chuỗi giá trị tối thiểu: xác thực người dùng, nhận tài liệu, đồng bộ nguồn dữ liệu được chọn, xử lý tài liệu thành knowledge base và cho phép agent truy xuất knowledge base. FLAE không phải là một coding agent mới và không thay thế các hệ thống nguồn.

## 2. Đối tượng người dùng

### Persona A — Founder hoặc nhóm startup 1–2 người

- **Bối cảnh:** Một hoặc hai người đồng thời phụ trách sản phẩm, kỹ thuật và vận hành; dữ liệu nằm trong tài liệu cá nhân, Drive, Notion và Slack.
- **Hành vi:** Dùng coding agent thường xuyên, muốn kết nối dữ liệu một lần rồi tái sử dụng trong nhiều phiên làm việc; ít thời gian cấu hình và theo dõi pipeline dữ liệu.
- **Mức độ kỹ thuật:** Trung bình đến cao. Có thể cấu hình MCP theo hướng dẫn, nhưng kỳ vọng quy trình kết nối nguồn dữ liệu và xử lý lỗi rõ ràng, ít bước.
- **Ảnh hưởng đến UX:** Onboarding phải ngắn; trạng thái upload/sync phải dễ hiểu; lỗi phải có hành động tiếp theo cụ thể; thông tin MCP phải có thể sao chép và sử dụng ngay.

### Persona B — Chủ doanh nghiệp hoặc người phụ trách vận hành/sản phẩm tại SME

- **Bối cảnh:** Quản lý tài liệu và trao đổi nội bộ nhưng không nhất thiết trực tiếp viết code.
- **Hành vi:** Tải tài liệu lên, cấp quyền cho các nguồn dữ liệu và kiểm tra dữ liệu đã được đồng bộ hay chưa.
- **Mức độ kỹ thuật:** Thấp đến trung bình. Có thể sử dụng OAuth và giao diện web, nhưng không nên phải hiểu embeddings, graph traversal, worker hoặc workflow engine.
- **Ảnh hưởng đến UX:** Giao diện phải diễn đạt theo khái niệm nguồn dữ liệu, tài liệu và trạng thái; không phơi bày thuật ngữ hạ tầng nếu không phục vụ xử lý lỗi.

### Persona C — Kỹ sư hoặc người cấu hình agent cho doanh nghiệp

- **Bối cảnh:** Kết nối Claude Code, Codex, Antigravity hoặc MCP-compatible agent với knowledge base của doanh nghiệp.
- **Hành vi:** Lấy thông tin kết nối MCP, cấu hình credential, gửi truy vấn thử và kiểm tra nguồn bằng chứng trả về.
- **Mức độ kỹ thuật:** Cao.
- **Ảnh hưởng đến UX:** Cần endpoint/cấu hình rõ ràng, thông báo lỗi có thể chẩn đoán và tài liệu về cách agent truy xuất đúng knowledge base.

Mô hình tenant, số lượng knowledge base trên mỗi tài khoản và nhu cầu nhiều thành viên trong một doanh nghiệp hiện chưa được xác định. `[CẦN LÀM RÕ: OQ-01]`

## 3. Phạm vi (Scope)

| Trong phạm vi MVP | Ngoài phạm vi MVP |
|---|---|
| Xác thực người dùng bằng Firebase Authentication. | Xây dựng hoặc vận hành một coding agent thay thế Claude Code, Codex hoặc Antigravity. |
| Tạo hoặc cấp một không gian knowledge base cho người dùng/tenant. Cấu trúc tenant và số lượng knowledge base cần xác nhận. `[CẦN LÀM RÕ: OQ-01]` | Ghi ngược, chỉnh sửa hoặc xóa nội dung trực tiếp trên Google Drive, Notion, Slack, HubSpot hoặc nguồn bên ngoài. |
| Upload tài liệu từ thiết bị của người dùng và lưu file gốc trên Firebase Storage. | Các workflow nghiệp vụ như CRM automation, project management hoặc task execution không liên quan trực tiếp đến thu thập và truy xuất knowledge base. |
| Đồng bộ dữ liệu từ các connector được chốt cho MVP. Google Drive, Notion và Slack được nêu trong phạm vi MVP; HubSpot và các nguồn khác cần xác nhận. `[CẦN LÀM RÕ: OQ-04]` | Connector chưa được xác nhận thuộc tập MVP. |
| Xử lý tài liệu thành các text chunk, entity, relation, knowledge graph và liên kết provenance hai chiều giữa graph với nguồn văn bản theo TGS-RAG. | Tính năng phân tích kinh doanh, dashboard BI hoặc báo cáo quản trị ngoài các chỉ số vận hành cần thiết cho upload/sync/retrieval. |
| Theo dõi trạng thái nhập và đồng bộ tài liệu, bao gồm thành công hoặc lỗi. | Ứng dụng mobile native. |
| Cung cấp knowledge base cho agent qua MCP. Việc MCP bắt buộc phát hành ngay trong MVP cần được xác nhận. `[CẦN LÀM RÕ: OQ-08]` | Các tính năng chưa được mô tả trong input như billing, marketplace connector hoặc mô hình quyền nâng cao; chỉ đưa vào scope sau khi có yêu cầu riêng. |
| Web frontend bằng React và Tailwind CSS, dùng màu chủ đạo `#F97316` và phong cách Glassmorphism. | |
| Backend FastAPI, quản lý package bằng `uv`, workflow bằng Temporal, PostgreSQL, Docker, LangChain, LangGraph, LangSmith, Terraform và GitHub Actions; deploy backend lên Google Cloud Run; frontend deploy lên Firebase Hosting hoặc Google Cloud Run. | |

## 4. Functional Requirements (FR)

| Mã | Yêu cầu chức năng có thể quan sát |
|---|---|
| **FR-01** | Khi người dùng thực hiện đăng nhập bằng phương thức được hỗ trợ, hệ thống phải xác thực qua Firebase Authentication, tạo phiên hợp lệ và chỉ cho phép truy cập dữ liệu thuộc phạm vi được cấp. Các phương thức đăng nhập cụ thể cần được xác nhận. `[CẦN LÀM RÕ: OQ-02]` |
| **FR-02** | Khi người dùng đăng xuất hoặc token Firebase không còn hợp lệ, hệ thống phải kết thúc quyền truy cập và từ chối các request cần xác thực. |
| **FR-03** | Sau khi người dùng được xác thực lần đầu, hệ thống phải tạo hoặc liên kết họ với phạm vi knowledge base tương ứng và hiển thị knowledge base mà họ được phép sử dụng. Quy tắc một hay nhiều knowledge base và mô hình user/workspace/organization cần được xác nhận. `[CẦN LÀM RÕ: OQ-01]` |
| **FR-04** | Khi người dùng chọn một file hợp lệ để upload, hệ thống phải lưu file gốc vào Firebase Storage, tạo bản ghi tài liệu và trả về trạng thái đã tiếp nhận hoặc lỗi có lý do. Định dạng file và dung lượng tối đa cần được xác nhận. `[CẦN LÀM RÕ: OQ-03]` |
| **FR-05** | Khi một tài liệu đã được tiếp nhận, hệ thống phải khởi chạy workflow xử lý bằng Temporal và cập nhật trạng thái tài liệu theo tối thiểu các trạng thái: đang chờ, đang xử lý, hoàn tất hoặc thất bại. |
| **FR-06** | Khi workflow xử lý hoàn tất, hệ thống phải tạo dữ liệu knowledge base gồm nội dung văn bản đã chia đoạn, entity, relation, knowledge graph và liên kết hai chiều từ thành phần graph đến đoạn văn bản/tài liệu nguồn và ngược lại. |
| **FR-07** | Khi workflow xử lý thất bại, hệ thống phải giữ lại trạng thái thất bại và thông tin lỗi đủ để người dùng hoặc đội vận hành biết tài liệu nào chưa được đưa vào knowledge base; chính sách retry tự động cần tuân theo `NFR-07`. |
| **FR-08** | Khi người dùng mở danh sách nguồn/tài liệu, hệ thống phải hiển thị tối thiểu tên nguồn, loại nguồn, trạng thái xử lý hoặc đồng bộ, thời điểm cập nhật gần nhất và lỗi gần nhất nếu có. |
| **FR-09** | Khi người dùng kết nối Google Drive và hoàn tất luồng cấp quyền, hệ thống phải lưu kết nối cho đúng tenant và cho phép nhập dữ liệu trong phạm vi đã được người dùng cấp. Phạm vi chọn file/thư mục/toàn bộ Drive cần được xác nhận. `[CẦN LÀM RÕ: OQ-05]` |
| **FR-10** | Khi người dùng kết nối Notion và hoàn tất luồng cấp quyền, hệ thống phải lưu kết nối cho đúng tenant và cho phép nhập các page/database nằm trong phạm vi được cấp. Phạm vi nội dung được chọn cần được xác nhận. `[CẦN LÀM RÕ: OQ-05]` |
| **FR-11** | Khi người dùng kết nối Slack và hoàn tất luồng cấp quyền, hệ thống phải lưu kết nối cho đúng tenant và cho phép nhập nội dung nằm trong phạm vi được cấp. Loại channel, thread, file, lịch sử và nội dung private/DM được phép đồng bộ cần được xác nhận. `[CẦN LÀM RÕ: OQ-05]` |
| **FR-12** | Khi một connector được yêu cầu đồng bộ, hệ thống phải lấy dữ liệu mới hoặc đã thay đổi trong phạm vi được cấp, tạo/cập nhật bản ghi tài liệu tương ứng và đưa các tài liệu bị thay đổi vào workflow xử lý knowledge base. Cơ chế kích hoạt thủ công, định kỳ hoặc event-based và tần suất đồng bộ cần được xác nhận. `[CẦN LÀM RÕ: OQ-06]` |
| **FR-13** | Khi cùng một tài liệu nguồn được đồng bộ lại, hệ thống phải nhận diện tài liệu theo định danh của nguồn và cập nhật phiên bản tương ứng thay vì tạo bản sao không kiểm soát. Quy tắc giữ phiên bản cũ và xử lý tài liệu bị xóa ở nguồn cần được xác nhận. `[CẦN LÀM RÕ: OQ-07]` |
| **FR-14** | Khi agent gửi truy vấn hợp lệ qua MCP, hệ thống phải truy xuất đồng thời bằng chứng văn bản và đường liên kết graph, áp dụng cơ chế phối hợp hai chiều theo TGS-RAG và trả về context đã hợp nhất cho agent. |
| **FR-15** | Khi trả context qua MCP, hệ thống phải kèm định danh nguồn/provenance đủ để agent hoặc người dùng xác định tài liệu và đoạn nội dung đã hỗ trợ kết quả. Schema response và mức chi tiết provenance cần được xác nhận. `[CẦN LÀM RÕ: OQ-09]` |
| **FR-16** | Khi người dùng cần kết nối agent, hệ thống phải cung cấp thông tin cấu hình MCP cần thiết cho đúng knowledge base và từ chối truy vấn dùng credential không hợp lệ hoặc không thuộc tenant. Transport MCP, cơ chế cấp/thu hồi credential và việc MCP thuộc release MVP cần được xác nhận. `[CẦN LÀM RÕ: OQ-08]` |
| **FR-17** | Khi hệ thống xử lý knowledge base hoặc truy vấn MCP, các bước orchestration LLM/retrieval phải sử dụng LangChain/LangGraph theo ràng buộc kỹ thuật và ghi trace phù hợp vào LangSmith theo chính sách dữ liệu của `NFR-13`. Model LLM và embedding cụ thể chưa được chọn. `[CẦN LÀM RÕ: OQ-10]` |

## 5. Non-Functional Requirements (NFR)

| Mã | Yêu cầu phi chức năng và tiêu chí nghiệm thu |
|---|---|
| **NFR-01** | **Hiệu năng API tương tác:** Với request không bao gồm thời gian chạy ingestion hoặc LLM dài, độ trễ phải được đo ở p95 và không vượt quá ngưỡng `[CẦN LÀM RÕ: OQ-11 — số giây]` trong điều kiện tải chuẩn `[CẦN LÀM RÕ: OQ-11 — số request đồng thời]`. |
| **NFR-02** | **Hiệu năng upload:** Với file có dung lượng tối đa theo `OQ-03`, hệ thống phải xác nhận đã tiếp nhận upload trong p95 không quá `[CẦN LÀM RÕ: OQ-11 — số giây, không tính thời gian truyền file phía client]`. |
| **NFR-03** | **Hiệu năng ingestion:** Từ thời điểm file được tiếp nhận thành công đến khi trạng thái knowledge base là hoàn tất, p95 phải không quá `[CẦN LÀM RÕ: OQ-11 — số phút]` cho tài liệu chuẩn `[CẦN LÀM RÕ: OQ-11 — số trang hoặc số token]`. |
| **NFR-04** | **Hiệu năng truy vấn MCP:** Với knowledge base ở quy mô chuẩn `[CẦN LÀM RÕ: OQ-11 — số tài liệu/chunk/entity]`, thời gian từ khi nhận truy vấn đến khi trả context phải có p95 không quá `[CẦN LÀM RÕ: OQ-11 — số giây]`, tách riêng thời gian retrieval và thời gian model nếu có. |
| **NFR-05** | **Khả năng mở rộng:** Backend trên Cloud Run và worker/workflow liên quan phải có khả năng scale ngang để phục vụ ít nhất `[CẦN LÀM RÕ: OQ-11 — số tenant, số workflow đồng thời và số truy vấn MCP đồng thời]` mà vẫn đáp ứng `NFR-01` đến `NFR-04`. Không được phụ thuộc vào state chỉ tồn tại trong một container. |
| **NFR-06** | **Độ sẵn sàng:** API và MCP production phải đạt uptime hàng tháng tối thiểu `[CẦN LÀM RÕ: OQ-12 — phần trăm]`, không tính thời gian bảo trì đã thông báo. Cách đo uptime phải dựa trên health check từ bên ngoài hệ thống. |
| **NFR-07** | **Độ tin cậy workflow:** Mọi ingestion/sync job phải có định danh idempotency, không được tạo dữ liệu trùng khi Temporal retry. Lỗi tạm thời phải được retry tối đa `[CẦN LÀM RÕ: OQ-12 — số lần và backoff]`; sau khi hết retry, job phải chuyển sang trạng thái thất bại có thể quan sát theo `FR-07`. |
| **NFR-08** | **Khôi phục dữ liệu:** PostgreSQL và metadata cần thiết để tái lập knowledge base phải có RPO không lớn hơn `[CẦN LÀM RÕ: OQ-12 — thời gian]` và RTO không lớn hơn `[CẦN LÀM RÕ: OQ-12 — thời gian]`. Chính sách backup/restore phải được kiểm thử định kỳ `[CẦN LÀM RÕ: OQ-12 — tần suất]`. |
| **NFR-09** | **Xác thực tối thiểu:** Backend phải xác minh Firebase ID token ở server cho mọi API/MCP operation cần bảo vệ; token hết hạn, sai chữ ký hoặc sai audience/project phải bị từ chối. Không được tin cậy user/tenant ID do client tự khai báo nếu chưa đối chiếu với token hoặc mapping server-side. |
| **NFR-10** | **Cô lập dữ liệu:** Mọi file, bản ghi PostgreSQL, workflow, trace và kết quả retrieval phải được scope theo tenant/knowledge base. Một người dùng không được đọc, sửa, đồng bộ hoặc truy vấn dữ liệu của tenant khác, kể cả khi biết định danh tài nguyên. Mô hình tenant cụ thể phụ thuộc `OQ-01`. |
| **NFR-11** | **Mã hóa:** Mọi kết nối qua mạng phải dùng TLS 1.2 trở lên. Dữ liệu lưu tại Firebase Storage, PostgreSQL và dịch vụ GCP phải dùng mã hóa at-rest của dịch vụ được quản lý; nếu có yêu cầu khóa mã hóa do khách hàng quản lý thì cần quyết định riêng. `[CẦN LÀM RÕ: OQ-13]` |
| **NFR-12** | **Quyền connector và bí mật:** OAuth scope phải theo nguyên tắc least privilege. Access token, refresh token, MCP credential và secret triển khai không được commit vào Git, nhúng trong image hoặc ghi nguyên văn vào log; phải lưu bằng cơ chế quản lý secret được phê duyệt. Cơ chế lưu và thu hồi token cần được xác nhận. `[CẦN LÀM RÕ: OQ-14]` |
| **NFR-13** | **Logging và observability:** API, Temporal workflow, connector sync và MCP request phải có structured log, correlation ID, metric lỗi/độ trễ và trace cần thiết. LangSmith được dùng cho trace LangChain/LangGraph, nhưng dữ liệu nhạy cảm không được gửi sang trace/log ngoài phạm vi cho phép; quy tắc masking, sampling và retention cần được xác nhận. `[CẦN LÀM RÕ: OQ-15]` |
| **NFR-14** | **CI/CD và hạ tầng:** Docker image, tài nguyên cloud và cấu hình deploy phải được quản lý bằng Docker/Terraform/GitHub Actions theo input. Pipeline tối thiểu phải chạy kiểm tra chất lượng, test và build trước deploy; deploy production thất bại phải có đường rollback. Môi trường dev/staging/prod và approval production cần được xác nhận. `[CẦN LÀM RÕ: OQ-16]` |
| **NFR-15** | **Ràng buộc backend:** Backend phải dùng FastAPI; dependency được quản lý bằng `uv`; orchestration dài hạn dùng Temporal; dữ liệu ứng dụng dùng PostgreSQL; tích hợp LLM/retrieval dùng LangChain, LangGraph và LangSmith; backend production deploy lên Google Cloud Run. |
| **NFR-16** | **Ràng buộc frontend:** Frontend phải dùng React và Tailwind CSS. Thiết kế phải dùng `#F97316` làm màu chủ đạo và phong cách Glassmorphism; nội dung, trạng thái và lỗi phải giữ độ tương phản có thể đọc được trên các lớp kính. Nền tảng deploy cuối cùng giữa Firebase Hosting và Google Cloud Run cần được chốt. `[CẦN LÀM RÕ: OQ-17]` |
| **NFR-17** | **Hạ tầng tái lập:** Một môi trường mới phải có thể được tạo từ Terraform và cấu hình được quản lý trong repo, ngoại trừ secret. Thay đổi hạ tầng production phải đi qua GitHub Actions hoặc quy trình review tương đương, không phụ thuộc vào cấu hình thủ công không được ghi nhận. |

## 6. Success Metrics

| Mã | Chỉ số | Cách đo | Mục tiêu MVP |
|---|---|---|---|
| **SM-01** | Tỷ lệ hoàn tất onboarding cốt lõi | Số người dùng đăng nhập thành công, có knowledge base và đưa ít nhất một tài liệu vào trạng thái hoàn tất / số người bắt đầu onboarding | `[CẦN LÀM RÕ: OQ-18 — % mục tiêu và cửa sổ thời gian]` |
| **SM-02** | Thời gian đến tài liệu đầu tiên sẵn sàng | p50 và p95 từ lúc đăng nhập lần đầu đến khi tài liệu đầu tiên ở trạng thái hoàn tất | `[CẦN LÀM RÕ: OQ-18 — số phút]` |
| **SM-03** | Tỷ lệ ingestion thành công | Số tài liệu hợp lệ hoàn tất xử lý / tổng số tài liệu hợp lệ được tiếp nhận, đo theo tuần và theo loại nguồn | `[CẦN LÀM RÕ: OQ-18 — % mục tiêu]` |
| **SM-04** | Tỷ lệ sync connector thành công | Số lần sync hoàn tất không lỗi / tổng số lần sync đã chạy, tách theo Google Drive, Notion, Slack và connector khác nếu có | `[CẦN LÀM RÕ: OQ-18 — % mục tiêu]` |
| **SM-05** | Tỷ lệ kết nối MCP thành công | Số tenant cấu hình agent và hoàn tất một truy vấn MCP hợp lệ / số tenant bắt đầu cấu hình MCP | `[CẦN LÀM RÕ: OQ-18 — % mục tiêu]` |
| **SM-06** | Chất lượng retrieval có provenance | Trên bộ câu hỏi đánh giá đại diện cho dữ liệu doanh nghiệp, đo tỷ lệ truy vấn trả về đủ tài liệu hỗ trợ, precision/recall của bằng chứng và tỷ lệ response có provenance hợp lệ | `[CẦN LÀM RÕ: OQ-18 — bộ benchmark và ngưỡng cho từng metric]` |
| **SM-07** | Độ đúng của context cung cấp cho agent | Tỷ lệ truy vấn benchmark mà context chứa thông tin cần thiết để trả lời đúng, được đánh giá bằng ground truth hoặc review của con người; không đánh đồng với chất lượng model sinh câu trả lời | `[CẦN LÀM RÕ: OQ-18 — % mục tiêu]` |
| **SM-08** | Độ ổn định production | Uptime API/MCP, error rate của request và tỷ lệ workflow thất bại sau retry | Các ngưỡng phải khớp `NFR-06`, `NFR-07` và `[CẦN LÀM RÕ: OQ-12/OQ-18]` |

## 7. Open Questions

1. **OQ-01 — Tenant và knowledge base:** Một tài khoản tương ứng một knowledge base hay có thể có nhiều knowledge base? Doanh nghiệp có nhiều thành viên không? Có cần workspace/organization và phân quyền thành viên trong MVP không?
2. **OQ-02 — Phương thức đăng nhập:** Firebase Authentication cần hỗ trợ email/password, Google Sign-In, magic link hay tổ hợp nào trong MVP?
3. **OQ-03 — File upload:** MVP hỗ trợ định dạng nào (ví dụ PDF, DOCX, TXT, Markdown, CSV) và dung lượng/số trang/số token tối đa cho mỗi file là bao nhiêu?
4. **OQ-04 — Danh sách connector MVP:** Google Drive, Notion và Slack có đều bắt buộc ở release đầu không? HubSpot có thuộc MVP không? Cụm “...” còn bao gồm nền tảng nào?
5. **OQ-05 — Phạm vi dữ liệu connector:** Người dùng chọn từng file/folder/page/channel hay đồng bộ toàn bộ phạm vi được cấp? Slack có cho phép private channel, DM, thread và file đính kèm không?
6. **OQ-06 — Cơ chế sync:** Sync chỉ chạy thủ công, chạy định kỳ hay event-based/webhook? Nếu định kỳ, tần suất tối thiểu là bao nhiêu? Webhook automation hiện chưa được mô tả trong input.
7. **OQ-07 — Phiên bản, xóa và retention:** Khi tài liệu nguồn thay đổi hoặc bị xóa, FLAE cập nhật/xóa knowledge graph như thế nào? Có giữ phiên bản cũ không, trong bao lâu, và người dùng có quyền xóa dữ liệu khỏi FLAE không?
8. **OQ-08 — MCP:** MCP có phải điều kiện bắt buộc để hoàn thành MVP không? Dùng transport nào, cơ chế credential nào, credential được cấp theo user hay knowledge base, và cách thu hồi ra sao?
9. **OQ-09 — MCP response/provenance:** Schema context trả cho agent gồm những trường nào? Có bắt buộc URL/tên tài liệu/chunk ID/đường graph/độ tin cậy hay không?
10. **OQ-10 — Model:** Dùng nhà cung cấp/model LLM và embedding nào cho entity extraction, relation extraction, embedding và retrieval? Có yêu cầu cho phép thay model hoặc giới hạn chi phí không?
11. **OQ-11 — Performance và scale:** Chốt ngưỡng p95 cho API, upload acknowledgment, ingestion và MCP retrieval; đồng thời chốt kích thước tài liệu chuẩn, số tài liệu/chunk/entity mỗi knowledge base, số tenant và số request/workflow đồng thời.
12. **OQ-12 — Reliability:** Chốt uptime tháng, retry policy, RPO, RTO và tần suất kiểm thử restore.
13. **OQ-13 — Data residency/encryption:** Dữ liệu phải đặt ở GCP region nào? Có yêu cầu customer-managed encryption key hoặc hạn chế chuyển dữ liệu ra ngoài region không?
14. **OQ-14 — Secret và OAuth token:** Cơ chế quản lý secret nào được phê duyệt; connector token được mã hóa, rotate và revoke theo chính sách nào?
15. **OQ-15 — Observability data:** Nội dung tài liệu/prompt có được gửi vào LangSmith không? Cần masking trường nào, sampling bao nhiêu và retention log/trace bao lâu?
16. **OQ-16 — Môi trường và release:** MVP cần những môi trường nào (dev/staging/prod), ai phê duyệt production deploy và chiến lược rollback cụ thể là gì?
17. **OQ-17 — Frontend hosting:** Chọn Firebase Hosting hay Google Cloud Run cho frontend production?
18. **OQ-18 — Success targets:** Chốt ngưỡng mục tiêu cho onboarding, time-to-first-document, ingestion/sync success, MCP activation, retrieval benchmark, context correctness và error rate.
