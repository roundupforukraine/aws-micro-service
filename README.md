# Ukraine Round-Up API Service

A Node.js API service that helps organizations manage round-up donations for Ukraine. The service allows organizations to register, log transactions, and calculate round-up amounts for donations.

## Features

- Organization registration and management (admin-only)
- Transaction logging with metadata
- Round-up calculation for donations
- Secure API key authentication
- AWS deployment ready
- Comprehensive test coverage (unit and integration tests)

## Project Structure

```
src/
├── controllers/         # Business logic for organizations and transactions
├── middleware/          # Authentication, error handling, and request validation
├── routes/              # API route definitions
├── tests/               # Test setup and integration tests
│   ├── integration/     # API integration tests
│   └── setup.ts         # Test environment setup
└── types/               # TypeScript type definitions
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
   - Can perform all operations on transactions

2. **Regular Organizations** (`isAdmin: false`)
   - Can only access and modify their own organization data
   - Can only manage their own transactions

### Access Control

- All endpoints require a valid API key
- Organization registration is restricted to admin organizations only
- Organizations can only access their own data unless they have admin privileges
- Invalid or missing API keys result in 401 Unauthorized responses
- Unauthorized access attempts result in 403 Forbidden responses

## API Documentation

### Endpoints

#### Organizations

- `POST /api/organizations/register` - Register a new organization (admin only)
  - Request header: `x-api-key: <admin-api-key>`
  - Request body: `{ "name": "Organization Name" }`
  - Response: Organization details including a new API key

- `GET /api/organizations/:id` - Get organization details
  - Accessible by:
    - The organization itself
    - Admin organizations
  - Request header: `x-api-key: <api-key>`
  - Response: Organization details

- `PUT /api/organizations/:id` - Update organization details
  - Accessible by:
    - The organization itself
    - Admin organizations
  - Request header: `x-api-key: <api-key>`
  - Request body: `{ "name": "Updated Name" }`
  - Response: Updated organization details

#### Transactions

- `POST /api/transactions` - Create a new transaction
  - Request header: `x-api-key: <api-key>`
  - Request body: 
    ```json
    {
      "originalAmount": 9.99,
      "metadata": {
        "description": "Coffee purchase",
        "location": "London"
      }
    }
    ```
  - Response: Created transaction with calculated round-up amount

- `GET /api/transactions` - List transactions
  - Request header: `x-api-key: <api-key>`
  - Query parameters:
    - `page` (optional): Page number (default: 1)
    - `limit` (optional): Items per page (default: 10, max: 100)
    - `startDate` (optional): Filter by start date (ISO format)
    - `endDate` (optional): Filter by end date (ISO format)
  - Response: Paginated list of transactions

- `GET /api/transactions/:id` - Get transaction details
  - Request header: `x-api-key: <api-key>`
  - Response: Transaction details

- `GET /api/transactions/reports/summary` - Get transaction reports
  - Request header: `x-api-key: <api-key>`
  - Query parameters:
    - `startDate` (optional): Filter by start date (ISO format)
    - `endDate` (optional): Filter by end date (ISO format)
  - Response: Summary statistics including total transactions and donations

## Testing

The project includes both unit tests and integration tests:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Environment

- Tests use a mock Prisma client to avoid database interactions
- API key authentication is simulated with test API keys
- Integration tests verify API endpoints and business logic
- Unit tests cover controller functions and middleware

## Security

- All API keys and secrets are stored in AWS Secrets Manager
- Environment variables are managed through AWS Parameter Store
- No sensitive data is stored in the codebase
- All API endpoints are secured with API key authentication
- Role-based access control through organization admin status
- Input validation using express-validator
- Error handling with custom AppError class

## Contributing

1. Create a feature branch
2. Make your changes
3. Ensure all tests pass
4. Submit a pull request

## License

MIT
