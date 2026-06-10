"""
Temporal Workflow: Document Ingestion Pipeline.
Orchestrate toàn bộ TGS-RAG pipeline từ prepare → chunk → embed → extract → fuse → finalize.
"""
import hashlib
import math
import time
from datetime import timedelta

from temporalio import workflow
from temporalio.common import RetryPolicy

with workflow.unsafe.imports_passed_through():
    from app.temporal.activities.ingestion import (
        update_document_status,
        prepare_document_content,
        chunk_document_activity,
        generate_embeddings_activity,
        extract_entities_activity,
        fuse_and_save_activity,
        finalize_ingestion,
    )


DEFAULT_RETRY = RetryPolicy(
    initial_interval=timedelta(seconds=2),
    maximum_interval=timedelta(seconds=30),
    maximum_attempts=3,
)


@workflow.defn
class DocumentIngestionWorkflow:
    """
    Orchestrate toàn bộ TGS-RAG ingestion pipeline.
    Workflow ID format: "kb-ingest-{document_id}"
    """

    @workflow.run
    async def run(self, params: dict) -> dict:
        document_id = params["document_id"]
        workspace_id = params["workspace_id"]
        doc_type = params["document_type"]
        gcs_path = params.get("gcs_path")
        content_text = params.get("content_text")
        file_name = params.get("file_name", "document")

        doc_hash = hashlib.md5(document_id.encode()).hexdigest()
        batch_size = 10
        start_time = time.time()

        total_chunks = 0
        total_entities = 0
        total_relations = 0
        token_usage = {
            "embedding_chunks": 0,
            "extraction": 0,
            "embedding_entities": 0,
            "embedding_relations": 0,
        }

        try:
            # ── Step 1: Update status → processing ──
            await workflow.execute_activity(
                update_document_status,
                {
                    "document_id": document_id,
                    "status": "processing",
                },
                start_to_close_timeout=timedelta(seconds=30),
            )

            # ── Step 2: Prepare content ──
            raw_text = await workflow.execute_activity(
                prepare_document_content,
                {
                    "document_type": doc_type,
                    "gcs_path": gcs_path,
                    "content_text": content_text,
                    "file_name": file_name,
                },
                start_to_close_timeout=timedelta(minutes=5),
                retry_policy=DEFAULT_RETRY,
            )

            # ── Step 3: Chunking ──
            chunks = await workflow.execute_activity(
                chunk_document_activity,
                {
                    "raw_text": raw_text,
                    "doc_hash": doc_hash,
                    "strategy": "semantic",
                    "chunk_size": 1200,
                    "chunk_overlap": 100,
                },
                start_to_close_timeout=timedelta(minutes=2),
            )

            if not chunks:
                raise ValueError("Không tạo được chunk nào từ tài liệu")

            # ── Step 4: Batch Processing ──
            num_batches = math.ceil(len(chunks) / batch_size)

            for batch_idx in range(0, len(chunks), batch_size):
                batch = chunks[batch_idx : batch_idx + batch_size]
                current = batch_idx // batch_size + 1

                # 4.1 Generate embeddings
                embedded_chunks = await workflow.execute_activity(
                    generate_embeddings_activity,
                    {"chunks": batch},
                    start_to_close_timeout=timedelta(minutes=5),
                    retry_policy=DEFAULT_RETRY,
                )

                # 4.2 Extract entities & relations
                extraction_result = await workflow.execute_activity(
                    extract_entities_activity,
                    {"chunks": embedded_chunks},
                    start_to_close_timeout=timedelta(minutes=10),
                    retry_policy=DEFAULT_RETRY,
                )

                entities = extraction_result.get("entities", [])
                relations = extraction_result.get("relations", [])
                token_usage["extraction"] += extraction_result.get(
                    "tokens_used", 0
                )

                # 4.3 Fuse & Save to rag_db
                save_result = await workflow.execute_activity(
                    fuse_and_save_activity,
                    {
                        "workspace_id": workspace_id,
                        "chunks": embedded_chunks,
                        "entities": entities,
                        "relations": relations,
                        "source_doc_name": doc_hash,
                    },
                    start_to_close_timeout=timedelta(minutes=5),
                    retry_policy=DEFAULT_RETRY,
                )

                total_chunks += save_result.get("chunk_count", 0)
                total_entities += save_result.get("entity_count", 0)
                total_relations += save_result.get("relation_count", 0)

            # ── Step 5: Finalize ──
            processing_time = time.time() - start_time

            await workflow.execute_activity(
                finalize_ingestion,
                {
                    "document_id": document_id,
                    "metrics": {
                        "total_chunks": total_chunks,
                        "total_entities": total_entities,
                        "total_relations": total_relations,
                        "token_usage": token_usage,
                        "processing_time": round(processing_time, 2),
                    },
                },
                start_to_close_timeout=timedelta(seconds=30),
            )

            return {
                "status": "completed",
                "total_chunks": total_chunks,
                "total_entities": total_entities,
                "total_relations": total_relations,
                "processing_time": round(processing_time, 2),
            }

        except Exception as e:
            # Cập nhật status → failed với error message
            await workflow.execute_activity(
                update_document_status,
                {
                    "document_id": document_id,
                    "status": "failed",
                    "error_message": str(e)[:1000],
                },
                start_to_close_timeout=timedelta(seconds=30),
            )
            raise
