"""
Service quản lý file trên Google Cloud Storage (GCS).
Path format: {workspace_id}/knowledge-base/{document_id}/{filename}
"""
import uuid
from typing import Optional

from google.cloud import storage

from app.core.config import settings
from app.core.logger import get_logger

logger = get_logger(__name__)

_storage_client: Optional[storage.Client] = None


def _get_client() -> storage.Client:
    global _storage_client
    if _storage_client is None:
        _storage_client = storage.Client()
    return _storage_client


def _get_bucket() -> storage.Bucket:
    client = _get_client()
    return client.bucket(settings.GCS_BUCKET_NAME)


class GCSStorageService:
    @staticmethod
    def build_gcs_path(
        workspace_id: uuid.UUID, document_id: uuid.UUID, file_name: str
    ) -> str:
        """Tạo đường dẫn GCS cho file."""
        return f"{workspace_id}/knowledge-base/{document_id}/{file_name}"

    @staticmethod
    async def upload_file(
        workspace_id: uuid.UUID,
        document_id: uuid.UUID,
        file_name: str,
        file_content: bytes,
        content_type: str = "application/octet-stream",
    ) -> str:
        """
        Upload file lên GCS. Trả về gcs_path (relative path, không bao gồm bucket).
        Chạy sync I/O trong executor để không block event loop.
        """
        import asyncio

        gcs_path = GCSStorageService.build_gcs_path(workspace_id, document_id, file_name)

        def _sync_upload():
            bucket = _get_bucket()
            blob = bucket.blob(gcs_path)
            blob.upload_from_string(file_content, content_type=content_type)
            logger.info(
                f"Uploaded file to GCS: gs://{settings.GCS_BUCKET_NAME}/{gcs_path}"
            )
            return gcs_path

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _sync_upload)

    @staticmethod
    def download_file_sync(gcs_path: str) -> bytes:
        """Download file từ GCS (sync - dùng trong Temporal activities)."""
        bucket = _get_bucket()
        blob = bucket.blob(gcs_path)
        content = blob.download_as_bytes()
        logger.info(
            f"Downloaded file from GCS: gs://{settings.GCS_BUCKET_NAME}/{gcs_path}"
        )
        return content

    @staticmethod
    async def delete_file(gcs_path: str) -> None:
        """Xóa file trên GCS."""
        import asyncio

        def _sync_delete():
            bucket = _get_bucket()
            blob = bucket.blob(gcs_path)
            if blob.exists():
                blob.delete()
                logger.info(
                    f"Deleted file from GCS: gs://{settings.GCS_BUCKET_NAME}/{gcs_path}"
                )

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _sync_delete)
