#!/usr/bin/env bash

# ==============================================================================
# DynamoDB Query Utility
# Table: rr-edu-data-dev (Single-Table Design)
#
# POWER QUERY:
#   aws dynamodb scan --table-name rr-edu-data-dev --limit 5
#
# USAGE:
#   ./scripts/db_query.sh <command> [user_id] [course_id]
#
# ── USER / PARTITION COMMANDS ─────────────────────────────────────────────────
#   1. List up to 10 unique user IDs from the table:
#      ./scripts/db_query.sh users
#
#   2. View user profile details only:
#      ./scripts/db_query.sh profile "usr_12345"
#
#   3. See all enrolled courses (Free & Premium) for a user:
#      ./scripts/db_query.sh courses "usr_12345"
#
#   4. See question practice progress (all topics or specific course):
#      ./scripts/db_query.sh progress "usr_12345"
#      ./scripts/db_query.sh progress "usr_12345" "ib_math_aa_sl"
#
#   5. Inspect entire partition (Profile + Enrollments + Progress):
#      ./scripts/db_query.sh all "usr_12345"
#
#   6. View reported question issues for a course:
#      ./scripts/db_query.sh issues "ib_math_aa_sl"
#
#   7. View verified audit questions for a course:
#      ./scripts/db_query.sh verified "ib_math_aa_sl"
#
# ── ATTEMPT ANALYTICS COMMANDS ───────────────────────────────────────────────
#   8.  All PROGRESS items grouped by user, with per-question breakdown
#       and subpart outcomes from the latest graded history entry:
#       ./scripts/db_query.sh attempts
#       ./scripts/db_query.sh attempts ib_math_aa_sl
#
#   9.  Per-user leaderboard (attempts, mastery, avg score, last active):
#       ./scripts/db_query.sh user-summary
#       ./scripts/db_query.sh user-summary ib_math_aa_sl
#
#   10. Per-question aggregates across all users (weakest spots first):
#       ./scripts/db_query.sh question-stats
#       ./scripts/db_query.sh question-stats ib_math_aa_sl
#
#   11. Per-topic aggregates (attempts, unique questions, users, avg score):
#       ./scripts/db_query.sh topic-stats
#       ./scripts/db_query.sh topic-stats ib_math_aa_sl
#
#   12. Full attempt history for one question across all users:
#       ./scripts/db_query.sh question-attempts topic_1_q3
#       ./scripts/db_query.sh question-attempts topic_1_q3 ib_math_aa_sl
# ==============================================================================

TABLE_NAME="rr-edu-data-dev"

COMMAND=$1
USER_ID=$2
COURSE_ID=$3

USAGE_SHORT="Usage: $0 <command> [args...]
  User commands:      users | profile | courses | progress | all
  Audit commands:     issues | verified
  Analytics commands: attempts | user-summary | question-stats | topic-stats | question-attempts"

if [ -z "$COMMAND" ]; then
  echo "$USAGE_SHORT"
  exit 1
fi

# ─── Helper: paginated full-table scan of PROGRESS items ─────────────────────
# $1 = optional course_id prefix to narrow SK filter.
# Echoes a JSON array of all matching DynamoDB typed-JSON items.
_scan_progress_items() {
  local COURSE_PREFIX="${1:-}"
  local SK_PREFIX
  if [ -n "$COURSE_PREFIX" ]; then
    SK_PREFIX="PROGRESS#${COURSE_PREFIX}"
  else
    SK_PREFIX="PROGRESS#"
  fi

  local RESULTS="[]"
  local LAST_KEY=""

  while true; do
    local PAGE
    if [ -n "$LAST_KEY" ]; then
      PAGE=$(aws dynamodb scan \
        --table-name "$TABLE_NAME" \
        --filter-expression "begins_with(PK, :pk_pfx) AND begins_with(SK, :sk_pfx)" \
        --expression-attribute-values "{\":pk_pfx\":{\"S\":\"USER#\"},\":sk_pfx\":{\"S\":\"${SK_PREFIX}\"}}" \
        --exclusive-start-key "$LAST_KEY" \
        --output json)
    else
      PAGE=$(aws dynamodb scan \
        --table-name "$TABLE_NAME" \
        --filter-expression "begins_with(PK, :pk_pfx) AND begins_with(SK, :sk_pfx)" \
        --expression-attribute-values "{\":pk_pfx\":{\"S\":\"USER#\"},\":sk_pfx\":{\"S\":\"${SK_PREFIX}\"}}" \
        --output json)
    fi

    local PAGE_ITEMS
    PAGE_ITEMS=$(echo "$PAGE" | jq '.Items // []')
    RESULTS=$(printf '%s\n%s' "$RESULTS" "$PAGE_ITEMS" | jq -s 'add')

    LAST_KEY=$(echo "$PAGE" | jq -r 'if .LastEvaluatedKey then (.LastEvaluatedKey | tostring) else "" end')
    if [ -z "$LAST_KEY" ] || [ "$LAST_KEY" = "null" ]; then
      break
    fi
  done
  echo "$RESULTS"
}

