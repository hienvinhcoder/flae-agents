import re
from typing import Dict, List, Tuple, Any
from collections import Counter

from app.agents.shared.prompts import TUPLE_DELIMITER, COMPLETION_DELIMITER
from app.utils import clean_entity_name
from app.services.knowledge.extraction.utils import get_entity_id, get_relation_id


def parse_extraction_output(
    raw_text: str, chunk_id: str
) -> Tuple[List[Dict], List[Dict], List[Dict]]:
    """Parse LLM output thành entities, relations và domains."""
    entities: list[dict] = []
    relations: list[dict] = []
    domains: list[dict] = []

    lines = [line.strip() for line in raw_text.split(COMPLETION_DELIMITER)[0].split("\n") if line.strip()]

    for line in lines:
        parts = line.split(TUPLE_DELIMITER)
        if parts[0].lower() == "entity" and len(parts) == 4:
            entity_name = clean_entity_name(parts[1])
            entities.append({
                "entity_id": get_entity_id(entity_name),
                "entity_name": entity_name,
                "entity_type": clean_entity_name(parts[2]),
                "description": parts[3].strip(),
                "source_chunk_id": chunk_id,
            })
        elif parts[0].lower() == "relation" and len(parts) == 5:
            src = clean_entity_name(parts[1])
            tgt = clean_entity_name(parts[2])
            source, target = sorted((src, tgt))
            relations.append({
                "relation_id": get_relation_id(src, tgt),
                "source": source,
                "target": target,
                "keywords": parts[3].strip(),
                "description": parts[4].strip(),
                "source_chunk_id": chunk_id,
            })
        elif parts[0].lower() == "domain" and len(parts) == 3:
            name = clean_entity_name(parts[1])
            domains.append({
                "name": name,
                "description": parts[2].strip(),
                "source_chunk_id": chunk_id,
            })

    return entities, relations, domains


def merge_entities(entities: List[Dict]) -> List[Dict]:
    """Merge entities trùng tên, tính frequency."""
    grouped: dict[str, list[dict]] = {}
    for e in entities:
        norm_name = clean_entity_name(e["entity_name"]).lower()
        grouped.setdefault(norm_name, []).append(e)

    merged = []
    for norm_name, group in grouped.items():
        main = max(group, key=lambda x: len(x["description"]))
        main = main.copy()
        main["entity_name"] = clean_entity_name(main["entity_name"])
        main["entity_id"] = get_entity_id(norm_name)
        main["entity_type"] = Counter([e["entity_type"] for e in group]).most_common(1)[0][0]
        main["source_chunk_ids"] = list({e["source_chunk_id"] for e in group})
        main["frequency"] = len(group)
        main["chunk_descriptions"] = {
            e["source_chunk_id"]: e["description"]
            for e in group if e.get("source_chunk_id")
        }
        main.pop("source_chunk_id", None)
        merged.append(main)

    return merged


def merge_relations(relations: List[Dict]) -> List[Dict]:
    """Merge relations trùng source-target, tính frequency."""
    grouped: dict[tuple, list[dict]] = {}
    for r in relations:
        src_norm = clean_entity_name(r["source"]).lower()
        tgt_norm = clean_entity_name(r["target"]).lower()
        key = tuple(sorted((src_norm, tgt_norm)))
        grouped.setdefault(key, []).append(r)

    merged = []
    for key, group in grouped.items():
        main = max(group, key=lambda x: len(x["description"]))
        main = main.copy()
        main["source"] = clean_entity_name(main["source"])
        main["target"] = clean_entity_name(main["target"])
        main["relation_id"] = get_relation_id(key[0], key[1])
        main["description"] = " | ".join({r["description"] for r in group})
        main["keywords"] = ", ".join({r["keywords"] for r in group})
        main["source_chunk_ids"] = list({r["source_chunk_id"] for r in group})
        main["frequency"] = len(group)
        main["chunk_meta"] = {
            r["source_chunk_id"]: {
                "description": r["description"],
                "keywords": r["keywords"]
            } for r in group if r.get("source_chunk_id")
        }
        main.pop("source_chunk_id", None)
        merged.append(main)

    return merged
