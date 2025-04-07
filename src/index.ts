import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import organizationRouter, { registrationRouter } from './routes/organizationRoutes';
import transactionRouter from './routes/transactionRoutes';
import { errorHandler } from './middleware/errorHandler';
import { apiKeyAuth } from './middleware/apiKeyAuth';

// Load environment variables from .env file
dotenv.config();

// Create Express app
const app = express();

// Apply middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Register routes that don't require API key authentication
app.use('/api/organizations/register', registrationRouter);

// Apply API key authentication for protected routes
app.use('/api', apiKeyAuth);

// Register protected routes
app.use('/api/organizations', organizationRouter);
app.use('/api/transactions', transactionRouter);

// Apply error handling middleware
app.use(errorHandler);

// Get port from environment variables or use default
const port = process.env.PORT || 3000;

// Start server if this file is run directly
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

export default app; 