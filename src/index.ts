import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import organizationRouter from './routes/organizationRoutes';
import transactionRouter from './routes/transactionRoutes';
import { errorHandler } from './middleware/errorHandler';
import { apiKeyAuth } from './middleware/apiKeyAuth';

// Load environment variables from .env file
dotenv.config();

// Create Express application
const app = express();

// Apply security middleware
app.use(helmet()); // Adds various HTTP headers for security
app.use(cors()); // Enables Cross-Origin Resource Sharing

// Parse JSON request bodies
app.use(express.json());

// Define API routes
app.use('/api/organizations', organizationRouter);
app.use('/api/transactions', transactionRouter);

// API Key authentication for all routes except organization registration
app.use('/api/organizations/register', organizationRouter);
app.use('/api', apiKeyAuth);

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