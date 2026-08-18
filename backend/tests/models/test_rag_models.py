from app.models.rag.records import RagBase


def test_rag_model_metadata_contains_revision_provenance_and_evidence_tables() -> None:
    assert {
        "document_revisions",
        "ingestion_runs",
        "stage_manifests",
        "document_sections",
        "chunks",
        "entity_observations",
        "assertion_evidence",
        "assertion_qualifiers",
        "entity_resolution_runs",
        "canonical_entity_versions",
        "entity_resolution_assignments",
        "entity_resolution_lineage",
        "relationship_projection_versions",
        "canonical_relationship_versions",
        "graph_mappings",
        "graph_snapshots",
        "graph_snapshot_revisions",
    } <= set(RagBase.metadata.tables)


def test_assertion_model_keeps_subject_and_object_observation_foreign_keys() -> None:
    assertion_table = RagBase.metadata.tables["assertion_evidence"]
    foreign_key_columns = {
        tuple(constraint.column_keys)
        for constraint in assertion_table.foreign_key_constraints
    }

    assert (
        "workspace_id",
        "revision_id",
        "chunk_id",
        "subject_observation_id",
    ) in foreign_key_columns
    assert (
        "workspace_id",
        "revision_id",
        "chunk_id",
        "object_observation_id",
    ) in foreign_key_columns
