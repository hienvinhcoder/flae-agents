# tests/services/test_domain_service.py

import pytest
import hashlib


def test_get_domain_id_normalization():
    from app.services.knowledge_base.domain_service import get_domain_id

    assert get_domain_id("Technology") == get_domain_id("technology")
    assert get_domain_id("  Tech  ") == get_domain_id("Tech")
    assert get_domain_id("AI & ML") == get_domain_id("ai & ml")


def test_get_domain_id_format():
    from app.services.knowledge_base.domain_service import get_domain_id

    did = get_domain_id("Technology")
    assert did.startswith("dom-")
    assert len(did) == 36  # "dom-" (4) + 32-char md5 hex


def test_merge_domains_groups_and_counts():
    from app.services.knowledge_base.domain_service import merge_domains

    domains = [
        {"name": "Tech", "description": "First", "source_chunk_id": "c1"},
        {"name": "Tech", "description": "Second", "source_chunk_id": "c2"},
        {"name": "Business", "description": "Biz", "source_chunk_id": "c3"},
    ]
    merged = merge_domains(domains)

    assert len(merged) == 2
    tech = next(m for m in merged if m["name"] == "Tech")
    assert tech["frequency"] == 2
    assert set(tech["source_chunk_ids"]) == {"c1", "c2"}
    assert len(tech["descriptions"]) == 2


def test_merge_domains_empty():
    from app.services.knowledge_base.domain_service import merge_domains

    assert merge_domains([]) == []
