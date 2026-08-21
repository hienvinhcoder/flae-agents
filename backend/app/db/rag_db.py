import os
import json
import re
from typing import List, Dict, Any, Optional
import urllib.parse
from contextlib import asynccontextmanager

import numpy as np
import pandas as pd
import psycopg2
from psycopg2 import sql
import psycopg2.extras
from psycopg2.extensions import register_adapter, AsIs
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.config import settings
from app.core.logger import get_logger

logger = get_logger(__name__)

# Đăng ký bộ chuyển đổi mảng numpy để tương thích với pgvector
register_adapter(np.float64, lambda x: AsIs(x))
register_adapter(np.int64, lambda x: AsIs(x))
register_adapter(np.float32, lambda x: AsIs(x))
register_adapter(np.ndarray, lambda x: AsIs(str(x.tolist())))


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
        self.app_role = settings.RAG_DATABASE_APP_ROLE
        if not re.fullmatch(r"[a-z_][a-z0-9_]*", self.app_role):
            raise ValueError("RAG_DATABASE_APP_ROLE must be a safe PostgreSQL identifier")
        self.ingestion_role = settings.RAG_DATABASE_INGESTION_ROLE
        if not re.fullmatch(r"[a-z_][a-z0-9_]*", self.ingestion_role):
            raise ValueError(
                "RAG_DATABASE_INGESTION_ROLE must be a safe PostgreSQL identifier"
            )

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

    def initialize(self) -> None:
        """Compatibility marker; schema creation is owned by RAG Alembic."""
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

    def load_df(self, table_name: str, workspace_id: str) -> pd.DataFrame:
        """
        Tải dữ liệu từ một bảng cho một workspace cụ thể dưới dạng Pandas DataFrame.
        Áp dụng Row-Level Security (RLS) để cô lập dữ liệu.
        """
        self.initialize()
        conn = self.get_conn()
        try:
            # Thiết lập session workspace context cho RLS trên connection này
            with conn.cursor() as cur:
                cur.execute(
                    sql.SQL("SET LOCAL ROLE {}").format(sql.Identifier(self.app_role))
                )
                cur.execute("SET app.current_workspace_id = %s;", (workspace_id,))

                # Identifier composition prevents callers from injecting SQL through
                # dynamic schema or table names.
                query = sql.SQL("SELECT * FROM {}.{}").format(
                    sql.Identifier(self.schema),
                    sql.Identifier(table_name),
                )
                cur.execute(query)
                rows = cur.fetchall()
                columns = [column.name for column in (cur.description or ())]
            df = pd.DataFrame(rows, columns=columns)

            vector_cols = ["embedding"]
            json_cols = ["source_chunk_ids", "entity_ids", "relation_ids", "chunk_descriptions", "chunk_meta"]

            def parse_vector(x: Any) -> Optional[np.ndarray]:
                if x is None or (isinstance(x, float) and pd.isna(x)):
                    return None
                if isinstance(x, str):
                    return np.array(json.loads(x))
                return np.array(x)

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
            cur.execute(f"SET LOCAL ROLE {self.app_role};")
            cur.execute("SET LOCAL app.current_workspace_id = %s;", (workspace_id,))

            df_to_save = df.copy()

            # Gán cột định danh workspace_id
            df_to_save["workspace_id"] = workspace_id

            def to_vector_str(x):
                if x is None or (isinstance(x, float) and pd.isna(x)):
                    return None
                return json.dumps(x.tolist()) if isinstance(x, np.ndarray) else (json.dumps(x) if isinstance(x, list) else str(x))

            def to_json_str(x):
                if x is None or (isinstance(x, float) and pd.isna(x)):
                    return None
                return json.dumps(x.tolist()) if isinstance(x, np.ndarray) else json.dumps(x)

            for col in df_to_save.columns:
                if col == "embedding":
                    df_to_save[col] = df_to_save[col].apply(to_vector_str)
                elif col in ["source_chunk_ids", "entity_ids", "relation_ids", "chunk_descriptions", "chunk_meta"]:
                    df_to_save[col] = df_to_save[col].apply(to_json_str)

            columns = list(df_to_save.columns)
            def safe_sql_val(x):
                return None if (not isinstance(x, (list, tuple, dict, np.ndarray)) and pd.isna(x)) else x
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

    def update_chunks_graph_references(
        self, workspace_id: str, chunk_updates: List[Dict[str, Any]]
    ) -> int:
        """Cập nhật entity_ids và relation_ids cho chunks đã tồn tại trong DB."""
        if not chunk_updates:
            return 0
        self.initialize()
        conn = self.get_conn()
        cur = conn.cursor()
        try:
            cur.execute(f"SET LOCAL ROLE {self.app_role};")
            cur.execute("SET LOCAL app.current_workspace_id = %s;", (workspace_id,))
            values = [
                (
                    item["chunk_id"],
                    json.dumps(item.get("entity_ids", [])),
                    json.dumps(item.get("relation_ids", [])),
                    workspace_id,
                )
                for item in chunk_updates
            ]
            sql = f"""
                UPDATE {self.schema}.chunks AS c
                SET entity_ids = v.entity_ids::jsonb,
                    relation_ids = v.relation_ids::jsonb
                FROM (VALUES %s) AS v(chunk_id, entity_ids, relation_ids, workspace_id)
                WHERE c.workspace_id = v.workspace_id AND c.chunk_id = v.chunk_id;
            """
            psycopg2.extras.execute_values(cur, sql, values, page_size=100)
            conn.commit()
            logger.info(f"🔗 Đã cập nhật graph refs cho {len(chunk_updates)} chunks (workspace_id: {workspace_id})")
            return len(chunk_updates)
        except Exception as e:
            conn.rollback()
            logger.error(f"❌ Lỗi khi cập nhật graph refs cho chunks (workspace {workspace_id}): {e}")
            raise e
        finally:
            cur.close()
            conn.close()

    @asynccontextmanager
    async def get_async_session(
        self, workspace_id: str, subject_id: str | None = None
    ):
        """
        Context manager cung cấp AsyncSession SQLAlchemy, tự động thiết lập
        biến local session `app.current_workspace_id` cho RLS.
        """
        self.initialize()
        async with self.async_session_factory() as session:
            try:
                # Đảm bảo thiết lập RLS trong transaction hiện tại
                await session.execute(text(f"SET LOCAL ROLE {self.app_role}"))
                await session.execute(
                    text("SELECT set_config('app.current_workspace_id', :workspace_id, true)"),
                    {"workspace_id": workspace_id}
                )
                await session.execute(
                    text("SELECT set_config('app.current_subject_id', :subject_id, true)"),
                    {"subject_id": subject_id or ""},
                )
                yield session
            except Exception as e:
                logger.error(f"Error in async session for workspace {workspace_id}: {e}")
                raise

    @asynccontextmanager
    async def get_ingestion_session(self, workspace_id: str):
        """Yield a least-privilege, workspace-scoped ingestion transaction."""
        self.initialize()
        async with self.async_session_factory() as session:
            try:
                await session.execute(text(f"SET LOCAL ROLE {self.ingestion_role}"))
                await session.execute(
                    text(
                        "SELECT set_config('app.current_workspace_id', "
                        ":workspace_id, true)"
                    ),
                    {"workspace_id": workspace_id},
                )
                yield session
            except Exception as error:
                logger.error(
                    "Error in ingestion session for workspace %s: %s",
                    workspace_id,
                    error,
                )
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

    async def create_workspace_partition(self, workspace_id: str) -> None:
        """Create LIST partitions for all rag_db tables for the given workspace.

        Calls the ``public.create_workspace_partitions()`` PL/pgSQL function
        installed by migration rag_0022.  Uses ``IF NOT EXISTS`` so repeated
        calls are safe and idempotent.  Silently skips if the function does
        not exist yet (pre-migration environments).
        """
        try:
            async with self.async_session_factory() as session:
                await session.execute(
                    text(
                        "SELECT public.create_workspace_partitions(:workspace_id)"
                    ),
                    {"workspace_id": workspace_id},
                )
                await session.commit()
            logger.info(
                "Ensured rag_db partitions exist for workspace %s", workspace_id
            )
        except Exception as exc:
            # Gracefully handle pre-migration environments where the
            # create_workspace_partitions() function does not exist yet.
            if "does not exist" in str(exc):
                logger.debug(
                    "Partition function not available yet, skipping for workspace %s",
                    workspace_id,
                )
            else:
                raise

    async def close(self):
        """Đóng tất cả các engine kết nối."""
        self.sync_engine.dispose()
        await self.async_engine.dispose()


rag_db_manager = DBManager()
