# Kế hoạch đánh giá Retriever với LangSmith

> **Mục tiêu**: Đánh giá độ chính xác của Hybrid RAG Retriever (Vector Search + Graph RAG Beam Search) sử dụng LangSmith evaluation framework.

---

## 1. Tổng quan kiến trúc

```
┌─────────────────────────────────────────────────────────────────┐
│                     Evaluation Pipeline                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   LangSmith Dataset ──▶ RetrieverService.retrieve() ──▶ Traces │
│          │                        │                   │         │
│          │                        ▼                   ▼         │
│          │              ┌─────────────────┐    ┌──────────────┐  │
│          │              │  Hybrid RAG     │    │  LangSmith   │  │
│          │              │  - Vector Search│    │  Evaluators  │  │
│          │              │  - Beam Search  │    │  - Chunk RE   │  │
│          │              │  - Path Scoring │    │  - Path QL    │  │
│          │              │  - Chunk Ranking│    │  - LLM Judge  │  │
│          │              └─────────────────┘    └──────────────┘  │
│          │                                              │       │
│          └── Ground truth queries & expected chunks ────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Retriever Components cần đánh giá

### 2.1 Vector Search
- **Chức năng**: Tìm kiếm chunks/entities tương tự dựa trên embedding similarity
- **Input**: Query embedding
- **Output**: Top-K chunks với similarity scores
- **Đánh giá**: Precision@K, Recall@K

### 2.2 Entity Extraction (LLM)
- **Chức năng**: Trích xuất entities từ query để làm seed cho graph search
- **Input**: User query
- **Output**: List of entity names
- **Đánh giá**: Extraction accuracy vs ground truth entities

### 2.3 Beam Search (Graph Traversal)
- **Chức năng**: Duyệt knowledge graph để tìm related paths
- **Input**: Seed entities, query embedding
- **Output**: Paths (list of entity IDs)
- **Đánh giá**: Path quality, semantic relevance

### 2.4 Path Scoring
- **Chức năng**: Chấm điểm và ranking paths dựa trên nhiều yếu tố
- **Đánh giá**: Ranking quality, NDCG@K

### 2.5 Chunk Scoring & Ranking
- **Chức năng**: Kết hợp vector scores với graph recommendations
- **Đánh giá**: Final ranking quality

---

## 3. Metrics đo lường

| Metric | Mô tả | Ngưỡng đề xuất |
|--------|--------|----------------|
| **Precision@K** | % relevant items trong top K | ≥ 0.6 |
| **Recall@K** | % relevant items được retrieve trong K | ≥ 0.5 |
| **MRR** | Mean Reciprocal Rank của first relevant item | ≥ 0.5 |
| **NDCG@K** | Normalized Discounted Cumulative Gain | ≥ 0.6 |
| **Chunk Relevance Score** | LLM judge score cho chunk quality (0-1) | ≥ 0.7 |
| **Path Quality Score** | LLM judge score cho path quality (0-1) | ≥ 0.6 |

---

## 4. Cấu trúc thư mục

```
backend/tests/services/test_retriever_evaluation/
├── __init__.py
│
├── conftest.py
│   └── Fixtures: mock session, sample data, LangSmith setup
│
├── dataset_loader.py
│   └── Quản lý LangSmith Dataset (create, add examples)
│
├── evaluators/
│   ├── __init__.py
│   ├── chunk_relevance.py      # Đánh giá chunk relevance (LLM judge)
│   ├── path_quality.py         # Đánh giá path quality
│   └── llm_judge.py            # Generic LLM-as-Judge evaluator
│
├── test_retriever_langsmith.py
│   └── Main test file với @traceable decorator
│
└── run_evaluation.py
    └── Script chạy evaluation (CLI)
```

---

## 5. LangSmith Dataset Schema

### 5.1 Dataset Definition

```python
DATASET_NAME = "flae-retriever-eval-v1"
DESCRIPTION = "Evaluation dataset cho FLAE Hybrid RAG Retriever"

# Input schema
{
    "query": str  # User query string
}

