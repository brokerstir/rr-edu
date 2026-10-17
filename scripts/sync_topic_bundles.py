#!/usr/bin/env python3
"""
scripts/sync_topic_bundles.py

Dynamically scans `public/data/questions/` for question files,
groups them by topic, and rebuilds `public/data/topic_{N}.json` and 
`public/data/topics.json` automatically without any hardcoded data or API calls.

Usage:
  python3 scripts/sync_topic_bundles.py            # Syncs all topics found
  python3 scripts/sync_topic_bundles.py --topic 2   # Syncs only Topic 2 bundle
"""

import argparse
import json
import re
from pathlib import Path

TOPIC_NAMES = {
    1: "Number and Algebra",
    2: "Functions",
    3: "Geometry and Trigonometry",
    4: "Statistics and Probability",
    5: "Calculus"
}

def sync_bundles(selected_topic: int = None, course_id: str = "ib_math_aa_sl"):
    data_dir = Path("public/data") / course_id
    questions_dir = data_dir / "questions"

    if not questions_dir.exists():
        print(f"❌ Directory {questions_dir} does not exist.")
        return

    # Glob for question files
    if selected_topic:
        pattern = f"topic_{selected_topic}_q*.json"
        print(f"🔍 Filtering question files for Topic {selected_topic}...")
    else:
        pattern = "topic_*_q*.json"
        print("🔍 Scanning all question files...")

    question_files = sorted(
        questions_dir.glob(pattern),
        key=lambda p: [int(c) for c in re.findall(r'\d+', p.name)]
    )

    if not question_files:
        target_msg = f"for Topic {selected_topic}" if selected_topic else ""
        print(f"❌ No question files found in public/data/questions/ {target_msg}")
        return

    print(f"📄 Found {len(question_files)} question file(s) to process.\n")

    topics_data = {}

    for q_file in question_files:
        try:
            with open(q_file, "r", encoding="utf-8") as f:
                q_data = json.load(f)

            topic_num = q_data.get("topic_number")
            if not topic_num:
                match = re.search(r"topic_(\d+)_q", q_file.name)
                if match:
                    topic_num = int(match.group(1))

            if topic_num:
                if topic_num not in topics_data:
                    topics_data[topic_num] = []
                topics_data[topic_num].append(q_data)

        except Exception as e:
            print(f"⚠️ Error reading {q_file.name}: {e}")

    # Rebuild bundle JSON for target topic(s)
    for t_num, q_list in topics_data.items():
        q_list.sort(key=lambda x: x.get("question_number", 0))

        t_filename = f"topic_{t_num}.json"
        t_filepath = data_dir / t_filename

        with open(t_filepath, "w", encoding="utf-8") as f:
            json.dump(q_list, f, indent=2, ensure_ascii=False)

        print(f"✅ Rebuilt {t_filename} ({len(q_list)} questions)")

    # Update or rebuild the topics.json manifest
    manifest_file = data_dir / "topics.json"
    manifest_dict = {}

    if manifest_file.exists():
        try:
            with open(manifest_file, "r", encoding="utf-8") as f:
                existing_manifest = json.load(f)
                for item in existing_manifest:
                    manifest_dict[item["topic_number"]] = item
        except Exception:
            manifest_dict = {}

    # Scan data_dir for all available topic_{N}.json bundle files to ensure full manifest integrity
    for t_num in [1, 2, 3, 4, 5]:
        t_file = data_dir / f"topic_{t_num}.json"
        if t_file.exists():
            try:
                with open(t_file, "r", encoding="utf-8") as f:
                    q_count = len(json.load(f))
                manifest_dict[t_num] = {
                    "topic_number": t_num,
                    "topic_name": TOPIC_NAMES.get(t_num, f"Topic {t_num}"),
                    "question_count": q_count,
                    "bundle_file": f"data/{course_id}/topic_{t_num}.json"
                }
            except Exception as e:
                print(f"⚠️ Error reading bundle {t_file.name}: {e}")

    sorted_manifest = [manifest_dict[k] for k in sorted(manifest_dict.keys())]

    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(sorted_manifest, f, indent=2, ensure_ascii=False)

    active_topics = [t["topic_number"] for t in sorted_manifest]
    print(f"\n🎉 Manifest '{manifest_file}' updated. Active topics in app: {active_topics}")

def main():
    parser = argparse.ArgumentParser(description="Sync question files into topic bundle JSONs.")
    parser.add_argument("--course-id", "--course_id", dest="course_id", default="ib_math_aa_sl", help="Course directory id")
    parser.add_argument("--topic", "-t", type=int, choices=[1, 2, 3, 4, 5], help="Specify a single topic number to sync")
    args = parser.parse_args()

    sync_bundles(selected_topic=args.topic, course_id=args.course_id)

if __name__ == "__main__":
    main()