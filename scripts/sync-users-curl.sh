#!/bin/bash

# Sync Supabase Users to Clerk using curl
# Usage: CLERK_SECRET_KEY=sk_live_xxx SUPABASE_SERVICE_ROLE_KEY=xxx ./scripts/sync-users-curl.sh

if [ -z "$CLERK_SECRET_KEY" ]; then
  echo "Error: CLERK_SECRET_KEY environment variable is required"
  exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required"
  exit 1
fi

SUPABASE_URL="https://rkzcybthcszeusrohbtc.supabase.co"
DEFAULT_PASSWORD="MendSafety2025!"

echo "==========================================="
echo "Syncing Supabase Users to Clerk"
echo "==========================================="
echo ""

# Fetch users without clerk_user_id
echo "Fetching users from Supabase..."
USERS=$(curl -s "${SUPABASE_URL}/rest/v1/users?select=user_id,email,display_name,clerk_user_id&clerk_user_id=is.null&email=not.is.null" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")

# Count users
USER_COUNT=$(echo "$USERS" | jq 'length')
echo "Found ${USER_COUNT} users to sync"
echo ""

CREATED=0
LINKED=0
FAILED=0

# Process each user
echo "$USERS" | jq -c '.[]' | while read -r user; do
  USER_ID=$(echo "$user" | jq -r '.user_id')
  EMAIL=$(echo "$user" | jq -r '.email')
  DISPLAY_NAME=$(echo "$user" | jq -r '.display_name // empty')

  if [ -z "$EMAIL" ] || [ "$EMAIL" = "null" ]; then
    echo "Skipping user ${USER_ID} - no email"
    continue
  fi

  echo "Processing: ${EMAIL}"

  # Parse name into first/last
  if [ -n "$DISPLAY_NAME" ] && [ "$DISPLAY_NAME" != "null" ]; then
    FIRST_NAME=$(echo "$DISPLAY_NAME" | awk '{print $1}')
    LAST_NAME=$(echo "$DISPLAY_NAME" | awk '{$1=""; print $0}' | xargs)
  else
    FIRST_NAME=$(echo "$EMAIL" | cut -d'@' -f1)
    LAST_NAME=""
  fi

  # Check if user exists in Clerk
  CLERK_USER=$(curl -s "https://api.clerk.com/v1/users?email_address=${EMAIL}" \
    -H "Authorization: Bearer ${CLERK_SECRET_KEY}")

  CLERK_USER_ID=$(echo "$CLERK_USER" | jq -r '.[0].id // empty')

  if [ -n "$CLERK_USER_ID" ] && [ "$CLERK_USER_ID" != "null" ]; then
    echo "  Found existing Clerk user: ${CLERK_USER_ID}"
  else
    # Create new Clerk user
    CREATE_RESPONSE=$(curl -s -X POST "https://api.clerk.com/v1/users" \
      -H "Authorization: Bearer ${CLERK_SECRET_KEY}" \
      -H "Content-Type: application/json" \
      -d "{
        \"email_address\": [\"${EMAIL}\"],
        \"first_name\": \"${FIRST_NAME}\",
        \"last_name\": \"${LAST_NAME}\",
        \"password\": \"${DEFAULT_PASSWORD}\",
        \"skip_password_checks\": true
      }")

    CLERK_USER_ID=$(echo "$CREATE_RESPONSE" | jq -r '.id // empty')

    if [ -z "$CLERK_USER_ID" ] || [ "$CLERK_USER_ID" = "null" ]; then
      ERROR=$(echo "$CREATE_RESPONSE" | jq -r '.errors[0].message // .message // "Unknown error"')
      echo "  Failed to create Clerk user: ${ERROR}"
      continue
    fi

    echo "  Created Clerk user: ${CLERK_USER_ID}"
  fi

  # Update Supabase with Clerk ID
  UPDATE_RESPONSE=$(curl -s -X PATCH "${SUPABASE_URL}/rest/v1/users?user_id=eq.${USER_ID}" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d "{\"clerk_user_id\": \"${CLERK_USER_ID}\"}")

  echo "  ✓ Synced: ${EMAIL}"

  # Rate limiting
  sleep 0.3
done

echo ""
echo "==========================================="
echo "Sync Complete!"
echo "==========================================="
echo "Note: New users were created with password: ${DEFAULT_PASSWORD}"
echo "They should reset their password on first login."
