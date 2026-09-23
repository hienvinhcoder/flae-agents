"""Fusion must not emit duplicate entity_ids for case-variant names."""

from __future__ import annotations

from unittest.mock import MagicMock

import pandas as pd
import pytest

from app.services.knowledge.extraction.fusion import run_incremental_fusion
from app.services.knowledge.extraction.utils import get_entity_id


@pytest.fixture
def db_manager() -> MagicMock:
    manager = MagicMock()
    manager.schema = "public"
    manager.load_df.return_value = pd.DataFrame()
    manager.get_conn.return_value = MagicMock()
    return manager


def test_fusion_does_not_duplicate_entity_id_for_case_variant_relation_names(
    db_manager: MagicMock,
) -> None:
    apple_id = get_entity_id("Apple")
    entities = [
        {
            "entity_id": apple_id,
            "entity_name": "Apple",
            "entity_type": "ORGANIZATION",
            "description": "A technology company",
            "source_chunk_ids": ["c1"],
            "frequency": 1,
            "chunk_descriptions": {"c1": "A technology company"},
        }
    ]
    relations = [
        {
            "relation_id": "rel-1",
            "source": "apple",
            "target": "iPhone",
            "keywords": "makes",
            "description": "Apple makes iPhone",
            "source_chunk_ids": ["c1"],
            "frequency": 1,
            "chunk_meta": {},
        }
    ]

    final_entities, final_relations, _tokens, _touched = run_incremental_fusion(
        workspace_id="ws-1",
        new_entities=entities,
        new_relations=relations,
        db_manager=db_manager,
    )

    entity_ids = [e["entity_id"] for e in final_entities]
    assert len(entity_ids) == len(set(entity_ids))
    assert apple_id in entity_ids
    assert entity_ids.count(apple_id) == 1

    apple_links = [
        r
        for r in final_relations
        if r.get("source_id") == apple_id or r.get("target_id") == apple_id
    ]
    assert apple_links, "relation endpoints must resolve to the fused Apple entity"


def test_save_df_dedupes_duplicate_primary_keys_in_one_batch() -> None:
    import pandas as pd
    from app.db.rag_db import DBManager

    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_conn.cursor.return_value = mock_cur

    db_manager = DBManager(
        db_url="postgresql+asyncpg://user:pass@host:5432/db", schema="public"
    )
    db_manager.get_conn = MagicMock(return_value=mock_conn)
    db_manager.initialize = MagicMock()

    entities_df = pd.DataFrame(
        [
            {
                "entity_id": "ent_dup",
                "entity_name": "Apple",
                "description": "first",
                "source_chunk_ids": ["c1"],
                "frequency": 1,
            },
            {
                "entity_id": "ent_dup",
                "entity_name": "apple",
                "description": "second longer description",
                "source_chunk_ids": ["c2"],
                "frequency": 1,
            },
        ]
    )

    with pytest.MonkeyPatch.context() as mp:
        captured: list[object] = []

        def capture_execute_values(_cur, _sql, values, **_kwargs):
            captured.append(values)

        mp.setattr("psycopg2.extras.execute_values", capture_execute_values)
        db_manager.save_df(
            entities_df,
            "entities",
            pk_col="entity_id",
            workspace_id="test_ws",
            overwrite=True,
        )

    assert len(captured) == 1
    assert len(captured[0]) == 1
