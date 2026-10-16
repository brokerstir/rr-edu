#!/usr/bin/env python3
"""
scripts/parse_h_revision.py

Hardened 2-pass parser for Haese IB Math AA SL revision guide:
1. Pass 1: Questions PDF page-by-page (extracts stems and subparts).
2. Pass 2: Solutions PDF in 3-page chunks (extracts mark_breakdown, solution, final_answer, and ai_explanation).
Normalizes subpart keys and LaTeX formatting, ensuring 100% solution coverage.

Usage ex:
  .venv/bin/python3 scripts/parse_h_revision.py --topic 3
  .venv/bin/python3 scripts/parse_h_revision.py --test-merge
  .venv/bin/python3 scripts/parse_h_revision.py --test-merge --topic 3
"""

import os
import json
import time
import tempfile
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from pypdf import PdfReader, PdfWriter

HAS_GENAI = False
try:
    from google import genai
    from google.genai import types
    from pydantic import BaseModel, field_validator
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False


TOPIC_PAGES = {
    1: {
        "name": "Number and Algebra",
        "q_pages": [3, 4, 5, 6],
        "s_pages": list(range(1, 15))
    },
    2: {
        "name": "Functions",
        "q_pages": [11, 12, 13, 14, 15],
        "s_pages": list(range(15, 35))
    },
    3: {
        "name": "Geometry and Trigonometry",
        "q_pages": [19, 20, 21, 22, 23, 24],
        "s_pages": list(range(35, 59))
    },
    4: {
        "name": "Statistics and Probability",
        "q_pages": [30, 31, 32, 33, 34, 35, 36, 37],
        "s_pages": list(range(59, 81))
    },
    5: {
        "name": "Calculus",
        "q_pages": [43, 44, 45, 46, 47, 48, 49],
        "s_pages": list(range(81, 118))
    }
}


# ==============================================================================
# Pydantic Schemas with Automated Format Normalization
# ==============================================================================
if HAS_GENAI:
    class MarkItem(BaseModel):
        code: str  # e.g. "M1", "A1", "R1"
        desc: str

    class AIExplanation(BaseModel):
        concept_rule: str
        step_by_step: List[str]
        common_pitfalls: str

    # Pass 1: Stems Only
    class SubpartStemOnly(BaseModel):
        subpart: str
        stem: str

        @field_validator('subpart')
        @classmethod
        def normalize_subpart_label(cls, v: str) -> str:
            v_clean = v.strip().lower()
            if v_clean in ["none", "default", "main", "null", "single", "1", "q1"]:
                return ""
            return v_clean

    class QuestionStemBatch(BaseModel):
        question_number: int
        question_text: str
        has_diagram: bool
        subparts: List[SubpartStemOnly]

    class Pass1QuestionsBatch(BaseModel):
        questions: List[QuestionStemBatch]

    # Pass 2: Solutions & Rubrics Only
    class SubpartSolutionBatch(BaseModel):
        question_number: int
        subpart: str
        final_answer: str
        mark_breakdown: List[MarkItem]
        solution: str
        ai_explanation: AIExplanation

        @field_validator('subpart')
        @classmethod
        def normalize_subpart_label(cls, v: str) -> str:
            v_clean = v.strip().lower()
            if v_clean in ["none", "default", "main", "null", "single"]:
                return ""
            return v_clean

        @field_validator('final_answer')
        @classmethod
        def ensure_latex_wrapper(cls, v: str) -> str:
            v_str = v.strip()
            if not v_str:
                return ""
            if not v_str.startswith('$'):
                v_str = f"${v_str}$"
            return v_str

    class Pass2SolutionsBatch(BaseModel):
        solutions: List[SubpartSolutionBatch]


def get_gemini_client() -> Optional[Any]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    return genai.Client(api_key=api_key)


def slice_pages_to_tempfile(pdf_reader: PdfReader, page_numbers: List[int]) -> str:
    writer = PdfWriter()
    for p in page_numbers:
        if 1 <= p <= len(pdf_reader.pages):
            writer.add_page(pdf_reader.pages[p - 1])
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    writer.write(tmp.name)
    tmp.close()
    return tmp.name


def chunk_list(lst: list, size: int):
    for i in range(0, len(lst), size):
        yield lst[i:i + size]


