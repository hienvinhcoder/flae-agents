import json
import uuid
from fastapi import APIRouter, Depends, Query, HTTPException, status, Header
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logger import get_logger
from app.core.config import settings
from app.db.database import get_db
from app.services.workspace_srv import WorkspaceService
from app.services.chat_srv import ChatService

logger = get_logger(__name__)

router = APIRouter()

# Thao tác bảo mật cho EventSource (hỗ trợ cả header và query parameter)
security_optional = HTTPBearer(auto_error=False)


async def verify_token_stream(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_optional),
    token: str | None = Query(None)
) -> str:
    """
    Xác thực Firebase Token từ Header hoặc Query Parameter.
    Trả về firebase_uid nếu hợp lệ.
    """
    raw_token = None
    if credentials:
        raw_token = credentials.credentials
    elif token:
        raw_token = token

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Thiếu ID Token để xác thực",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        decoded_token = auth.verify_id_token(raw_token, clock_skew_seconds=settings.FIREBASE_CLOCK_SKEW_SECONDS)
        uid = decoded_token.get("uid")
        if not uid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token không hợp lệ (thiếu uid)"
            )
        return uid
    except Exception as e:
        logger.error(f"Xác thực token stream thất bại: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ID Token không hợp lệ hoặc đã hết hạn",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def verify_workspace_access_stream(
    workspace_id: uuid.UUID,
    user_uid: str = Depends(verify_token_stream),
    db: AsyncSession = Depends(get_db)
) -> uuid.UUID:
    """
    Xác minh quyền truy cập của user đối với workspace.
    """
    is_member = await WorkspaceService.is_active_member(db, workspace_id, user_uid)
    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền truy cập workspace này"
        )
    return workspace_id


@router.get("/{agent_id}/sessions/{session_id}/stream", summary="Stream hội thoại qua Server-Sent Events (SSE)")
async def stream_chat(
    agent_id: uuid.UUID,
    session_id: uuid.UUID,
    message: str = Query(..., min_length=1, description="Tin nhắn của người dùng"),
    user_uid: str = Depends(verify_token_stream),
    workspace_id: uuid.UUID = Depends(verify_workspace_access_stream),
):
    """
    Endpoint SSE trả về dòng sự kiện (stream tokens) của Agent trả lời câu hỏi RAG.
    """
    try:
        generator = ChatService.stream_chat(
            workspace_id=workspace_id,
            agent_id=agent_id,
            session_id=session_id,
            user_uid=user_uid,
            user_message=message
        )
        return StreamingResponse(
            generator,
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"  # Hỗ trợ Nginx buffering bypass
            }
        )
    except Exception as e:
        logger.error(f"Lỗi khởi chạy stream SSE: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Không thể khởi động luồng stream: {str(e)}"
        )
