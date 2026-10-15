# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

"""
===============================================================================
RR-EDU REVISION APP - DATA PIPELINE & UTILITY REFERENCE
===============================================================================

1. DEPRECATED / ONE-OFF UTILITIES:
   - `scripts/repair_topic_2.py`:
     [DEPRECATED] Hardcoded patch for Topic 2 edge cases. Do not run again;
     superceded by `repair_missing_questions.py`.

2. ACCIDENTAL / MISSING DATA WORKFLOW (Run Consecutively):
   - Step 1: `python3 scripts/repair_missing_questions.py --topic N [--local | --api]`
     Scans `public/data/questions/` for Topic N, detects incomplete subparts,
     and fills missing answers (using local fallback or targeted $0/low-cost API calls).
   - Step 2: `python3 scripts/sync_topic_bundles.py --topic N`
     Reads the individual question JSONs from `public/data/questions/` and compiles
     them into the bundled `public/data/topic_N.json` while keeping `topics.json`
     intact across all topics.

3. PRE-PARSING & VALIDATION TOOLS:
   - `scripts/test_merge_logic.py` (Dry-Run Test):
     Run BEFORE parsing a new topic (Topics 3, 4, 5) with full Gemini API calls.
     Verifies page slicing, Regex matching, subpart alignment, and JSON merging
     algebraically without saving files or polluting the database.
"""