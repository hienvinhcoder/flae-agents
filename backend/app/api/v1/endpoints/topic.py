import uuid
from typing import Optional, List, Any

from fastapi import APIRouter, Depends, HTTPException, status as http_status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    get_current_user_uid,
    get_current_workspace_id,
    require_roles,
)
from app.db.database import get_db
from app.models.workspace import WorkspaceRole
from app.schemas.sche_base import DataResponse
from app.schemas.sche_topic import (
    TopicListItem,
    TopicDetailResponse,
    TopicUpdate,
    TopicMergeRequest,
)
from app.services.srv_topic import TopicService
from app.core.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()


@router.get(
    "",
    response_model=DataResponse[List[TopicListItem]],
    summary="Liệt kê và tìm kiếm topics trong workspace",
)
async def list_topics(
    query: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    workspace_id: uuid.UUID = Depends(get_current_workspace_id),
):
    try:
        topics = await TopicService.get_topics(
            workspace_id=str(workspace_id),
            query=query,
            status=status,
            limit=limit,
            offset=offset
        )
        return DataResponse[List[TopicListItem]].success_response(data=topics)
    except Exception as e:
        logger.error(f"Error listing topics: {e}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi liệt kê chủ đề: {str(e)}"
        )


@router.get(
    "/{topic_id_or_slug}",
    response_model=DataResponse[TopicDetailResponse],
    summary="Chi tiết một topic cùng các tri thức liên kết",
)
async def get_topic(
    topic_id_or_slug: str,
    db: AsyncSession = Depends(get_db),
    workspace_id: uuid.UUID = Depends(get_current_workspace_id),
):
    try:
        topic_detail = await TopicService.get_topic_detail(
            workspace_id=str(workspace_id),
            topic_id_or_slug=topic_id_or_slug,
            main_db=db
        )
        if not topic_detail:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Chủ đề không tồn tại."
            )
        return DataResponse[TopicDetailResponse].success_response(data=topic_detail)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching topic detail: {e}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi lấy chi tiết chủ đề: {str(e)}"
        )


@router.put(
    "/{topic_id}",
    response_model=DataResponse[Any],
    summary="Cập nhật thông tin topic",
)
async def update_topic(
    topic_id: str,
    payload: TopicUpdate,
    workspace_id: uuid.UUID = Depends(get_current_workspace_id),
    _role: str = Depends(
        require_roles([WorkspaceRole.owner, WorkspaceRole.admin])
    ),
):
    try:
        updated = await TopicService.update_topic(
            workspace_id=str(workspace_id),
            topic_id=topic_id,
            payload=payload.model_dump(exclude_unset=True)
        )
        if not updated:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Chủ đề không tồn tại."
            )
        return DataResponse[Any].success_response(data=updated)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating topic: {e}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi cập nhật chủ đề: {str(e)}"
        )


@router.post(
    "/merge",
    response_model=DataResponse[bool],
    summary="Gộp các topics trùng lặp",
)
async def merge_topics(
    payload: TopicMergeRequest,
    workspace_id: uuid.UUID = Depends(get_current_workspace_id),
    _role: str = Depends(
        require_roles([WorkspaceRole.owner, WorkspaceRole.admin])
    ),
):
    try:
        if not payload.source_topic_ids:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Danh sách chủ đề nguồn không được để trống."
            )

        success = await TopicService.merge_topics(
            workspace_id=str(workspace_id),
            target_topic_id=payload.target_topic_id,
            source_topic_ids=payload.source_topic_ids
        )
        return DataResponse[bool].success_response(data=success)
    except ValueError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error merging topics: {e}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi gộp chủ đề: {str(e)}"
        )


@router.post(
    "/{topic_id}/re-summarize",
    response_model=DataResponse[bool],
    summary="Yêu cầu tóm tắt lại chủ đề qua Temporal workflow",
)
async def re_summarize_topic(
    topic_id: str,
    workspace_id: uuid.UUID = Depends(get_current_workspace_id),
    _role: str = Depends(
        require_roles([WorkspaceRole.owner, WorkspaceRole.admin])
    ),
):
    try:
        await TopicService.request_re_summarize(str(workspace_id), topic_id)
        return DataResponse[bool].success_response(data=True)
    except Exception as e:
        logger.error(f"Error re-summarizing topic: {e}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi tóm tắt lại chủ đề: {str(e)}"
        )
