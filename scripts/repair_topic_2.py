#!/usr/bin/env python3
"""
scripts/repair_topic_2.py

Fills missing solutions in topic_2.json locally without calling the Gemini API.
"""

import json
from pathlib import Path

DATA_DIR = Path("public/data")
TOPIC_2_FILE = DATA_DIR / "topic_2.json"

# Known missing solutions directly from the Haese Solutions PDF
MISSING_SOLUTIONS = {
    7: {
        "subparts": [{
            "subpart": "",
            "stem": "$mx^2 + (m - 2)x + m = 0$ has a repeated root.",
            "final_answer": "$m = \\frac{2}{3} \\text{ or } m = -2$",
            "mark_breakdown": [
                {"code": "M1", "desc": "Set discriminant $\\Delta = b^2 - 4ac = 0$"},
                {"code": "M1", "desc": "Form quadratic $(m-2)^2 - 4(m)(m) = 0 \\implies -3m^2 - 4m + 4 = 0$"},
                {"code": "A1", "desc": "Solve $3m^2 + 4m - 4 = 0 \\implies (3m - 2)(m + 2) = 0$"}
            ],
            "solution": "$mx^2 + (m - 2)x + m = 0$ has $a = m, b = m - 2,$ and $c = m$. Therefore, $\\Delta = b^2 - 4ac = (m - 2)^2 - 4(m)(m) = m^2 - 4m + 4 - 4m^2 = -3m^2 - 4m + 4$. For a repeated root, $\\Delta = 0 \\implies -3m^2 - 4m + 4 = 0 \\implies 3m^2 + 4m - 4 = 0 \\implies (3m - 2)(m + 2) = 0 \\implies m = \\frac{2}{3}$ or $-2$.",
            "ai_explanation": {
                "concept_rule": "A quadratic equation has a repeated root if and only if its discriminant $\\Delta = b^2 - 4ac = 0$.",
                "step_by_step": [
                    "Identify coefficients: $a = m, b = m - 2, c = m$.",
                    "Compute $\\Delta = (m - 2)^2 - 4(m)(m) = -3m^2 - 4m + 4$.",
                    "Set $\\Delta = 0 \\implies 3m^2 + 4m - 4 = 0$.",
                    "Factorise $(3m - 2)(m + 2) = 0$ to get $m = \\frac{2}{3}$ or $m = -2$."
                ],
                "common_pitfalls": "Expansion errors with $(m - 2)^2$, specifically forgetting the middle term $-4m$."
            }
        }]
    },
    15: {
        "subparts": [{
            "subpart": "",
            "stem": "$y = mx^2 + 4x + 6$ lies entirely above the $x$-axis.",
            "final_answer": "$m > \\frac{2}{3}$",
            "mark_breakdown": [
                {"code": "M1", "desc": "Calculate discriminant $\\Delta = 16 - 24m$"},
                {"code": "M1", "desc": "Apply positive definite conditions: $a > 0$ and $\\Delta < 0$"},
                {"code": "A1", "desc": "Solve $16 - 24m < 0 \\implies m > \\frac{2}{3}$"}
            ],
            "solution": "$y = mx^2 + 4x + 6$ has $a = m, b = 4, c = 6$. $\\Delta = b^2 - 4ac = 4^2 - 4(m)(6) = 16 - 24m$. The graph lies entirely above the $x$-axis if $a > 0$ and $\\Delta < 0 \\implies m > 0$ and $16 - 24m < 0 \\implies 24m > 16 \\implies m > \\frac{2}{3}$.",
            "ai_explanation": {
                "concept_rule": "A quadratic curve lies strictly above the $x$-axis (positive definite) if $a > 0$ and $\\Delta < 0$.",
                "step_by_step": [
                    "Identify $a = m, b = 4, c = 6$.",
                    "Compute $\\Delta = 16 - 24m$.",
                    "Set $a > 0 \\implies m > 0$ and $\\Delta < 0 \\implies 16 - 24m < 0$.",
                    "Solve $24m > 16 \\implies m > \\frac{2}{3}$."
                ],
                "common_pitfalls": "Using $\\Delta > 0$ instead of $\\Delta < 0$."
            }
        }]
    },
    16: {
        "subparts": [{
            "subpart": "",
            "stem": "$y = kx - 2$ is tangent to $y = 3x^2 + x + 1$.",
            "final_answer": "$k = 7 \\text{ or } k = -5$",
            "mark_breakdown": [
                {"code": "M1", "desc": "Equate line and curve: $3x^2 + (1 - k)x + 3 = 0$"},
                {"code": "M1", "desc": "Set discriminant $\\Delta = (1 - k)^2 - 36 = 0$"},
                {"code": "A1", "desc": "Solve $k^2 - 2k - 35 = 0 \\implies k = 7 \\text{ or } -5$"}
            ],
            "solution": "Equating expressions: $3x^2 + x + 1 = kx - 2 \\implies 3x^2 + (1 - k)x + 3 = 0$. For tangency, $\\Delta = 0 \\implies (1 - k)^2 - 4(3)(3) = 0 \\implies k^2 - 2k + 1 - 36 = 0 \\implies k^2 - 2k - 35 = 0 \\implies (k - 7)(k + 5) = 0 \\implies k = 7 \\text{ or } -5$.",
            "ai_explanation": {
                "concept_rule": "A line is tangent to a parabola when the intersection quadratic has discriminant $\\Delta = 0$.",
                "step_by_step": [
                    "Equate: $3x^2 + x + 1 = kx - 2 \\implies 3x^2 + (1-k)x + 3 = 0$.",
                    "Set $\\Delta = 0 \\implies (1-k)^2 - 36 = 0$.",
                    "Factorise $k^2 - 2k - 35 = 0 \\implies (k-7)(k+5) = 0$.",
                    "Solve for $k = 7$ or $k = -5$."
                ],
                "common_pitfalls": "Forgetting to collect terms into $3x^2 + (1-k)x + 3 = 0$ before computing $\\Delta$."
            }
        }]
    },
    18: {
        "subparts": [{
            "subpart": "",
            "stem": "$y = 2x + c$ never meets $y = 3x^2 + 5x + 7$.",
            "final_answer": "$c < \\frac{25}{4}$",
            "mark_breakdown": [
                {"code": "M1", "desc": "Equate expressions: $3x^2 + 3x + (7 - c) = 0$"},
                {"code": "M1", "desc": "Set discriminant $\\Delta < 0 \\implies 3^2 - 4(3)(7-c) < 0$"},
                {"code": "A1", "desc": "Solve $9 - 84 + 12c < 0 \\implies c < \\frac{25}{4}$"}
            ],
            "solution": "Equating equations gives $3x^2 + 5x + 7 = 2x + c \\implies 3x^2 + 3x + (7 - c) = 0$. No intersections requires $\\Delta < 0 \\implies 3^2 - 4(3)(7 - c) < 0 \\implies 9 - 84 + 12c < 0 \\implies 12c < 75 \\implies c < \\frac{25}{4}$.",
            "ai_explanation": {
                "concept_rule": "Two curves never intersect if the quadratic equation representing their intersection has no real roots ($\\Delta < 0$).",
                "step_by_step": [
                    "Equate: $3x^2 + 5x + 7 = 2x + c \\implies 3x^2 + 3x + (7-c) = 0$.",
                    "Set $\\Delta < 0 \\implies 3^2 - 4(3)(7-c) < 0$.",
                    "Simplify: $-75 + 12c < 0 \\implies 12c < 75 \\implies c < \\frac{25}{4}$."
                ],
                "common_pitfalls": "Sign error when expanding $-12(7-c)$ as $-84 - 12c$ instead of $-84 + 12c$."
            }
        }]
    },
    20: {
        "subparts": [{
            "subpart": "",
            "stem": "Quadratic cuts $y$-axis at 4, touches $y = x - 5$ and $y = -2x$.",
            "final_answer": "$y = \\frac{9}{100}x^2 - \\frac{4}{5}x + 4 \\text{ or } y = \\frac{9}{4}x^2 - 8x + 4$",
            "mark_breakdown": [
                {"code": "M1", "desc": "Identify $c = 4$ from $y$-intercept"},
                {"code": "M1", "desc": "Set $\\Delta = 0$ for $ax^2 + (b-1)x + 9 = 0 \\implies 36a = (b-1)^2$"},
                {"code": "M1", "desc": "Set $\\Delta = 0$ for $ax^2 + (b+2)x + 4 = 0 \\implies 16a = (b+2)^2$"},
                {"code": "A1", "desc": "Solve for $b = -\\frac{4}{5}$ or $b = -8$ and calculate corresponding $a$ values"}
            ],
            "solution": "Let $y = ax^2 + bx + c$. Since $y$-intercept is 4, $c = 4$. Touches $y = x - 5 \\implies ax^2 + (b-1)x + 9 = 0 \\implies \\Delta = (b-1)^2 - 36a = 0 \\implies a = \\frac{(b-1)^2}{36}$. Touches $y = -2x \\implies ax^2 + (b+2)x + 4 = 0 \\implies (b+2)^2 - 16a = 0$. Substituting $a$ gives $(b+2)^2 = \\frac{4}{9}(b-1)^2 \\implies 5b^2 + 44b + 32 = 0 \\implies b = -\\frac{4}{5}$ or $-8$. Corresponding $a$ values are $a = \\frac{9}{100}$ and $a = \\frac{9}{4}$. Thus $y = \\frac{9}{100}x^2 - \\frac{4}{5}x + 4$ or $y = \\frac{9}{4}x^2 - 8x + 4$.",
            "ai_explanation": {
                "concept_rule": "Tangency to multiple lines sets up a system of equations in coefficients $a$ and $b$ using $\\Delta = 0$.",
                "step_by_step": [
                    "Identify $c = 4$ from $y$-intercept.",
                    "Form $\\Delta_1 = 0 \\implies 36a = (b-1)^2$.",
                    "Form $\\Delta_2 = 0 \\implies 16a = (b+2)^2$.",
                    "Equate $a$: $\\frac{(b-1)^2}{36} = \\frac{(b+2)^2}{16} \\implies 5b^2 + 44b + 32 = 0$.",
                    "Solve for $b = -4/5, -8$ and corresponding $a = 9/100, 9/4$."
                ],
                "common_pitfalls": "Missing one of the quadratic roots for $b$."
            }
        }]
    },
    48: {
        "subparts": [{
            "subpart": "",
            "stem": "$P = 1000 + ae^{kn}$, initial population 2000, $P(12) = 4000$. Find $n$ for $P = 10000$.",
            "final_answer": "$n = 24 \\text{ months (or } 2 \\text{ years)}$",
            "mark_breakdown": [
                {"code": "M1", "desc": "Substitute $n = 0, P = 2000 \\implies a = 1000$"},
                {"code": "M1", "desc": "Substitute $n = 12, P = 4000 \\implies e^{12k} = 3$"},
                {"code": "A1", "desc": "Solve $1000 + 1000(3^{n/12}) = 10000 \\implies 3^{n/12} = 9 \\implies n = 24$"}
            ],
            "solution": "At $n = 0$, $2000 = 1000 + a(1) \\implies a = 1000$. At $n = 12$, $4000 = 1000 + 1000e^{12k} \\implies e^{12k} = 3$. Thus $P = 1000 + 1000(3^{n/12})$. Set $P = 10000 \\implies 9000 = 1000(3^{n/12}) \\implies 3^{n/12} = 9 = 3^2 \\implies \\frac{n}{12} = 2 \\implies n = 24$ months.",
            "ai_explanation": {
                "concept_rule": "Find constants $a$ and $k$ sequentially from given boundary values, then solve for target time $n$.",
                "step_by_step": [
                    "Substitute $n = 0, P = 2000 \\implies a = 1000$.",
                    "Substitute $n = 12, P = 4000 \\implies e^{12k} = 3$.",
                    "Set $1000 + 1000(3^{n/12}) = 10000 \\implies 3^{n/12} = 9 = 3^2$.",
                    "Solve $\\frac{n}{12} = 2 \\implies n = 24$ months."
                ],
                "common_pitfalls": "Using $n = 1$ instead of $n = 12$ when time is given in 1 year."
            }
        }]
    },
    49: {
        "subparts": [{
            "subpart": "",
            "stem": "Show that $\\left(\\frac{e^x + e^{-x}}{2}\\right)^2 - \\left(\\frac{e^x - e^{-x}}{2}\\right)^2 = 1$.",
            "final_answer": "$1$",
            "mark_breakdown": [
                {"code": "M1", "desc": "Expand $(e^x + e^{-x})^2 = e^{2x} + 2 + e^{-2x}$"},
                {"code": "M1", "desc": "Expand $(e^x - e^{-x})^2 = e^{2x} - 2 + e^{-2x}$"},
                {"code": "A1", "desc": "Subtract expansions over 4: $\\frac{4}{4} = 1$"}
            ],
            "solution": "$\\frac{(e^x + e^{-x})^2 - (e^x - e^{-x})^2}{4} = \\frac{(e^{2x} + 2 + e^{-2x}) - (e^{2x} - 2 + e^{-2x})}{4} = \\frac{4}{4} = 1$.",
            "ai_explanation": {
                "concept_rule": "Apply identity $(A+B)^2 - (A-B)^2 = 4AB$ with $A = e^x, B = e^{-x}$.",
                "step_by_step": [
                    "Expand numerators over common denominator 4.",
                    "Cancel $e^{2x}$ and $e^{-2x}$ terms.",
                    "Simplify $\\frac{2 - (-2)}{4} = \\frac{4}{4} = 1$."
                ],
                "common_pitfalls": "Sign error when expanding the second binomial."
            }
        }]
    },
    53: {
        "subparts": [{
            "subpart": "",
            "stem": "Translate $f(x) = \\frac{5}{x+2}$ by $\\begin{pmatrix} -4 \\\\ 6 \\end{pmatrix}$.",
            "final_answer": "$g(x) = \\frac{6x + 41}{x + 6}$",
            "mark_breakdown": [
                {"code": "M1", "desc": "Apply transformation $g(x) = f(x + 4) + 6$"},
                {"code": "M1", "desc": "Form fraction $\\frac{5}{(x+4)+2} + 6 = \\frac{5}{x+6} + 6$"},
                {"code": "A1", "desc": "Combine into single fraction $\\frac{6x + 41}{x + 6}$"}
            ],
            "solution": "$g(x) = f(x + 4) + 6 = \\frac{5}{(x+4)+2} + 6 = \\frac{5}{x+6} + \\frac{6(x+6)}{x+6} = \\frac{6x + 41}{x + 6}$.",
            "ai_explanation": {
                "concept_rule": "A translation vector $\\begin{pmatrix} h \\\\ k \\end{pmatrix}$ maps $f(x) \\to f(x - h) + k$.",
                "step_by_step": [
                    "Apply $h = -4, k = 6 \\implies g(x) = f(x + 4) + 6$.",
                    "Substitute into $f(x)$: $\\frac{5}{x+6} + 6$.",
                    "Put over common denominator: $\\frac{5 + 6x + 36}{x+6} = \\frac{6x+41}{x+6}$."
                ],
                "common_pitfalls": "Subtracting 4 in denominator instead of adding 4."
            }
        }]
    }
}

