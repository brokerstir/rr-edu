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
# COMMAND EXAMPLES:
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
# ==============================================================================

TABLE_NAME="rr-edu-data-dev"

COMMAND=$1
USER_ID=$2
COURSE_ID=$3

if [ -z "$COMMAND" ]; then
  echo "Usage: $0 <users|all|profile|courses|progress|issues|verified> [user_id|course_id] [course_id]"
  exit 1
fi

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

  *)
    echo "Unknown command: $COMMAND"
    echo "Usage: $0 <users|all|profile|courses|progress|issues|verified> [user_id|course_id] [course_id]"
    exit 1
    ;;
esac
