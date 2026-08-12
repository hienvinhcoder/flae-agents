"""Pure normalization and metric helpers for topic discovery."""

from __future__ import annotations

from hashlib import sha256
import json
import re
import unicodedata
from uuid import UUID

from app.core.exceptions import InvalidArgumentError
from app.schemas.agent_memory_discovery import Topic
from app.schemas.topic_discovery import TopicEvidenceWindow


def checksum(value: object) -> str:
    encoded = json.dumps(
        value, default=str, ensure_ascii=False, separators=(",", ":"), sort_keys=True
    ).encode("utf-8")
    return "sha256:" + sha256(encoded).hexdigest()


def semantic_key(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value.casefold())
    ascii_value = "".join(
        char for char in normalized if not unicodedata.combining(char)
    )
    return " ".join(re.findall(r"[a-z0-9]+", ascii_value))


def canonicalize_windows(
    windows: tuple[TopicEvidenceWindow, ...],
) -> tuple[TopicEvidenceWindow, ...]:
    unique: dict[UUID, TopicEvidenceWindow] = {}
    for window in windows:
        existing = unique.get(window.window_id)
        if existing is not None and existing != window:
            raise InvalidArgumentError(
                "A topic evidence window ID cannot describe conflicting evidence."
            )
        unique[window.window_id] = window
    return tuple(sorted(unique.values(), key=lambda item: str(item.window_id)))


def match_score(
    key: str, windows: tuple[TopicEvidenceWindow, ...], topic: Topic
) -> float:
    names = {semantic_key(topic.name), *(semantic_key(alias) for alias in topic.aliases)}
    if key in names:
        return 1.0
    current_targets = {
        f"{item.target_kind.value}:{item.target_id}" for item in windows
    }
    previous_targets = {
        f"{item.target_kind.value}:{item.target_id}" for item in topic.memberships
    }
    union = current_targets | previous_targets
    return len(current_targets & previous_targets) / len(union) if union else 0.0


def topic_material(topic: Topic) -> dict[str, object]:
    return {
        "topic_id": str(topic.topic_id),
        "name": topic.name,
        "aliases": topic.aliases,
        "lifecycle": topic.lifecycle.value,
        "primary_parent_id": str(topic.primary_parent_id)
        if topic.primary_parent_id
        else None,
        "secondary_parent_ids": tuple(map(str, topic.secondary_parent_ids)),
        "promotion_evidence_count": topic.promotion_evidence_count,
        "memberships": [item.model_dump(mode="json") for item in topic.memberships],
        "discovery_version": topic.discovery_version,
    }


def taxonomy_change_count(
    previous_topics: tuple[Topic, ...], topics: tuple[Topic, ...]
) -> int:
    previous = {topic.topic_id: _identity_material(topic) for topic in previous_topics}
    current = {topic.topic_id: _identity_material(topic) for topic in topics}
    return len(set(previous) ^ set(current)) + sum(
        previous[topic_id] != current[topic_id]
        for topic_id in set(previous) & set(current)
    )


def _identity_material(topic: Topic) -> tuple[object, ...]:
    return (
        topic.name,
        topic.aliases,
        topic.lifecycle.value,
        topic.primary_parent_id,
        topic.secondary_parent_ids,
    )