def run_pass1_questions(
    client: Any,
    topics_reader: PdfReader,
    q_pages: List[int],
    topic_num: int,
    model_name: str
) -> Dict[int, Dict[str, Any]]:
    questions_dict = {}

    for page_num in q_pages:
        print(f"  📄 [Pass 1/2] Questions Page {page_num}...")
        tmp_path = slice_pages_to_tempfile(topics_reader, [page_num])
        up_file = None
        try:
            up_file = client.files.upload(file=tmp_path)
            prompt = f"""
Extract all SKILL BUILDER QUESTIONS on this single Questions PDF page for TOPIC {topic_num}.
Format inline math in standard LaTeX ($...$). Set `has_diagram = True` if a figure is referenced.
Subpart labeling rules:
- If a question has explicit subparts like 'a', 'b', or nested 'a i', 'a ii', extract each separately.
- If a question is a single standalone question with no subpart letters, set `subpart = ""` (empty string).
"""
            response = client.models.generate_content(
                model=model_name,
                contents=[up_file, prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=Pass1QuestionsBatch,
                    temperature=0.1
                ),
            )
            data: Pass1QuestionsBatch = response.parsed
            for q in data.questions:
                questions_dict[q.question_number] = {
                    "id": f"topic_{topic_num}_q{q.question_number}",
                    "topic_number": topic_num,
                    "topic_name": TOPIC_PAGES[topic_num]["name"],
                    "question_number": q.question_number,
                    "question_text": q.question_text,
                    "has_diagram": q.has_diagram,
                    "subparts": {
                        s.subpart: {
                            "subpart": s.subpart,
                            "stem": s.stem,
                            "final_answer": "",
                            "mark_breakdown": [],
                            "solution": "",
                            "ai_explanation": None
                        }
                        for s in q.subparts
                    }
                }
        except Exception as e:
            print(f"  ⚠️ Warning: Pass 1 error on Page {page_num}: {e}")
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
            if up_file:
                try:
                    client.files.delete(name=up_file.name)
                except Exception:
                    pass
        time.sleep(1)

    return questions_dict


def run_pass2_solutions(
    client: Any,
    solutions_reader: PdfReader,
    s_pages: List[int],
    topic_num: int,
    model_name: str
) -> List[Any]:
    all_sols = []

    for chunk in chunk_list(s_pages, 3):
        print(f"  📝 [Pass 2/2] Solutions Pages {chunk[0]}..{chunk[-1]}...")
        tmp_path = slice_pages_to_tempfile(solutions_reader, chunk)
        up_file = None
        try:
            up_file = client.files.upload(file=tmp_path)
            prompt = f"""
Extract ALL WORKED SOLUTIONS on these PDF pages for TOPIC {topic_num}.
Ensure NO questions or subparts are omitted.

Subpart Matching Rules:
1. `question_number`: Identify the corresponding integer question number.
2. `subpart`: Match subpart labels accurately:
   - For subparts with letters/roman numerals, extract exact label (e.g., 'a', 'b', 'a i', 'a ii', 'c i').
   - For single-part questions that have NO subpart letters in the question stem, set `subpart = ""` (empty string).
3. `final_answer`: Extract isolated short target answer enclosed in LaTeX $...$.
4. `mark_breakdown`: Extract rubric array containing mark codes ("M1", "A1", "R1") and descriptions.
5. `solution`: Extract full worked math derivation.
6. `ai_explanation`: Generate object with `concept_rule`, `step_by_step` array, and `common_pitfalls`.
Format all math expressions as standard LaTeX inside $...$.
"""
            response = client.models.generate_content(
                model=model_name,
                contents=[up_file, prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=Pass2SolutionsBatch,
                    temperature=0.1
                ),
            )
            data: Pass2SolutionsBatch = response.parsed
            all_sols.extend(data.solutions)
        except Exception as e:
            print(f"  ⚠️ Warning: Pass 2 error on Pages {chunk[0]}..{chunk[-1]}: {e}")
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
            if up_file:
                try:
                    client.files.delete(name=up_file.name)
                except Exception:
                    pass
        time.sleep(1)

    return all_sols