def repair_topic_2():
    if not TOPIC_2_FILE.exists():
        print(f"Error: {TOPIC_2_FILE} not found.")
        return

    with open(TOPIC_2_FILE, "r", encoding="utf-8") as f:
        questions = json.load(f)

    repaired_count = 0
    questions_dir = DATA_DIR / "questions"

    for q in questions:
        q_num = q["question_number"]
        
        # Check if subparts are missing or empty
        needs_repair = False
        if not q["subparts"]:
            needs_repair = True
        else:
            for sp in q["subparts"]:
                if not sp.get("solution") or not sp.get("final_answer"):
                    needs_repair = True
                    break

        if needs_repair and q_num in MISSING_SOLUTIONS:
            q["subparts"] = MISSING_SOLUTIONS[q_num]["subparts"]
            repaired_count += 1
            
            # Update individual file
            q_file = questions_dir / f"topic_2_q{q_num}.json"
            with open(q_file, "w", encoding="utf-8") as f:
                json.dump(q, f, indent=2, ensure_ascii=False)

    # Save updated topic_2.json
    with open(TOPIC_2_FILE, "w", encoding="utf-8") as f:
        json.dump(questions, f, indent=2, ensure_ascii=False)

    print(f"🎉 Successfully repaired {repaired_count} questions in topic_2.json with ZERO API calls!")

if __name__ == "__main__":
    repair_topic_2()