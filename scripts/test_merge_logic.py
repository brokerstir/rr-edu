#!/usr/bin/env python3
"""
scripts/test_merge_logic.py

Offline validation test: Verifies that the new 2-stage matching logic
properly populates `topic_2_q1` subparts ('a i', 'a ii', 'b') without calling Gemini API.
"""

import json

# Mock Pass 1 Question Dictionary (from Questions PDF extraction)
pass1_question_1 = {
    "id": "topic_2_q1",
    "topic_number": 2,
    "topic_name": "Functions",
    "question_number": 1,
    "question_text": "A line segment has equation $4x - 3y + 2 = 0$. Its midpoint is $(4, 6)$.",
    "has_diagram": False,
    "subparts": {
        "a i": {"subpart": "a i", "stem": "State the gradient of the line segment.", "solution": "", "final_answer": ""},
        "a ii": {"subpart": "a ii", "stem": "State the gradient of its perpendicular bisector.", "solution": "", "final_answer": ""},
        "b": {"subpart": "b", "stem": "State the equation of the perpendicular bisector.", "solution": "", "final_answer": ""}
    }
}

# Mock Pass 2 Solutions List (as returned by Gemini from Solutions PDF)
pass2_solutions_q1 = [
    {
        "question_number": 1,
        "subpart": "a(i)",  # Notice format discrepancy from PDF
        "final_answer": "$\\frac{4}{3}$",
        "solution": "Rearranging $4x - 3y + 2 = 0 \\implies 3y = 4x + 2 \\implies y = \\frac{4}{3}x + \\frac{2}{3}$. Thus $m = \\frac{4}{3}$."
    },
    {
        "question_number": 1,
        "subpart": "a(ii)", # Discrepancy with parentheses
        "final_answer": "$-\\frac{3}{4}$",
        "solution": "Perpendicular gradient $m_2 = -\\frac{1}{m_1} = -\\frac{3}{4}$."
    },
    {
        "question_number": 1,
        "subpart": "b",
        "final_answer": "$3x + 4y - 36 = 0$",
        "solution": "Using point $(4, 6)$ and gradient $m = -\\frac{3}{4}$: $y - 6 = -\\frac{3}{4}(x - 4) \\implies 3x + 4y - 36 = 0$."
    }
]

def test_merge():
    sp_dict = pass1_question_1["subparts"]
    sp_keys = list(sp_dict.keys())
    
    unmatched_sols = []
    merged_count = 0

    # Attempt 1: Normalized string matching
    for sol in pass2_solutions_q1:
        s_part = sol["subpart"].strip().lower().replace(" ", "").replace("(", "").replace(")", "")
        matched_key = None

        for k in sp_keys:
            k_clean = k.strip().lower().replace(" ", "").replace("(", "").replace(")", "")
            if s_part == k_clean or (s_part == "" and len(sp_keys) == 1):
                matched_key = k
                break

        if matched_key:
            sp_dict[matched_key].update({
                "final_answer": sol["final_answer"],
                "solution": sol["solution"]
            })
            merged_count += 1
        else:
            unmatched_sols.append(sol)

    # Attempt 2: Sequential Position Fill
    empty_keys = [k for k, v in sp_dict.items() if not v.get("solution")]
    for sol, empty_k in zip(unmatched_sols, empty_keys):
        sp_dict[empty_k].update({
            "final_answer": sol["final_answer"],
            "solution": sol["solution"]
        })
        merged_count += 1

    print("\n--- TEST MERGE RESULT FOR TOPIC 2 QUESTION 1 ---")
    print(json.dumps(pass1_question_1, indent=2))
    
    # Validation checks
    all_filled = all(sp["solution"] != "" and sp["final_answer"] != "" for sp in sp_dict.values())
    if all_filled and merged_count == 3:
        print("\n✅ PASSED: All subparts ('a i', 'a ii', 'b') successfully matched and populated!")
    else:
        print("\n❌ FAILED: Some subparts are still empty.")

if __name__ == "__main__":
    test_merge()