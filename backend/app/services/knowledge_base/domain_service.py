"""Knowledge Domain service: resolve, merge, fuse, and list domains."""

import hashlib

from app.core.logger import get_logger
from app.utils import clean_entity_name

logger = get_logger(__name__)


def get_domain_id(name: str) -> str:
    """Generate deterministic domain ID from normalized name (case-insensitive)."""
    name_clean = clean_entity_name(name).lower()
    return f"dom-{hashlib.md5(name_clean.encode('utf-8')).hexdigest()}"


def merge_domains(domains: list[dict]) -> list[dict]:
    """
    Merge duplicate domain names. Return list of merged domain dicts
    with: name, description, source_chunk_ids, frequency, descriptions.
    """
    grouped: dict[str, list[dict]] = {}
    for d in domains:
        key = clean_entity_name(d["name"]).lower()
        grouped.setdefault(key, []).append(d)

    merged = []
    for key, group in grouped.items():
        # Pick name from most frequent or first
        name = clean_entity_name(group[0]["name"])
        source_chunks = list({d["source_chunk_id"] for d in group if d.get("source_chunk_id")})
        descriptions = list({d["description"].strip() for d in group if d.get("description") and d["description"].strip()})

        merged.append({
            "name": name,
            "descriptions": descriptions,
            "source_chunk_ids": source_chunks,
            "frequency": len(group),
        })

    return merged
