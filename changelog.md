# Changelog

## [Unreleased] - `admin-debugging`

### Added 11-17-2026
- **Admin Verification Workflow:** Implemented question verification persistence and unverify/delete capabilities backed by DynamoDB (`AUDIT#<course_id>` partition).
- **Calculator Tagging CLI (`scripts/set_calculator.py`):** Added a Python utility to set, update, or remove `"calculator": true` flags on question JSON files under `public/data/<course_id>/` while preserving UTF-8 LaTeX formatting[cite: 5, 7].
- **Verification Sync CLI (`scripts/sync_verified_to_files.py`):** Added an idempotent sync script to query verified DynamoDB records via `scripts/db_query.sh`[cite: 4, 6] and inject `"verified": true` into corresponding local question JSON files.
- **Database & Local Query Extensions (`scripts/db_query.sh`):** Added support for querying `issues`, `verified` audit statuses[cite: 4, 6], and local `calculator`-enabled question files[cite: 5, 7].

### Changed
- **IAM & Infrastructure (`terraform/`):** Updated Terraform IAM policies to grant `dynamodb:DeleteItem` permissions required for the unverify workflow.