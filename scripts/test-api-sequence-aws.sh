#!/bin/bash

# Load AWS credentials and export them to environment
eval "$(node -e '
  const fs = require("fs");
  const path = require("path");
  const credentialsPath = path.join(__dirname, "aws-credentials.json");
  const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
  console.log(`export API_BASE_URL="${credentials.api.baseUrl}"`);
  console.log(`export ADMIN_API_KEY="${credentials.api.adminApiKey}"`);
')"

# Set the base URL and API keys from environment variables
BASE_URL="${API_BASE_URL}"
ADMIN_API_KEY="${ADMIN_API_KEY}"
INVALID_API_KEY="invalid-key-123"

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

# Step 2: Test error cases for organization registration
echo "Step 2: Test error cases for organization registration"
call_api "POST" "/api/organizations/register" "$INVALID_API_KEY" '{"name": "Invalid Org"}'
call_api "POST" "/api/organizations/register" "$ORG1_API_KEY" '{"name": "Unauthorized Org"}'
call_api "POST" "/api/organizations/register" "$ADMIN_API_KEY" '{}'

# Step 3: Test organization details retrieval
echo "Step 3: Test organization details retrieval"
call_api "GET" "/api/organizations/$ORG1_ID" "$ORG1_API_KEY"
call_api "GET" "/api/organizations/$ORG1_ID" "$ADMIN_API_KEY"
call_api "GET" "/api/organizations/$ORG2_ID" "$ORG1_API_KEY" # Should fail
call_api "GET" "/api/organizations/invalid-id" "$ADMIN_API_KEY"

# Step 4: Test organization listing with pagination and search
echo "Step 4: Test organization listing with pagination and search"
call_api "GET" "/api/organizations?page=1&limit=10" "$ADMIN_API_KEY"
call_api "GET" "/api/organizations?search=Organization&sortBy=name&sortOrder=desc" "$ADMIN_API_KEY"
call_api "GET" "/api/organizations" "$ORG1_API_KEY" # Should fail - not admin

# Step 5: Create transactions for Organization 1
echo "Step 5: Create transactions for Organization 1"
for i in {1..25}; do
  amount=$(echo "scale=2; $RANDOM/1000 + 10" | bc)
  call_api "POST" "/api/transactions" "$ORG1_API_KEY" "{\"originalAmount\": \"$amount\", \"organizationId\": \"$ORG1_ID\", \"metadata\": {\"description\": \"Transaction $i for Org 1\"}}"
  if [ $i -eq 1 ]; then
    TRANSACTION1_ID=$transaction_id
    echo "TRANSACTION1_ID: $TRANSACTION1_ID"
  fi
  sleep 0.1
done

# Step 6: Create transactions for Organization 2
echo "Step 6: Create transactions for Organization 2"
for i in {1..25}; do
  amount=$(echo "scale=2; $RANDOM/1000 + 10" | bc)
  call_api "POST" "/api/transactions" "$ORG2_API_KEY" "{\"originalAmount\": \"$amount\", \"organizationId\": \"$ORG2_ID\", \"metadata\": {\"description\": \"Transaction $i for Org 2\"}}"
  if [ $i -eq 1 ]; then
    TRANSACTION2_ID=$transaction_id
    echo "TRANSACTION2_ID: $TRANSACTION2_ID"
  fi
  sleep 0.1
done

# Step 7: Test transaction details retrieval
echo "Step 7: Test transaction details retrieval"
call_api "GET" "/api/transactions/$TRANSACTION1_ID" "$ORG1_API_KEY"
call_api "GET" "/api/transactions/$TRANSACTION1_ID" "$ADMIN_API_KEY"
call_api "GET" "/api/transactions/$TRANSACTION1_ID" "$ORG2_API_KEY" # Should fail
call_api "GET" "/api/transactions/invalid-id" "$ADMIN_API_KEY"

# Step 8: Test transaction listing with pagination, sorting, and date filtering
echo "Step 8: Test transaction listing with pagination, sorting, and date filtering"
TODAY=$(date +%Y-%m-%d)
call_api "GET" "/api/transactions?page=1&limit=10&sortBy=originalAmount&sortOrder=desc" "$ORG1_API_KEY"
call_api "GET" "/api/transactions?startDate=${TODAY}T00:00:00Z&endDate=${TODAY}T23:59:59Z" "$ORG1_API_KEY"
call_api "GET" "/api/transactions?organizationId=$ORG2_ID" "$ORG1_API_KEY" # Should fail

