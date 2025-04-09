#!/bin/bash

# Get AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION="ap-southeast-1"

# Get the database URL from Secrets Manager
DATABASE_URL=$(aws secretsmanager get-secret-value --secret-id aws-micro-service/database-url --query 'SecretString' --output text)

# Create the task definition file
cat simple-task-definition.template.json | \
  sed "s/ACCOUNT_ID/$ACCOUNT_ID/g" | \
  sed "s/REGION/$REGION/g" | \
  sed "s|DATABASE_URL_PLACEHOLDER|$DATABASE_URL|g" > task-definition.json

# Register the new task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Clean up
rm task-definition.json

echo "Task definition updated successfully!" 