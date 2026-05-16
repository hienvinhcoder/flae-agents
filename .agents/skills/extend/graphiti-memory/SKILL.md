---
name: graphiti-memory
description: "INVOKE THIS SKILL when your Agent needs a temporal context graph memory or knowledge base using Graphiti. Covers setup with LLMs (OpenAI, Gemini), graph backends (Neo4j, FalkorDB), ingestion of episodes, and hybrid retrieval."
---

<overview>
Graphiti là framework xây dựng temporal context graphs (đồ thị ngữ cảnh thời gian) dành cho bộ nhớ của AI Agents. Thay vì kiến thức tĩnh như GraphRAG thông thường, Graphiti theo dõi sự thay đổi của thông tin theo thời gian và giữ lại lịch sử nguồn (provenance).

**Các thành phần chính của Graphiti**:
1. **Entities (Nodes)**: Thực thể (người, sản phẩm, khái niệm) với bản tóm tắt tiến hóa theo thời gian.
2. **Facts / Relationships (Edges)**: Các mối quan hệ (Triplet: Entity -> Relationship -> Entity) gắn kèm "cửa sổ thời gian" (validity windows) biểu thị lúc sự thật bắt đầu đúng và khi nào bị thay thế.
3. **Episodes**: Dữ liệu thô (raw data/nguồn) được nạp vào. Mọi sự thật đều có thể truy xuất ngược lại Episode tạo ra nó.
</overview>

<setup-and-config>
Graphiti yêu cầu 2 thành phần cốt lõi:
1. **Graph Database Backend**: Neo4j (mặc định), FalkorDB, Kuzu, hoặc Amazon Neptune.
2. **LLM Provider**: Tốt nhất với các LLM hỗ trợ Structured Output (OpenAI, Gemini).
3. **Embedder**: Sinh vector cho hybrid search.

**Cài đặt:**
```bash
# Cài đặt lõi
uv add graphiti-core

# Cài đặt kèm backend/LLM (ví dụ: falkordb và google-genai)
uv add "graphiti-core[falkordb,google-genai]"
```
</setup-and-config>

<ex-init-graphiti-openai>
<python>
Khởi tạo Graphiti với Neo4j và OpenAI (Mặc định).
```python
from graphiti_core import Graphiti
import os

# Cần set OPENAI_API_KEY trong environment
os.environ["OPENAI_API_KEY"] = "your-api-key"

graphiti = Graphiti(
    neo4j_uri="bolt://localhost:7687",
    neo4j_user="neo4j",
    neo4j_password="password"
)
```
</python>
</ex-init-graphiti-openai>

<ex-init-graphiti-gemini-falkordb>
<python>
Khởi tạo Graphiti với FalkorDB và Google Gemini.
```python
from graphiti_core import Graphiti
from graphiti_core.driver.falkordb_driver import FalkorDriver
from graphiti_core.llm_client.gemini_client import GeminiClient, LLMConfig
from graphiti_core.embedder.gemini import GeminiEmbedder, GeminiEmbedderConfig
from graphiti_core.cross_encoder.gemini_reranker_client import GeminiRerankerClient

api_key = "your-google-api-key"

# Driver FalkorDB
driver = FalkorDriver(
    host="localhost",
    port=6379,
    database="agent_memory"
)

graphiti = Graphiti(
    graph_driver=driver,
    llm_client=GeminiClient(
        config=LLMConfig(api_key=api_key, model="gemini-2.0-flash")
    ),
    embedder=GeminiEmbedder(
        config=GeminiEmbedderConfig(api_key=api_key, embedding_model="embedding-001")
    ),
    cross_encoder=GeminiRerankerClient(
        config=LLMConfig(api_key=api_key, model="gemini-2.5-flash-lite")
    )
)
```
</python>
</ex-init-graphiti-gemini-falkordb>

<ex-ingesting-episodes>
<python>
Nạp dữ liệu (Episode) vào graph. Hệ thống sẽ tự động phân tích và cập nhật Entities & Relationships.
```python
import asyncio

async def ingest_data():
    # Thêm văn bản thuần túy
    await graphiti.add_episode(
        name="User interaction",
        episode_body="Kendra purchased Adidas Ultraboost running shoes today."
    )
    
    # Thêm dữ liệu có cấu trúc (JSON/Dict)
    await graphiti.add_episode(
        name="Purchase history",
        episode_body='{"user": "Kendra", "action": "return", "item": "Adidas Ultraboost", "reason": "too small"}'
    )

asyncio.run(ingest_data())
```
</python>
</ex-ingesting-episodes>

<ex-querying-graph>
<python>
Sử dụng Hybrid Search kết hợp Reranking để truy xuất bộ nhớ.
```python
import asyncio

async def query_memory():
    query = "What kind of shoes does Kendra like?"
    
    # Tìm kiếm Relationships liên quan
    search_results = await graphiti.search(
        query=query,
        limit=5 # Giới hạn số lượng edges trả về
    )
    
    for edge in search_results.edges:
        print(f"{edge.source_node.name} -> {edge.name} -> {edge.target_node.name}")
        print(f"Valid from: {edge.valid_from}, Valid to: {edge.valid_to}")

asyncio.run(query_memory())
```
</python>
</ex-querying-graph>

<important-guidelines>
### Lưu ý khi phát triển với Graphiti:

1. **Structured Output LLM**: LUÔN LUÔN ưu tiên sử dụng LLM hỗ trợ native structured output (OpenAI GPT-4.x/5, Gemini 1.5/2.x) cho `llm_client`. Sử dụng các model nhỏ không hỗ trợ tốt có thể gây lỗi schema.
2. **Concurrency (Rate Limits)**: Graphiti pipeline chạy song song với concurrency default là `10` để tránh lỗi 429 từ LLM provider. Có thể chỉnh biến môi trường `SEMAPHORE_LIMIT` để điều chỉnh luồng nạp dữ liệu.
3. **Database Driver**: Truyền qua tham số `graph_driver` thay vì dùng các tham số kết nối trực tiếp nếu không dùng Neo4j mặc định. Neo4j mặc định tên DB là `neo4j`, FalkorDB mặc định là `default_db`.
4. **Agent Integration**: Khi tích hợp vào MCP server, hãy tìm kiếm knowledge hiện có (search) trước khi thêm thông tin mới (add_episode) để tránh rác.
</important-guidelines>
