import firebase_admin
from firebase_admin import auth, credentials
from fastapi import Depends, HTTPException, status
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
