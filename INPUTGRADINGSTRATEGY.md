===============================================================================
RR-EDU REVISION APP - ANSWER INPUT & GRADING STRATEGY DOCUMENT
===============================================================================

1. EXECUTIVE SUMMARY & HISTORICAL CONTEXT
-------------------------------------------------------------------------------
* V1 Iteration: Full digital auto-grading with inline LaTeX inputs and KaTeX 
  virtual keypads.
  - Pros: High interactive feel, instant feedback.
  - Cons: Keyboard/math entry friction for complex expressions (e.g., matrices, 
    nested fractions, radicals), edge-case LaTeX equivalence matching failures 
    (e.g., $1/2 x$ vs $\frac{x}{2}$).

* Current V2 Iteration: "Paper-First" Hybrid Scratchpad + Manual Self-Grading.
  - Current UI allows optional text/math preview scratchwork, followed by 
    revealing the official target answer and clicking [Got It Right] / [Got It Wrong].
  - Pros: Zero friction for fast problem solving; mirrors real IB exam conditions 
    where students work on paper.
  - Cons: Lacks instant automated confirmation for simple numerical/algebraic 
    answers.

-------------------------------------------------------------------------------
2. STRATEGIC OPTIONS FOR FUTURE REVISITS
-------------------------------------------------------------------------------

OPTION A: Dual-Mode Toggle ("Exam / Paper Mode" vs. "Interactive / Digital Mode")
-------------------------------------------------------------------------------
Give the student control over how they want to complete the practice set via 
a session toggle on the topic/quiz setup screen.

* Mode 1: Paper & Self-Check (Current V2)
  - Focus: Fast, paper-based drills.
  - UI: Scratchpad input + "Check Answer" reveal + 🟩 Got It Right / 🟥 Got It Wrong.

* Mode 2: Digital Auto-Grade (Enhanced V1)
  - Focus: Immediate digital validation.
  - UI: Dedicated answer input box + Virtual Math Keypad + "Submit & Grade".

* Best Suited For: Accommodating both desktop students who prefer typing and 
  mobile/tablet students working with physical paper or Apple Pencil/stylus.


OPTION B: Smart Auto-Grading Hybrids
-------------------------------------------------------------------------------
Instead of strict string/LaTeX matching, use intelligent client-side validation 
for basic answers while keeping manual self-grading for proof/derivation stems.

* Mechanics:
  1. Exact Symbol / Short Expression Matching:
     - For integers, decimals, simple fractions, or single coordinate points 
       (e.g., $(4, 6)$ or $m = \frac{4}{3}$), automatically grade input on submit.
  2. Fallback to Self-Grading:
     - For multi-step derivations, "Show that..." proofs, or complex expressions, 
       automatically default to manual self-check.
  3. SymPy / Math.js Computer Algebra System (CAS):
     - Use a client-side CAS library to evaluate algebraic equivalence (e.g., 
       evaluating $2x + 4$ as equivalent to $2(x + 2)$).


OPTION C: AI-Assisted Handwritten & Scratchpad Grading
-------------------------------------------------------------------------------
Leverage multimodal AI (e.g., Gemini Vision) for smart grading of uploaded or 
drawn work.

* Mechanics:
  1. Digital Canvas / Photo Upload:
     - Allow students to write on an in-app HTML5 canvas or snap a quick photo 
       of their written paper solution using a mobile camera.
  2. Targeted AI Feedback:
     - Pass the student's handwritten step-by-step work to Gemini.
     - Gemini compares student work against the official mark breakdown (M1, A1, R1) 
       and highlights where a sign error or algebraic step went wrong.

-------------------------------------------------------------------------------
3. RECOMMENDED ROADMAP & IMPLEMENTATION STAGING
-------------------------------------------------------------------------------
* Phase 1 (Current Focus): Deploy core authentication (Cognito) and persistent 
  progress logging (DynamoDB) using the V2 paper-first self-grading system.
* Phase 2: Add Option A (Dual-Mode Toggle) with basic Math.js / Regex equivalence 
  for numeric and short coordinate answers.
* Phase 3: Evaluate Option C (AI Vision/Canvas Grading) as an advanced feature.
===============================================================================