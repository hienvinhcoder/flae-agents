import firebase_admin
from firebase_admin import auth, credentials
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings

security = HTTPBearer()

try:
    if settings.GOOGLE_APPLICATION_CREDENTIALS:
        cred = credentials.Certificate(settings.GOOGLE_APPLICATION_CREDENTIALS)
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app()
except ValueError:
    # Firebase app already initialized
    pass


async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Verify Firebase JWT token from Authorization Header.
    Frontend should send `Authorization: Bearer <token>`.
    Returns the decoded token payload (dict).
    """
    token = credentials.credentials
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


from app.models.user import User
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound
from app.db.database import get_db


async def get_current_user_uid(decoded_token: dict = Depends(verify_token)) -> str:
    """
    Extracts firebase_uid from the decoded Firebase JWT token.
    """
    uid = decoded_token.get("uid")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token does not contain a valid user ID",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return uid


async def get_current_user(
    firebase_uid: str = Depends(get_current_user_uid), db: AsyncSession = Depends(get_db)
) -> User:
    """
    Retrieves the full User object from the database using the firebase_uid.
    This should be used for endpoints that require the user to be fully synced.
    """
    try:
        result = await db.execute(select(User).where(User.firebase_uid == firebase_uid))
        user = result.scalar_one()
    except NoResultFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found in database. Please sync user first."
        )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")

    return user


import json
import uuid
from app.db.database import redis_client
from app.models.workspace import WorkspaceRole, WorkspaceMember, WorkspaceMemberStatus

async def get_current_workspace_id(
    x_workspace_id: str = Header(None, alias="X-Workspace-ID"),
    user_uid: str = Depends(get_current_user_uid),
    db: AsyncSession = Depends(get_db)
) -> uuid.UUID:
    """
    Extract and validate current workspace ID from headers.
    Checks Redis cache first, then DB, verifies user is an active member.
    """
    if not x_workspace_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Header X-Workspace-ID is missing"
        )
    
    try:
        workspace_uuid = uuid.UUID(x_workspace_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid workspace ID format"
        )

    cache_key = f"user:membership:{user_uid}"
    
    # 1. Check Redis Cache
    try:
        cached_data = await redis_client.get(cache_key)
        if cached_data:
            membership = json.loads(cached_data)
            workspaces = membership.get("workspaces", [])
            for ws in workspaces:
                if ws["workspace_id"] == str(workspace_uuid):
                    if ws["status"] == WorkspaceMemberStatus.active.value:
                        return workspace_uuid
                    else:
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="You do not have access to this workspace"
                        )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this workspace"
            )
    except HTTPException:
        raise
    except Exception as e:
        # Log error but fallback to DB
        pass

    # 2. Cache Miss - Query DB
    result = await db.execute(
        select(WorkspaceMember).where(WorkspaceMember.user_uid == user_uid)
    )
    memberships = result.scalars().all()
    
    # Build cache structure
    workspaces_list = []
    user_has_access = False
    is_active = False
    
    for m in memberships:
        ws_info = {
            "workspace_id": str(m.workspace_id),
            "role": m.role.value,
            "status": m.status.value
        }
        workspaces_list.append(ws_info)
        if m.workspace_id == workspace_uuid:
            user_has_access = True
            if m.status == WorkspaceMemberStatus.active:
                is_active = True
                
    # Write to Redis Cache
    try:
        await redis_client.setex(
            cache_key,
            86400,  # 24 hours
            json.dumps({"workspaces": workspaces_list})
        )
    except Exception as e:
        pass
        
    if not user_has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this workspace"
        )
        
    if not is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this workspace"
        )
        
    return workspace_uuid


def require_roles(allowed_roles: list[WorkspaceRole]):
    """
    Dependency generator to restrict access to users with specific roles in the current workspace.
    """
    async def role_dependency(
        user_uid: str = Depends(get_current_user_uid),
        workspace_id: uuid.UUID = Depends(get_current_workspace_id),
    ):
        cache_key = f"user:membership:{user_uid}"
        cached_data = await redis_client.get(cache_key)
        
        if not cached_data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied"
            )
            
        membership = json.loads(cached_data)
        workspaces = membership.get("workspaces", [])
        
        for ws in workspaces:
            if ws["workspace_id"] == str(workspace_id):
                if ws["role"] in [role.value for role in allowed_roles]:
                    return ws["role"]
                break
                
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action"
        )
        
    return role_dependency

