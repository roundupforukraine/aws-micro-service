#!/bin/bash

# Set the base URL
BASE_URL="http://localhost:3000"
ADMIN_API_KEY="admin-key-1234567890abcdef"

# Function to make API calls and print results
call_api() {
  local method=$1
  local endpoint=$2
  local api_key=$3
  local data=$4
  
  echo "Calling $method $endpoint"
  
  if [ -z "$data" ]; then
    response=$(curl -s -X $method "$BASE_URL$endpoint" \
      -H "x-api-key: $api_key" \
      -H "Content-Type: application/json")
  else
    response=$(curl -s -X $method "$BASE_URL$endpoint" \
      -H "x-api-key: $api_key" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi
  
  echo "Response: $response"
  echo "-----------------------------------"
  
  # Extract values from response
  if [[ $response == *"\"status\":\"success\""* ]]; then
    if [[ $endpoint == *"/organizations/register"* ]]; then
      # Extract organization ID and API key
      org_id=$(echo $response | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
      org_api_key=$(echo $response | grep -o '"apiKey":"[^"]*"' | cut -d'"' -f4)
      echo "Organization ID: $org_id"
      echo "Organization API Key: $org_api_key"
    fi
  fi
}

# Step 1: Register two organizations
echo "Step 1: Register two organizations"
call_api "POST" "/api/organizations/register" "$ADMIN_API_KEY" '{"name": "Organization 1"}'
ORG1_ID=$org_id
ORG1_API_KEY=$org_api_key

echo "ORG1_ID: $ORG1_ID"
echo "ORG1_API_KEY: $ORG1_API_KEY"

call_api "POST" "/api/organizations/register" "$ADMIN_API_KEY" '{"name": "Organization 2"}'
ORG2_ID=$org_id
ORG2_API_KEY=$org_api_key

echo "ORG2_ID: $ORG2_ID"
echo "ORG2_API_KEY: $ORG2_API_KEY"

# Step 2: Create 25 transactions for Organization 1
echo "Step 2: Create 25 transactions for Organization 1"
for i in {1..25}; do
  amount=$(echo "scale=2; $RANDOM/1000 + 10" | bc)
  call_api "POST" "/api/transactions" "$ORG1_API_KEY" "{\"originalAmount\": \"$amount\", \"organizationId\": \"$ORG1_ID\", \"metadata\": {\"description\": \"Transaction $i for Org 1\"}}"
  sleep 0.1
done

# Step 3: Create 25 transactions for Organization 2
echo "Step 3: Create 25 transactions for Organization 2"
for i in {1..25}; do
  amount=$(echo "scale=2; $RANDOM/1000 + 10" | bc)
  call_api "POST" "/api/transactions" "$ORG2_API_KEY" "{\"originalAmount\": \"$amount\", \"organizationId\": \"$ORG2_ID\", \"metadata\": {\"description\": \"Transaction $i for Org 2\"}}"
  sleep 0.1
done

# Step 4: Get all transactions for Organization 1
echo "Step 4: Get all transactions for Organization 1"
call_api "GET" "/api/transactions?organizationId=$ORG1_ID" "$ORG1_API_KEY"

# Step 5: Get all transactions for Organization 2
echo "Step 5: Get all transactions for Organization 2"
call_api "GET" "/api/transactions?organizationId=$ORG2_ID" "$ORG2_API_KEY"

# Step 6: Get transaction report for Organization 1
echo "Step 6: Get transaction report for Organization 1"
call_api "GET" "/api/transactions/report?organizationId=$ORG1_ID" "$ORG1_API_KEY"

# Step 7: Get transaction report for Organization 2
echo "Step 7: Get transaction report for Organization 2"
call_api "GET" "/api/transactions/report?organizationId=$ORG2_ID" "$ORG2_API_KEY"

# Step 8: Admin gets all transactions for Organization 1
echo "Step 8: Admin gets all transactions for Organization 1"
call_api "GET" "/api/transactions?organizationId=$ORG1_ID" "$ADMIN_API_KEY"

# Step 9: Admin gets all transactions for Organization 2
echo "Step 9: Admin gets all transactions for Organization 2"
call_api "GET" "/api/transactions?organizationId=$ORG2_ID" "$ADMIN_API_KEY"

# Step 10: Admin gets transaction report for Organization 1
echo "Step 10: Admin gets transaction report for Organization 1"
call_api "GET" "/api/transactions/report?organizationId=$ORG1_ID" "$ADMIN_API_KEY"

# Step 11: Admin gets transaction report for Organization 2
echo "Step 11: Admin gets transaction report for Organization 2"
call_api "GET" "/api/transactions/report?organizationId=$ORG2_ID" "$ADMIN_API_KEY"

echo "API sequence completed!" 