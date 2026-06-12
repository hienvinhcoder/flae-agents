"""
Service nghiệp vụ cho Đồ thị Tri thức (Knowledge Graph).
Chịu trách nhiệm truy vấn các thực thể (Entities) và quan hệ (Relationships) của workspace trong RAG Database.
"""
import uuid
from sqlalchemy import text
from app.db.rag_db import rag_db_manager
from app.schemas.sche_knowledge_base import (
    GraphNode,
    GraphEdge,
    KnowledgeGraphResponse,
)
from app.core.logger import get_logger

logger = get_logger(__name__)


class KnowledgeGraphService:
    @staticmethod
    async def get_graph(workspace_id: uuid.UUID) -> KnowledgeGraphResponse:
        """
        Lấy thông tin entities và relationships của workspace_id từ RAG DB
        để trả về cấu trúc Graph đầy đủ (Nodes & Edges).
        """
        # Sử dụng async session của RAG DB Manager đã cấu hình RLS context
        async with rag_db_manager.get_async_session(str(workspace_id)) as session:
            schema = rag_db_manager.schema

            # Truy vấn danh sách các thực thể của workspace
            entities_query = text(
                f"""
                SELECT entity_id, entity_name, entity_type, description, frequency, degree
                FROM {schema}.entities
                WHERE workspace_id = :workspace_id
                """
            )

            # Truy vấn danh sách các mối quan hệ của workspace
            relations_query = text(
                f"""
                SELECT relation_id, source_id, source_name, target_id, target_name, keywords, description, frequency
                FROM {schema}.relationships
                WHERE workspace_id = :workspace_id
                """
            )

            entities_result = await session.execute(
                entities_query, {"workspace_id": str(workspace_id)}
            )
            relations_result = await session.execute(
                relations_query, {"workspace_id": str(workspace_id)}
            )

            nodes = []
            for row in entities_result:
                nodes.append(
                    GraphNode(
                        id=row.entity_id,
                        name=row.entity_name or row.entity_id,
                        type=row.entity_type or "Unknown",
                        description=row.description,
                        frequency=row.frequency or 1,
                        degree=row.degree or 0,
                    )
                )

            edges = []
            for row in relations_result:
                edges.append(
                    GraphEdge(
                        id=row.relation_id,
                        source=row.source_id,
                        target=row.target_id,
                        label=row.keywords or "RELATES_TO",
                        description=row.description,
                        weight=row.frequency or 1,
                    )
                )

            logger.info(
                f"Lấy đồ thị tri thức cho workspace {workspace_id}: "
                f"{len(nodes)} nodes, {len(edges)} edges."
            )

            return KnowledgeGraphResponse(nodes=nodes, edges=edges)
