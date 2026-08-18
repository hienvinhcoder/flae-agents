"""Fail CI when handwritten backend application modules grow too large."""

from argparse import ArgumentParser
from pathlib import Path
from typing import Sequence

MAX_LINES = 450
APP_ROOT = Path(__file__).resolve().parents[1] / "app"


def line_count(path: Path) -> int:
    """Count logical text lines without counting a final newline twice."""
    content = path.read_text(encoding="utf-8")
    if not content:
        return 0
    return len(content.splitlines())


def find_violations(
    root: Path,
    *,
    max_lines: int = MAX_LINES,
) -> list[tuple[Path, int]]:
    """Return Python modules exceeding ``max_lines``, largest first."""
    violations = [
        (path, line_count(path))
        for path in root.rglob("*.py")
        if "__pycache__" not in path.parts
    ]
    return sorted(
        (item for item in violations if item[1] > max_lines),
        key=lambda item: (-item[1], str(item[0])),
    )


def main(argv: Sequence[str] | None = None) -> int:
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=APP_ROOT)
    parser.add_argument("--max-lines", type=int, default=MAX_LINES)
    args = parser.parse_args(argv)

    violations = find_violations(args.root, max_lines=args.max_lines)
    if violations:
        print(f"Python files must not exceed {args.max_lines} lines:")
        for path, count in violations:
            print(f"- {path.relative_to(args.root)}: {count}")
        return 1

    file_count = sum(1 for _ in args.root.rglob("*.py"))
    print(
        f"Checked {file_count} Python files; "
        f"all are within {args.max_lines} lines."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