# Output schema (ground truth)
{
    "relevant_chunks": Set[str],   # Chunk IDs được coi là relevant
    "relevant_entities": Set[str], # Entity IDs được coi là relevant
    "expected_topics": List[str],  # Topics mong đợi được cover
}
```

### 5.2 Sample Evaluation Queries

```python
EVALUATION_QUERIES = [
    {
        "query": "Apple được thành lập khi nào và bởi ai?",
        "relevant_chunks": {"chunk-apple-founding", "chunk-apple-history"},
        "relevant_entities": {"ent-apple", "ent-steve-jobs"},
        "expected_topics": ["Apple Inc.", "Founders"],
    },
    {
        "query": "iPhone đời đầu có gì khác biệt so với các đời sau?",
        "relevant_chunks": {"chunk-iphone-original", "chunk-iphone-evolution"},
        "relevant_entities": {"ent-iphone"},
        "expected_topics": ["iPhone History"],
    },
    {
        "query": "MacBook Pro có những tính năng gì cho developers?",
        "relevant_chunks": {"chunk-macbook-pro", "chunk-mac-dev-tools"},
        "relevant_entities": {"ent-macbook-pro", "ent-apple-silicon"},
        "expected_topics": ["MacBook Pro", "Development"],
    },
    {
        "query": "Apple Watch có thể làm được gì?",
        "relevant_chunks": {"chunk-apple-watch-features"},
        "relevant_entities": {"ent-apple-watch"},
        "expected_topics": ["Apple Watch"],
    },
    {
        "query": "iOS và Android khác nhau như thế nào?",
        "relevant_chunks": {"chunk-ios-vs-android", "chunk-ios-features"},
        "relevant_entities": {"ent-ios", "ent-android"},
        "expected_topics": ["Mobile OS", "Comparison"],
    },
    # Generic tech queries
    {
        "query": "Machine Learning là gì?",
        "relevant_chunks": {"chunk-ml-intro", "chunk-ml-types"},
        "relevant_entities": {"ent-machine-learning"},
        "expected_topics": ["ML Basics"],
    },
    {
        "query": "Cloud computing mang lại lợi ích gì?",
        "relevant_chunks": {"chunk-cloud-benefits", "chunk-cloud-services"},
        "relevant_entities": {"ent-cloud-computing"},
        "expected_topics": ["Cloud"],
    },
    {
        "query": "API là gì và tại sao nó quan trọng?",
        "relevant_chunks": {"chunk-api-explained", "chunk-api-types"},
        "relevant_entities": {"ent-api"},
        "expected_topics": ["API"],
    },
]
```

---

## 6. LangSmith Evaluators

### 6.1 Chunk Relevance Evaluator

```python
"""
Evaluator: Chunk Relevance
Mục đích: Đánh giá relevance của từng chunk được retrieve
Phương pháp: LLM-as-Judge (Gemini)
"""

# Scoring rubric:
# 1.0 = Rất liên quan, chứa thông tin trực tiếp trả lời query
# 0.7 = Liên quan, có thông tin hỗ trợ trả lời
# 0.4 = Trung bình, có một phần liên quan
# 0.1 = Ít liên quan, có vài từ khóa chung
# 0.0 = Không liên quan

# Output format:
{
    "score": float,           # 0.0 - 1.0
    "max_score_in_top5": float,
    "reason": str,
    "judgement": "PASS|BORDERLINE|FAIL",
    "chunk_scores": List[float],
}
```

### 6.2 Path Quality Evaluator

```python
"""
Evaluator: Path Quality
Mục đích: Đánh giá quality của knowledge graph paths
Phương pháp: LLM-as-Judge (Gemini)
"""

# Scoring dimensions:
# - Semantic Relevance (0-1): Paths có liên quan về ngữ nghĩa?
# - Path Coherence (0-1): Entities trong path có kết nối logic?
# - Completeness (0-1): Path có đầy đủ để trả lời query?
# - Diversity (0-1): Paths có đa dạng, không trùng lặp?

# Output format:
{
    "semantic_relevance": float,
    "path_coherence": float,
    "completeness": float,
    "diversity": float,
    "overall_score": float,  # Trung bình có trọng số
    "feedback": str,
    "improvement_suggestions": List[str],
    "judgement": "PASS|BORDERLINE|FAIL",
}
```

### 6.3 Ground Truth Evaluator (Optional)

```python
"""
Evaluator: Ground Truth Based
Mục đích: So sánh với ground truth đã có sẵn
Phương pháp: Exact match với relevant_chunks
"""

# Metrics computed:
# - Precision@K
# - Recall@K
# - MRR (Mean Reciprocal Rank)
# - NDCG@K

# Output format:
{
    "precision_at_5": float,
    "recall_at_5": float,
    "mrr": float,
    "ndcg_at_5": float,
}
```

---

## 7. Target Function (Được trace)

```python
from langsmith import traceable

@traceable(name="retriever-evaluation-target", tags=["retriever", "evaluation"])
async def retriever_target(query: str, workspace_id: str = "eval-ws") -> dict:
    """
    Target function được LangSmith trace và evaluate.
    Wrapped với @traceable decorator để capture traces.
    """
    results, diagnostics = await RetrieverService.retrieve(
        workspace_id=workspace_id,
        query=query,
        top_k_chunks=5,
        top_k_paths=5
    )

    return {
        "top_chunks": results["top_chunks"],
        "top_paths": results["top_paths"],
        "diagnostics": diagnostics,
    }
```

---

## 8. Configuration

### 8.1 Environment Variables (.env)

```bash
# LangSmith Configuration
LANGSMITH_TRACING=true
LANGSMITH_ENDPOINT=https://api.smith.langchain.com
LANGSMITH_API_KEY=your_api_key_here
LANGSMITH_PROJECT_NAME=flae-retriever-evaluation
```

### 8.2 Config additions (config.py)

```python
# Thêm vào Settings class