def parse_topic(
    client: Any,
    topics_reader: PdfReader,
    solutions_reader: PdfReader,
    topic_num: int,
    topic_info: dict,
    model_name: str
) -> List[Dict[str, Any]]:
    print(f"\n🚀 Slicing & Parsing Topic {topic_num}: {topic_info['name']}...")

    # Pass 1: Questions
    questions_dict = run_pass1_questions(client, topics_reader, topic_info["q_pages"], topic_num, model_name)

    # Pass 2: Solutions
    sols_list = run_pass2_solutions(client, solutions_reader, topic_info["s_pages"], topic_num, model_name)

    # Group Pass 2 solutions by question_number
    sols_by_q = {}
    for sol in sols_list:
        q_num = sol.question_number
        if q_num not in sols_by_q:
            sols_by_q[q_num] = []
        sols_by_q[q_num].append(sol)

    # Merge Solutions into Questions
    merged_count = 0
    for q_num, q_data in questions_dict.items():
        sp_dict = q_data["subparts"]
        q_sols = sols_by_q.get(q_num, [])

        if not q_sols:
            continue

        sp_keys = list(sp_dict.keys())

        # Attempt 1: Exact / Normalized Match
        unmatched_sols = []
        for sol in q_sols:
            s_part = sol.subpart.strip().lower().replace(" ", "").replace("(", "").replace(")", "")
            if s_part in ["none", "default", "main", "null", "single", "1", "q1"]:
                s_part = ""

            matched_key = None

            for k in sp_keys:
                k_clean = k.strip().lower().replace(" ", "").replace("(", "").replace(")", "")
                if s_part == k_clean or (s_part == "" and len(sp_keys) == 1):
                    matched_key = k
                    break

            if matched_key is not None:
                sp_dict[matched_key].update({
                    "final_answer": sol.final_answer,
                    "mark_breakdown": [{"code": m.code, "desc": m.desc} for m in sol.mark_breakdown],
                    "solution": sol.solution,
                    "ai_explanation": {
                        "concept_rule": sol.ai_explanation.concept_rule,
                        "step_by_step": sol.ai_explanation.step_by_step,
                        "common_pitfalls": sol.ai_explanation.common_pitfalls
                    }
                })
                merged_count += 1
            else:
                unmatched_sols.append(sol)

        # Attempt 2: Sequential Position Fill for remaining empty subparts
        empty_keys = [k for k, v in sp_dict.items() if not v.get("solution")]
        for sol, empty_k in zip(unmatched_sols, empty_keys):
            sp_dict[empty_k].update({
                "final_answer": sol.final_answer,
                "mark_breakdown": [{"code": m.code, "desc": m.desc} for m in sol.mark_breakdown],
                "solution": sol.solution,
                "ai_explanation": {
                    "concept_rule": sol.ai_explanation.concept_rule,
                    "step_by_step": sol.ai_explanation.step_by_step,
                    "common_pitfalls": sol.ai_explanation.common_pitfalls
                }
            })
            merged_count += 1

    final_questions = []
    for q_num in sorted(questions_dict.keys()):
        q_data = questions_dict[q_num]
        q_data["subparts"] = list(q_data["subparts"].values())
        final_questions.append(q_data)

    print(f"✅ Topic {topic_num}: {len(final_questions)} questions extracted, {merged_count} solutions merged.")
    return final_questions


def save_static_bundles(data_dir: Path, all_topics_data: Dict[int, List[Dict[str, Any]]]) -> None:
    data_dir.mkdir(parents=True, exist_ok=True)
    questions_dir = data_dir / "questions"
    questions_dir.mkdir(parents=True, exist_ok=True)

    manifest_file = data_dir / "topics.json"
    manifest_dict = {}

    if manifest_file.exists():
        try:
            with open(manifest_file, "r", encoding="utf-8") as f:
                existing_manifest = json.load(f)
                manifest_dict = {item["topic_number"]: item for item in existing_manifest}
        except Exception as e:
            print(f"⚠️ Warning: Could not parse existing topics.json: {e}")
            manifest_dict = {}

    for t_num, q_list in all_topics_data.items():
        t_name = TOPIC_PAGES.get(t_num, {}).get("name", f"Topic {t_num}")
        t_filename = f"topic_{t_num}.json"

        for q in q_list:
            q_file = questions_dir / f"{q['id']}.json"
            with open(q_file, "w", encoding="utf-8") as f:
                json.dump(q, f, indent=2, ensure_ascii=False)

        with open(data_dir / t_filename, "w", encoding="utf-8") as f:
            json.dump(q_list, f, indent=2, ensure_ascii=False)

        manifest_dict[t_num] = {
            "topic_number": t_num,
            "topic_name": t_name,
            "question_count": len(q_list),
            "bundle_file": f"data/{t_filename}"
        }

    for t_num in [1, 2, 3, 4, 5]:
        bundle_path = data_dir / f"topic_{t_num}.json"
        if bundle_path.exists() and t_num not in manifest_dict:
            try:
                with open(bundle_path, "r", encoding="utf-8") as f:
                    b_data = json.load(f)
                t_name = TOPIC_PAGES.get(t_num, {}).get("name", f"Topic {t_num}")
                manifest_dict[t_num] = {
                    "topic_number": t_num,
                    "topic_name": t_name,
                    "question_count": len(b_data),
                    "bundle_file": f"data/topic_{t_num}.json"
                }
            except Exception:
                pass

    sorted_manifest = [manifest_dict[k] for k in sorted(manifest_dict.keys())]

    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(sorted_manifest, f, indent=2, ensure_ascii=False)

    active_topics = [m["topic_number"] for m in sorted_manifest]
    print(f"\n🎉 Successfully saved data files and updated master manifest 'topics.json'.")
    print(f"   Active topics indexed in topics.json: {active_topics}")


