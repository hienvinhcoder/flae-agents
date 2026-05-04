import firebase_admin
from firebase_admin import auth
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

try:
    # Automatically uses GOOGLE_APPLICATION_CREDENTIALS for initialization
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
