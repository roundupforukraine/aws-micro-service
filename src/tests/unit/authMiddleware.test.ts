// Set test environment
process.env.NODE_ENV = 'test';

// Mock the database module
const mockFindUnique = jest.fn();

import { Request, Response, NextFunction } from 'express';
import { Organization } from '@prisma/client';
import { adminAuth, apiKeyAuth, combinedAuth } from '../../middleware/authMiddleware';
import { AppError } from '../../middleware/errorHandler';

// Mock the setup module
jest.mock('../setup', () => ({
  prismaTestClient: {
    organization: {
      findUnique: mockFindUnique
    }
  }
}));

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;
  let mockOrganization: Organization;

  beforeEach(() => {
    mockOrganization = {
      id: 'test-id',
      name: 'Test Organization',
      apiKey: 'test-api-key',
      isAdmin: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockReq = {
      header: jest.fn()
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    mockNext = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();
    mockFindUnique.mockReset();
  });

  describe('adminAuth', () => {
    it('should authenticate admin organization successfully', async () => {
      const adminOrg = { ...mockOrganization, isAdmin: true, apiKey: 'test-admin-key' };
      (mockReq.header as jest.Mock).mockReturnValue('test-admin-key');
      mockFindUnique.mockResolvedValueOnce(adminOrg);

      await adminAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.header).toHaveBeenCalledWith('x-api-key');
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { apiKey: 'test-admin-key' }
      });
      expect(mockReq.organization).toEqual(adminOrg);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should return 401 if API key is missing', async () => {
      (mockReq.header as jest.Mock).mockReturnValue(undefined);

      await adminAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockNext.mock.calls[0][0]).toHaveProperty('statusCode', 401);
      expect(mockNext.mock.calls[0][0]).toHaveProperty('message', 'API key is required');
    });

    it('should return 403 if organization is not admin', async () => {
      (mockReq.header as jest.Mock).mockReturnValue('test-api-key');
      mockFindUnique.mockResolvedValueOnce(mockOrganization);

      await adminAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockNext.mock.calls[0][0]).toHaveProperty('statusCode', 403);
      expect(mockNext.mock.calls[0][0]).toHaveProperty('message', 'Invalid admin API key');
    });

    it('should return 403 if organization not found', async () => {
      (mockReq.header as jest.Mock).mockReturnValue('invalid-api-key');
      mockFindUnique.mockResolvedValueOnce(null);

      await adminAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockNext.mock.calls[0][0]).toHaveProperty('statusCode', 403);
      expect(mockNext.mock.calls[0][0]).toHaveProperty('message', 'Invalid admin API key');
    });
  });

  describe('apiKeyAuth', () => {
    it('should authenticate organization successfully', async () => {
      (mockReq.header as jest.Mock).mockReturnValue('test-api-key');
      mockFindUnique.mockResolvedValueOnce(mockOrganization);

      await apiKeyAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.header).toHaveBeenCalledWith('x-api-key');
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { apiKey: 'test-api-key' }
      });
      expect(mockReq.organization).toEqual(mockOrganization);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should return 401 if API key is missing', async () => {
      (mockReq.header as jest.Mock).mockReturnValue(undefined);

      await apiKeyAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockNext.mock.calls[0][0]).toHaveProperty('statusCode', 401);
      expect(mockNext.mock.calls[0][0]).toHaveProperty('message', 'API key is required');
    });

    it('should return 401 if organization not found', async () => {
      (mockReq.header as jest.Mock).mockReturnValue('invalid-api-key');
      mockFindUnique.mockResolvedValueOnce(null);

      await apiKeyAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockNext.mock.calls[0][0]).toHaveProperty('statusCode', 401);
      expect(mockNext.mock.calls[0][0]).toHaveProperty('message', 'Invalid API key');
    });
  });

  describe('combinedAuth', () => {
    it('should authenticate admin organization successfully', async () => {
      const adminOrg = { ...mockOrganization, isAdmin: true, apiKey: 'test-admin-key' };
      (mockReq.header as jest.Mock).mockReturnValue('test-admin-key');
      mockFindUnique.mockResolvedValueOnce(adminOrg);

      await combinedAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.header).toHaveBeenCalledWith('x-api-key');
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { apiKey: 'test-admin-key' }
      });
      expect(mockReq.organization).toEqual(adminOrg);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should authenticate regular organization successfully', async () => {
      (mockReq.header as jest.Mock).mockReturnValue('test-api-key');
      mockFindUnique.mockResolvedValueOnce(mockOrganization);

      await combinedAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.header).toHaveBeenCalledWith('x-api-key');
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { apiKey: 'test-api-key' }
      });
      expect(mockReq.organization).toEqual(mockOrganization);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should return 401 if API key is missing', async () => {
      (mockReq.header as jest.Mock).mockReturnValue(undefined);

      await combinedAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockNext.mock.calls[0][0]).toHaveProperty('statusCode', 401);
      expect(mockNext.mock.calls[0][0]).toHaveProperty('message', 'API key is required');
    });

    it('should return 401 if organization not found', async () => {
      (mockReq.header as jest.Mock).mockReturnValue('invalid-api-key');
      mockFindUnique.mockResolvedValueOnce(null);

      await combinedAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockNext.mock.calls[0][0]).toHaveProperty('statusCode', 401);
      expect(mockNext.mock.calls[0][0]).toHaveProperty('message', 'Invalid API key');
    });
  });
}); 