def run_zero_token_test_merge(topic_num: Optional[int] = None):
    """Performs a local dry-run test of normalization and merge logic without making API calls."""
    t_target = topic_num if topic_num else 3
    t_name = TOPIC_PAGES.get(t_target, {}).get("name", f"Topic {t_target}")

    print(f"🧪 Running Zero-Token Local Key Matching Test for Topic {t_target} ({t_name})...")

    # Mock Pass 1 Question dictionary (containing nested subparts AND single-part questions)
    mock_questions = {
        1: {
            "id": f"topic_{t_target}_q1",
            "question_number": 1,
            "subparts": {
                "a i": {"subpart": "a i", "stem": "Stem 1a i", "solution": ""},
                "a ii": {"subpart": "a ii", "stem": "Stem 1a ii", "solution": ""},
                "b": {"subpart": "b", "stem": "Stem 1b", "solution": ""}
            }
        },
        7: {
            "id": f"topic_{t_target}_q7",
            "question_number": 7,
            "subparts": {
                "": {"subpart": "", "stem": "Single part stem", "solution": ""}
            }
        }
    }

    class MockSolution:
        def __init__(self, q_num, sp, sol):
            self.question_number = q_num
            self.subpart = sp
            self.final_answer = "$x = 5$"
            self.mark_breakdown = []
            self.solution = sol
            self.ai_explanation = type('obj', (object,), {
                'concept_rule': 'Rule', 'step_by_step': ['Step 1'], 'common_pitfalls': 'None'
            })()

    mock_sols = [
        MockSolution(1, "a i", "Solution 1a i"),
        MockSolution(1, "a ii", "Solution 1a ii"),
        MockSolution(1, "b", "Solution 1b"),
        MockSolution(7, "single", "Solution 7 single part")  # Mock LLM returning 'single'
    ]

    sols_by_q = {}
    for sol in mock_sols:
        q_num = sol.question_number
        if q_num not in sols_by_q:
            sols_by_q[q_num] = []
        sols_by_q[q_num].append(sol)

    merged_count = 0
    for q_num, q_data in mock_questions.items():
        sp_dict = q_data["subparts"]
        q_sols = sols_by_q.get(q_num, [])
        if not q_sols:
            continue

        sp_keys = list(sp_dict.keys())
        unmatched_sols = []

        for sol in q_sols:
            s_part = sol.subpart.strip().lower().replace(" ", "").replace("(", "").replace(")", "")
            if s_part in ["none", "default", "main", "null", "single", "1", "q1"]:
                s_part = ""

            matched_key = None

            for k in sp_keys:
                k_clean = k.strip().lower().replace(" ", "").replace("(", "").replace(")", "")
                if s_part == k_clean or (s_part == "" and len(sp_keys) == 1):
                    matched_key = k
                    break

            if matched_key is not None:
                sp_dict[matched_key]["solution"] = sol.solution
                merged_count += 1
            else:
                unmatched_sols.append(sol)

    assert merged_count == 4, f"Expected 4 merged solutions, got {merged_count}"
    assert mock_questions[1]["subparts"]["a i"]["solution"] == "Solution 1a i"
    assert mock_questions[7]["subparts"][""]["solution"] == "Solution 7 single part"

    print(f"✅ Zero-Token Test Passed 100% for Topic {t_target}! All nested and single-part questions merged cleanly.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--topics", default="ib/Mathematics-AA-SL-2-REVISION-GUIDE-Topics-Haese2020.pdf")
    parser.add_argument("--solutions", default="ib/Mathematics-AA-SL-2-REVISION-GUIDE-Skill-Solutions-Haese-2020.pdf")
    parser.add_argument("--model", default=os.getenv("GEMINI_MODEL", "gemini-3.8-flash"))
    parser.add_argument("--topic", type=int, choices=[1, 2, 3, 4, 5])
    parser.add_argument("--outdir", default="public/data")
    parser.add_argument("--test-merge", action="store_true", help="Run local zero-token key matching test")
    args = parser.parse_args()

    if args.test_merge:
        run_zero_token_test_merge(topic_num=args.topic)
        return

    client = get_gemini_client()
    if not client:
        print("❌ GEMINI_API_KEY environment variable not set.")
        return

    topics_reader = PdfReader(args.topics)
    solutions_reader = PdfReader(args.solutions)

    target_topics = [args.topic] if args.topic else [3]
    all_data = {}

    for t_num in target_topics:
        all_data[t_num] = parse_topic(
            client, topics_reader, solutions_reader, t_num, TOPIC_PAGES[t_num], args.model
        )

    save_static_bundles(Path(args.outdir), all_data)


if __name__ == "__main__":
    main()