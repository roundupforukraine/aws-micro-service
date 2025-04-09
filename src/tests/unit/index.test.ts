import request from 'supertest';
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import organizationRouter from '../../routes/organizationRoutes';
import transactionRouter from '../../routes/transactionRoutes';
import { errorHandler } from '../../middleware/errorHandler';

// Create a test app without starting the server
const createTestApp = (): Application => {
  const app = express();

  // Middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
  });

  // Routes
  app.use('/api/organizations', organizationRouter);
  app.use('/api/transactions', transactionRouter);

  // Test error route
  app.get('/error-test', () => {
    throw new Error('Test error');
  });

  // Error handling
  app.use(errorHandler);

  return app;
};

describe('API Server', () => {
  let app: Application;
  
  beforeEach(() => {
    app = createTestApp();
  });

  it('should return 200 for health check endpoint', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'healthy' });
  });

  it('should handle 404 for non-existent routes', async () => {
    const response = await request(app).get('/non-existent-route');
    expect(response.status).toBe(404);
  });

  it('should handle errors properly', async () => {
    const response = await request(app).get('/error-test');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      status: 'error',
      message: 'Something went wrong!'
    });
  });
}); 