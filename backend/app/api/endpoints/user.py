from fastapi import APIRouter, Depends
from app.core.security import verify_token
from app.schemas.sche_base import DataResponse
from pydantic import BaseModel

router = APIRouter()

class UserCreate(BaseModel):
    name: str
    email: str

@router.post("", response_model=DataResponse[dict])
async def create_user(
    user_in: UserCreate,
    current_user: dict = Depends(verify_token)
):
    """
    Example POST API to create or update a user profile.
    Requires Firebase Auth token.
    (No GET endpoint since frontend queries Firestore directly).
    """
    # Logic to save to Firestore via Firedantic models would go here
    return DataResponse.custom_response(
        code="200", 
        message="User action handled successfully", 
        data={"uid": current_user.get("uid"), "email": user_in.email, "name": user_in.name}
    )

@router.put("/{user_id}", response_model=DataResponse[dict])
async def update_user(
    user_id: str,
    user_in: UserCreate,
    current_user: dict = Depends(verify_token)
):
    """
    Example PUT API to update a user.
    """
    return DataResponse.custom_response(
        code="200",
        message="User updated successfully",
        data={"user_id": user_id, "updated": True}
    )

@router.delete("/{user_id}", response_model=DataResponse[dict])
async def delete_user(
    user_id: str,
    current_user: dict = Depends(verify_token)
):
    """
    Example DELETE API.
    """
    return DataResponse.custom_response(
        code="200",
        message="User deleted successfully",
        data={"user_id": user_id, "deleted": True}
    )
