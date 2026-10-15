#!/usr/bin/env python3
"""
scripts/repair_missing_questions.py

Scans `public/data/questions/topic_{topic}_q*.json` to detect incomplete question files
(where subparts are empty or solutions/final_answers are missing).

Modes:
  1. Local Zero-Token Repair:
     python3 scripts/repair_missing_questions.py --topic 2 --local

  2. Targeted API Repair (Only burns tokens on broken questions):
     python3 scripts/repair_missing_questions.py --topic 2 --api
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path

# Local fallback payloads for known incomplete Topic 2 questions
LOCAL_REPAIR_PAYLOADS = {
    1: {
        "subparts": [
            {
                "subpart": "a i",
                "stem": "State the gradient of the line segment.",
                "final_answer": "$\\frac{4}{3}$",
                "mark_breakdown": [
                    {"code": "M1", "desc": "Rearrange $4x - 3y + 2 = 0$ to $y = \\frac{4}{3}x + \\frac{2}{3}$"},
                    {"code": "A1", "desc": "Identify the coefficient of $x$ as $m = \\frac{4}{3}$"}
                ],
                "solution": "Rearranging $4x - 3y + 2 = 0 \\implies 3y = 4x + 2 \\implies y = \\frac{4}{3}x + \\frac{2}{3}$. The gradient of the line segment is $\\frac{4}{3}$.",
                "ai_explanation": {
                    "concept_rule": "In general line equation $ax + by + c = 0$, the gradient $m = -\\frac{a}{b}$.",
                    "step_by_step": [
                        "Isolate $y$: $3y = 4x + 2$.",
                        "Divide by 3: $y = \\frac{4}{3}x + \\frac{2}{3}$.",
                        "State the coefficient of $x$ as the gradient $m = \\frac{4}{3}$."
                    ],
                    "common_pitfalls": "Mistaking $4$ for the gradient without dividing by $3$."
                }
            },
            {
                "subpart": "a ii",
                "stem": "State the gradient of its perpendicular bisector.",
                "final_answer": "$-\\frac{3}{4}$",
                "mark_breakdown": [
                    {"code": "M1", "desc": "Apply negative reciprocal formula $m_{\\perp} = -\\frac{1}{m}$"},
                    {"code": "A1", "desc": "Calculate $m_{\\perp} = -\\frac{3}{4}$"}
                ],
                "solution": "The perpendicular bisector has gradient $m_{\\perp} = -\\frac{1}{4/3} = -\\frac{3}{4}$.",
                "ai_explanation": {
                    "concept_rule": "Perpendicular lines have gradients satisfying $m_1 m_2 = -1$.",
                    "step_by_step": [
                        "Take the negative reciprocal of $\\frac{4}{3}$: $-\\frac{1}{4/3} = -\\frac{3}{4}$."
                    ],
                    "common_pitfalls": "Forgetting to negate the reciprocal gradient."
                }
            },
            {
                "subpart": "b",
                "stem": "State the equation of the perpendicular bisector. Write your answer in the form $ax + by + d = 0$.",
                "final_answer": "$3x + 4y - 36 = 0$",
                "mark_breakdown": [
                    {"code": "M1", "desc": "Substitute midpoint $(4, 6)$ and gradient $-\\frac{3}{4}$ into point-slope equation"},
                    {"code": "M1", "desc": "Multiply through by 4 to clear denominator"},
                    {"code": "A1", "desc": "Rearrange to general form $3x + 4y - 36 = 0$"}
                ],
                "solution": "The perpendicular bisector passes through midpoint $(4, 6)$ with gradient $m = -\\frac{3}{4}$. Using $y - y_1 = m(x - x_1)$: $y - 6 = -\\frac{3}{4}(x - 4) \\implies 4(y - 6) = -3(x - 4) \\implies 4y - 24 = -3x + 12 \\implies 3x + 4y - 36 = 0$.",
                "ai_explanation": {
                    "concept_rule": "The perpendicular bisector passes through the segment's midpoint with the perpendicular slope.",
                    "step_by_step": [
                        "Substitute point $(4, 6)$ and $m = -\\frac{3}{4}$ into $y - 6 = -\\frac{3}{4}(x - 4)$.",
                        "Clear denominator: $4y - 24 = -3x + 12$.",
                        "Collect all terms on one side: $3x + 4y - 36 = 0$."
                    ],
                    "common_pitfalls": "Sign error when distributing $-3(x - 4)$ to get $+12$."
                }
            }
        ]
    },
    2: {
        "subparts": [
            {
                "subpart": "a",
                "stem": "parallel to $2x - y = -3$ and passes through $(5, 3)$",
                "final_answer": "$y = 2x - 7$",
                "mark_breakdown": [
                    {"code": "M1", "desc": "Identify slope $m = 2$ from $2x - y = -3$"},
                    {"code": "M1", "desc": "Substitute point $(5, 3)$ and $m = 2$ into line equation"},
                    {"code": "A1", "desc": "Simplify to $y = 2x - 7$"}
                ],
                "solution": "From $2x - y = -3 \\implies y = 2x + 3$, the parallel line has gradient $m = 2$. Using point $(5, 3)$: $y - 3 = 2(x - 5) \\implies y - 3 = 2x - 10 \\implies y = 2x - 7$.",
                "ai_explanation": {
                    "concept_rule": "Parallel lines have identical gradients ($m_1 = m_2$).",
                    "step_by_step": [
                        "Determine $m = 2$ from $y = 2x + 3$.",
                        "Use point-slope form with $(5, 3)$: $y - 3 = 2(x - 5)$.",
                        "Simplify: $y = 2x - 7$."
                    ],
                    "common_pitfalls": "Using the perpendicular slope instead of the parallel slope."
                }
            }
        ]
    }
}


def is_question_incomplete(q_data: dict) -> bool:
    """Checks if a question JSON has missing subparts, empty solutions, or blank answers."""
    subparts = q_data.get("subparts", [])
    if not subparts:
        return True
    for sp in subparts:
        if not sp.get("solution") or not sp.get("final_answer"):
            return True
    return False


def scan_topic_questions(questions_dir: Path, topic_num: int):
    """Returns a list of tuples (file_path, question_data) for incomplete questions."""
    pattern = f"topic_{topic_num}_q*.json" if topic_num else "topic_*_q*.json"
    files = sorted(
        questions_dir.glob(pattern),
        key=lambda p: [int(c) for c in re.findall(r'\d+', p.name)]
    )

    incomplete = []
    total_files = len(files)

    for fpath in files:
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                q_data = json.load(f)
            if is_question_incomplete(q_data):
                incomplete.append((fpath, q_data))
        except Exception as e:
            print(f"⚠️ Error reading {fpath.name}: {e}")

    return total_files, incomplete


def repair_local(incomplete: list):
    """Applies local repair payloads to missing questions without calling Gemini API."""
    repaired_count = 0
    for fpath, q_data in incomplete:
        q_num = q_data.get("question_number")
        if q_num in LOCAL_REPAIR_PAYLOADS:
            payload = LOCAL_REPAIR_PAYLOADS[q_num]
            # Replace missing subparts or merge specific subparts
            if "subparts" in payload:
                # Merge existing complete subparts with local payload
                local_subparts_by_label = {sp["subpart"]: sp for sp in payload["subparts"]}
                existing_subparts = q_data.get("subparts", [])
                
                updated_subparts = []
                for sp in existing_subparts:
                    label = sp.get("subpart")
                    if label in local_subparts_by_label and (not sp.get("solution") or not sp.get("final_answer")):
                        updated_subparts.append(local_subparts_by_label[label])
                    else:
                        updated_subparts.append(sp)
                
                # Check if there are subparts in payload not present in existing
                existing_labels = {sp.get("subpart") for sp in existing_subparts}
                for label, sp in local_subparts_by_label.items():
                    if label not in existing_labels:
                        updated_subparts.append(sp)

                q_data["subparts"] = updated_subparts

            with open(fpath, "w", encoding="utf-8") as f:
                json.dump(q_data, f, indent=2, ensure_ascii=False)

            print(f"  ✅ Repaired {fpath.name} locally (0 API tokens).")
            repaired_count += 1
        else:
            print(f"  ⚠️ No local payload defined for {fpath.name}. Use --api mode to repair via LLM.")

    return repaired_count


def repair_api(incomplete: list):
    """Calls Gemini API ONLY for the specific incomplete questions to fetch missing solutions."""
    try:
        from google import genai
    except ImportError:
        print("❌ `google-genai` SDK is not installed. Install via `pip install google-genai` or use --local.")
        return 0

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("❌ GEMINI_API_KEY environment variable is not set.")
        return 0

    client = genai.Client(api_key=api_key)
    repaired_count = 0

    for fpath, q_data in incomplete:
        q_num = q_data.get("question_number")
        q_text = q_data.get("question_text", "")
        topic_num = q_data.get("topic_number")

        print(f"  ⚡ Requesting targeted solution from Gemini for Question {q_num}...")

        prompt = f"""
