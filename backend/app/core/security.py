import firebase_admin
from firebase_admin import auth, credentials
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings
from app.core.logger import get_logger

logger = get_logger(__name__)

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
        decoded_token = auth.verify_id_token(token, clock_skew_seconds=settings.FIREBASE_CLOCK_SKEW_SECONDS)
        return decoded_token
    except Exception as e:
        logger.error(f"Firebase token verification failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token or expired session",
            headers={"WWW-Authenticate": "Bearer"},
        )


from app.models.user import User
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
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
    workspace_id: uuid.UUID | None = None,
    x_workspace_id: str | None = Header(None, alias="X-Workspace-ID"),
    user_uid: str = Depends(get_current_user_uid),
    db: AsyncSession = Depends(get_db)
) -> uuid.UUID:
    """
    Extract and validate current workspace ID from path or headers.
    Checks Redis cache first, then DB, verifies user is an active member.
    """
    target_workspace_id = workspace_id
    if not target_workspace_id:
        if not x_workspace_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Workspace ID is missing (neither workspace_id path param nor X-Workspace-ID header was provided)"
            )
        
        try:
            target_workspace_id = uuid.UUID(x_workspace_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid workspace ID format in header"
            )

    cache_key = f"user:membership:{user_uid}"
    
    # 1. Check Redis Cache
    try:
        cached_data = await redis_client.get(cache_key)
        if cached_data:
            membership = json.loads(cached_data)
            workspaces = membership.get("workspaces", [])
            for ws in workspaces:
                if ws["workspace_id"] == str(target_workspace_id):
                    if ws["status"] == WorkspaceMemberStatus.active.value:
                        return target_workspace_id
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
        if m.workspace_id == target_workspace_id:
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
        
    return target_workspace_id


def require_roles(allowed_roles: list[WorkspaceRole]):
    """
    Dependency generator to restrict access to users with specific roles in the current workspace.
    """
    async def role_dependency(
        user_uid: str = Depends(get_current_user_uid),
        workspace_id: uuid.UUID = Depends(get_current_workspace_id),
        db: AsyncSession = Depends(get_db),
    ):
        cache_key = f"user:membership:{user_uid}"
        cached_data = None
        
        try:
            cached_data = await redis_client.get(cache_key)
        except Exception:
            # Fallback will handle DB query if Redis is down
            pass
            
        if cached_data:
            try:
                membership = json.loads(cached_data)
                workspaces = membership.get("workspaces", [])
                
                for ws in workspaces:
                    if ws["workspace_id"] == str(workspace_id):
                        if ws["role"] in [role.value for role in allowed_roles]:
                            return ws["role"]
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="You do not have permission to perform this action"
                        )
            except HTTPException:
                raise
            except Exception:
                pass

        # Fallback to Database when Redis cache is missing, corrupted, or Redis is offline
        result = await db.execute(
            select(WorkspaceMember).where(
                and_(
                    WorkspaceMember.user_uid == user_uid,
                    WorkspaceMember.workspace_id == workspace_id,
                    WorkspaceMember.status == WorkspaceMemberStatus.active
                )
            )
        )
        member = result.scalar_one_or_none()
        if member:
            if member.role in allowed_roles:
                return member.role
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action"
            )
            
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied"
        )
        
    return role_dependency

