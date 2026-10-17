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
# ==============================================================================

TABLE_NAME="rr-edu-data-dev"

COMMAND=$1
USER_ID=$2
COURSE_ID=$3

if [ -z "$COMMAND" ]; then
  echo "Usage: $0 <users|all|profile|courses|progress> [user_id] [course_id]"
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

  *)
    echo "Unknown command: $COMMAND"
    echo "Usage: $0 <users|all|profile|courses|progress> [user_id] [course_id]"
    exit 1
    ;;
esac