# ─── Helper: paginated scan of PROFILE items ─────────────────────────────────
# Returns a jq object map of { "USER#<id>": "<email>" } for display.
_scan_profile_emails() {
  local RESULTS="[]"
  local LAST_KEY=""

  while true; do
    local PAGE
    if [ -n "$LAST_KEY" ]; then
      PAGE=$(aws dynamodb scan \
        --table-name "$TABLE_NAME" \
        --filter-expression "begins_with(PK, :pk_pfx) AND SK = :sk" \
        --expression-attribute-values '{":pk_pfx":{"S":"USER#"},":sk":{"S":"PROFILE"}}' \
        --projection-expression "PK,email" \
        --exclusive-start-key "$LAST_KEY" \
        --output json)
    else
      PAGE=$(aws dynamodb scan \
        --table-name "$TABLE_NAME" \
        --filter-expression "begins_with(PK, :pk_pfx) AND SK = :sk" \
        --expression-attribute-values '{":pk_pfx":{"S":"USER#"},":sk":{"S":"PROFILE"}}' \
        --projection-expression "PK,email" \
        --output json)
    fi

    local PAGE_ITEMS
    PAGE_ITEMS=$(echo "$PAGE" | jq '.Items // []')
    RESULTS=$(printf '%s\n%s' "$RESULTS" "$PAGE_ITEMS" | jq -s 'add')

    LAST_KEY=$(echo "$PAGE" | jq -r 'if .LastEvaluatedKey then (.LastEvaluatedKey | tostring) else "" end')
    if [ -z "$LAST_KEY" ] || [ "$LAST_KEY" = "null" ]; then
      break
    fi
  done

  # Return as a lookup map: { "USER#abc": "user@example.com", ... }
  echo "$RESULTS" | jq 'map({ (.PK.S): (.email.S // "") }) | add // {}'
}

# ─── Notes on DynamoDB typed JSON format ─────────────────────────────────────
# `aws dynamodb scan` always returns typed JSON regardless of how the item was
# written. Fields are accessed as:
#   .fieldName.S   (string)   .fieldName.N   (number string, use tonumber)
#   .fieldName.L   (list)     .fieldName.M   (map)
# history is stored as: .history.L = [ { "M": { ...entry fields... } }, ... ]
# subpartResults is:    .subpartResults.M = { "sp_0": { "S": "correct" }, ... }
# jq helper defined inline:
#   def to_num(f): (f.N // f.S // "0" | tonumber? // 0);
#   def to_str(f): (f.S // f.N // "?");

