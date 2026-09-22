"""CLI to exercise FLAE ChunkingService (Chonkie: semantic pipeline / fixed / markdown) offline.

Examples (from repo root):

  uv run --project backend python -m scripts.try_chunking \\
    --file docs/datasets/luminaops/documents/04-adr-014-pgvector.md \\
    --strategy compare -o backend/.tmp/chunking/adr-compare.json
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.services.knowledge.ingestion.chunking import ChunkingService
from app.utils.token import get_token_count

REPO_ROOT = Path(__file__).resolve().parents[2]
_PAD = (
    "Ca vận hành ShelfFlow ghi nhận vị trí kệ, wave picking và đối soát xuất nhập "
    "theo tenant. Nhân sự không dùng số liệu doanh thu hay sửa SLA đã ký. "
)


def _section(title: str, repeats: int) -> str:
    body = "\n".join(f"{title} bước {i:02d}. {_PAD}" for i in range(1, repeats + 1))
    return f"## {title}\n\n{body}\n"


DEFAULT_SAMPLE = "# Company handbook\n\n" "Intro paragraph before any H2. Mentions Alice and Acme Corp.\n\n" + _section(
    "People", 25
) + "\n" + _section("Products", 25) + "\n" + _section("Operations appendix A", 30) + "\n" + _section(
    "Operations appendix B", 30
)


def _checksum(text: str) -> str:
    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
    return f"sha256:{digest}"


def _load_text(*, file: Path | None, sample: bool) -> tuple[str, str]:
    if sample:
        return DEFAULT_SAMPLE, "inline-sample"
    if file is None:
        raise SystemExit("Provide --file PATH or --sample")
    path = file if file.is_absolute() else REPO_ROOT / file
    if not path.is_file():
        raise SystemExit(f"File not found: {path}")
    return path.read_text(encoding="utf-8"), str(
        path.relative_to(REPO_ROOT) if path.is_relative_to(REPO_ROOT) else path
    )


def _knobs_for(strategy: str) -> dict[str, int | str | float]:
    if strategy == "semantic":
        return {
            "engine": "chonkie.Pipeline: recursive(markdown) → SemanticChunker+Gemini",
            "recursive_size": settings.RAG_RECURSIVE_SIZE,
            "semantic_size": settings.RAG_SEMANTIC_TARGET,
            "threshold": settings.RAG_SEMANTIC_THRESHOLD,
            "skip_window": settings.RAG_SEMANTIC_SKIP_WINDOW,
            "min_sentences": settings.RAG_SEMANTIC_MIN_SENTENCES,
            "embedding_model": settings.GEMINI_EMBEDDING_MODEL,
            "embedding_dims": settings.EMBEDDING_DIMENSIONS,
        }
    if strategy == "markdown":
        return {
            "engine": "chonkie.RecursiveChunker(markdown)",
            "chunk_size": settings.RAG_RECURSIVE_SIZE,
        }
    return {
        "engine": "chonkie.TokenChunker",
        "size": settings.RAG_FIXED_SIZE,
        "overlap": settings.RAG_FIXED_OVERLAP,
    }


def _run_strategy(*, text: str, strategy: str) -> dict[str, Any]:
    chunks = ChunkingService.chunk_document(
        text=text,
        content_checksum=_checksum(text),
        strategy=strategy,
    )
    return {
        "strategy": strategy,
        "knobs": _knobs_for(strategy),
        "chunk_count": len(chunks),
        "chunks": [
            {
                "index": index,
                "token_count": chunk.token_count,
                "section_structural_key": chunk.section_structural_key,
                "heading_path": list(chunk.heading_path),
                "text": chunk.text,
            }
            for index, chunk in enumerate(chunks)
        ],
    }


def _print_strategy(result: dict[str, Any], *, preview: int) -> None:
    strategy = str(result["strategy"])
    print(f"\n{'=' * 72}")
    print(f"Strategy: {strategy}")
    print(f"chunks={result['chunk_count']} | knobs={result['knobs']}")
    print(f"{'=' * 72}")
    for chunk in result["chunks"]:
        heading = " > ".join(chunk["heading_path"])
        preview_text = str(chunk["text"]).replace("\n", " ")
        if len(preview_text) > preview:
            preview_text = preview_text[: preview - 1] + "…"
        print(f"\n[{chunk['index']:03d}] tokens={chunk['token_count']} | " f"key={chunk['section_structural_key']}")
        print(f"      headings: {heading}")
        print(f"      preview: {preview_text}")
    if not result["chunks"]:
        print("\n(no chunks produced)")


def _default_output_path(*, source: str, strategy: str) -> Path:
    stem = Path(source).stem if source != "inline-sample" else "inline-sample"
    return REPO_ROOT / "backend" / ".tmp" / "chunking" / f"{stem}-{strategy}.json"


def run(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run FLAE ChunkingService and save chunk results to JSON.")
    parser.add_argument(
        "--file",
        type=Path,
        help="Markdown/text file to chunk (relative to repo root or absolute).",
    )
    parser.add_argument(
        "--sample",
        action="store_true",
        help="Use a small built-in markdown sample instead of --file.",
    )
    parser.add_argument(
        "--strategy",
        choices=("semantic", "fixed", "markdown", "both", "compare", "default"),
        default="semantic",
        help=(
            "Chunking strategy (default: semantic). "
            "'compare' runs semantic + markdown; 'both' runs semantic + fixed."
        ),
    )
    parser.add_argument(
        "--preview",
        type=int,
        default=180,
        help="Max characters of console preview per chunk (default: 180).",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        help=("JSON output path. Default: " "backend/.tmp/chunking/<source>-<strategy>.json"),
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Do not print chunk previews to the console.",
    )
    args = parser.parse_args(argv)

    text, source = _load_text(file=args.file, sample=args.sample)
    input_tokens = get_token_count(text)
    print(f"Source: {source}")
    print(f"Chars: {len(text)} | tokens≈{input_tokens}")

    if args.strategy == "both":
        strategies = ["semantic", "fixed"]
    elif args.strategy == "compare":
        strategies = ["semantic", "markdown"]
    elif args.strategy == "default":
        strategies = [settings.RAG_CHUNKING_STRATEGY]
    else:
        strategies = [args.strategy]

    strategy_results = [_run_strategy(text=text, strategy=name) for name in strategies]
    payload: dict[str, Any] = {
        "source": source,
        "char_count": len(text),
        "token_count": input_tokens,
        "settings_default_strategy": settings.RAG_CHUNKING_STRATEGY,
        "requested_strategy": args.strategy,
        "results": strategy_results,
    }

    strategy_tag = "both" if len(strategies) > 1 else strategies[0]
    output_path = args.output or _default_output_path(source=source, strategy=strategy_tag)
    if not output_path.is_absolute():
        output_path = REPO_ROOT / output_path
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote JSON: {output_path}")

    if not args.quiet:
        for result in strategy_results:
            _print_strategy(result, preview=args.preview)
    return 0


if __name__ == "__main__":
    sys.exit(run())