You are an expert IB Math AA SL tutor.
Fill in the official markscheme, final answer, worked solution, and step-by-step AI lesson for the following question:

Question Text: {q_text}
Current Subparts Structure: {json.dumps(q_data.get('subparts', []), indent=2)}

Return ONLY a valid JSON array of objects representing the completed `subparts` list with these exact keys:
- subpart: (e.g. "a", "b", "a i", or "")
- stem: (question stem text)
- final_answer: (LaTeX string wrapped in $ signs)
- mark_breakdown: array of objects {{"code": "M1/A1/R1", "desc": "description"}}
- solution: (full step-by-step worked mathematical solution string in LaTeX)
- ai_explanation: object {{"concept_rule": "...", "step_by_step": ["..."], "common_pitfalls": "..."}}

Ensure all math expressions are properly formatted in LaTeX $...$. Return JSON ONLY.
"""

        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config={"response_mime_type": "application/json"}
            )
            
            repaired_subparts = json.loads(response.text)
            if isinstance(repaired_subparts, list):
                q_data["subparts"] = repaired_subparts
                with open(fpath, "w", encoding="utf-8") as f:
                    json.dump(q_data, f, indent=2, ensure_ascii=False)
                print(f"  ✅ Repaired {fpath.name} via Targeted Gemini API call.")
                repaired_count += 1
            else:
                print(f"  ❌ Invalid response format for {fpath.name}.")

        except Exception as e:
            print(f"  ❌ Error fetching solution for {fpath.name}: {e}")

    return repaired_count


def trigger_sync(topic_num: int):
    """Executes sync_topic_bundles.py to update the topic bundle JSONs."""
    print("\n🔄 Running sync_topic_bundles.py...")
    cmd = f"python3 scripts/sync_topic_bundles.py --topic {topic_num}" if topic_num else "python3 scripts/sync_topic_bundles.py"
    os.system(cmd)


def main():
    parser = argparse.ArgumentParser(description="Scan and repair incomplete question JSON files.")
    parser.add_argument("--topic", "-t", type=int, default=2, help="Specify topic number to check and repair")
    parser.add_argument("--local", action="store_true", help="Apply zero-token local payload fixes")
    parser.add_argument("--api", action="store_true", help="Call Gemini API ONLY for incomplete questions")
    args = parser.parse_args()

    data_dir = Path("public/data")
    questions_dir = data_dir / "questions"

    if not questions_dir.exists():
        print(f"❌ Questions directory {questions_dir} does not exist.")
        sys.exit(1)

    print(f"🔍 Scanning Topic {args.topic} question files in {questions_dir}...")
    total_files, incomplete = scan_topic_questions(questions_dir, args.topic)

    print(f"📊 Summary for Topic {args.topic}:")
    print(f"   - Total Question Files: {total_files}")
    print(f"   - Incomplete Question Files: {len(incomplete)}")

    if not incomplete:
        print("🎉 All question files are 100% complete! No repairs needed.")
        trigger_sync(args.topic)
        return

    print("\nIncomplete Files Found:")
    for fpath, _ in incomplete:
        print(f"   ❌ {fpath.name}")

    if args.local:
        print("\n🛠️ Applying Local Zero-Token Repair Mode...")
        repaired = repair_local(incomplete)
        if repaired > 0:
            trigger_sync(args.topic)
    elif args.api:
        print("\n⚡ Applying Targeted API Repair Mode...")
        repaired = repair_api(incomplete)
        if repaired > 0:
            trigger_sync(args.topic)
    else:
        print("\n💡 Choose a repair mode:")
        print(f"   - Zero-token local repair: python3 scripts/repair_missing_questions.py --topic {args.topic} --local")
        print(f"   - Targeted Gemini API repair: python3 scripts/repair_missing_questions.py --topic {args.topic} --api")


if __name__ == "__main__":
    main()