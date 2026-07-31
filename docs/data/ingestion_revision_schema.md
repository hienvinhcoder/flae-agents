# RAG ingestion revision schema

The RAG database stores immutable document revisions before any derived graph or
discovery projection. Connector identity is unique by workspace, source,
external document identity, and source version key. Content and ACL checksums
are recorded separately so an ACL-only change still creates a new revision.

`document_revisions.state` controls base visibility. A revision can become
`searchable` only when `base_readiness=ready`; graph and discovery readiness are
orthogonal and may remain pending or fail without removing base search.

`ingestion_runs` identifies a replay by revision, pipeline version, and input
checksum. `stage_manifests` identifies one stage batch and records immutable
input/output checksums and item count. Duplicate writes use the database unique
keys with `ON CONFLICT DO NOTHING`; a retry cannot increment counts.

## Legacy backfill and recovery

The `rag_0002` migration groups existing chunks by workspace and source document
and creates one deterministic synthetic searchable revision per document. The
content checksum is derived from ordered chunk IDs and text; the ACL checksum is
derived from the legacy workspace/document boundary. Existing chunk rows are not
changed by this migration, so legacy visibility remains intact.

Downgrade removes only the revision/run/manifest metadata. It does not delete or
rewrite legacy chunks. If upgrade verification fails, roll back the migration
transaction, correct the migration, and rerun; do not hand-edit synthetic rows.

## Chunk provenance and current visibility

Each chunk points to one immutable revision and records its source/document IDs,
optional structural section, typed location payload, content hash, parser and
chunker versions, source timestamps, and ACL projection. New chunk IDs are
derived from revision, structural key, typed location, normalized content, and
chunker version. They are not based on array position.

`current_chunks` is a `security_invoker` view. It returns only revisions with
`state=searchable` and `base_readiness=ready`; PostgreSQL applies the caller's
RLS policies to both the chunk and revision underneath the view. Superseded or
tombstoned revisions therefore disappear without rewriting chunk evidence.

## Evidence and authorization

Entity observations and assertions are revision/chunk scoped. Database checks
enforce ordered spans, confidence bounds, complete resolution metadata,
exactly-one assertion object, polarity, temporal validity, typed qualifiers,
and deterministic evidence keys. Multiple predicates remain separate rows.

The application assumes the non-owner `flae_rag_app` role. Workspace and subject
IDs are installed as transaction-local settings before every repository query.
Missing context is default-deny. Restricted revisions/chunks require the subject
in `acl_principal_ids`; observations and assertions inherit the chunk ACL.
Legacy discovery tables remain default-deny until evidence-backed discovery
snapshots are implemented, preventing inaccessible summaries or counts from
leaking during the transition.

Revision identity/checksum/ACL fields are protected by an immutability trigger.
The application role may update only lifecycle/readiness columns. Assertion,
qualifier, and stage-manifest rows are insert/select only; observation resolver
fields may be updated without mutating the extracted evidence.

## Base staging, atomic publish, and Workflow V2

`staged_base_chunks` holds revision-scoped parse output and embeddings before
publication. Stable chunk and section IDs derive from revision identity,
structural location, normalized text, and versioned parser/chunker inputs.
Parse and embed manifests are immutable. Retries compare the existing rows and
checksums; divergent retries fail closed instead of overwriting evidence.

Publishing validates the exact parse/embed manifest set and non-null embeddings,
copies sections/chunks, supersedes the prior current revision, marks the new
revision searchable, and completes the ingestion run in one RAG transaction.
Any failure rolls back all visibility changes. Tombstoning a revision removes it
from `current_chunks` immediately, while authorized resource/span reads still
pass through the subject-scoped `flae_rag_app` repository.

Internal staging and publish operations assume `flae_rag_ingestion`, a NOLOGIN,
NOINHERIT, NOBYPASSRLS role. Its policy is workspace-scoped and its grants omit
DELETE and immutable-evidence updates. This lets an ACL change supersede a prior
revision without borrowing an end-user principal or bypassing tenant RLS.

`IngestionWorkflowV2` carries only GCS references, UUIDs, counts, and checksums.
All file, database, embedding, and status side effects run in heartbeat-enabled
activities. V2 uses `flae-ingestion-v2-queue` and a dedicated worker with bounded
workflow/activity concurrency and task-queue rate. V1 stays registered on
`flae-default-queue`; new checksummed GCS starts switch to V2 only when
`INGESTION_V2_ENABLED=true`.

Rollout order: migrate both core and RAG databases, start the ingestion worker
with the flag still false, verify V1 replay, enable the worker, then canary the
feature flag. Roll back by disabling new V2 starts and leaving both workflow
types registered until all V2 histories complete; do not downgrade tables while
executions still reference staged rows.
