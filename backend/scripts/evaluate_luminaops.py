"""Internal LuminaOps LangSmith evaluation CLI.

``mirror`` syncs the gold dataset without retrieval. ``run`` mirrors the
dataset, then executes live retrieval and evaluation for a disposable workspace.
"""

from __future__ import annotations

import argparse
import sys
from collections.abc import Mapping, Sequence
from typing import cast
from uuid import UUID

from sqlalchemy import bindparam, text

from app.db.rag_db import rag_db_manager
from app.evaluation.langsmith_client import LangSmithClientAdapter
from app.evaluation.luminaops import load_luminaops_dataset
from app.evaluation.luminaops_langsmith import (
    LuminaOpsDatasetMirror,
    LuminaOpsExperimentRunner,
    build_doc_id_aliases,
    build_langsmith_evaluators,
    langsmith_credentials_configured,
    make_live_target,
)
from app.services.knowledge.retrieval.retriever import RetrieverService


async def _retrieve_results(
    *, workspace_id: str, query: str
) -> Mapping[str, object]:
    results, _diagnostics = await RetrieverService.retrieve(
        workspace_id=workspace_id,
        query=query,
    )
    return results


async def _resolve_document_external_ids(
    *, workspace_id: str, document_ids: Sequence[str]
) -> Mapping[str, str]:
    """Map chunk ``source_document_id`` values to ingested external ids.

    Gold ``doc_id`` equals the ``source_external_id`` used at ingest time, so the
    searchable revision of each document supplies the join back to gold.
    """
    parsed: list[UUID] = []
    for document_id in document_ids:
        try:
            parsed.append(UUID(document_id))
        except ValueError:
            continue
    if not parsed:
        return {}

    statement = text(
        "SELECT document_id, source_external_id "
        f"FROM {rag_db_manager.schema}.document_revisions "
        "WHERE workspace_id = :workspace_id "
        "AND state = 'searchable' "
        "AND document_id IN :document_ids"
    ).bindparams(bindparam("document_ids", expanding=True))

    async with rag_db_manager.get_async_session(workspace_id) as session:
        result = await session.execute(
            statement,
            {"workspace_id": workspace_id, "document_ids": parsed},
        )
        return {str(row[0]): str(row[1]) for row in result}


def main(argv: Sequence[str] | None = None) -> int:
    """Run the requested LuminaOps evaluation command."""
    parser = argparse.ArgumentParser(prog="flae-evaluate-luminaops")
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("mirror", help="Sync gold to LangSmith (no retrieve)")

    run_parser = subparsers.add_parser(
        "run", help="Live retrieve + LangSmith experiment"
    )
    run_parser.add_argument(
        "--kb-id",
        default=None,
        help="Disposable RAG workspace UUID (RetrieverService workspace_id)",
    )

    args = parser.parse_args(list(argv) if argv is not None else None)

    if args.command == "run" and not args.kb_id:
        print("--kb-id is required for live evaluation", file=sys.stderr)
        return 2

    if not langsmith_credentials_configured():
        print(
            "Missing LANGSMITH_API_KEY or LANGCHAIN_API_KEY",
            file=sys.stderr,
        )
        return 1

    dataset = load_luminaops_dataset()
    client = LangSmithClientAdapter()
    mirror_result = LuminaOpsDatasetMirror(client).mirror(dataset)
    print(
        f"dataset={mirror_result.dataset_name} "
        f"examples={mirror_result.example_count}"
    )

    if args.command == "mirror":
        print("mirrored only (no live scores)")
        return 0

    aliases = build_doc_id_aliases(dataset)
    target = make_live_target(
        workspace_id=args.kb_id,
        aliases=aliases,
        retrieve=_retrieve_results,
        resolve_document_external_ids=_resolve_document_external_ids,
    )
    prefix = LuminaOpsExperimentRunner(client).run(
        mirror_result,
        target=target,
        evaluators=cast(list[object], build_langsmith_evaluators()),
    )
    print(f"experiment_prefix={prefix}")
    print("Open LangSmith Experiments UI to inspect scores.")
    return 0


def run() -> None:
    """Console-script wrapper that propagates the CLI exit code."""
    raise SystemExit(main())


if __name__ == "__main__":
    run()
