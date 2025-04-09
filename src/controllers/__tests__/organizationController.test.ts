import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { registerOrganization, getOrganization, updateOrganization, listOrganizations, deleteOrganization } from '../organizationController';
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

    it('should reject non-admin organizations', async () => {
      req.body = { name: 'New Organization' };
      req.organization = { isAdmin: false } as Organization;

      await registerOrganization(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: 'Only administrators can register new organizations',
        })
      );
    });

    it('should validate organization name', async () => {
      req.body = {};
      req.organization = { isAdmin: true } as Organization;

      await registerOrganization(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Organization name is required',
        })
      );
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

    it('should handle organization not found', async () => {
      req.params = { id: 'non-existent' };
      req.organization = { id: 'admin-org-id', isAdmin: true };

      (prismaTestClient.organization.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await getOrganization(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Organization not found',
        })
      );
    });

    it('should reject unauthorized access', async () => {
      req.params = { id: 'other-id' };
      req.organization = { id: 'test-id', isAdmin: false };

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

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: 'Not authorized to access this organization',
        })
      );
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

    it('should validate organization name', async () => {
      req.params = { id: 'test-id' };
      req.body = {};
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

      await updateOrganization(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Organization name is required',
        })
      );
    });

    it('should handle duplicate organization names', async () => {
      req.params = { id: 'test-id' };
      req.body = { name: 'Existing Organization' };
      req.organization = { id: 'test-id', isAdmin: false };

      const mockOrg = {
        id: 'test-id',
        name: 'Test Organization',
        apiKey: 'test-api-key',
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const error = new Error('Duplicate organization name');
      (error as any).code = 'P2002';

      (prismaTestClient.organization.findUnique as jest.Mock).mockResolvedValueOnce(mockOrg);
      (prismaTestClient.organization.update as jest.Mock).mockRejectedValueOnce(error);

      await updateOrganization(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'An organization with this name already exists',
        })
      );
    });
  });

  describe('listOrganizations', () => {
    it('should list organizations with pagination and sorting', async () => {
      req.organization = { id: 'admin-org-id', isAdmin: true };
      req.query = { page: '1', limit: '10', sortBy: 'name', sortOrder: 'asc' };

      const mockOrgs = [
        {
          id: 'org-1',
          name: 'Organization 1',
          apiKey: 'key-1',
          isAdmin: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'org-2',
          name: 'Organization 2',
          apiKey: 'key-2',
          isAdmin: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prismaTestClient.organization.findMany as jest.Mock).mockResolvedValueOnce(mockOrgs);
      (prismaTestClient.organization.count as jest.Mock).mockResolvedValueOnce(2);

      await listOrganizations(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          organizations: mockOrgs,
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            pages: 1,
          },
        },
      });
    });

    it('should reject non-admin access', async () => {
      req.organization = { id: 'test-id', isAdmin: false };

      await listOrganizations(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: 'Not authorized to list organizations',
        })
      );
    });

    it('should validate sort field', async () => {
      req.organization = { id: 'admin-org-id', isAdmin: true };
      req.query = { sortBy: 'invalid' };

      await listOrganizations(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Invalid sort field',
        })
      );
    });
  });

  describe('deleteOrganization', () => {
    beforeEach(() => {
      (prismaTestClient.organization.findUnique as jest.Mock) = jest.fn();
      (prismaTestClient.organization.delete as jest.Mock) = jest.fn();
      (prismaTestClient.transaction.deleteMany as jest.Mock) = jest.fn();
      (prismaTestClient.$transaction as jest.Mock) = jest.fn();
    });

    it('should delete organization successfully', async () => {
      req.params = { id: 'test-id' };
      req.organization = { id: 'admin-org-id', isAdmin: true };

      const mockOrg = {
        id: 'test-id',
        name: 'Test Organization',
        apiKey: 'test-api-key',
        isAdmin: false,
        transactions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaTestClient.organization.findUnique as jest.Mock).mockResolvedValueOnce(mockOrg);
      (prismaTestClient.$transaction as jest.Mock).mockImplementation(async (callback) => {
        await callback(prismaTestClient);
        return mockOrg;
      });

      await deleteOrganization(req as Request, res as Response, next);

      expect(prismaTestClient.organization.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        include: { transactions: true }
      });
      expect(prismaTestClient.transaction.deleteMany).toHaveBeenCalledWith({
        where: { organizationId: 'test-id' }
      });
      expect(prismaTestClient.organization.delete).toHaveBeenCalledWith({
        where: { id: 'test-id' }
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Organization deleted successfully'
      });
    });

    it('should reject non-admin access', async () => {
      req.params = { id: 'test-id' };
      req.organization = { id: 'test-id', isAdmin: false };

      await deleteOrganization(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: 'Not authorized to delete organizations',
        })
      );
    });

    it('should handle organization not found', async () => {
      req.params = { id: 'non-existent' };
      req.organization = { id: 'admin-org-id', isAdmin: true };

      (prismaTestClient.organization.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await deleteOrganization(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Organization not found',
        })
      );
    });
  });
}); 