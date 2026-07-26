"""
Service quản lý file trên Google Cloud Storage (GCS).
Path format: {workspace_id}/knowledge-base/{document_id}/{filename}
"""
import os
import uuid
from typing import Optional

from google.cloud import storage
from google.api_core import exceptions as google_exceptions
from google.oauth2.credentials import Credentials

from app.core.config import settings
from app.core.logger import get_logger

logger = get_logger(__name__)

_storage_client: Optional[storage.Client] = None


def _get_client() -> storage.Client:
    global _storage_client
    if _storage_client is None:
        if os.getenv("STORAGE_EMULATOR_HOST"):
            _storage_client = storage.Client(
                project=os.getenv("GOOGLE_CLOUD_PROJECT"),
                credentials=Credentials(token="owner"),
            )
        else:
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
            client = _get_client()
            bucket = client.bucket(settings.GCS_BUCKET_NAME)
            blob = bucket.blob(gcs_path)
            try:
                blob.upload_from_string(file_content, content_type=content_type)
            except google_exceptions.NotFound:
                # Bucket does not exist, try to create it
                logger.info(f"Bucket {settings.GCS_BUCKET_NAME} not found. Attempting to create it...")
                try:
                    client.create_bucket(bucket)
                    # Retry upload
                    blob.upload_from_string(file_content, content_type=content_type)
                except google_exceptions.Forbidden as e:
                    logger.error(f"Permission denied when creating GCS bucket {settings.GCS_BUCKET_NAME}: {e}")
                    raise ValueError(
                        f"Không tìm thấy bucket lưu trữ '{settings.GCS_BUCKET_NAME}' và không có quyền tự tạo mới. "
                        "Vui lòng liên hệ quản trị viên để cấu hình GCS."
                    ) from e
                except Exception as create_exc:
                    logger.error(f"Failed to auto-create GCS bucket {settings.GCS_BUCKET_NAME}: {create_exc}")
                    raise ValueError(
                        f"Không tìm thấy bucket lưu trữ '{settings.GCS_BUCKET_NAME}' và không thể tự động tạo mới: {str(create_exc)}. "
                        "Vui lòng kiểm tra lại cấu hình GCS."
                    ) from create_exc
            except google_exceptions.GoogleAPICallError as e:
                logger.error(f"Google API error during GCS upload: {e}")
                raise ValueError(f"Lỗi dịch vụ lưu trữ đám mây Google Cloud: {e.message}") from e
            except Exception as e:
                logger.error(f"GCS upload error: {e}")
                raise ValueError(f"Lỗi tải file lên GCS: {str(e)}") from e

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