# LangSmith Configuration
LANGCHAIN_TRACING: bool = os.getenv('LANGCHAIN_TRACING', 'false').lower() == 'true'
LANGCHAIN_ENDPOINT: str = os.getenv('LANGCHAIN_ENDPOINT', 'https://api.smith.langchain.com')
LANGCHAIN_API_KEY: str = os.getenv('LANGCHAIN_API_KEY', '')
LANGCHAIN_PROJECT: str = os.getenv('LANGCHAIN_PROJECT', 'flae-retriever-evaluation')
```

---

## 9. Running the Evaluation

### 9.1 Setup Dataset

```bash
cd backend

# Chạy script setup dataset
python -m tests.services.test_retriever_evaluation.dataset_loader
```

### 9.2 Run Evaluation

```bash
# Chạy với pytest
pytest tests/services/test_retriever_evaluation/test_retriever_langsmith.py -v

# Hoặc dùng script
python -m tests.services.test_retriever_evaluation.run_evaluation --all
```

### 9.3 View Results

Truy cập LangSmith Dashboard: https://smith.langchain.com/

---

## 10. Expected Output trên LangSmith

```
┌─────────────────────────────────────────────────────────────────┐
│ 📊 Experiment: retriever-eval-v1                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Summary Metrics                                                │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ Evaluator           │ Mean Score │ Status                 ││
│  ├─────────────────────┼────────────┼────────────────────────┤│
│  │ Chunk Relevance     │ 0.78       │ ✅ PASS                 ││
│  │ Path Quality        │ 0.65       │ ⚠️ BORDERLINE          ││
│  │ Precision@5         │ 0.72       │ ✅ PASS                 ││
│  │ MRR                 │ 0.68       │ ✅ PASS                 ││
│  │ NDCG@5              │ 0.71       │ ✅ PASS                 ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Example Runs                                                   │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ Query: "Apple được thành lập khi nào và bởi ai?"            ││
│  │   • Retrieved: 5 chunks, 3 paths                          ││
│  │   • Chunk Relevance: 0.82                                 ││
│  │   • Path Quality: 0.75                                    ││
│  │   • First Relevant Rank: 1                                 ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Traces: https://smith.langchain.com/experiments               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11. Cấu trúc file implementation

### 11.1 conftest.py

```python
# Fixtures cho testing
- mock_workspace_session
- sample_evaluation_data
- mock_embedding
- langsmith_client
```

### 11.2 dataset_loader.py

```python
class LangSmithDatasetLoader:
    - create_dataset()
    - add_examples()
    - get_dataset()
    - list_datasets()
```

### 11.3 evaluators/chunk_relevance.py

```python
class ChunkRelevanceEvaluator:
    - __init__()  # Setup LLM (Gemini)
    - evaluate(run, example) -> dict

def create_chunk_relevance_evaluator() -> callable
```

### 11.4 evaluators/path_quality.py

```python
class PathQualityEvaluator:
    - __init__()  # Setup LLM (Gemini)
    - evaluate(run, example) -> dict

def create_path_quality_evaluator() -> callable
```

### 11.5 test_retriever_langsmith.py

```python
class TestRetrieverWithLangSmith:
    - setup_mocks()  # Fixture
    - retriever_target()  # @traceable decorated
    - test_with_sample_data()
    - test_with_langsmith_dataset()  # Requires API key
```

### 11.6 run_evaluation.py

```python
def setup_dataset()
def run_evaluation()

# CLI args: --setup-dataset, --run, --all
```

---

## 12. Next Steps (Sau khi implement)

1. **Chạy initial evaluation** với sample queries
2. **Analyze weak points** từ LangSmith dashboard
3. **Tuning hyperparameters**:
   - `RAG_SCORING_CHUNK_ALPHA` (0.0-1.0)
   - `RAG_SCORING_TEXT_CONFIRMATION_BONUS`
   - `RAG_RETRIEVAL_BEAM_WIDTH`
   - `RAG_RETRIEVAL_BFS_DEPTH`
4. **Add more evaluation queries** theo production usage
5. **A/B testing** với different retrieval strategies

---

## 13. Dependencies

```toml
# Đã có trong pyproject.toml
langsmith>=0.8.9
langchain>=1.3.4
langchain-core>=1.4.1
langchain-google-genai>=4.2.5
google-genai>=1.0.0
pytest>=9.0.3
pytest-asyncio>=1.3.0
```

---

## 14. References

- [LangSmith Evaluation Docs](https://docs.smith.langchain.com/)
- [LangSmith Evaluators](https://docs.smith.langchain.com/evaluation/evaluators)
- [RAG Evaluation Best Practices](https://docs.smith.langchain.com/evaluation/evaluating-rag-applications)