case $COMMAND in
  # 1. List up to 10 unique user IDs from the table
  users)
    aws dynamodb scan \
      --table-name "$TABLE_NAME" \
      --projection-expression "PK" \
      --limit 50 \
      --output text | awk '{print $2}' | grep '^USER#' | sort -u | head -n 10
    ;;

  # 2. Fetch EVERYTHING stored under a user partition
  all)
    if [ -z "$USER_ID" ]; then echo "Error: user_id required"; exit 1; fi
    aws dynamodb query \
      --table-name "$TABLE_NAME" \
      --key-condition-expression "PK = :pk" \
      --expression-attribute-values "{\":pk\":{\"S\":\"USER#${USER_ID}\"}}"
    ;;

  # 3. View user profile details only
  profile)
    if [ -z "$USER_ID" ]; then echo "Error: user_id required"; exit 1; fi
    aws dynamodb query \
      --table-name "$TABLE_NAME" \
      --key-condition-expression "PK = :pk AND SK = :sk" \
      --expression-attribute-values "{\":pk\":{\"S\":\"USER#${USER_ID}\"}, \":sk\":{\"S\":\"PROFILE\"}}"
    ;;

  # 4. View all enrolled courses (Free & Premium) for a user
  courses)
    if [ -z "$USER_ID" ]; then echo "Error: user_id required"; exit 1; fi
    aws dynamodb query \
      --table-name "$TABLE_NAME" \
      --key-condition-expression "PK = :pk AND begins_with(SK, :sk_prefix)" \
      --expression-attribute-values "{\":pk\":{\"S\":\"USER#${USER_ID}\"}, \":sk_prefix\":{\"S\":\"ENROLLMENT#\"}}"
    ;;

  # 5. View question progress (all topics, or specific course topic)
  progress)
    if [ -z "$USER_ID" ]; then echo "Error: user_id required"; exit 1; fi
    if [ -n "$COURSE_ID" ]; then
      SK_PREFIX="PROGRESS#${COURSE_ID}"
    else
      SK_PREFIX="PROGRESS#"
    fi
    aws dynamodb query \
      --table-name "$TABLE_NAME" \
      --key-condition-expression "PK = :pk AND begins_with(SK, :sk_prefix)" \
      --expression-attribute-values "{\":pk\":{\"S\":\"USER#${USER_ID}\"}, \":sk_prefix\":{\"S\":\"${SK_PREFIX}\"}}"
    ;;

  # 6. View reported question issues for a course
  issues)
    TARGET_COURSE="${COURSE_ID:-$USER_ID}"
    if [ -z "$TARGET_COURSE" ]; then
      echo "Error: course_id required"
      echo "Usage: $0 issues <course_id>"
      exit 1
    fi
    RAW_RES=$(aws dynamodb query \
      --table-name "$TABLE_NAME" \
      --key-condition-expression "PK = :pk" \
      --expression-attribute-values "{\":pk\":{\"S\":\"ISSUE#${TARGET_COURSE}\"}}")

    if command -v jq >/dev/null 2>&1; then
      COUNT=$(echo "$RAW_RES" | jq -r '.Count // 0')
      echo "Found $COUNT issue(s) for course: $TARGET_COURSE"
      echo "============================================================"
      echo "$RAW_RES" | jq -r '.Items[] | "Question ID: \(.questionId.S // .SK.S)\nIssue Type:  \(.issueType.S // "N/A")\nStatus:      \(.status.S // "open")\nReported By: \(.reportedBy.S // "Unknown")\nCreated At:  \(.createdAt.S // "N/A")\nNotes:       \(.notes.S // "(no notes)")\n------------------------------------------------------------"'
    else
      echo "$RAW_RES"
    fi
    ;;

  # 7. View verified audit questions for a course
  verified)
    TARGET_COURSE="${COURSE_ID:-$USER_ID}"
    if [ -z "$TARGET_COURSE" ]; then
      echo "Error: course_id required"
      echo "Usage: $0 verified <course_id>"
      exit 1
    fi
    RAW_RES=$(aws dynamodb query \
      --table-name "$TABLE_NAME" \
      --key-condition-expression "PK = :pk" \
      --expression-attribute-values "{\":pk\":{\"S\":\"AUDIT#${TARGET_COURSE}\"}}")

    if command -v jq >/dev/null 2>&1; then
      COUNT=$(echo "$RAW_RES" | jq -r '.Count // 0')
      echo "Found $COUNT verified question(s) for course: $TARGET_COURSE"
      echo "============================================================"
      echo "$RAW_RES" | jq -r '.Items[] | "Question ID: \(.questionId.S // .SK.S)\nTopic:       \(.topicId.S // "N/A")\nStatus:      \(.status.S // "verified")\nVerified By: \(.verifiedBy.S // "Unknown")\nVerified At: \(.verifiedAt.S // "N/A")\n------------------------------------------------------------"'
    else
      echo "$RAW_RES"
    fi
    ;;

  # ── ANALYTICS: 8. All PROGRESS items grouped by user ─────────────────────
  # Usage: ./scripts/db_query.sh attempts [course_id]
  # $2 serves as optional course_id for all analytics commands.
  attempts)
    FILTER_COURSE="${USER_ID:-}"
    echo "Scanning PROGRESS items${FILTER_COURSE:+ for course: $FILTER_COURSE}..."
    ITEMS=$(_scan_progress_items "$FILTER_COURSE")
    TOTAL=$(echo "$ITEMS" | jq 'length')
    echo "Found $TOTAL progress item(s)."

    if [ "$TOTAL" -eq 0 ]; then exit 0; fi

    if ! command -v jq >/dev/null 2>&1; then
      echo "$ITEMS"; exit 0
    fi

    EMAILS=$(_scan_profile_emails)

    echo "$ITEMS" | jq -r --argjson emails "$EMAILS" '
      def to_num(f): (f.N // f.S // "0" | tonumber? // 0);
      def to_str(f): (f.S // f.N // "?");

      group_by(.PK.S) |
      sort_by(.[0].PK.S) |
      .[] |
      (.[0].PK.S) as $pk |
      ($emails[$pk] // "") as $email |
      (if $email != "" then "\($pk)  [\($email)]" else $pk end) as $user_label |
      (map(to_num(.latestScore)) | if length > 0 then (add / length * 10 | round / 10) else 0 end) as $avg_score |
      (map(to_num(.attemptCount)) | add) as $total_attempts |

      "══════════════════════════════════════════════════════════════════════",
      "USER: \($user_label)",
      "  Unique questions attempted : \(length)",
      "  Total attempts             : \($total_attempts)",
      "  Average latestScore        : \($avg_score)%",
      "──────────────────────────────────────────────────────────────────────",

      (
        sort_by(
          (to_num(.topicId) | tostring),
          to_str(.questionId)
        ) |
        .[] |
        # Latest non-skipped history entry for subpart summary
        (.history.L // [] |
          map(.M) |
          map(select((.result.S // .result // "") != "skipped")) |
          last // null
        ) as $latest_hist |

        (
          if $latest_hist != null then
            ($latest_hist.subpartResults.M // {} | to_entries) as $sp |
            ($sp | map(select(.value.S == "correct")) | length) as $correct |
            ($sp | map(select(.value.S == "incorrect")) | length) as $incorrect |
            ($sp | length) as $total |
            if $total > 0 then
              "\($correct)/\($total) subparts correct  [\($incorrect) incorrect]"
            else
              "no subpart data"
            end
          else "not graded"
          end
        ) as $subpart_summary |

        "  ├─ \(to_str(.questionId))  Topic \(to_str(.topicId))",
        "     Attempts: \(to_num(.attemptCount))  Score: \(to_num(.latestScore))%  Result: \(to_str(.latestResult))  Last: \(to_str(.lastAttemptAt))",
        "     Subparts: \($subpart_summary)"
      )
    '
    ;;

  # ── ANALYTICS: 9. Per-user leaderboard summary ───────────────────────────
  # Usage: ./scripts/db_query.sh user-summary [course_id]
  user-summary)
    FILTER_COURSE="${USER_ID:-}"
    echo "Scanning PROGRESS items${FILTER_COURSE:+ for course: $FILTER_COURSE}..."
    ITEMS=$(_scan_progress_items "$FILTER_COURSE")
    TOTAL=$(echo "$ITEMS" | jq 'length')
    echo "Found $TOTAL progress item(s)."

    if [ "$TOTAL" -eq 0 ]; then exit 0; fi

    if ! command -v jq >/dev/null 2>&1; then
      echo "$ITEMS"; exit 0
    fi

    EMAILS=$(_scan_profile_emails)

    echo "$ITEMS" | jq -r --argjson emails "$EMAILS" '
      def to_num(f): (f.N // f.S // "0" | tonumber? // 0);
      def to_str(f): (f.S // f.N // "?");

      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "USER SUMMARY LEADERBOARD",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",

      (
        group_by(.PK.S) |
        # Sort descending by average score (best performers first)
        sort_by(
          -(map(to_num(.latestScore)) | if length > 0 then add / length else 0 end)
        ) |
        .[] |
        (.[0].PK.S) as $pk |
        ($emails[$pk] // "") as $email |
        (if $email != "" then "\($pk)  [\($email)]" else $pk end) as $user_label |
        (map(to_num(.attemptCount)) | add) as $total_attempts |
        (map(to_num(.latestScore))) as $scores |
        ($scores | length) as $q_count |
        ($scores | if $q_count > 0 then (add / $q_count * 10 | round / 10) else 0 end) as $avg |
        ($scores | map(select(. == 100)) | length) as $mastered |
        ($scores | map(select(. > 0 and . < 100)) | length) as $partial |
        ($scores | map(select(. == 0)) | length) as $missed |
        (map(to_str(.lastAttemptAt)) | sort | last // "never") as $last_active |

        "\($user_label)",
        "  Questions: \($q_count) attempted  |  Attempts: \($total_attempts)  |  Avg Score: \($avg)%",
        "  Mastered (100%): \($mastered)  |  Partial: \($partial)  |  Missed (0%): \($missed)  |  Last Active: \($last_active)",
        "─────────────────────────────────────────────────────────────────────────────────"
      )
    '
    ;;

  # ── ANALYTICS: 10. Per-question aggregates across all users ──────────────
  # Usage: ./scripts/db_query.sh question-stats [course_id]
  question-stats)
    FILTER_COURSE="${USER_ID:-}"
    echo "Scanning PROGRESS items${FILTER_COURSE:+ for course: $FILTER_COURSE}..."
    ITEMS=$(_scan_progress_items "$FILTER_COURSE")
    TOTAL=$(echo "$ITEMS" | jq 'length')
    echo "Found $TOTAL progress item(s)."

    if [ "$TOTAL" -eq 0 ]; then exit 0; fi

    if ! command -v jq >/dev/null 2>&1; then
      echo "$ITEMS"; exit 0
    fi

    echo "$ITEMS" | jq -r '
      def to_num(f): (f.N // f.S // "0" | tonumber? // 0);
      def to_str(f): (f.S // f.N // "?");

      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "QUESTION PERFORMANCE STATS  (sorted: weakest avg score first)",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",

      # Collect graded scores from each item, grouped by question key
      (
        group_by((.courseId.S // "?") + "#" + (to_str(.topicId)) + "#" + to_str(.questionId)) |
        map({
          questionId:   (.[0] | to_str(.questionId)),
          topicId:      (.[0] | to_str(.topicId)),
          courseId:     (.[0].courseId.S // "?"),
          uniqueUsers:  (map(.PK.S) | unique | length),
          totalAttempts:(map(to_num(.attemptCount)) | add),
          # Flatten all graded (non-skipped) history entry scores
          gradedScores: (
            map(
              .history.L // [] | map(.M) |
              map(
                select(
                  (.result.S // "") != "skipped" and
                  (.score != null)
                ) |
                (.score.N // .score.S // "0" | tonumber? // 0)
              )
            ) | add // []
          )
        }) |
        map(. + {
          avgScore: (if (.gradedScores | length) > 0
                     then (.gradedScores | add / length * 10 | round / 10)
                     else null end),
          full:    (.gradedScores | map(select(. == 100)) | length),
          partial: (.gradedScores | map(select(. > 0 and . < 100)) | length),
          zero:    (.gradedScores | map(select(. == 0)) | length)
        }) |
        # Sort: never-graded last, then weakest avg score first
        sort_by(.avgScore // 999) |
        .[] |
        "Question: \(.questionId)  |  Topic: \(.topicId)  |  Course: \(.courseId)",
        "  Users: \(.uniqueUsers)  |  Total Attempts: \(.totalAttempts)  |  Avg Score: \(if .avgScore != null then "\(.avgScore)%" else "N/A (no graded entries)" end)",
        "  Full (100%): \(.full)  |  Partial: \(.partial)  |  Zero (0%): \(.zero)",
        "─────────────────────────────────────────────────────────────────────────────────"
      )
    '
    ;;

  # ── ANALYTICS: 11. Per-topic aggregates ──────────────────────────────────
  # Usage: ./scripts/db_query.sh topic-stats [course_id]
  topic-stats)
    FILTER_COURSE="${USER_ID:-}"
    echo "Scanning PROGRESS items${FILTER_COURSE:+ for course: $FILTER_COURSE}..."
    ITEMS=$(_scan_progress_items "$FILTER_COURSE")
    TOTAL=$(echo "$ITEMS" | jq 'length')
    echo "Found $TOTAL progress item(s)."

    if [ "$TOTAL" -eq 0 ]; then exit 0; fi

    if ! command -v jq >/dev/null 2>&1; then
      echo "$ITEMS"; exit 0
    fi

    echo "$ITEMS" | jq -r '
      def to_num(f): (f.N // f.S // "0" | tonumber? // 0);
      def to_str(f): (f.S // f.N // "?");

      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "TOPIC PERFORMANCE STATS",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",

      (
        group_by(to_str(.topicId)) |
        sort_by((.[0] | to_num(.topicId))) |
        .[] |
        (.[0] | to_str(.topicId)) as $topic |
        (map(.PK.S) | unique | length) as $unique_users |
        (map(to_str(.questionId)) | unique | length) as $unique_qs |
        (map(to_num(.attemptCount)) | add) as $total_attempts |
        (
          map(
            .history.L // [] | map(.M) |
            map(
              select(
                (.result.S // "") != "skipped" and
                (.score != null)
              ) |
              (.score.N // .score.S // "0" | tonumber? // 0)
            )
          ) | add // []
        ) as $graded_scores |
        (
          if ($graded_scores | length) > 0
          then ($graded_scores | add / length * 10 | round / 10)
          else null
          end
        ) as $avg |

        "Topic \($topic):",
        "  Unique questions: \($unique_qs)  |  Unique users: \($unique_users)  |  Total attempts: \($total_attempts)",
        "  Avg score (graded entries): \(if $avg != null then "\($avg)%" else "N/A" end)",
        "─────────────────────────────────────────────────────────────────────────────────"
      )
    '
    ;;

  # ── ANALYTICS: 12. Full attempt history for a single question ────────────
  # Usage: ./scripts/db_query.sh question-attempts <question_id> [course_id]
  question-attempts)
    QUESTION_ID="${USER_ID:-}"
    FILTER_COURSE="${COURSE_ID:-}"

    if [ -z "$QUESTION_ID" ]; then
      echo "Error: question_id required"
      echo "Usage: $0 question-attempts <question_id> [course_id]"
      exit 1
    fi

    echo "Scanning for all attempts on question: $QUESTION_ID${FILTER_COURSE:+ in course: $FILTER_COURSE}..."
    ITEMS=$(_scan_progress_items "$FILTER_COURSE")

    if ! command -v jq >/dev/null 2>&1; then
      echo "Error: jq is required for question-attempts output" >&2
      exit 1
    fi

    EMAILS=$(_scan_profile_emails)

    echo "$ITEMS" | jq -r --arg qid "$QUESTION_ID" --argjson emails "$EMAILS" '
      def to_num(f): (f.N // f.S // "0" | tonumber? // 0);
      def to_str(f): (f.S // f.N // "?");

      map(select(to_str(.questionId) == $qid)) |
      if length == 0 then
        "No attempts found for question: \($qid)"
      else
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "ATTEMPT HISTORY  —  Question: \($qid)",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        (
          .[] |
          (.PK.S) as $pk |
          ($emails[$pk] // "") as $email |
          (if $email != "" then "\($pk)  [\($email)]" else $pk end) as $user_label |
          "USER: \($user_label)  |  Topic: \(to_str(.topicId))  |  attemptCount: \(to_num(.attemptCount))  |  latestScore: \(to_num(.latestScore))%  |  latestResult: \(to_str(.latestResult))",
          (
            (.history.L // []) | to_entries |
            .[] |
            .value.M as $h |
            (
              $h.subpartResults.M // {} | to_entries |
              map((.key) + "=" + (.value.S // "?")) |
              if length > 0 then join("  ") else "(none)" end
            ) as $sp_line |
            "  [\(.index + 1)] \($h.timestamp.S // "?")  result=\($h.result.S // "?")  score=\($h.score.N // "N/A")  mode=\($h.mode.S // "?")",
            "       subparts: \($sp_line)"
          ),
          "─────────────────────────────────────────────────────────────────────────────────"
        )
      end
    '
    ;;

  *)
    echo "Unknown command: $COMMAND"
    echo "$USAGE_SHORT"
    exit 1
    ;;
esac
