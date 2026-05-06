from fastapi import HTTPException, status
from app.models.user import User
from app.schemas.sche_user import UserCreateRequest

class UserService:
    @staticmethod
    async def create_user(request: UserCreateRequest, token_payload: dict) -> User:
        """
        Tạo user mới trong Firestore sau khi xác thực qua Firebase.
        """
        firebase_uid = token_payload.get("uid")
        email = token_payload.get("email")

        if not firebase_uid or not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token không chứa đủ thông tin uid hoặc email"
            )

        # Kiểm tra user đã tồn tại qua firebase_uid
        try:
            # Firedantic throws Error if get_by_id not found
            existing_user = User.get_by_id(firebase_uid)
            if existing_user:
                # Nếu đã tồn tại, kiểm tra và cập nhật login_provider
                if request.login_provider not in existing_user.login_providers:
                    existing_user.login_providers.append(request.login_provider)
                    existing_user.save()
                return existing_user
        except Exception:
            pass

        new_user = User(
            id=firebase_uid,
            firebase_uid=firebase_uid,
            email=email,
            full_name=request.full_name,
            avatar_url=request.avatar_url,
            login_providers=[request.login_provider]
        )
        
        # Lưu vào Firestore
        new_user.save()
        
        return new_user
