"""Deterministic change, contradiction, and explicit-gap projection."""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Awaitable
from datetime import datetime, timedelta
from hashlib import sha256
import json
from typing import Protocol
from uuid import NAMESPACE_URL, UUID, uuid5

from app.core.exceptions import InvalidArgumentError
from app.schemas.agent_memory import (
    AssertionPolarity,
    ContradictionFinding,
    GapFinding,
)
from app.schemas.memory_state import (
    ExpectedEvidenceRule,
    MemoryStateAssertion,
    MemoryStateProjection,
    MemoryStateProjectionInput,
    OrderedChangeFinding,
)


def _checksum(value: object) -> str:
    encoded = json.dumps(
        value,
        default=str,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")
    return "sha256:" + sha256(encoded).hexdigest()


class MemoryStateStore(Protocol):
    def load_projection_input(
        self,
        workspace_id: UUID,
        *,
        projection_version: str,
        inspected_at: datetime,
    ) -> Awaitable[MemoryStateProjectionInput]: ...

    def publish_atomic(
        self, projection: MemoryStateProjection
    ) -> Awaitable[MemoryStateProjection]: ...


class MemoryStateService:
    def __init__(self, *, repository: MemoryStateStore) -> None:
        self._repository = repository

    async def project_workspace(
        self,
        workspace_id: UUID,
        *,
        projection_version: str,
        inspected_at: datetime,
    ) -> MemoryStateProjection:
        command = await self._repository.load_projection_input(
            workspace_id,
            projection_version=projection_version,
            inspected_at=inspected_at,
        )
        projection = self.project(command)
        return await self._repository.publish_atomic(projection)

    @staticmethod
    def project(command: MemoryStateProjectionInput) -> MemoryStateProjection:
        assertions = MemoryStateService._deduplicate(command.assertions)
        changes = MemoryStateService._changes(command, assertions)
        contradictions = MemoryStateService._contradictions(command, assertions)
        gaps = MemoryStateService._gaps(command, assertions)
        payload = {
            "workspace_id": str(command.workspace_id),
            "graph_snapshot_id": str(command.graph_snapshot_id),
            "revision_set_checksum": command.revision_set_checksum,
            "projection_version": command.projection_version,
            "inspected_at": command.inspected_at.isoformat(),
            "changes": [item.model_dump(mode="json") for item in changes],
            "contradictions": [
                item.model_dump(mode="json") for item in contradictions
            ],
            "gaps": [item.model_dump(mode="json") for item in gaps],
        }
        projection_checksum = _checksum(payload)
        return MemoryStateProjection(
            projection_id=uuid5(
                NAMESPACE_URL,
                f"flae:memory-state:{command.workspace_id}:{projection_checksum}",
            ),
            projection_checksum=projection_checksum,
            changes=changes,
            contradictions=contradictions,
            gaps=gaps,
            **command.model_dump(
                exclude={"assertions", "expected_evidence_rules"}
            ),
        )

    @staticmethod
    def _deduplicate(
        assertions: tuple[MemoryStateAssertion, ...],
    ) -> tuple[MemoryStateAssertion, ...]:
        by_id: dict[UUID, MemoryStateAssertion] = {}
        for assertion in assertions:
            previous = by_id.get(assertion.assertion_id)
            if previous is not None and previous != assertion:
                raise InvalidArgumentError(
                    "Duplicate assertion ID maps to conflicting memory-state evidence."
                )
            by_id[assertion.assertion_id] = assertion
        return tuple(by_id[key] for key in sorted(by_id, key=str))

    @staticmethod
    def _changes(command, assertions):
        grouped: dict[
            tuple[UUID, UUID, str], dict[int, list[MemoryStateAssertion]]
        ] = defaultdict(lambda: defaultdict(list))
        for assertion in assertions:
            key = (
                assertion.citation.provenance.document_id,
                assertion.subject_entity_id,
                assertion.predicate,
            )
            grouped[key][assertion.revision_order].append(assertion)

        findings: list[OrderedChangeFinding] = []
        for (_, subject_id, predicate), revisions in grouped.items():
            ordered = sorted(revisions.items())
            for (before_order, before), (after_order, after) in zip(
                ordered, ordered[1:], strict=False
            ):
                if MemoryStateService._semantic_set(before) == (
                    MemoryStateService._semantic_set(after)
                ):
                    continue
                before_citations = MemoryStateService._citations(before)
                after_citations = MemoryStateService._citations(after)
                finding_id = MemoryStateService._finding_id(
                    command.workspace_id,
                    "change",
                    (*before_citations, *after_citations),
                )
                findings.append(
                    OrderedChangeFinding(
                        finding_id=finding_id,
                        subject_entity_id=subject_id,
                        predicate=predicate,
                        before=before_citations,
                        after=after_citations,
                        before_revision_order=before_order,
                        after_revision_order=after_order,
                        confidence=min(
                            item.confidence for item in (*before, *after)
                        ),
                        detected_at=command.inspected_at,
                    )
                )
        return tuple(sorted(findings, key=lambda item: str(item.finding_id)))

    @staticmethod
    def _contradictions(command, assertions):
        grouped: dict[tuple[UUID, str], list[MemoryStateAssertion]] = defaultdict(
            list
        )
        for assertion in assertions:
            if (
                assertion.is_current
                and assertion.polarity is not AssertionPolarity.uncertain
                and MemoryStateService._active_at(
                    assertion, command.inspected_at
                )
            ):
                grouped[(assertion.subject_entity_id, assertion.predicate)].append(
                    assertion
                )
        findings: list[ContradictionFinding] = []
        for (subject_id, predicate), evidence in grouped.items():
            ordered = sorted(evidence, key=lambda item: str(item.assertion_id))
            for index, left in enumerate(ordered):
                for right in ordered[index + 1 :]:
                    if not MemoryStateService._overlaps(left, right):
                        continue
                    if not MemoryStateService._incompatible(left, right):
                        continue
                    citations = (left.citation, right.citation)
                    findings.append(
                        ContradictionFinding(
                            finding_id=MemoryStateService._finding_id(
                                command.workspace_id, "contradiction", citations
                            ),
                            subject_entity_id=subject_id,
                            predicate=predicate,
                            evidence_sets=((left.citation,), (right.citation,)),
                            confidence=min(left.confidence, right.confidence),
                            detected_at=command.inspected_at,
                        )
                    )
        return tuple(sorted(findings, key=lambda item: str(item.finding_id)))

    @staticmethod
    def _gaps(command, assertions):
        current = tuple(item for item in assertions if item.is_current)
        findings: list[GapFinding] = []
        for rule in sorted(
            command.expected_evidence_rules, key=lambda item: str(item.rule_id)
        ):
            candidates = tuple(
                item
                for item in current
                if item.subject_entity_id == rule.subject_entity_id
                and item.predicate == rule.predicate
                and item.polarity in rule.required_polarities
                and item.confidence >= rule.minimum_confidence
            )
            matches = tuple(
                item
                for item in candidates
                if MemoryStateService._active_at(item, command.inspected_at)
            )
            stale_after = MemoryStateService._stale_after(rule, matches)
            is_stale = stale_after is not None and command.inspected_at > stale_after
            if matches and not is_stale:
                continue
            if not matches:
                stale_after = MemoryStateService._validity_stale_after(
                    candidates, command.inspected_at
                )
            citations = MemoryStateService._citations(
                matches if is_stale else candidates
            )
            findings.append(
                GapFinding(
                    finding_id=uuid5(
                        NAMESPACE_URL,
                        f"flae:memory-gap:{command.workspace_id}:{rule.rule_id}",
                    ),
                    expected_evidence_rule=rule.description,
                    inspected_at=command.inspected_at,
                    stale_after=stale_after,
                    confidence=MemoryStateService._gap_confidence(
                        rule, matches or candidates
                    ),
                    supporting_evidence=citations,
                )
            )
        return tuple(findings)

    @staticmethod
    def _semantic_set(assertions):
        return {
            (
                str(item.object_entity_id) if item.object_entity_id else None,
                item.object_value,
                item.polarity.value,
                item.valid_from,
                item.valid_to,
            )
            for item in assertions
        }

    @staticmethod
    def _citations(assertions):
        return tuple(
            item.citation
            for item in sorted(assertions, key=lambda value: str(value.assertion_id))
        )

    @staticmethod
    def _object_key(assertion):
        if assertion.object_entity_id is not None:
            return "entity", str(assertion.object_entity_id)
        return "value", assertion.object_value

    @staticmethod
    def _incompatible(left, right):
        same_object = MemoryStateService._object_key(
            left
        ) == MemoryStateService._object_key(right)
        if same_object:
            return {left.polarity, right.polarity} == {
                AssertionPolarity.affirmed,
                AssertionPolarity.negated,
            }
        return (
            left.polarity is AssertionPolarity.affirmed
            and right.polarity is AssertionPolarity.affirmed
        )

    @staticmethod
    def _overlaps(left, right):
        return MemoryStateService._before(left.valid_from, right.valid_to) and (
            MemoryStateService._before(right.valid_from, left.valid_to)
        )

    @staticmethod
    def _before(start: datetime | None, end: datetime | None) -> bool:
        return start is None or end is None or start < end

    @staticmethod
    def _active_at(assertion, inspected_at: datetime) -> bool:
        return (
            assertion.valid_from is None or assertion.valid_from <= inspected_at
        ) and (
            assertion.valid_to is None or inspected_at < assertion.valid_to
        )

    @staticmethod
    def _stale_after(
        rule: ExpectedEvidenceRule,
        matches: tuple[MemoryStateAssertion, ...],
    ) -> datetime | None:
        if rule.stale_after_seconds is None or not matches:
            return None
        latest = max(item.citation.provenance.source_modified_at for item in matches)
        return latest + timedelta(seconds=rule.stale_after_seconds)

    @staticmethod
    def _validity_stale_after(
        matches: tuple[MemoryStateAssertion, ...], inspected_at: datetime
    ) -> datetime | None:
        expired_at = tuple(
            item.valid_to
            for item in matches
            if item.valid_to is not None and item.valid_to <= inspected_at
        )
        return max(expired_at) if expired_at else None

    @staticmethod
    def _gap_confidence(rule, matches):
        if not matches:
            return 1.0
        return min(item.confidence for item in matches)

    @staticmethod
    def _finding_id(workspace_id, kind, citations):
        identity = ":".join(
            sorted(str(citation.assertion_id) for citation in citations)
        )
        return uuid5(
            NAMESPACE_URL,
            f"flae:memory-finding:{workspace_id}:{kind}:{identity}",
        )
