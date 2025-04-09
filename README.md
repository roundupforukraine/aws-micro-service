# Ukraine Round-Up API Service

> **Disclaimer**: This entire project was created using "vibe coding" with the assistance of Claude Pro (Anthropic's AI assistant). No code was written directly by the author - all code was generated through interaction with this AI tool. The author's role was limited to providing requirements and guidance, while Claude Pro handled the actual implementation. The AWS deployment was also fully automated and tested in a real environment, with all infrastructure components (ECS, RDS, VPC, etc.) being created and configured through AI-generated scripts.

[![Tests](https://github.com/roundupforukraine/aws-micro-service/actions/workflows/test.yml/badge.svg)](https://github.com/roundupforukraine/aws-micro-service/actions/workflows/test.yml)
[![Code Coverage](https://codecov.io/gh/roundupforukraine/aws-micro-service/branch/develop/graph/badge.svg)](https://app.codecov.io/gh/roundupforukraine/aws-micro-service)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22.0-purple.svg)](https://www.prisma.io/)
[![Jest](https://img.shields.io/badge/Jest-29.x-orange.svg)](https://jestjs.io/)

A Node.js API service that helps organizations manage round-up donations for Ukraine. The service allows organizations to register, log transactions, and calculate round-up amounts for donations.

## Features

- Organization registration and management (admin-only)
- Transaction logging with metadata
- Round-up calculation for donations
- Secure API key authentication
- Admin access to all organizations' data
- AWS deployment ready
- Comprehensive test coverage (unit and integration tests)
- API testing with HTTP files
- OpenAPI documentation with Swagger UI
- Client library generation for multiple languages

## API Documentation and Client Libraries

The API is documented using the OpenAPI 3.0.3 specification in the `openapi.yaml` file. This specification can be used to:

1. Generate interactive API documentation
2. Create client libraries for various programming languages
3. Test the API directly from the documentation

### Viewing the API Documentation

You can view the API documentation by running:

```bash
npm run docs
```

This will start a server at http://localhost:3001/api-docs that serves the Swagger UI for the API documentation.

### Generating Client Libraries

You can generate client libraries for various programming languages using:

```bash
npm run generate-client <language>
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

For more information, see the [API Documentation](API_DOCUMENTATION.md) file.

### Example Client Usage

See the [examples](examples/) directory for examples of how to use the generated client libraries.

## Project Structure

```
src/
├── config/             # Configuration files
├── controllers/        # Business logic for organizations and transactions
├── middleware/         # Authentication, error handling, and request validation
├── routes/             # API route definitions
├── tests/              # Test setup and integration tests
│   ├── integration/    # API integration tests
│   └── setup.ts        # Test environment setup
├── types/              # TypeScript type definitions
└── utils/              # Utility functions

scripts/                # Shell scripts for testing and deployment
examples/               # Examples of using the generated client libraries
api-tests.http         # API testing file for VS Code REST Client
openapi.yaml           # OpenAPI specification for API documentation
API_DOCUMENTATION.md   # Detailed API documentation
```

## Development Workflow

This project follows the GitFlow branching model for development:

### Main Branches
- `main`: Production-ready code
- `develop`: Latest development changes

### Supporting Branches
- `feature/*`: New features
- `release/*`: Release preparation
- `hotfix/*`: Emergency fixes for production
- `bugfix/*`: Bug fixes for development

### Branch Naming Convention
- Feature branches: `feature/feature-name`
- Release branches: `release/x.y.z`
- Hotfix branches: `hotfix/x.y.z`
- Bugfix branches: `bugfix/bug-description`

### Workflow Steps
1. Create feature branches from `develop`
2. Create release branches from `develop`
3. Create hotfix branches from `main`
4. Merge features into `develop`
5. Merge releases into both `main` and `develop`
6. Tag all merges to `main` with version number

### Version Control
- We use Semantic Versioning (MAJOR.MINOR.PATCH)
- All changes are documented in CHANGELOG.md
- Release tags follow the format `v1.0.0`

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL
- AWS Account
- AWS CLI configured

## Local Development Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd ukraine-roundup-api
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment file:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your local configuration:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/ukraine_roundup"
   PORT=3000
   NODE_ENV=development
   ```

5. Set up the database:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

7. Start the API documentation server:
   ```bash
   npm run docs
   ```

## Authentication & Authorization

The API uses API key authentication for all endpoints. Each organization has its own API key that must be included in the request headers:

```
x-api-key: <your-api-key>
```

### Organization Types

There are two types of organizations in the system:

1. **Admin Organizations** (`isAdmin: true`)
   - Can register new organizations
   - Can access and modify any organization's data
   - Can view all transactions across organizations
   - Can get reports for all organizations or filter by organization

2. **Regular Organizations** (`isAdmin: false`)
   - Can only access and modify their own organization data
   - Can only manage their own transactions
   - Can only view their own transaction reports

### Access Control

- All endpoints require a valid API key
- Organization registration is restricted to admin organizations only
- Organizations can only access their own data unless they have admin privileges
- Admin organizations can access all data and filter by organization
- Invalid or missing API keys result in 401 Unauthorized responses
- Unauthorized access attempts result in 403 Forbidden responses

## AWS Deployment Guide

### Prerequisites for AWS Deployment

1. AWS CLI installed and configured
2. Docker installed
3. Node.js v18 or higher
4. AWS Account with necessary permissions:
   - ECS (Elastic Container Service)
   - ECR (Elastic Container Registry)
   - RDS (Relational Database Service)
   - VPC and Security Groups
   - Application Load Balancer
   - IAM roles and policies

### Deployment Steps

1. Clone the repository and install dependencies:
   ```bash
   git clone <repository-url>
   cd aws-micro-service
   npm install
   ```

2. Create AWS credentials file:
   ```bash
   cp scripts/load-aws-credentials.template.js scripts/load-aws-credentials.js
   ```

3. Update the credentials file with your AWS credentials and API information:
   ```javascript
   // scripts/load-aws-credentials.js
   module.exports = {
     aws: {
       region: 'your-region',
       credentials: {
         accessKeyId: 'your-access-key',
         secretAccessKey: 'your-secret-key'
       }
     },
     api: {
       baseUrl: 'your-load-balancer-url',
       adminApiKey: 'your-admin-api-key'
     }
   };
   ```

4. Make deployment scripts executable:
   ```bash
   chmod +x scripts/test-api-sequence-aws.sh
   chmod +x scripts/update-task-definition.sh
   chmod +x scripts/generate-infrastructure-config.sh
   ```

5. Generate infrastructure configuration:
   ```bash
   ./scripts/generate-infrastructure-config.sh
   ```
   This will create the necessary AWS infrastructure configuration files.

6. Generate task definition:
   ```bash
   node scripts/generate-task-definition.js
   ```
   This will create the ECS task definition file.

7. Update the task definition:
   ```bash
   ./scripts/update-task-definition.sh
   ```
   This will update the ECS task definition with the latest configuration.

8. Test the deployment:
   ```bash
   ./scripts/test-api-sequence-aws.sh
   ```
   This will run a sequence of API tests to verify the deployment.

### Monitoring and Maintenance

- View logs in CloudWatch Logs
- Monitor metrics in CloudWatch Metrics
- Check service health in ECS console
- Monitor database performance in RDS console

### Testing the API

The project includes a comprehensive API test sequence that can be run against the deployed environment:

```bash
./scripts/test-api-sequence-aws.sh
```

This script will:
- Test organization registration and management
- Test transaction creation and retrieval
- Test admin operations
- Test error cases and validation
- Clean up test data after completion

## API Testing

The project includes two ways to test the API:

1. **VS Code REST Client** (`api-tests.http`):
   - Contains a comprehensive set of API test cases
   - Tests both organization and transaction endpoints
   - Includes admin and regular organization scenarios
   - Can be run directly from VS Code

2. **Shell Script** (`scripts/test-api-sequence.sh`):
   - Automated test sequence for API endpoints
   - Creates test organizations and transactions
   - Verifies admin access functionality
   - Can be run from the command line

To run the API tests:
```bash
# Using VS Code REST Client
# Open api-tests.http and click "Send Request" above each request

# Using shell script
./scripts/test-api-sequence.sh
```

## API Documentation

### Organization Endpoints

#### Register Organization (Admin only)
```http
POST /api/organizations/register
Content-Type: application/json
x-api-key: <admin-api-key>

{
    "name": "Organization Name"
}
```

#### Get Organization Details
```http
GET /api/organizations/:id
x-api-key: <api-key>
```

#### Update Organization
```http
PUT /api/organizations/:id
Content-Type: application/json
x-api-key: <api-key>

{
    "name": "Updated Name"
}
```

### Transaction Endpoints

#### Create Transaction
```http
POST /api/transactions
Content-Type: application/json
x-api-key: <api-key>

{
    "originalAmount": "10.50",
    "metadata": {
        "description": "Transaction description"
    }
}
```

#### List Transactions
```http
GET /api/transactions
x-api-key: <api-key>

# Optional query parameters
?page=1&limit=10&startDate=2024-01-01&endDate=2024-12-31
```

#### Get Transaction Report
```http
GET /api/transactions/report
x-api-key: <api-key>

# Optional query parameters
?startDate=2024-01-01&endDate=2024-12-31
```

## Error Handling

The API uses standard HTTP status codes and returns error messages in a consistent format:

```json
{
    "status": "fail",
    "message": "Error description"
}
```

Common error codes:
- 400: Bad Request (invalid input)
- 401: Unauthorized (missing or invalid API key)
- 403: Forbidden (insufficient permissions)
- 404: Not Found (resource doesn't exist)
- 500: Internal Server Error

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the ISC License.
