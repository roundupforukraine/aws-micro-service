#!/bin/bash

# Get AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION="ap-southeast-1"

# Get the database credentials from Secrets Manager
DB_CREDS=$(aws secretsmanager get-secret-value --secret-id aws-micro-service/dev/db-credentials --query 'SecretString' --output text)

# Extract username and password from the credentials
DB_USERNAME=$(echo $DB_CREDS | jq -r '.username')
DB_PASSWORD=$(echo $DB_CREDS | jq -r '.password')

# Construct the database URL
DATABASE_URL="postgresql://${DB_USERNAME}:${DB_PASSWORD}@aws-micro-service-dbinstance-tkgwucjgw9on.c72cswwawfke.ap-southeast-1.rds.amazonaws.com:5432/microservice"

# Create the task definition file
cat simple-task-definition.template.json | \
  sed "s/ACCOUNT_ID/$ACCOUNT_ID/g" | \
  sed "s/REGION/$REGION/g" | \
  sed "s|DATABASE_URL_PLACEHOLDER|$DATABASE_URL|g" > task-definition.json

# Print the task definition for debugging
echo "Generated task definition:"
cat task-definition.json

# Register the new task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Clean up
rm task-definition.json

echo "Task definition updated successfully!" 