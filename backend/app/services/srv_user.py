from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound
from app.models.user import User
from app.schemas.sche_user import UserCreateRequest


class UserService:
    @staticmethod
    async def create_user(db: AsyncSession, request: UserCreateRequest, token_payload: dict) -> User:
        """
        Tạo user mới trong Database sau khi xác thực qua Firebase.
        """
        firebase_uid = token_payload.get("uid")
        email = token_payload.get("email")

        if not firebase_uid or not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Token không chứa đủ thông tin uid hoặc email"
            )

        # Kiểm tra user đã tồn tại qua firebase_uid
        try:
            result = await db.execute(select(User).where(User.firebase_uid == firebase_uid))
            existing_user = result.scalar_one()

            # Nếu đã tồn tại, kiểm tra và cập nhật login_provider
            if request.login_provider not in existing_user.login_providers:
                existing_user.login_providers = existing_user.login_providers + [request.login_provider]
                await db.commit()
                await db.refresh(existing_user)
            return existing_user
        except NoResultFound:
            pass

        new_user = User(
            firebase_uid=firebase_uid,
            email=email,
            full_name=request.full_name,
            avatar_url=request.avatar_url,
            login_providers=[request.login_provider],
        )

        # Lưu vào PostgreSQL
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)

        return new_user
