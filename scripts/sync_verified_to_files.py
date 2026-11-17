#!/usr/bin/env python3
"""
Syncs verified questions from DynamoDB (via db_query.sh or direct scan)
into their corresponding JSON source files under public/data/<course_id>/.

Usage:
  .venv/bin/python3 scripts/sync_verified_to_files.py <course_id>

Example:
  .venv/bin/python3 scripts/sync_verified_to_files.py ib_math_aa_sl
"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path


def get_verified_records_from_cli(project_root: Path, course_id: str) -> list[dict]:
    """
    Executes ./scripts/db_query.sh verified <course_id> and extracts question entries.
    Parses Question ID and Topic from the structured CLI output.
    """
    db_script = project_root / "scripts" / "db_query.sh"
    if not db_script.exists():
        print(f"Error: Could not locate db query script at {db_script}", file=sys.stderr)
        sys.exit(1)

    try:
        result = subprocess.run(
            ["bash", str(db_script), "verified", course_id],
            capture_output=True,
            text=True,
            check=True,
        )
    except subprocess.CalledProcessError as e:
        print(f"Error running db_query.sh: {e.stderr}", file=sys.stderr)
        sys.exit(1)

    output = result.stdout
    records = []

    # Parse entries structured like:
    # Question ID: topic_1_q1
    # Topic:       1
    # Status:      verified
    blocks = output.split("------------------------------------------------------------")
    for block in blocks:
        q_match = re.search(r"Question ID:\s*([^\n\r]+)", block)
        t_match = re.search(r"Topic:\s*([^\n\r]+)", block)
        status_match = re.search(r"Status:\s*([^\n\r]+)", block)

        if q_match:
            q_id = q_match.group(1).strip()
            topic_val = t_match.group(1).strip() if t_match else None
            status_val = status_match.group(1).strip() if status_match else "verified"

            # Derive topic and question numbers if not explicitly labeled
            topic_num = None
            q_num = None
            if topic_val and topic_val.isdigit():
                topic_num = int(topic_val)

            # Match patterns like topic_1_q34 or q34
            parsed_id = re.match(r"(?:topic_(\d+)_)?q?(\d+)", q_id)
            if parsed_id:
                if not topic_num and parsed_id.group(1):
                    topic_num = int(parsed_id.group(1))
                q_num = int(parsed_id.group(2))

            records.append({
                "raw_id": q_id,
                "topic_num": topic_num,
                "question_num": q_num,
                "status": status_val,
            })

    return records


def find_target_file(course_dir: Path, topic_num: int | None, q_num: int | None, raw_id: str) -> Path | None:
    """
    Finds the JSON file matching topic and question numbers or raw ID.
    """
    candidate_names = []
    if topic_num is not None and q_num is not None:
        candidate_names.append(f"topic_{topic_num}_q{q_num}.json")
    candidate_names.append(f"{raw_id}.json")

    for fname in candidate_names:
        # Check topic subfolder if topic is known
        if topic_num is not None:
            subfolder_path = course_dir / f"topic_{topic_num}" / fname
            if subfolder_path.is_file():
                return subfolder_path

        # Check flat course directory
        flat_path = course_dir / fname
        if flat_path.is_file():
            return flat_path

        # Recursive search across course directory
        for match in course_dir.rglob(fname):
            if match.is_file():
                return match

    return None


def main():
    parser = argparse.ArgumentParser(
        description="Sync verified questions from DynamoDB audit records to local JSON files."
    )
    parser.add_argument("course_id", help="Course identifier (e.g., ib_math_aa_sl)")
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parent.parent
    course_dir = project_root / "public" / "data" / args.course_id

    if not course_dir.exists():
        print(f"Error: Course directory not found: {course_dir}", file=sys.stderr)
        sys.exit(1)

    print(f"Querying verified questions for course '{args.course_id}'...")
    records = get_verified_records_from_cli(project_root, args.course_id)

    if not records:
        print(f"No verified questions found for {args.course_id}.")
        return

    print(f"Found {len(records)} verified question record(s) in DynamoDB.")

    updated_count = 0
    already_verified_count = 0
    missing_files = []

    for item in records:
        target_file = find_target_file(
            course_dir, item["topic_num"], item["question_num"], item["raw_id"]
        )

        if not target_file:
            missing_files.append(item["raw_id"])
            continue

        try:
            with open(target_file, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            print(f"Warning: Could not parse {target_file}: {e}", file=sys.stderr)
            continue

        # Idempotent check: skip rewrite if already verified: true
        if data.get("verified") is True:
            already_verified_count += 1
            continue

        # Position "verified": true near "has_diagram" or "calculator" if present
        new_data = {}
        inserted = False
        anchor_keys = {"has_diagram", "calculator"}

        for k, v in data.items():
            new_data[k] = v
            if k in anchor_keys and not inserted:
                new_data["verified"] = True
                inserted = True

        if not inserted:
            new_data["verified"] = True

        # Write back ensuring UTF-8 LaTeX is never escaped
        try:
            with open(target_file, "w", encoding="utf-8") as f:
                json.dump(new_data, f, indent=2, ensure_ascii=False)
                f.write("\n")
            updated_count += 1
            rel_path = target_file.relative_to(project_root)
            print(f"  ✓ Tagged verified: {rel_path}")
        except Exception as e:
            print(f"Error writing {target_file}: {e}", file=sys.stderr)

    print("\nSync Summary:")
    print(f"  • Newly updated files : {updated_count}")
    print(f"  • Already verified    : {already_verified_count}")
    if missing_files:
        print(f"  • Files not found ({len(missing_files)}): {', '.join(missing_files)}")


if __name__ == "__main__":
    main()