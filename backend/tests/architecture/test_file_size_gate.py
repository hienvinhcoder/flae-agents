from pathlib import Path

from scripts.check_file_size import find_violations, line_count


def test_line_count_handles_trailing_newline(tmp_path: Path) -> None:
    source = tmp_path / "module.py"
    source.write_text("first\nsecond\n", encoding="utf-8")

    assert line_count(source) == 2


def test_find_violations_only_reports_oversized_python_files(
    tmp_path: Path,
) -> None:
    (tmp_path / "small.py").write_text("one\ntwo\n", encoding="utf-8")
    (tmp_path / "large.py").write_text("one\ntwo\nthree\n", encoding="utf-8")
    (tmp_path / "large.txt").write_text("one\ntwo\nthree\n", encoding="utf-8")

    assert find_violations(tmp_path, max_lines=2) == [
        (tmp_path / "large.py", 3),
    ]
