"""
API Endpoints cho Knowledge Base Management.
Chỉ nhận request, gọi service, trả response. Không chứa business logic.
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    get_current_user_uid,
    get_current_workspace_id,
    require_roles,
)
from app.core.exceptions import ApplicationError
from app.db.database import get_db
from app.models.workspace import WorkspaceRole
from app.schemas.sche_base import DataResponse
from app.schemas.sche_knowledge_base import (
    DocumentUploadResponse,
    DocumentListItem,
    DocumentDetail,
    ManualDocumentCreate,
    IngestionStatusResponse,
    KnowledgeGraphResponse,
    KnowledgeSearchRequest,
    KnowledgeSearchResponse,
)
from app.schemas.memory_query import MemoryQueryBudget, MemoryQueryRequest
from app.services.knowledge_base_srv import KnowledgeBaseService
from app.services.knowledge_graph_srv import KnowledgeGraphService
from app.services.knowalge_base.knowledge_query_service import KnowledgeQueryService
from app.services.knowalge_base.memory_query_factory import (
    create_memory_query_service,
)
from app.core.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()


@router.post(
    "/upload",
    response_model=DataResponse[DocumentUploadResponse],
    summary="Upload tài liệu (PDF, Markdown, Text)",
)
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    user_uid: str = Depends(get_current_user_uid),
    workspace_id: uuid.UUID = Depends(get_current_workspace_id),
    _role: str = Depends(
        require_roles([WorkspaceRole.owner, WorkspaceRole.admin])
    ),
):
    try:
        result = await KnowledgeBaseService.upload_document(
            db=db,
            workspace_id=workspace_id,
            user_uid=user_uid,
            file=file,
            title=title,
            description=description,
        )
        return DataResponse[DocumentUploadResponse].success_response(
            data=result
        )
    except ValueError as e:
        raise ApplicationError(
            status_code=400, code="INVALID_ARGUMENT", message="Tài liệu tải lên không hợp lệ."
        ) from e


@router.post(
    "/manual",
    response_model=DataResponse[DocumentUploadResponse],
    summary="Nhập nội dung text/markdown trực tiếp",
)
async def create_manual_document(
    payload: ManualDocumentCreate,
    db: AsyncSession = Depends(get_db),
    user_uid: str = Depends(get_current_user_uid),
    workspace_id: uuid.UUID = Depends(get_current_workspace_id),
    _role: str = Depends(
        require_roles([WorkspaceRole.owner, WorkspaceRole.admin])
    ),
):
    try:
        result = await KnowledgeBaseService.create_manual_document(
            db=db,
            workspace_id=workspace_id,
            user_uid=user_uid,
            payload=payload,
        )
        return DataResponse[DocumentUploadResponse].success_response(
            data=result
        )
    except ValueError as e:
        raise ApplicationError(
            status_code=400, code="INVALID_ARGUMENT", message="Nội dung tài liệu không hợp lệ."
        ) from e


@router.get(
    "",
    response_model=DataResponse[list[DocumentListItem]],
    summary="Liệt kê tài liệu trong workspace",
)
async def list_documents(
    db: AsyncSession = Depends(get_db),
    workspace_id: uuid.UUID = Depends(get_current_workspace_id),
):
    docs = await KnowledgeBaseService.list_documents(db, workspace_id)
    return DataResponse[list[DocumentListItem]].success_response(data=docs)


@router.get(
    "/graph",
    response_model=DataResponse[KnowledgeGraphResponse],
    summary="Lấy đồ thị tri thức (Knowledge Graph) của workspace",
)
async def get_knowledge_graph(
    workspace_id: uuid.UUID = Depends(get_current_workspace_id),
):
    try:
        graph_data = await KnowledgeGraphService.get_graph(workspace_id)
        return DataResponse[KnowledgeGraphResponse].success_response(data=graph_data)
    except Exception as e:
        logger.error(f"Error fetching knowledge graph: {e}")
        raise ApplicationError(
            status_code=500, code="INTERNAL_ERROR", message="Không thể lấy đồ thị tri thức."
        ) from e


@router.get(
    "/{doc_id}",
    response_model=DataResponse[DocumentDetail],
    summary="Chi tiết tài liệu",
)
async def get_document(
    doc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    workspace_id: uuid.UUID = Depends(get_current_workspace_id),
):
    doc = await KnowledgeBaseService.get_document(db, workspace_id, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return DataResponse[DocumentDetail].success_response(data=doc)


@router.delete(
    "/{doc_id}",
    response_model=DataResponse[bool],
    summary="Xóa tài liệu (bao gồm dữ liệu RAG)",
)
async def delete_document(
    doc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    workspace_id: uuid.UUID = Depends(get_current_workspace_id),
    _role: str = Depends(
        require_roles([WorkspaceRole.owner, WorkspaceRole.admin])
    ),
):
    success = await KnowledgeBaseService.delete_document(
        db, workspace_id, doc_id
    )
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    return DataResponse[bool].success_response(data=True)


@router.post(
    "/{doc_id}/retry",
    response_model=DataResponse[DocumentUploadResponse],
    summary="Retry ingestion khi document bị lỗi",
)
async def retry_ingestion(
    doc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    workspace_id: uuid.UUID = Depends(get_current_workspace_id),
    _role: str = Depends(
        require_roles([WorkspaceRole.owner, WorkspaceRole.admin])
    ),
):
    try:
        result = await KnowledgeBaseService.retry_ingestion(
            db, workspace_id, doc_id
        )
        if not result:
            raise HTTPException(
                status_code=404, detail="Document not found"
            )
        return DataResponse[DocumentUploadResponse].success_response(
            data=result
        )
    except ValueError as e:
        raise ApplicationError(
            status_code=400, code="INVALID_ARGUMENT", message="Không thể retry tài liệu này."
        ) from e


@router.get(
    "/{doc_id}/status",
    response_model=DataResponse[IngestionStatusResponse],
    summary="Check trạng thái ingestion",
)
async def get_ingestion_status(
    doc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    workspace_id: uuid.UUID = Depends(get_current_workspace_id),
):
    status = await KnowledgeBaseService.get_ingestion_status(
        db, workspace_id, doc_id
    )
    if not status:
        raise HTTPException(status_code=404, detail="Document not found")
    return DataResponse[IngestionStatusResponse].success_response(
        data=status
    )


@router.post(
    "/search",
    response_model=DataResponse[KnowledgeSearchResponse],
    summary="Tìm kiếm hybrid (vector + Graph RAG) trong Knowledge Base",
)
async def search_knowledge_base(
    payload: KnowledgeSearchRequest,
    user_uid: str = Depends(get_current_user_uid),
    workspace_id: uuid.UUID = Depends(get_current_workspace_id),
):
    try:
        result = await create_memory_query_service(
            workspace_id, user_uid
        ).search(
            MemoryQueryRequest(
                query=payload.query,
                budget=MemoryQueryBudget(
                    max_chunks=payload.top_k_chunks,
                    max_paths=payload.top_k_paths,
                ),
            )
        )
        legacy = KnowledgeQueryService.to_legacy_result(result)
        return DataResponse[KnowledgeSearchResponse].success_response(
            data=KnowledgeSearchResponse(
                top_chunks=legacy["top_chunks"],
                top_paths=legacy["top_paths"],
                diagnostics={
                    "readiness": result.readiness.model_dump(mode="json"),
                    "truncation": result.truncation.model_dump(mode="json"),
                },
            )
        )
    except Exception as error:
        logger.error("Knowledge Base canonical search failed")
        raise ApplicationError(
            status_code=500, code="INTERNAL_ERROR", message="Tìm kiếm thất bại."
        ) from error
