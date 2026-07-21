# DDL SQL definitions for RAG DB

# Các bảng chính
CREATE_CHUNKS_TABLE = """
CREATE TABLE IF NOT EXISTS {schema}.chunks (
    workspace_id TEXT NOT NULL,
    chunk_id TEXT NOT NULL,
    text TEXT,
    token_count INT,
    embedding vector({dimensions}),
    source_document_id TEXT,
    entity_ids JSONB,
    relation_ids JSONB,
    PRIMARY KEY (workspace_id, chunk_id)
) PARTITION BY LIST (workspace_id);
"""

CREATE_ENTITIES_TABLE = """
CREATE TABLE IF NOT EXISTS {schema}.entities (
    workspace_id TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    entity_name TEXT,
    entity_type TEXT,
    description TEXT,
    source_chunk_ids JSONB,
    chunk_descriptions JSONB,
    degree INT,
    frequency INT,
    embedding vector({dimensions}),
    PRIMARY KEY (workspace_id, entity_id)
) PARTITION BY LIST (workspace_id);
"""

CREATE_RELATIONSHIPS_TABLE = """
CREATE TABLE IF NOT EXISTS {schema}.relationships (
    workspace_id TEXT NOT NULL,
    relation_id TEXT NOT NULL,
    source_id TEXT,
    source_name TEXT,
    target_id TEXT,
    target_name TEXT,
    keywords TEXT,
    description TEXT,
    source_chunk_ids JSONB,
    chunk_meta JSONB,
    frequency INT,
    degree INT,
    embedding vector({dimensions}),
    PRIMARY KEY (workspace_id, relation_id)
) PARTITION BY LIST (workspace_id);
"""

# Các bảng Topics mới
CREATE_TOPICS_TABLE = """
CREATE TABLE IF NOT EXISTS {schema}.topics (
    workspace_id TEXT NOT NULL,
    topic_id TEXT NOT NULL,
    parent_topic_id TEXT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    type TEXT NOT NULL, -- 'domain' | 'topic' | 'subtopic'
    summary TEXT,
    current_state TEXT,
    status TEXT NOT NULL, -- 'active' | 'archived' | 'needs_review'
    confidence FLOAT DEFAULT 1.0,
    embedding vector({dimensions}),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (workspace_id, topic_id),
    CONSTRAINT uq_topics_workspace_slug UNIQUE (workspace_id, slug)
) PARTITION BY LIST (workspace_id);
"""

CREATE_TOPIC_MEMBERSHIPS_TABLE = """
CREATE TABLE IF NOT EXISTS {schema}.topic_memberships (
    workspace_id TEXT NOT NULL,
    membership_id TEXT NOT NULL,
    topic_id TEXT NOT NULL,
    member_type TEXT NOT NULL, -- 'chunk' | 'document' | 'entity' | 'relationship' | 'fact' | 'code_symbol' | 'stale_doc_finding'
    member_id TEXT NOT NULL,
    relevance_score FLOAT DEFAULT 1.0,
    evidence_count INT DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'inactive'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (workspace_id, membership_id),
    CONSTRAINT uq_topic_memberships_workspace_member UNIQUE (workspace_id, topic_id, member_type, member_id)
) PARTITION BY LIST (workspace_id);
"""

CREATE_TOPIC_ALIASES_TABLE = """
CREATE TABLE IF NOT EXISTS {schema}.topic_aliases (
    workspace_id TEXT NOT NULL,
    alias_id TEXT NOT NULL,
    topic_id TEXT NOT NULL,
    alias TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (workspace_id, alias_id),
    CONSTRAINT uq_topic_aliases_workspace_alias UNIQUE (workspace_id, topic_id, alias)
) PARTITION BY LIST (workspace_id);
"""

CREATE_TOPIC_UPDATE_QUEUE_TABLE = """
CREATE TABLE IF NOT EXISTS {schema}.topic_update_queue (
    workspace_id TEXT NOT NULL,
    queue_id TEXT NOT NULL,
    topic_id TEXT NOT NULL,
    reason TEXT,
    changed_member_ids JSONB, -- Mảng các member_type và member_id thay đổi
    status TEXT NOT NULL, -- 'pending' | 'processing' | 'completed' | 'failed'
    scheduled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (workspace_id, queue_id)
) PARTITION BY LIST (workspace_id);
"""

# Các câu lệnh bổ sung
CREATE_TOPIC_FOREIGN_KEYS = [
    """
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint c
            JOIN pg_namespace n ON c.connamespace = n.oid
            WHERE n.nspname = '{schema}' AND c.conname = 'fk_topic_memberships_topics'
        ) THEN
            ALTER TABLE {schema}.topic_memberships ADD CONSTRAINT fk_topic_memberships_topics
            FOREIGN KEY (workspace_id, topic_id) REFERENCES {schema}.topics (workspace_id, topic_id) ON DELETE CASCADE;
        END IF;
    END
    $$;
    """,
    """
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint c
            JOIN pg_namespace n ON c.connamespace = n.oid
            WHERE n.nspname = '{schema}' AND c.conname = 'fk_topic_aliases_topics'
        ) THEN
            ALTER TABLE {schema}.topic_aliases ADD CONSTRAINT fk_topic_aliases_topics
            FOREIGN KEY (workspace_id, topic_id) REFERENCES {schema}.topics (workspace_id, topic_id) ON DELETE CASCADE;
        END IF;
    END
    $$;
    """,
    """
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint c
            JOIN pg_namespace n ON c.connamespace = n.oid
            WHERE n.nspname = '{schema}' AND c.conname = 'fk_topic_update_queue_topics'
        ) THEN
            ALTER TABLE {schema}.topic_update_queue ADD CONSTRAINT fk_topic_update_queue_topics
            FOREIGN KEY (workspace_id, topic_id) REFERENCES {schema}.topics (workspace_id, topic_id) ON DELETE CASCADE;
        END IF;
    END
    $$;
    """
]

CREATE_RLS_POLICY_TEMPLATE = """
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = '{schema}' 
          AND tablename = '{table_name}' 
          AND policyname = '{policy_name}'
    ) THEN
        CREATE POLICY {policy_name} ON {schema}.{table_name}
        USING (workspace_id = current_setting('app.current_workspace_id', true));
    END IF;
END
$$;
"""
