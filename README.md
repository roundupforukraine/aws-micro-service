# Ukraine Round-Up API Service

A Node.js API service that helps organizations manage round-up donations for Ukraine. The service allows organizations to register, log transactions, and calculate round-up amounts for donations.

## Features

- Organization registration and management (admin-only)
- Transaction logging with metadata
- Round-up calculation for donations
- Secure API key authentication
- AWS deployment ready

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

4. Update the `.env` file with your local configuration

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
- `GET /api/transactions` - List transactions
- `GET /api/transactions/:id` - Get transaction details
- `GET /api/transactions/reports` - Get transaction reports

## Security

- All API keys and secrets are stored in AWS Secrets Manager
- Environment variables are managed through AWS Parameter Store
- No sensitive data is stored in the codebase
- All API endpoints are secured with API key authentication
- Role-based access control through organization admin status

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

## Contributing

1. Create a feature branch
2. Make your changes
3. Ensure all tests pass
4. Submit a pull request

## License

MIT
