#!/bin/bash

# Check if language is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <language>"
  echo "Available languages:"
  echo "  typescript-fetch"
  echo "  typescript-axios"
  echo "  javascript-fetch"
  echo "  javascript-axios"
  echo "  python"
  echo "  java"
  echo "  csharp"
  echo "  php"
  echo "  go"
  echo "  ruby"
  echo "  swift"
  echo "  kotlin"
  exit 1
fi

LANGUAGE=$1
OUTPUT_DIR="./generated-client-$LANGUAGE"

# Check if OpenAPI Generator is installed
if ! command -v openapi-generator-cli &> /dev/null; then
  echo "OpenAPI Generator CLI is not installed. Installing..."
  npm install @openapitools/openapi-generator-cli -g
fi

# Generate client library
echo "Generating $LANGUAGE client library..."
openapi-generator-cli generate \
  -i ./openapi.yaml \
  -g $LANGUAGE \
  -o $OUTPUT_DIR \
  --additional-properties=npmName=@roundupforukraine/api-client-$LANGUAGE,npmVersion=1.0.0

# Check if generation was successful
if [ $? -eq 0 ]; then
  echo "Client library generated successfully in $OUTPUT_DIR"
  
  # If TypeScript, build the library
  if [[ $LANGUAGE == typescript-* ]]; then
    echo "Building TypeScript library..."
    cd $OUTPUT_DIR
    npm install
    npm run build
    cd ..
  fi
  
  echo "Done!"
else
  echo "Failed to generate client library"
  exit 1
fi 