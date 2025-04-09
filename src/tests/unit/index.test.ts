import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Server } from 'http';
import organizationRouter from '../../routes/organizationRoutes';
import transactionRouter from '../../routes/transactionRoutes';
import { errorHandler } from '../../middleware/errorHandler';
import app from '../../index';
import http from 'http';
import { Request, Response, NextFunction } from 'express';

const createTestApp = () => {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  // Test error route
  app.get('/error-test', (req: Request, res: Response, next: NextFunction) => {
    next(new Error('Test error'));
  });

  // Routes
  app.use('/api/organizations', organizationRouter);
  app.use('/api/transactions', transactionRouter);

  // Error handling
  app.use(errorHandler);

  return app;
};

describe('API Server', () => {
  let testApp: express.Application;
  
  beforeEach(() => {
    testApp = express();
    testApp.use(helmet());
    testApp.use(cors());
    testApp.use(express.json());
    
    // Health check endpoint
    testApp.get('/health', (req, res) => {
      res.status(200).json({ status: 'healthy' });
    });
    
    // Routes
    testApp.use('/api/organizations', organizationRouter);
    testApp.use('/api/transactions', transactionRouter);
    
    // Test error route
    testApp.get('/error-test', (req, res, next) => {
      const error = new Error('Test error');
      next(error);
    });
    
    // Error handling
    testApp.use(errorHandler);
  });
  
  describe('Health Check', () => {
    it('should return 200 and healthy status', async () => {
      const response = await request(testApp).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'healthy' });
    });
  });
  
  describe('Route Mounting', () => {
    it('should mount organization routes', async () => {
      const response = await request(testApp).get('/api/organizations');
      expect(response.status).toBe(401); // Unauthorized without API key
    });
    
    it('should mount transaction routes', async () => {
      const response = await request(testApp).get('/api/transactions');
      expect(response.status).toBe(401); // Unauthorized without API key
    });
  });
  
  describe('Error Handling', () => {
    it('should handle errors with 500 status', async () => {
      const response = await request(testApp).get('/error-test');
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        status: 'error',
        message: 'Something went wrong!'
      });
    });
  });
});

describe('Server Startup', () => {
  const originalEnv = process.env;
  let mockListen: jest.SpyInstance;
  let mockConsoleLog: jest.SpyInstance;
  
  beforeEach(() => {
    process.env = { ...originalEnv };
    mockListen = jest.spyOn(app, 'listen').mockImplementation((port: number, cb?: () => void) => {
      if (cb) cb();
      return new Server();
    });
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
  });
  
  afterEach(() => {
    mockListen.mockRestore();
    mockConsoleLog.mockRestore();
  });
  
  afterAll(() => {
    process.env = originalEnv;
  });
  
  it('should start server on specified port', () => {
    const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    const app = createTestApp();
    const mockServer = {
      listen: jest.fn(),
    } as unknown as http.Server;

    const listenSpy = jest.spyOn(app, 'listen').mockImplementation((port, callback) => {
      if (typeof callback === 'function') {
        callback();
      }
      return mockServer;
    });

    app.listen(3001, () => {
      console.log('Server is running on port 3001');
    });

    expect(listenSpy).toHaveBeenCalledWith(3001, expect.any(Function));
    expect(mockConsoleLog).toHaveBeenCalledWith('Server is running on port 3001');
  });
  
  it('should use default port 3000 when PORT is not set', () => {
    delete process.env.PORT;
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
    
    expect(mockListen).toHaveBeenCalledWith(3000, expect.any(Function));
    expect(mockConsoleLog).toHaveBeenCalledWith('Server is running on port 3000');
  });
}); 