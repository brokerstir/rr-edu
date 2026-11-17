#!/usr/bin/env python3
"""
CLI utility to set or unset the "calculator": true flag on question JSON files.
Preserves UTF-8 math/LaTeX strings and standard indentation.

Usage:
  python scripts/set_calculator.py <course_id> <topic_number> <question_number> [--remove]

Examples:
  python scripts/set_calculator.py ib_math_aa_sl 3 34
  python scripts/set_calculator.py ib_math_aa_sl 3 34 --remove

  .venv/bin/python3 scripts/set_calculator.py ib_math_aa_sl 3 34
  .venv/bin/python3 scripts/set_calculator.py ib_math_aa_sl 3 34 --delete-key
"""

import argparse
import json
import os
import sys
from pathlib import Path


def find_question_file(base_dir: Path, course_id: str, topic_num: int, q_num: int) -> Path | None:
    course_dir = base_dir / "public" / "data" / course_id
    if not course_dir.exists():
        print(f"Error: Course directory not found: {course_dir}", file=sys.stderr)
        sys.exit(1)

    target_filename = f"topic_{topic_num}_q{q_num}.json"

    # 1. Direct path check (topic subfolder pattern)
    direct_subfolder = course_dir / f"topic_{topic_num}" / target_filename
    if direct_subfolder.is_file():
        return direct_subfolder

    # 2. Direct path check (flat course folder pattern)
    direct_flat = course_dir / target_filename
    if direct_flat.is_file():
        return direct_flat

    # 3. Recursive fallback scan across the course directory
    for match in course_dir.rglob(target_filename):
        if match.is_file():
            return match

    return None


def main():
    parser = argparse.ArgumentParser(
        description="Tag a question JSON file as calculator-required or remove the flag."
    )
    parser.add_argument("course_id", help="Course identifier (e.g., ib_math_aa_sl)")
    parser.add_argument("topic_number", type=int, help="Topic number (e.g., 3)")
    parser.add_argument("question_number", type=int, help="Question number (e.g., 34)")
    parser.add_argument(
        "--remove",
        action="store_true",
        help="Remove or set 'calculator': false instead of true",
    )
    parser.add_argument(
        "--delete-key",
        action="store_true",
        help="Completely delete the 'calculator' key from JSON instead of setting to false",
    )

    args = parser.parse_args()

    # Determine project root (assumes script is inside scripts/)
    script_dir = Path(__file__).resolve().parent
    project_root = script_dir.parent

    target_file = find_question_file(
        project_root, args.course_id, args.topic_number, args.question_number
    )

    if not target_file:
        expected_path = f"public/data/{args.course_id}/**/topic_{args.topic_number}_q{args.question_number}.json"
        print(f"Error: Could not find question file matching: {expected_path}", file=sys.stderr)
        sys.exit(1)

    # Read existing JSON with explicit UTF-8
    try:
        with open(target_file, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error: Failed to read/parse {target_file}: {e}", file=sys.stderr)
        sys.exit(1)

    # Mutate data
    if args.delete_key:
        if "calculator" in data:
            del data["calculator"]
            action_desc = "Removed 'calculator' key"
        else:
            action_desc = "'calculator' key not present (no change)"
    elif args.remove:
        data["calculator"] = False
        action_desc = 'Set "calculator": false'
    else:
        # Insert or update 'calculator': true
        # Keep clean ordering near has_diagram if present
        if "has_diagram" in data and "calculator" not in data:
            new_data = {}
            for k, v in data.items():
                new_data[k] = v
                if k == "has_diagram":
                    new_data["calculator"] = True
            data = new_data
        else:
            data["calculator"] = True
        action_desc = 'Set "calculator": true'

    # Write back to disk with ensure_ascii=False to protect LaTeX math characters
    try:
        with open(target_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write("\n")  # Trailing newline for POSIX compliance
    except Exception as e:
        print(f"Error: Failed to write {target_file}: {e}", file=sys.stderr)
        sys.exit(1)

    rel_path = target_file.relative_to(project_root)
    print(f"✓ {action_desc} in {args.course_id} Topic {args.topic_number} Q{args.question_number}")
    print(f"  File: {rel_path}")


if __name__ == "__main__":
    main()