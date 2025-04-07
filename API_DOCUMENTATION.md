# API Documentation

This document explains how to use the OpenAPI specification for the Round-Up Donation API.

## Overview

The Round-Up Donation API allows organizations to register, create transactions, and track donations. Each transaction has an original amount, a rounded-up amount, and a donation amount.

Authentication is performed using API keys in the `x-api-key` header.

## OpenAPI Specification

The API is documented using the OpenAPI 3.0.3 specification in the `openapi.yaml` file. This specification can be used to:

1. Generate interactive API documentation
2. Create client libraries for various programming languages
3. Test the API directly from the documentation

## Viewing the API Documentation

You can view the API documentation using tools like:

- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [Redoc](https://redocly.github.io/redoc/)

### Using Swagger UI

1. Install Swagger UI:
   ```bash
   npm install -g swagger-ui-express
   ```

2. Create a simple Express server to serve the Swagger UI:
   ```javascript
   const express = require('express');
   const swaggerUi = require('swagger-ui-express');
   const YAML = require('yamljs');
   const swaggerDocument = YAML.load('./openapi.yaml');
   
   const app = express();
   app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
   app.listen(3000, () => console.log('Swagger UI running at http://localhost:3000/api-docs'));
   ```

3. Run the server and navigate to `http://localhost:3000/api-docs` in your browser.

## Generating Client Libraries

You can generate client libraries for various programming languages using tools like:

- [OpenAPI Generator](https://openapi-generator.tech/)
- [Swagger Codegen](https://swagger.io/tools/swagger-codegen/)

### Using OpenAPI Generator

1. Install OpenAPI Generator:
   ```bash
   npm install @openapitools/openapi-generator-cli -g
   ```

2. Generate a client library for your preferred language:
   ```bash
   openapi-generator-cli generate -i openapi.yaml -g typescript-fetch -o ./generated-client
   ```

   Available languages include:
   - `typescript-fetch`: TypeScript with Fetch API
   - `typescript-axios`: TypeScript with Axios
   - `javascript-fetch`: JavaScript with Fetch API
   - `javascript-axios`: JavaScript with Axios
   - `python`: Python
   - `java`: Java
   - `csharp`: C#
   - `php`: PHP
   - `go`: Go
   - `ruby`: Ruby
   - `swift`: Swift
   - `kotlin`: Kotlin

3. Use the generated client in your application:
   ```typescript
   import { DefaultApi, Configuration } from './generated-client';
   
   const config = new Configuration({
     basePath: 'http://localhost:3000/api',
     apiKey: 'your-api-key'
   });
   
   const api = new DefaultApi(config);
   
   // Create a transaction
   api.createTransaction({
     originalAmount: 10.50,
     metadata: { description: 'Coffee purchase' }
   }).then(response => {
     console.log('Transaction created:', response.data.transaction);
   }).catch(error => {
     console.error('Error creating transaction:', error);
   });
   ```

## API Endpoints

### Organizations

- `POST /api/organizations/register`: Register a new organization
- `GET /api/organizations/{id}`: Get organization details
- `PUT /api/organizations/{id}`: Update organization details

### Transactions

- `POST /api/transactions`: Create a new transaction
- `GET /api/transactions`: List transactions
- `GET /api/transactions/{id}`: Get transaction details
- `PUT /api/transactions/{id}`: Update transaction metadata
- `GET /api/transactions/report`: Get transaction report

## Authentication

All API endpoints require authentication using an API key. The API key should be included in the `x-api-key` header of each request.

Example:
```
GET /api/organizations/123e4567-e89b-12d3-a456-426614174000
x-api-key: abc123def456
```

## Error Handling

The API uses standard HTTP status codes to indicate the success or failure of a request:

- `2xx`: Success
- `4xx`: Client error
- `5xx`: Server error

Error responses include a JSON object with the following structure:

```json
{
  "status": "fail",
  "message": "Error message"
}
```

## Rate Limiting

The API may implement rate limiting to prevent abuse. If rate limiting is in effect, the response will include the following headers:

- `X-RateLimit-Limit`: The maximum number of requests allowed in the current time window
- `X-RateLimit-Remaining`: The number of requests remaining in the current time window
- `X-RateLimit-Reset`: The time at which the current rate limit window resets

## Pagination

Endpoints that return lists of resources support pagination using the following query parameters:

- `page`: The page number (default: 1)
- `limit`: The number of items per page (default: 10)

The response includes a `pagination` object with the following properties:

- `page`: The current page number
- `limit`: The number of items per page
- `total`: The total number of items
- `pages`: The total number of pages

## Date Filtering

Endpoints that return lists of resources support date filtering using the following query parameters:

- `startDate`: Filter resources from this date (ISO 8601 format)
- `endDate`: Filter resources until this date (ISO 8601 format)

Example:
```
GET /api/transactions?startDate=2023-01-01T00:00:00Z&endDate=2023-01-31T23:59:59Z
``` 