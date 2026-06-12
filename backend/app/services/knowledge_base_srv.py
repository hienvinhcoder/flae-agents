"""
Service nghiệp vụ chính cho Knowledge Base.
Xử lý logic: upload, create, list, delete, retry documents.
Tất cả thao tác DB đều nằm trong service layer.
"""
import uuid
import hashlib
from typing import Optional

from fastapi import UploadFile
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logger import get_logger
from app.core.temporal import get_temporal_client
from app.models.knowledge_base import (
    KnowledgeDocument,
    DocumentStatus,
    DocumentType,
)
from app.schemas.sche_knowledge_base import (
    DocumentUploadResponse,
    DocumentListItem,
    DocumentDetail,
    ManualDocumentCreate,
    IngestionStatusResponse,
)
from app.services.gcs_storage_srv import GCSStorageService

logger = get_logger(__name__)

INGESTION_TASK_QUEUE = "flae-default-queue"


# ── Private helper functions (Module-level) ───────────────────────


def _detect_document_type(mime_type: str, file_name: str) -> DocumentType:
    """Xác định document type từ mime_type và file extension."""
    if mime_type == "application/pdf":
        return DocumentType.pdf
    if file_name.endswith(".md"):
        return DocumentType.markdown
    return DocumentType.text


def _validate_upload(file: UploadFile) -> None:
    """Validate file upload: mime type và size."""
    if file.content_type not in settings.ALLOWED_MIME_TYPES:
        ext_hint = ", ".join(settings.ALLOWED_MIME_TYPES)
        raise ValueError(
            f"File type '{file.content_type}' không được hỗ trợ. "
            f"Cho phép: {ext_hint}"
        )


async def _start_ingestion_workflow(doc: KnowledgeDocument) -> str:
    """Trigger Temporal IngestionWorkflow cho document."""
    from app.temporal.workflows.ingestion import DocumentIngestionWorkflow

    workflow_id = f"kb-ingest-{doc.id}"

    params = {
        "document_id": str(doc.id),
        "workspace_id": str(doc.workspace_id),
        "document_type": doc.document_type.value,
        "gcs_path": doc.gcs_path,
        "content_text": doc.content_text,
        "file_name": doc.file_name or f"document-{doc.id}",
    }

    try:
        client = await get_temporal_client()
        await client.start_workflow(
            DocumentIngestionWorkflow.run,
            params,
            id=workflow_id,
            task_queue=INGESTION_TASK_QUEUE,
        )
        logger.info(f"Started ingestion workflow: {workflow_id}")
    except Exception as e:
        logger.error(f"Failed to start ingestion workflow: {e}")
        raise

    return workflow_id


