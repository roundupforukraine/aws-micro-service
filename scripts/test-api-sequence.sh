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
    elif [[ $endpoint == *"/transactions"* && $method == "POST" ]]; then
      # Extract transaction ID
      transaction_id=$(echo $response | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
      echo "Transaction ID: $transaction_id"
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
  if [ $i -eq 1 ]; then
    TRANSACTION1_ID=$transaction_id
    echo "TRANSACTION1_ID: $TRANSACTION1_ID"
  fi
  sleep 0.1
done

# Step 3: Create 25 transactions for Organization 2
echo "Step 3: Create 25 transactions for Organization 2"
for i in {1..25}; do
  amount=$(echo "scale=2; $RANDOM/1000 + 10" | bc)
  call_api "POST" "/api/transactions" "$ORG2_API_KEY" "{\"originalAmount\": \"$amount\", \"organizationId\": \"$ORG2_ID\", \"metadata\": {\"description\": \"Transaction $i for Org 2\"}}"
  if [ $i -eq 1 ]; then
    TRANSACTION2_ID=$transaction_id
    echo "TRANSACTION2_ID: $TRANSACTION2_ID"
  fi
  sleep 0.1
done

# Step 4: Update Organization 1
echo "Step 4: Update Organization 1"
call_api "PUT" "/api/organizations/$ORG1_ID" "$ORG1_API_KEY" "{\"name\": \"Updated Organization 1\", \"description\": \"This organization has been updated\"}"

# Step 5: Update Organization 2
echo "Step 5: Update Organization 2"
call_api "PUT" "/api/organizations/$ORG2_ID" "$ORG2_API_KEY" "{\"name\": \"Updated Organization 2\", \"description\": \"This organization has been updated\"}"

# Step 6: Update Transaction 1 for Organization 1
echo "Step 6: Update Transaction 1 for Organization 1"
call_api "PUT" "/api/transactions/$TRANSACTION1_ID" "$ORG1_API_KEY" "{\"metadata\": {\"description\": \"Updated Transaction 1 for Org 1\", \"updated\": true}}"

# Step 7: Update Transaction 1 for Organization 2
echo "Step 7: Update Transaction 1 for Organization 2"
call_api "PUT" "/api/transactions/$TRANSACTION2_ID" "$ORG2_API_KEY" "{\"metadata\": {\"description\": \"Updated Transaction 1 for Org 2\", \"updated\": true}}"

# Step 8: Get all transactions for Organization 1
echo "Step 8: Get all transactions for Organization 1"
call_api "GET" "/api/transactions?organizationId=$ORG1_ID" "$ORG1_API_KEY"

# Step 9: Get all transactions for Organization 2
echo "Step 9: Get all transactions for Organization 2"
call_api "GET" "/api/transactions?organizationId=$ORG2_ID" "$ORG2_API_KEY"

# Step 10: Get transaction report for Organization 1
echo "Step 10: Get transaction report for Organization 1"
call_api "GET" "/api/transactions/report?organizationId=$ORG1_ID" "$ORG1_API_KEY"

# Step 11: Get transaction report for Organization 2
echo "Step 11: Get transaction report for Organization 2"
call_api "GET" "/api/transactions/report?organizationId=$ORG2_ID" "$ORG2_API_KEY"

# Step 12: Admin gets all transactions for Organization 1
echo "Step 12: Admin gets all transactions for Organization 1"
call_api "GET" "/api/transactions?organizationId=$ORG1_ID" "$ADMIN_API_KEY"

# Step 13: Admin gets all transactions for Organization 2
echo "Step 13: Admin gets all transactions for Organization 2"
call_api "GET" "/api/transactions?organizationId=$ORG2_ID" "$ADMIN_API_KEY"

# Step 14: Admin gets transaction report for Organization 1
echo "Step 14: Admin gets transaction report for Organization 1"
call_api "GET" "/api/transactions/report?organizationId=$ORG1_ID" "$ADMIN_API_KEY"

# Step 15: Admin gets transaction report for Organization 2
echo "Step 15: Admin gets transaction report for Organization 2"
call_api "GET" "/api/transactions/report?organizationId=$ORG2_ID" "$ADMIN_API_KEY"

# Step 16: Admin deletes Organization 1
echo "Step 16: Admin deletes Organization 1"
call_api "DELETE" "/api/organizations/$ORG1_ID" "$ADMIN_API_KEY"

# Step 17: Admin deletes Organization 2
echo "Step 17: Admin deletes Organization 2"
call_api "DELETE" "/api/organizations/$ORG2_ID" "$ADMIN_API_KEY"

# Step 18: Admin deletes Transaction 1
echo "Step 18: Admin deletes Transaction 1"
call_api "DELETE" "/api/transactions/$TRANSACTION1_ID" "$ADMIN_API_KEY"

# Step 19: Admin deletes Transaction 2
echo "Step 19: Admin deletes Transaction 2"
call_api "DELETE" "/api/transactions/$TRANSACTION2_ID" "$ADMIN_API_KEY"

echo "API sequence completed!" 