import os
import json
from typing import List, Dict, Any, Optional
import urllib.parse
from contextlib import asynccontextmanager

import numpy as np
import pandas as pd
import psycopg2
import psycopg2.extras
from psycopg2.extensions import register_adapter, AsIs
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.config import settings
from app.core.logger import get_logger

logger = get_logger(__name__)

# Đăng ký bộ chuyển đổi mảng numpy để tương thích với pgvector
def adapt_numpy_float64(numpy_float64):
    return AsIs(numpy_float64)

def adapt_numpy_int64(numpy_int64):
    return AsIs(numpy_int64)

def adapt_numpy_float32(numpy_float32):
    return AsIs(numpy_float32)

def adapt_numpy_array(numpy_array):
    return AsIs(str(numpy_array.tolist()))

register_adapter(np.float64, adapt_numpy_float64)
register_adapter(np.int64, adapt_numpy_int64)
register_adapter(np.float32, adapt_numpy_float32)
register_adapter(np.ndarray, adapt_numpy_array)


class DBManager:
    """
    Manager class quản lý kết nối và các thao tác trên RAG Database (flae_knowledge_db / rag_db).
    
    Hỗ trợ:
    - Các thao tác đồng bộ sử dụng Pandas DataFrame và psycopg2 (phục vụ offline ingestion pipeline).
    - Các thao tác bất đồng bộ (async) qua SQLAlchemy AsyncSession phục vụ API của FastAPI.
    - Cơ chế cô lập dữ liệu Row-Level Security (RLS) theo workspace_id.
    - Cơ chế phân vùng bảng (Partition Table) theo workspace_id.
    """
    def __init__(self, db_url: Optional[str] = None, embedding_dimensions: Optional[int] = None, schema: str = "public"):
        # Sử dụng URL truyền vào hoặc mặc định lấy từ settings
        self.async_db_url = db_url or settings.RAG_DATABASE_URL
        self.embedding_dimensions = embedding_dimensions or settings.EMBEDDING_DIMENSIONS
        self.schema = schema.lower().replace("-", "_")

        # Phân tích URL để kết nối thông qua psycopg2 (đồng bộ)
        parsed_url = make_url(self.async_db_url)
        self.user = parsed_url.username or "postgres"
        self.password = parsed_url.password or "postgres"
        self.host = parsed_url.query.get("host") or parsed_url.host or "localhost"
        self.port = parsed_url.port or 5432
        self.dbname = parsed_url.database or "rag_db"

        # Tự động chuyển đổi sang driver psycopg2 cho connection đồng bộ
        if "+asyncpg" in self.async_db_url:
            self.sync_db_url = self.async_db_url.replace("+asyncpg", "+psycopg2")
        elif "postgresql://" in self.async_db_url:
            self.sync_db_url = self.async_db_url.replace("postgresql://", "postgresql+psycopg2://")
        else:
            self.sync_db_url = self.async_db_url

        # Tạo engine và session factory
        self.sync_engine = create_engine(self.sync_db_url)
        self.async_engine = create_async_engine(self.async_db_url, echo=False)
        self.async_session_factory = async_sessionmaker(
            bind=self.async_engine, class_=AsyncSession, expire_on_commit=False
        )

        self._initialized = False

    def initialize(self):
        """Khởi tạo database RAG (chạy DDL). Chỉ thực hiện một lần."""
        if self._initialized:
            return
        self._init_db()
        self._initialized = True


    def get_conn(self):
        """Khởi tạo và trả về một connection đồng bộ dùng psycopg2."""
        decoded_password = urllib.parse.unquote(self.password)
        return psycopg2.connect(
            dbname=self.dbname,
            user=self.user,
            password=decoded_password,
            host=self.host,
            port=self.port
        )

    def _init_db(self):
        """Khởi tạo database, schema, các bảng cha (parent partition tables) và chính sách RLS."""
        conn = self.get_conn()
        conn.autocommit = True
        cur = conn.cursor()

        try:
            # 1. Tạo extension pgvector
            cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
            
            # 2. Tạo schema
            if self.schema != "public":
                cur.execute(f"CREATE SCHEMA IF NOT EXISTS {self.schema};")

            # 3. Tạo bảng chunks cha (Partitioned Table)
            cur.execute(
                f"""
                CREATE TABLE IF NOT EXISTS {self.schema}.chunks (
                    workspace_id TEXT NOT NULL,
                    chunk_id TEXT NOT NULL,
                    text TEXT,
                    token_count INT,
                    embedding vector({self.embedding_dimensions}),
                    source_document_id TEXT,
                    entity_ids JSONB,
                    relation_ids JSONB,
                    PRIMARY KEY (workspace_id, chunk_id)
                ) PARTITION BY LIST (workspace_id);
                """
            )

            # 4. Tạo bảng entities cha (Partitioned Table)
            cur.execute(
                f"""
                CREATE TABLE IF NOT EXISTS {self.schema}.entities (
                    workspace_id TEXT NOT NULL,
                    entity_id TEXT NOT NULL,
                    entity_name TEXT,
                    entity_type TEXT,
                    description TEXT,
                    source_chunk_ids JSONB,
                    chunk_descriptions JSONB,
                    degree INT,
                    frequency INT,
                    embedding vector({self.embedding_dimensions}),
                    PRIMARY KEY (workspace_id, entity_id)
                ) PARTITION BY LIST (workspace_id);
                """
            )

            # 5. Tạo bảng relationships cha (Partitioned Table)
            cur.execute(
                f"""
                CREATE TABLE IF NOT EXISTS {self.schema}.relationships (
                    workspace_id TEXT NOT NULL,
                    relation_id TEXT NOT NULL,
                    source_id TEXT,
                    source_name TEXT,
                    target_id TEXT,
                    target_name TEXT,
                    keywords TEXT,
                    description TEXT,
                    source_chunk_ids JSONB,
                    chunk_meta JSONB,
                    frequency INT,
                    degree INT,
                    embedding vector({self.embedding_dimensions}),
                    PRIMARY KEY (workspace_id, relation_id)
                ) PARTITION BY LIST (workspace_id);
                """
            )

            # Đảm bảo các cột mới tồn tại cho các DB cũ chưa drop
            cur.execute(f"ALTER TABLE {self.schema}.entities ADD COLUMN IF NOT EXISTS chunk_descriptions JSONB;")
            cur.execute(f"ALTER TABLE {self.schema}.relationships ADD COLUMN IF NOT EXISTS chunk_meta JSONB;")

            # 6. Kích hoạt Row Level Security (RLS) trên các bảng chính
            cur.execute(f"ALTER TABLE {self.schema}.chunks ENABLE ROW LEVEL SECURITY;")
            cur.execute(f"ALTER TABLE {self.schema}.entities ENABLE ROW LEVEL SECURITY;")
            cur.execute(f"ALTER TABLE {self.schema}.relationships ENABLE ROW LEVEL SECURITY;")

            # 7. Tạo RLS policies (Kiểm tra sự tồn tại của policy trước khi tạo bằng PL/pgSQL)
            for table_name in ["chunks", "entities", "relationships"]:
                policy_name = f"{table_name}_workspace_isolation_policy"
                cur.execute(f"""
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM pg_policies 
                            WHERE schemaname = '{self.schema}' 
                              AND tablename = '{table_name}' 
                              AND policyname = '{policy_name}'
                        ) THEN
                            CREATE POLICY {policy_name} ON {self.schema}.{table_name}
                            USING (workspace_id = current_setting('app.current_workspace_id', true));
                        END IF;
                    END
                    $$;
                """)

            logger.info(f"✅ Đã khởi tạo schema '{self.schema}' cho RAG database với RLS & Partitioning.")
        except Exception as e:
            logger.error(f"❌ Lỗi khi khởi tạo database RAG: {e}")
            raise e
        finally:
            cur.close()
            conn.close()

    def _ensure_partition(self, cur, workspace_id: str) -> str:
        """
        Đảm bảo bảng partition cho workspace_id đã được tạo.
        Trả về hậu tố an toàn của tên bảng (workspace_safe).
        """
        # Chuẩn hóa workspace_id để chỉ chứa ký tự chữ và số và dấu gạch dưới
        workspace_safe = "".join([c if c.isalnum() else "_" for c in workspace_id]).lower()
        
        # Tạo bảng partition con cho chunks, entities, relationships
        cur.execute(f"""
            CREATE TABLE IF NOT EXISTS {self.schema}.chunks_{workspace_safe} 
            PARTITION OF {self.schema}.chunks FOR VALUES IN ('{workspace_id}');
        """)
        cur.execute(f"""
            CREATE TABLE IF NOT EXISTS {self.schema}.entities_{workspace_safe} 
            PARTITION OF {self.schema}.entities FOR VALUES IN ('{workspace_id}');
        """)
        cur.execute(f"""
            CREATE TABLE IF NOT EXISTS {self.schema}.relationships_{workspace_safe} 
            PARTITION OF {self.schema}.relationships FOR VALUES IN ('{workspace_id}');
        """)
        return workspace_safe

    def load_df(self, table_name: str, workspace_id: str) -> pd.DataFrame:
        """
        Tải dữ liệu từ một bảng cho một workspace cụ thể dưới dạng Pandas DataFrame.
        Áp dụng Row-Level Security (RLS) để cô lập dữ liệu.
        """
        self.initialize()
        conn = self.get_conn()
        try:
            # Thiết lập session workspace context cho RLS trên connection này
            cur = conn.cursor()
            cur.execute("SET app.current_workspace_id = %s;", (workspace_id,))
            cur.close()

            # Sử dụng connection đã cài đặt RLS context để đọc dữ liệu
            query = f"SELECT * FROM {self.schema}.{table_name}"
            df = pd.read_sql(query, conn)

            vector_cols = ["embedding"]
            json_cols = ["source_chunk_ids", "entity_ids", "relation_ids", "chunk_descriptions", "chunk_meta"]

            def parse_vector(x: Any) -> Optional[np.ndarray]:
                if isinstance(x, str):
                    return np.array(json.loads(x))
                elif x is not None:
                    return np.array(x)
                return None

            def parse_json(x: Any) -> Any:
                if isinstance(x, (list, dict)):
                    return x
                elif isinstance(x, str):
                    return json.loads(x)
                return None

            for col in df.columns:
                if col in vector_cols:
                    df[col] = pd.Series([parse_vector(x) for x in df[col]], dtype=object)
                elif col in json_cols:
                    df[col] = pd.Series([parse_json(x) for x in df[col]], dtype=object)

            return df
        except Exception as e:
            logger.warning(f"⚠️ Lỗi khi tải bảng {table_name} cho workspace {workspace_id}: {e}")
            return pd.DataFrame()
        finally:
            conn.close()

    def save_df(self, df: pd.DataFrame, table_name: str, pk_col: str, workspace_id: str, overwrite: bool = False):
        """
        Lưu DataFrame vào cơ sở dữ liệu.
        Đảm bảo partition tồn tại, thiết lập RLS session context và thực hiện UPSERT.
        """
        if df.empty:
            return

        self.initialize()
        conn = self.get_conn()
        cur = conn.cursor()

        try:
            # 1. Thiết lập RLS context cho transaction hiện tại
            cur.execute("SET LOCAL app.current_workspace_id = %s;", (workspace_id,))
            
            # 2. Đảm bảo bảng partition con của workspace này tồn tại
            self._ensure_partition(cur, workspace_id)

            df_to_save = df.copy()
            
            # Gán cột định danh workspace_id
            df_to_save["workspace_id"] = workspace_id

            def robust_json_dumps(x):
                if isinstance(x, np.ndarray):
                    return json.dumps(x.tolist())
                return json.dumps(x)

            def to_list(x: Any) -> Any:
                if isinstance(x, np.ndarray):
                    return x.tolist()
                return x

            for col in df_to_save.columns:
                if col == "embedding":
                    def to_vector_str(x):
                        if x is None or (isinstance(x, float) and pd.isna(x)):
                            return None
                        if isinstance(x, np.ndarray):
                            return json.dumps(x.tolist())
                        if isinstance(x, list):
                            return json.dumps(x)
                        return str(x)
                    df_to_save[col] = df_to_save[col].apply(to_vector_str)
                elif col in ["source_chunk_ids", "entity_ids", "relation_ids", "chunk_descriptions", "chunk_meta"]:
                    def to_json_str(x):
                        if x is None or (isinstance(x, float) and pd.isna(x)):
                            return None
                        return robust_json_dumps(x)
                    df_to_save[col] = df_to_save[col].apply(to_json_str)

            columns = list(df_to_save.columns)

            def safe_sql_val(x):
                if isinstance(x, (list, tuple, dict, np.ndarray)):
                    return x
                if pd.isna(x):
                    return None
                return x

            values = [tuple(safe_sql_val(x) for x in row) for row in df_to_save.to_numpy()]

            cols_str = ", ".join(columns)
            
            # Khóa chính của bảng partition là (workspace_id, pk_col)
            # Cần chỉ định đầy đủ trong ON CONFLICT
            if not overwrite and table_name == "entities":
                update_sets = []
                for col in columns:
                    if col in [pk_col, "workspace_id"]:
                        continue
                    if col == "description":
                        update_sets.append(
                            f"description = CASE WHEN length(COALESCE(EXCLUDED.description, '')) > length(COALESCE({table_name}.description, '')) THEN EXCLUDED.description ELSE COALESCE({table_name}.description, EXCLUDED.description) END"
                        )
                    elif col == "source_chunk_ids":
                        update_sets.append(
                            f"source_chunk_ids = (SELECT COALESCE(jsonb_agg(DISTINCT elem), '[]'::jsonb) FROM (SELECT jsonb_array_elements(COALESCE({table_name}.source_chunk_ids, '[]'::jsonb)) AS elem UNION SELECT jsonb_array_elements(COALESCE(EXCLUDED.source_chunk_ids, '[]'::jsonb)) AS elem) sub)"
                        )
                    elif col == "chunk_descriptions":
                        update_sets.append(
                            f"chunk_descriptions = COALESCE({table_name}.chunk_descriptions, '{{}}'::jsonb) || COALESCE(EXCLUDED.chunk_descriptions, '{{}}'::jsonb)"
                        )
                    elif col == "frequency":
                        update_sets.append(
                            f"frequency = COALESCE({table_name}.frequency, 0) + COALESCE(EXCLUDED.frequency, 0)"
                        )
                    else:
                        update_sets.append(f"{col} = EXCLUDED.{col}")
            elif not overwrite and table_name == "relationships":
                update_sets = []
                for col in columns:
                    if col in [pk_col, "workspace_id"]:
                        continue
                    if col == "description":
                        update_sets.append(
                            f"description = CASE WHEN COALESCE({table_name}.description, '') = '' THEN EXCLUDED.description WHEN COALESCE(EXCLUDED.description, '') = '' THEN {table_name}.description WHEN {table_name}.description LIKE '%%' || EXCLUDED.description || '%%' THEN {table_name}.description ELSE {table_name}.description || ' | ' || EXCLUDED.description END"
                        )
                    elif col == "keywords":
                        update_sets.append(
                            f"keywords = CASE WHEN COALESCE({table_name}.keywords, '') = '' THEN EXCLUDED.keywords WHEN COALESCE(EXCLUDED.keywords, '') = '' THEN {table_name}.keywords WHEN {table_name}.keywords LIKE '%%' || EXCLUDED.keywords || '%%' THEN {table_name}.keywords ELSE {table_name}.keywords || ', ' || EXCLUDED.keywords END"
                        )
                    elif col == "source_chunk_ids":
                        update_sets.append(
                            f"source_chunk_ids = (SELECT COALESCE(jsonb_agg(DISTINCT elem), '[]'::jsonb) FROM (SELECT jsonb_array_elements(COALESCE({table_name}.source_chunk_ids, '[]'::jsonb)) AS elem UNION SELECT jsonb_array_elements(COALESCE(EXCLUDED.source_chunk_ids, '[]'::jsonb)) AS elem) sub)"
                        )
                    elif col == "chunk_meta":
                        update_sets.append(
                            f"chunk_meta = COALESCE({table_name}.chunk_meta, '{{}}'::jsonb) || COALESCE(EXCLUDED.chunk_meta, '{{}}'::jsonb)"
                        )
                    elif col == "frequency":
                        update_sets.append(
                            f"frequency = COALESCE({table_name}.frequency, 0) + COALESCE(EXCLUDED.frequency, 0)"
                        )
                    else:
                        update_sets.append(f"{col} = EXCLUDED.{col}")
            else:
                update_sets = [f"{col} = EXCLUDED.{col}" for col in columns if col not in [pk_col, "workspace_id"]]
            
            update_str = ", ".join(update_sets)

            if update_str:
                sql = f"""
                    INSERT INTO {self.schema}.{table_name} ({cols_str})
                    VALUES %s
                    ON CONFLICT (workspace_id, {pk_col}) DO UPDATE
                    SET {update_str};
                """
            else:
                sql = f"""
                    INSERT INTO {self.schema}.{table_name} ({cols_str})
                    VALUES %s
                    ON CONFLICT (workspace_id, {pk_col}) DO NOTHING;
                """

            psycopg2.extras.execute_values(cur, sql, values, page_size=100)
            conn.commit()
            logger.info(f"💾 Đã lưu {len(df)} dòng vào {self.schema}.{table_name} (workspace_id: {workspace_id})")
        except Exception as e:
            conn.rollback()
            logger.error(f"❌ Lỗi khi lưu vào {table_name} cho workspace {workspace_id}: {e}")
            raise e
        finally:
            cur.close()
            conn.close()

    @asynccontextmanager
    async def get_async_session(self, workspace_id: str):
        """
        Context manager cung cấp AsyncSession SQLAlchemy, tự động thiết lập
        biến local session `app.current_workspace_id` cho RLS.
        """
        self.initialize()
        async with self.async_session_factory() as session:
            try:
                # Đảm bảo thiết lập RLS trong transaction hiện tại
                await session.execute(
                    text("SELECT set_config('app.current_workspace_id', :workspace_id, true)"),
                    {"workspace_id": workspace_id}
                )
                yield session
            except Exception as e:
                logger.error(f"Error in async session for workspace {workspace_id}: {e}")
                raise

    async def search_similar_chunks(
        self, workspace_id: str, query_embedding: List[float], limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Tìm kiếm các chunks tương tự dựa trên vector embedding (pgvector cosine similarity).
        Đảm bảo an toàn RLS thông qua session context.
        """
        async with self.get_async_session(workspace_id) as session:
            # PostgreSQL <=> đại diện cho Cosine Distance
            # Cosine Similarity = 1 - Cosine Distance
            sql = text(f"""
                SELECT 
                    chunk_id, 
                    text, 
                    token_count, 
                    source_document_id,
                    entity_ids,
                    relation_ids,
                    1 - (embedding <=> :embedding::vector) as similarity
                FROM {self.schema}.chunks
                ORDER BY embedding <=> :embedding::vector
                LIMIT :limit
            """)
            result = await session.execute(
                sql,
                {"embedding": query_embedding, "limit": limit}
            )
            
            chunks = []
            for row in result:
                chunks.append({
                    "chunk_id": row.chunk_id,
                    "text": row.text,
                    "token_count": row.token_count,
                    "source_document_id": row.source_document_id,
                    "entity_ids": row.entity_ids,
                    "relation_ids": row.relation_ids,
                    "similarity": float(row.similarity) if row.similarity is not None else 0.0
                })
            return chunks

    async def create_workspace_partition(self, workspace_id: str):
        """
        Khởi tạo phân vùng RAG (chunks, entities, relationships) cho workspace_id
        một cách bất đồng bộ để tránh block event loop.
        """
        self.initialize()
        import asyncio
        def sync_task():
            conn = self.get_conn()
            conn.autocommit = True
            cur = conn.cursor()
            try:
                self._ensure_partition(cur, workspace_id)
            finally:
                cur.close()
                conn.close()
        
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, sync_task)

    async def close(self):
        """Đóng tất cả các engine kết nối."""
        self.sync_engine.dispose()
        await self.async_engine.dispose()


rag_db_manager = DBManager()