async def _cleanup_rag_data(workspace_id: str, document_id: str) -> None:
    """Xóa chunks/entities/relationships liên quan đến document trong rag_db."""
    from app.db.rag_db import rag_db_manager
    from psycopg2.extras import execute_values
    import json

    conn = None
    try:
        rag_db_manager.initialize()
        conn = rag_db_manager.get_conn()
        conn.autocommit = False  # Sử dụng transaction để đảm bảo toàn vẹn dữ liệu
        cur = conn.cursor()
        schema = rag_db_manager.schema

        # 1. Lấy tất cả các chunk_id thuộc về document bị xóa trong workspace này
        cur.execute(
            f"SELECT chunk_id FROM {schema}.chunks "
            f"WHERE workspace_id = %s AND source_document_id = %s",
            (workspace_id, document_id),
        )
        deleted_chunk_ids = [row[0] for row in cur.fetchall()]
        
        # Nếu tài liệu này chưa được tạo bất kỳ chunk nào, dừng xử lý dọn dẹp
        if not deleted_chunk_ids:
            cur.close()
            conn.close()
            logger.info(f"Không tìm thấy chunks nào cho document {document_id} trong workspace {workspace_id}")
            return

        deleted_chunk_ids_set = set(deleted_chunk_ids)

        # Định nghĩa helper function xử lý xóa/cập nhật hàng loạt (giống demo app nhưng tối ưu cho multi-tenancy)
        def process_table_cleanup(table_name, id_col):
            # Sử dụng toán tử JSONB "?|" để tìm các dòng có chứa ít nhất một chunk_id sắp bị xóa trong mảng source_chunk_ids.
            # Điều này giúp lọc nhanh chỉ những bản ghi thực sự bị ảnh hưởng bởi file đang xóa mà không cần quét toàn bộ bảng.
            cur.execute(
                f"SELECT {id_col}, source_chunk_ids FROM {schema}.{table_name} "
                f"WHERE workspace_id = %s AND source_chunk_ids ?| %s",
                (workspace_id, deleted_chunk_ids),
            )
            candidates = cur.fetchall()

            if not candidates:
                return

            to_update = []  # Lưu các bản ghi cần cập nhật: [(id, new_json_str, new_freq, workspace_id), ...]
            to_delete = []  # Lưu các bản ghi cần xóa hoàn toàn: [id, ...]

            for row_id, source_chunk_ids_raw in candidates:
                # Phân tích dữ liệu JSON source_chunk_ids từ DB
                if isinstance(source_chunk_ids_raw, str):
                    source_chunk_ids = json.loads(source_chunk_ids_raw)
                elif isinstance(source_chunk_ids_raw, list):
                    source_chunk_ids = source_chunk_ids_raw
                else:
                    source_chunk_ids = []

                # Lọc bỏ các chunk_id thuộc tài liệu bị xóa
                remaining_chunks = [cid for cid in source_chunk_ids if cid not in deleted_chunk_ids_set]

                if not remaining_chunks:
                    # Nếu không còn chunk nào khác liên kết -> Thực thể/Quan hệ này mồ côi -> Đưa vào hàng chờ XÓA
                    to_delete.append(row_id)
                else:
                    # Nếu vẫn còn chunk thuộc tài liệu khác -> Đưa vào hàng chờ CẬP NHẬT (loại bỏ tham chiếu chunk cũ và tính lại frequency)
                    to_update.append((row_id, json.dumps(remaining_chunks), len(remaining_chunks), workspace_id))

            # Thực thi cập nhật hàng loạt bằng execute_values để đạt hiệu năng Enterprise cao nhất (chỉ chạy 1 câu SQL)
            if to_update:
                update_sql = f"""
                    UPDATE {schema}.{table_name} AS t
                    SET source_chunk_ids = v.new_ids::jsonb,
                        frequency = v.new_freq::int
                    FROM (VALUES %s) AS v(id, new_ids, new_freq, w_id)
                    WHERE t.workspace_id = v.w_id AND t.{id_col} = v.id
                """
                execute_values(cur, update_sql, to_update)

            # Thực thi xóa hàng loạt bằng ANY(%s) để chỉ chạy 1 câu SQL duy nhất
            if to_delete:
                cur.execute(
                    f"DELETE FROM {schema}.{table_name} "
                    f"WHERE workspace_id = %s AND {id_col} = ANY(%s)",
                    (workspace_id, to_delete),
                )

        # 2. Dọn dẹp bảng Entities liên quan
        process_table_cleanup('entities', 'entity_id')

        # 3. Dọn dẹp bảng Relationships liên quan
        process_table_cleanup('relationships', 'relation_id')

        # 4. Xóa vật lý toàn bộ các Chunks thuộc về tài liệu này
        cur.execute(
            f"DELETE FROM {schema}.chunks "
            f"WHERE workspace_id = %s AND source_document_id = %s",
            (workspace_id, document_id),
        )

        conn.commit()  # Xác nhận lưu tất cả thay đổi nếu không có lỗi xảy ra
        cur.close()
        conn.close()
        logger.info(
            f"Đã dọn dẹp triệt để RAG data (chunks, entities, relationships) cho document {document_id} "
            f"trong workspace {workspace_id} (sử dụng Batch Operations)"
        )
    except Exception as e:
        if conn:
            try:
                conn.rollback()  # Rollback toàn bộ nếu có bất kỳ lỗi nào xảy ra trong transaction
                conn.close()
            except Exception:
                pass
        logger.warning(f"Failed to cleanup RAG data: {e}")


# ── Service Class ──────────────────────────────────────────────────


