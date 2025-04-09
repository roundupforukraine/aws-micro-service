import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { registerOrganization, getOrganization, updateOrganization } from '../organizationController';
import { prismaTestClient, Organization } from '../../tests/setup';
import { AppError } from '../../middleware/errorHandler';
import { mockRequest, mockNext } from '../../tests/helpers';

// Mock crypto for deterministic API key generation
jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue('test-api-key'),
  }),
}));

// Create partial types for mocking
type MockRequest = Partial<Request> & {
  organization?: Organization;
  body?: any;
  params?: any;
  query?: any;
};

type MockResponse = Partial<Response> & {
  status: jest.Mock;
  json: jest.Mock;
};

describe('Organization Controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      organization: { id: 'admin-org-id', isAdmin: true },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('registerOrganization', () => {
    it('should create a new organization when called by admin', async () => {
      req.body = { name: 'New Organization' };
      req.organization = { isAdmin: true } as Organization;
      (prismaTestClient.organization.create as jest.Mock).mockResolvedValueOnce({
        id: 1,
        name: 'New Organization',
        isAdmin: false,
        apiKey: 'test-random-bytes',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await registerOrganization(req as Request, res as Response, next);

      expect(prismaTestClient.organization.create).toHaveBeenCalledWith({
        data: {
          name: 'New Organization',
          isAdmin: false,
          apiKey: expect.any(String)
        }
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          organization: expect.objectContaining({
            name: 'New Organization',
            isAdmin: false,
            apiKey: expect.any(String)
          })
        }
      });
    });

    it('should handle duplicate organization names', async () => {
      req.body = { name: 'Existing Organization' };
      req.organization = { id: 'admin-org-id', isAdmin: true };

      const error = new Error('Duplicate organization name');
      (error as any).code = 'P2002';
      (prismaTestClient.organization.create as jest.Mock).mockRejectedValueOnce(error);

      await registerOrganization(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'An organization with this name already exists',
        })
      );
    });

    it('should handle database errors', async () => {
      req.body = { name: 'New Organization' };
      req.organization = { id: 'admin-org-id', isAdmin: true };

      const error = new Error('Database error');
      (prismaTestClient.organization.create as jest.Mock).mockRejectedValueOnce(error);

      await registerOrganization(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getOrganization', () => {
    it('should get organization details successfully', async () => {
      req.params = { id: 'test-id' };
      req.organization = { id: 'test-id', isAdmin: false };

      const mockOrg = {
        id: 'test-id',
        name: 'Test Organization',
        apiKey: 'test-api-key',
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaTestClient.organization.findUnique as jest.Mock).mockResolvedValueOnce(mockOrg);

      await getOrganization(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { organization: mockOrg },
      });
    });

    it('should allow admin to access any organization', async () => {
      req.params = { id: 'other-id' };
      req.organization = { id: 'admin-org-id', isAdmin: true };

      const mockOrg = {
        id: 'other-id',
        name: 'Other Organization',
        apiKey: 'other-api-key',
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaTestClient.organization.findUnique as jest.Mock).mockResolvedValueOnce(mockOrg);

      await getOrganization(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { organization: mockOrg },
      });
    });
  });

  describe('updateOrganization', () => {
    it('should update organization successfully', async () => {
      req.params = { id: 'test-id' };
      req.body = { name: 'Updated Organization' };
      req.organization = { id: 'test-id', isAdmin: false };

      const mockOrg = {
        id: 'test-id',
        name: 'Updated Organization',
        apiKey: 'test-api-key',
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaTestClient.organization.findUnique as jest.Mock).mockResolvedValueOnce(mockOrg);
      (prismaTestClient.organization.update as jest.Mock).mockResolvedValueOnce(mockOrg);

      await updateOrganization(req as Request, res as Response, next);

      expect(prismaTestClient.organization.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: { name: 'Updated Organization' },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { organization: mockOrg },
      });
    });
  });
}); 