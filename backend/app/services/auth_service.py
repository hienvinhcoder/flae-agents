from app.models.user import User
from app.schemas.auth import UserSyncRequest
from app.core.logger import get_logger
from firedantic.exceptions import ModelNotFoundError

logger = get_logger(__name__)


class AuthService:
    @staticmethod
    async def sync_firebase_user(firebase_uid: str, sync_data: UserSyncRequest) -> User:
        """
        Sync user data from Firebase to Firestore.
        If user exists, update if necessary (e.g., adding a new login provider).
        If user does not exist, create a new one.
        """
        # Find user by document ID (which is firebase_uid)
        try:
            user = User.get_by_doc_id(firebase_uid)
        except ModelNotFoundError:
            user = None

        if user:
            # User exists
            action = "updated"
            needs_save = False

            # Check if login_provider needs to be added
            if sync_data.login_provider not in user.login_providers:
                user.login_providers.append(sync_data.login_provider)
                needs_save = True

            # Optionally update profile info if it was missing
            if not user.full_name and sync_data.full_name:
                user.full_name = sync_data.full_name
                needs_save = True
            if not user.avatar_url and sync_data.avatar_url:
                user.avatar_url = sync_data.avatar_url
                needs_save = True

            if needs_save:
                user.save()
        else:
            # Create new user with custom document ID
            user = User(
                id=firebase_uid,
                firebase_uid=firebase_uid,
                email=sync_data.email,
                full_name=sync_data.full_name,
                avatar_url=sync_data.avatar_url,
                login_providers=[sync_data.login_provider],
                is_active=True,
            )
            user.save()
            action = "created"

        logger.info(f"User synced successfully: firebase_uid={firebase_uid}, action={action}")
        return user


auth_service = AuthService()
