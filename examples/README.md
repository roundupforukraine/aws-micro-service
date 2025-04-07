# API Client Examples

This directory contains examples of how to use the generated client libraries to interact with the Round-Up Donation API.

## Prerequisites

Before running the examples, you need to:

1. Generate the client library for your preferred language:
   ```bash
   npm run generate-client typescript-fetch
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Make sure the API server is running:
   ```bash
   npm run dev
   ```

## Available Examples

- `client-usage.ts`: Example of using the TypeScript Fetch client library to interact with the API.

## Running the Examples

To run the TypeScript Fetch example:

```bash
ts-node examples/client-usage.ts
```

## Customizing the Examples

Before running the examples, you need to replace the placeholder API keys with your actual API keys:

- `your-admin-api-key`: Replace with your admin API key
- `your-api-key`: Replace with your organization's API key

## Client Libraries for Other Languages

You can generate client libraries for other languages using the `generate-client` script:

```bash
npm run generate-client typescript-axios
npm run generate-client javascript-fetch
npm run generate-client javascript-axios
npm run generate-client python
npm run generate-client java
npm run generate-client csharp
npm run generate-client php
npm run generate-client go
npm run generate-client ruby
npm run generate-client swift
npm run generate-client kotlin
```

Each generated client library will be placed in a directory named `generated-client-<language>`. 