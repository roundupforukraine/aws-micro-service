import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import organizationRouter from './routes/organizationRoutes';
import transactionRouter from './routes/transactionRoutes';
import { errorHandler } from './middleware/errorHandler';
import { apiKeyAuth } from './middleware/apiKeyAuth';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// API Key authentication for all routes except organization registration
app.use('/api/organizations/register', organizationRouter);
app.use('/api', apiKeyAuth);
app.use('/api/organizations', organizationRouter);
app.use('/api/transactions', transactionRouter);

// Error handling
app.use(errorHandler);

// Only start the server if this file is run directly
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

export default app; 