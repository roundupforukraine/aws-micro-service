import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import organizationRouter from './routes/organizationRoutes';
import transactionRouter from './routes/transactionRoutes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/organizations', organizationRouter);
app.use('/api/transactions', transactionRouter);

// Error handling
app.use(errorHandler);

// Only start the server if this file is run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app; 