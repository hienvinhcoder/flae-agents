from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.core.security import get_current_user
from app.schemas.sche_base import DataResponse
from app.schemas.sche_workspace import (
    WorkspaceItemResponse,
    WorkspaceManualCreateRequest
)
from app.services.workspace_srv import WorkspaceService

router = APIRouter()

@router.post("/manual", response_model=DataResponse[WorkspaceItemResponse])
async def create_manual_workspace(
    request: WorkspaceManualCreateRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Tạo workspace thủ công và sinh data mặc định.
    """
    workspace = await WorkspaceService.create_manual_workspace(db, request, current_user.firebase_uid)
    
    # Ensure ID is string for response validation if needed
    workspace_dict = {k: v for k, v in workspace.__dict__.items() if not k.startswith('_')}
    workspace_dict['id'] = str(workspace.id) if workspace.id else ""
    
    return DataResponse[WorkspaceItemResponse].success_response(
        data=WorkspaceItemResponse(**workspace_dict)
    )

