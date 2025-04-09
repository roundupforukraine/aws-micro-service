#!/bin/bash

# Script to generate infrastructure configuration files from templates
# Usage: ./scripts/generate-infrastructure-config.sh <environment>

set -e

# Check if environment is provided
if [ -z "$1" ]; then
  echo "Error: Environment not specified"
  echo "Usage: ./scripts/generate-infrastructure-config.sh <environment>"
  exit 1
fi

ENVIRONMENT=$1

# Set AWS account ID and region
# These can be overridden by environment variables
AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID:-"YOUR_AWS_ACCOUNT_ID"}
AWS_REGION=${AWS_REGION:-"YOUR_AWS_REGION"}

# Set other variables based on environment
case $ENVIRONMENT in
  dev)
    SUBNET_1_ID="YOUR_DEV_SUBNET_1_ID"
    SUBNET_2_ID="YOUR_DEV_SUBNET_2_ID"
    SECURITY_GROUP_ID="YOUR_DEV_SECURITY_GROUP_ID"
    TARGET_GROUP_ARN="YOUR_DEV_TARGET_GROUP_ARN"
    DB_SECRET_ARN="YOUR_DEV_DB_SECRET_ARN"
    INIT_KEY_SECRET_ARN="YOUR_DEV_INIT_KEY_SECRET_ARN"
    ;;
  prod)
    # Replace with production values
    SUBNET_1_ID="YOUR_PROD_SUBNET_1_ID"
    SUBNET_2_ID="YOUR_PROD_SUBNET_2_ID"
    SECURITY_GROUP_ID="YOUR_PROD_SECURITY_GROUP_ID"
    TARGET_GROUP_ARN="YOUR_PROD_TARGET_GROUP_ARN"
    DB_SECRET_ARN="YOUR_PROD_DB_SECRET_ARN"
    INIT_KEY_SECRET_ARN="YOUR_PROD_INIT_KEY_SECRET_ARN"
    ;;
  *)
    echo "Error: Unknown environment '$ENVIRONMENT'"
    exit 1
    ;;
esac

# Get the latest task definition revision
TASK_DEFINITION_REVISION=$(aws ecs describe-task-definition --task-definition aws-micro-service --query 'taskDefinition.revision' --output text)

# Create infrastructure directory if it doesn't exist
mkdir -p infrastructure

# Generate task-definition.json
echo "Generating task-definition.json..."
envsubst < infrastructure/task-definition.template.json > infrastructure/task-definition.json

# Generate service-definition.json
echo "Generating service-definition.json..."
envsubst < infrastructure/service-definition.template.json > infrastructure/service-definition.json

# Generate policy files
echo "Generating policy files..."
envsubst < infrastructure/ssm-policy.template.json > infrastructure/ssm-policy.json
envsubst < infrastructure/task-execution-policy.template.json > infrastructure/task-execution-policy.json
envsubst < infrastructure/secrets-policy.template.json > infrastructure/secrets-policy.json

echo "Infrastructure configuration files generated successfully for environment: $ENVIRONMENT"
echo "Files are located in the infrastructure/ directory" 