class KnowledgeBaseService:
    @staticmethod
    async def upload_document(
        db: AsyncSession,
        workspace_id: uuid.UUID,
        user_uid: str,
        file: UploadFile,
        title: str,
        description: Optional[str] = None,
    ) -> DocumentUploadResponse:
        """
        Upload file lên GCS, tạo record metadata, trigger Temporal workflow.
        """
        _validate_upload(file)

        file_content = await file.read()
        file_size = len(file_content)

        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if file_size > max_bytes:
            raise ValueError(
                f"File vượt quá giới hạn {settings.MAX_UPLOAD_SIZE_MB}MB"
            )

        doc_id = uuid.uuid4()
        document_type = _detect_document_type(
            file.content_type or "", file.filename or ""
        )

        # 1. Upload lên GCS
        gcs_path = await GCSStorageService.upload_file(
            workspace_id=workspace_id,
            document_id=doc_id,
            file_name=file.filename or f"document.{document_type.value}",
            file_content=file_content,
            content_type=file.content_type or "application/octet-stream",
        )

        # 2. Tạo record trong DB
        doc = KnowledgeDocument(
            id=doc_id,
            workspace_id=workspace_id,
            title=title,
            description=description,
            document_type=document_type,
            file_name=file.filename,
            file_size=file_size,
            gcs_path=gcs_path,
            mime_type=file.content_type,
            status=DocumentStatus.pending,
            uploaded_by=user_uid,
        )
        db.add(doc)
        await db.commit()
        await db.refresh(doc)

        # 3. Trigger Temporal workflow
        workflow_id = await _start_ingestion_workflow(doc)

        # 4. Cập nhật workflow_id
        doc.temporal_workflow_id = workflow_id
        await db.commit()

        logger.info(
            f"Document uploaded: id={doc_id}, workspace={workspace_id}, "
            f"workflow={workflow_id}"
        )

        return DocumentUploadResponse(
            id=doc.id,
            title=doc.title,
            status=doc.status,
            temporal_workflow_id=workflow_id,
        )

    @staticmethod
    async def create_manual_document(
        db: AsyncSession,
        workspace_id: uuid.UUID,
        user_uid: str,
        payload: ManualDocumentCreate,
    ) -> DocumentUploadResponse:
        """Tạo document từ text input trực tiếp (không upload file)."""
        doc_id = uuid.uuid4()

        content_size = len(payload.content_text.encode("utf-8"))
        max_bytes = 10 * 1024 * 1024  # 10MB cho text
        if content_size > max_bytes:
            raise ValueError("Nội dung vượt quá giới hạn 10MB")

        doc = KnowledgeDocument(
            id=doc_id,
            workspace_id=workspace_id,
            title=payload.title,
            description=payload.description,
            document_type=DocumentType.manual_input,
            content_text=payload.content_text,
            status=DocumentStatus.pending,
            uploaded_by=user_uid,
        )
        db.add(doc)
        await db.commit()
        await db.refresh(doc)

        workflow_id = await _start_ingestion_workflow(doc)

        doc.temporal_workflow_id = workflow_id
        await db.commit()

        logger.info(
            f"Manual document created: id={doc_id}, workspace={workspace_id}"
        )

        return DocumentUploadResponse(
            id=doc.id,
            title=doc.title,
            status=doc.status,
            temporal_workflow_id=workflow_id,
        )

    @staticmethod
    async def list_documents(
        db: AsyncSession, workspace_id: uuid.UUID
    ) -> list[DocumentListItem]:
        """Liệt kê documents trong workspace, sắp xếp theo ngày tạo mới nhất."""
        result = await db.execute(
            select(KnowledgeDocument)
            .where(KnowledgeDocument.workspace_id == workspace_id)
            .order_by(KnowledgeDocument.created_at.desc())
        )
        docs = result.scalars().all()
        return [DocumentListItem.model_validate(d) for d in docs]

    @staticmethod
    async def get_document(
        db: AsyncSession, workspace_id: uuid.UUID, doc_id: uuid.UUID
    ) -> Optional[DocumentDetail]:
        """Lấy chi tiết document theo ID."""
        result = await db.execute(
            select(KnowledgeDocument).where(
                KnowledgeDocument.id == doc_id,
                KnowledgeDocument.workspace_id == workspace_id,
            )
        )
        doc = result.scalar_one_or_none()
        if not doc:
            return None
        return DocumentDetail.model_validate(doc)

    @staticmethod
    async def delete_document(
        db: AsyncSession, workspace_id: uuid.UUID, doc_id: uuid.UUID
    ) -> bool:
        """
        Xóa document: GCS file + rag_db data + flae_db record.
        """
        result = await db.execute(
            select(KnowledgeDocument).where(
                KnowledgeDocument.id == doc_id,
                KnowledgeDocument.workspace_id == workspace_id,
            )
        )
        doc = result.scalar_one_or_none()
        if not doc:
            return False

        # 1. Xóa file trên GCS (nếu có)
        if doc.gcs_path:
            try:
                await GCSStorageService.delete_file(doc.gcs_path)
            except Exception as e:
                logger.warning(f"Failed to delete GCS file {doc.gcs_path}: {e}")

        # 2. Xóa dữ liệu RAG (chunks/entities/relationships) trong rag_db
        await _cleanup_rag_data(str(workspace_id), str(doc_id))

        # 3. Xóa record metadata
        await db.execute(
            delete(KnowledgeDocument).where(KnowledgeDocument.id == doc_id)
        )
        await db.commit()

        logger.info(f"Document deleted: id={doc_id}, workspace={workspace_id}")
        return True

    @staticmethod
    async def retry_ingestion(
        db: AsyncSession, workspace_id: uuid.UUID, doc_id: uuid.UUID
    ) -> Optional[DocumentUploadResponse]:
        """Reset status và trigger lại ingestion workflow."""
        result = await db.execute(
            select(KnowledgeDocument).where(
                KnowledgeDocument.id == doc_id,
                KnowledgeDocument.workspace_id == workspace_id,
            )
        )
        doc = result.scalar_one_or_none()
        if not doc:
            return None

        if doc.status not in (DocumentStatus.failed, DocumentStatus.completed):
            raise ValueError(
                f"Chỉ có thể retry document ở trạng thái failed hoặc completed, "
                f"hiện tại: {doc.status.value}"
            )

        # Cleanup rag data cũ trước khi retry
        await _cleanup_rag_data(str(workspace_id), str(doc_id))

        # Reset metrics
        doc.status = DocumentStatus.pending
        doc.error_message = None
        doc.chunk_count = None
        doc.entity_count = None
        doc.relation_count = None
        doc.token_usage = None
        doc.processing_time_seconds = None

        workflow_id = await _start_ingestion_workflow(doc)
        doc.temporal_workflow_id = workflow_id
        await db.commit()

        return DocumentUploadResponse(
            id=doc.id,
            title=doc.title,
            status=doc.status,
            temporal_workflow_id=workflow_id,
        )

    @staticmethod
    async def get_ingestion_status(
        db: AsyncSession, workspace_id: uuid.UUID, doc_id: uuid.UUID
    ) -> Optional[IngestionStatusResponse]:
        """Lấy trạng thái ingestion hiện tại."""
        result = await db.execute(
            select(KnowledgeDocument).where(
                KnowledgeDocument.id == doc_id,
                KnowledgeDocument.workspace_id == workspace_id,
            )
        )
        doc = result.scalar_one_or_none()
        if not doc:
            return None

        return IngestionStatusResponse(
            document_id=doc.id,
            status=doc.status,
            error_message=doc.error_message,
            chunk_count=doc.chunk_count,
            entity_count=doc.entity_count,
            relation_count=doc.relation_count,
            processing_time_seconds=doc.processing_time_seconds,
        )

    @staticmethod
    async def update_document_status_db(
        db: AsyncSession,
        doc_id: uuid.UUID,
        status: str,
        error_message: Optional[str] = None,
        metrics: Optional[dict] = None,
    ) -> None:
        """Cập nhật status document trong flae_db."""
        result = await db.execute(
            select(KnowledgeDocument).where(KnowledgeDocument.id == doc_id)
        )
        doc = result.scalar_one_or_none()
        if not doc:
            logger.error(f"Document {doc_id} not found")
            return

        doc.status = DocumentStatus(status)
        if error_message:
            doc.error_message = error_message

        if metrics:
            for key in [
                "chunk_count", "entity_count", "relation_count",
                "token_usage", "processing_time_seconds",
            ]:
                if key in metrics:
                    setattr(doc, key, metrics[key])

        await db.commit()
        logger.info(f"Document {doc_id} status -> {status}")

    @staticmethod
    async def finalize_document_ingestion_db(
        db: AsyncSession,
        doc_id: uuid.UUID,
        metrics: dict,
    ) -> None:
        """Cập nhật metrics cuối cùng và đánh dấu completed."""
        result = await db.execute(
            select(KnowledgeDocument).where(KnowledgeDocument.id == doc_id)
        )
        doc = result.scalar_one_or_none()
        if not doc:
            logger.error(f"Document {doc_id} not found during finalization")
            return

        doc.status = DocumentStatus.completed
        doc.chunk_count = metrics.get("total_chunks", 0)
        doc.entity_count = metrics.get("total_entities", 0)
        doc.relation_count = metrics.get("total_relations", 0)
        doc.token_usage = metrics.get("token_usage")
        doc.processing_time_seconds = metrics.get("processing_time")
        doc.error_message = None

        await db.commit()
        logger.info(
            f"Ingestion finalized for document {doc_id}: "
            f"chunks={doc.chunk_count}, entities={doc.entity_count}, "
            f"relations={doc.relation_count}"
        )
