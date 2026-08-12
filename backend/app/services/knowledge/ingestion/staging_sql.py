"""SQL statements used by deterministic base staging."""

SELECT_SOURCE = """
SELECT 1
FROM document_revisions AS revision
JOIN ingestion_runs AS run
  ON run.workspace_id = revision.workspace_id
 AND run.revision_id = revision.revision_id
WHERE revision.workspace_id = :workspace_id
  AND revision.revision_id = :revision_id
  AND revision.source_id = :source_id
  AND revision.document_id = :document_id
  AND revision.content_checksum = :content_checksum
  AND revision.acl_checksum = :acl_checksum
  AND revision.acl_scope = :acl_scope
  AND revision.acl_principal_ids = CAST(:acl_principal_ids AS jsonb)
  AND revision.state = 'staging'
  AND run.run_id = :run_id
  AND run.pipeline_version = :pipeline_version
  AND run.status IN ('pending', 'running')
FOR UPDATE OF revision, run
"""

INSERT_STAGED_CHUNK = """
INSERT INTO staged_base_chunks (
  workspace_id, ingestion_run_id, chunk_id, revision_id, source_id,
  document_id, section_id, batch_id, ordinal, section_structural_key,
  heading_path, location_kind, location_data, text, token_count, content_hash,
  parser_version, chunker_version, pipeline_version, source_name, source_type,
  source_modified_at, acl_scope, acl_principal_ids
) VALUES (
  :workspace_id, :ingestion_run_id, :chunk_id, :revision_id, :source_id,
  :document_id, :section_id, :batch_id, :ordinal, :section_structural_key,
  CAST(:heading_path AS jsonb), :location_kind, CAST(:location_data AS jsonb),
  :text, :token_count, :content_hash, :parser_version, :chunker_version,
  :pipeline_version, :source_name, :source_type, :source_modified_at,
  :acl_scope, CAST(:acl_principal_ids AS jsonb)
) ON CONFLICT (workspace_id, ingestion_run_id, chunk_id) DO NOTHING
"""

INSERT_MANIFEST = """
INSERT INTO stage_manifests (
  workspace_id, manifest_id, ingestion_run_id, stage_name, batch_id,
  pipeline_version, input_checksum, output_checksum, item_count
) VALUES (
  :workspace_id, :manifest_id, :run_id, :stage_name, :batch_id,
  :pipeline_version, :input_checksum, :output_checksum, :item_count
) ON CONFLICT (
  workspace_id, ingestion_run_id, stage_name, batch_id, pipeline_version
) DO NOTHING
"""

SELECT_MANIFEST = """
SELECT input_checksum, output_checksum, item_count
FROM stage_manifests
WHERE workspace_id = :workspace_id
  AND ingestion_run_id = :run_id
  AND stage_name = :stage_name
  AND batch_id = :batch_id
  AND pipeline_version = :pipeline_version
"""
