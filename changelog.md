# Changelog

## [Released] - `feature-add-graphs` - 2026-11-25
## [Released] - `feature-basic-analytics` - 2026-11-25

### Added
- **Free-Tier Topic Analytics View (`TopicAnalyticsView.jsx` & `analyticsUtils.js`):**
  - Built per-topic performance dashboard displaying **Questions Attempted**, **Current Accuracy**, and a **Mastery Breakdown** bar (`Mastered` vs. `Needs Review`), with first-try deltas and cross-topic insights positioned behind the Premium Analytics preview.
  - Added question-level breakdown rows with status filtering (`All Attempted`, `Mastered`, `Needs Review`) and per-subpart outcome pills.
  - Implemented an isolated single-question **Retry** portal that launches just the selected question without exposing the full topic question bank, refreshing topic analytics automatically upon return.
- **Coordinate Function Graphing (`AnswerGraph.jsx` & `scripts/add_answer_graphs.mjs`):**
  - Created a dark-theme SVG graph renderer supporting mathematical expressions, asymptote discontinuity handling, dashed asymptotes, discrete/open points, and piecewise segments.
  - Integrated `<AnswerGraph />` into `SubpartCard.jsx` (revealed answers) and `SolutionDrawers.jsx` (worked solutions).
  - Built CLI batch-patcher `scripts/add_answer_graphs.mjs` to sync `graphSpec` metadata across standalone question JSONs and topic bundles, and added graphs to flagged Topic 2 questions (e.g., `topic_2_q30`).
- **Vector Geometry & Trigonometry Diagrams (`GeometryDiagram.jsx` & `scripts/add_diagrams.mjs`):**
  - Created a declarative SVG geometry component supporting vertices, labeled segments, right-angle markers, angle arcs, and circles/sectors.
  - Wired `<GeometryDiagram />` into both question/subpart prompts (`diagramSpec`) and answer reveals/worked solutions (`answerDiagramSpec`).
  - Built CLI batch-patcher `scripts/add_diagrams.mjs` and added diagrams to Topic 3 questions across both prompt and answer views (e.g., `topic_3_q11`, `topic_3_q13`).
- **Admin Issue Triage CLI (`scripts/db_query.sh`):**
  - Added status filtering (`issues <course_id> [open|closed]`) and a `close-issue <course_id> <question_id>` command for resolving DynamoDB question issues as fixes are verified.

### To-Do / Next Steps
- Continue auditing IB Math AA SL Topic 2 and Topic 3 questions to identify remaining open issues missing coordinate graphs or geometric diagrams in question prompts or revealed answers.
- Register and batch-patch remaining Topic 2 (`graphSpec`) and Topic 3 (`diagramSpec` / `answerDiagramSpec`) items and close resolved issues in DynamoDB.

## [Released] - `feature-branch-1` - 2026-11-19

### Added
- **Granular Question Attempt & Subpart Tracking (`dbService.js`, `SubpartCard.jsx`, `App.jsx`)**
  - Added immediate real-time saving when self-grading subparts (`"I got it right"` / `"I got it wrong"`), ensuring progress is persisted even on the final question of a session.
  - Introduced per-pass `sessionAttemptId` deduplication so grading multiple subparts within a single question updates the active `history` entry in place without inflating `attemptCount`.
  - Added `topicId`, `latestScore`, and per-subpart outcome tracking (`subpartResults`) to DynamoDB `PROGRESS#` items.
  - Replaced the disabled **Next Question →** button on the final question of a practice set with **Finish Session ✓**.
- **Attempt Analytics CLI Queries (`scripts/db_query.sh`)**[cite: 3]
  - Added `attempts`, `user-summary`, `question-stats`, `topic-stats`, and `question-attempts` subcommands with paginated DynamoDB scans and `jq`-formatted terminal reports[cite: 3].
  - Added user email resolution from `PROFILE` records alongside user IDs in analytics outputs[cite: 3].

### Fixed
- **DynamoDB Serialization Error (`dbService.js`)**
  - Configured `DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } })` to prevent SDK marshalling errors when optional fields are `undefined`.
- **Non-Punitive Skip Behavior (`App.jsx`, `dbService.js`)**
  - Stopped writing false `'completed'` or `0%` scores when advancing past questions without self-grading, preserving existing `attemptCount`, `latestResult`, and `latestScore` values.

## [Released] - `admin-debugging` - 11-17-2026

### Added
- **Admin Verification Workflow:** Implemented question verification persistence and unverify/delete capabilities backed by DynamoDB (`AUDIT#<course_id>` partition).
- **Calculator Tagging CLI (`scripts/set_calculator.py`):** Added a Python utility to set, update, or remove `"calculator": true` flags on question JSON files under `public/data/<course_id>/` while preserving UTF-8 LaTeX formatting[cite: 5, 7].
- **Verification Sync CLI (`scripts/sync_verified_to_files.py`):** Added an idempotent sync script to query verified DynamoDB records via `scripts/db_query.sh`[cite: 4, 6] and inject `"verified": true` into corresponding local question JSON files.
- **Database & Local Query Extensions (`scripts/db_query.sh`):** Added support for querying `issues`, `verified` audit statuses[cite: 4, 6], and local `calculator`-enabled question files[cite: 5, 7].

### Changed
- **IAM & Infrastructure (`terraform/`):** Updated Terraform IAM policies to grant `dynamodb:DeleteItem` permissions required for the unverify workflow.