# Step 9: Update organizations
echo "Step 9: Update organizations"
call_api "PUT" "/api/organizations/$ORG1_ID" "$ORG1_API_KEY" "{\"name\": \"Updated Organization 1\", \"description\": \"This organization has been updated\"}"
call_api "PUT" "/api/organizations/$ORG2_ID" "$ORG2_API_KEY" "{\"name\": \"Updated Organization 2\", \"description\": \"This organization has been updated\"}"
call_api "PUT" "/api/organizations/$ORG2_ID" "$ORG1_API_KEY" "{\"name\": \"Unauthorized Update\"}" # Should fail
call_api "PUT" "/api/organizations/invalid-id" "$ADMIN_API_KEY" "{\"name\": \"Invalid Update\"}"

# Step 10: Update transactions
echo "Step 10: Update transactions"
call_api "PUT" "/api/transactions/$TRANSACTION1_ID" "$ORG1_API_KEY" "{\"metadata\": {\"description\": \"Updated Transaction 1 for Org 1\", \"updated\": true}}"
call_api "PUT" "/api/transactions/$TRANSACTION2_ID" "$ORG2_API_KEY" "{\"metadata\": {\"description\": \"Updated Transaction 1 for Org 2\", \"updated\": true}}"
call_api "PUT" "/api/transactions/$TRANSACTION2_ID" "$ORG1_API_KEY" "{\"metadata\": {\"description\": \"Unauthorized Update\"}}" # Should fail
call_api "PUT" "/api/transactions/invalid-id" "$ADMIN_API_KEY" "{\"metadata\": {\"description\": \"Invalid Update\"}}"

# Step 11: Get transaction reports with date filtering
echo "Step 11: Get transaction reports with date filtering"
call_api "GET" "/api/transactions/report?startDate=${TODAY}T00:00:00Z&endDate=${TODAY}T23:59:59Z" "$ORG1_API_KEY"
call_api "GET" "/api/transactions/report?organizationId=$ORG1_ID" "$ADMIN_API_KEY"
call_api "GET" "/api/transactions/report?organizationId=$ORG2_ID" "$ORG1_API_KEY" # Should fail

# Step 12: Test cross-organization access
echo "Step 12: Test cross-organization access"
call_api "GET" "/api/organizations/$ORG2_ID" "$ORG1_API_KEY"
call_api "PUT" "/api/organizations/$ORG2_ID" "$ORG1_API_KEY" "{\"name\": \"Unauthorized Update\"}"
call_api "GET" "/api/transactions/$TRANSACTION2_ID" "$ORG1_API_KEY"
call_api "PUT" "/api/transactions/$TRANSACTION2_ID" "$ORG1_API_KEY" "{\"metadata\": {\"description\": \"Unauthorized Update\"}}"

# Step 13: Admin operations
echo "Step 13: Admin operations"
call_api "GET" "/api/organizations" "$ADMIN_API_KEY"
call_api "GET" "/api/transactions?organizationId=$ORG1_ID" "$ADMIN_API_KEY"
call_api "GET" "/api/transactions/report?organizationId=$ORG2_ID" "$ADMIN_API_KEY"

# Step 14: Cleanup
echo "Step 14: Cleanup"
call_api "DELETE" "/api/organizations/$ORG1_ID" "$ADMIN_API_KEY"
call_api "DELETE" "/api/organizations/$ORG2_ID" "$ADMIN_API_KEY"
call_api "DELETE" "/api/transactions/$TRANSACTION1_ID" "$ADMIN_API_KEY"
call_api "DELETE" "/api/transactions/$TRANSACTION2_ID" "$ADMIN_API_KEY"
call_api "DELETE" "/api/organizations/invalid-id" "$ADMIN_API_KEY"
call_api "DELETE" "/api/transactions/invalid-id" "$ADMIN_API_KEY"
call_api "DELETE" "/api/organizations/$ORG1_ID" "$ORG1_API_KEY" # Should fail - not admin
call_api "DELETE" "/api/transactions/$TRANSACTION1_ID" "$ORG1_API_KEY" # Should fail - not admin

echo "API sequence completed!" 