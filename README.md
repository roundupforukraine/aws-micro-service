# Ukraine Round-Up API Service

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
api-tests.http         # API testing file for VS Code REST Client
```

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
