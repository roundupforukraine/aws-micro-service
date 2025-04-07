import { Request, Response } from 'express';
import { prismaTestClient, Organization } from '../../tests/setup';
import {
  registerOrganization,
  getOrganization,
  updateOrganization,
} from '../organizationController';
import { AppError } from '../../middleware/errorHandler';
import { mockRequest, mockNext } from '../../tests/helpers';

// Mock crypto module to make API key generation deterministic
jest.mock('crypto', () => ({
  randomBytes: () => ({
    toString: () => 'test-random-bytes',
  }),
}));

// Create partial types for mocking
type MockRequest = Partial<Request> & {
  organization?: Organization;
  body?: any;
  params?: any;
};

type MockResponse = Partial<Response> & {
  status: jest.Mock;
  json: jest.Mock;
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => prismaTestClient),
}));

describe('Organization Controller', () => {
  const next = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerOrganization', () => {
    it('should create a new organization when called by admin', async () => {
      const req: MockRequest = {
        organization: {
          id: 'admin-id',
          name: 'Admin Org',
          apiKey: 'admin-key',
          isAdmin: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        body: { name: 'New Organization' },
      };

      const res: MockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const expectedOrg = {
        id: 'new-org-id',
        name: 'New Organization',
        apiKey: 'api-key-test-random-bytes',
        isAdmin: false,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      };

      prismaTestClient.organization.create.mockResolvedValueOnce(expectedOrg);

      await registerOrganization(req as Request, res as Response, next);

      expect(prismaTestClient.organization.create).toHaveBeenCalledWith({
        data: {
          name: 'New Organization',
          apiKey: expect.stringMatching(/^api-key-/),
          isAdmin: false,
        },
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { organization: expectedOrg },
      });
    });

    it('should return 403 if called by non-admin', async () => {
      const req: MockRequest = {
        organization: {
          id: 'non-admin-id',
          name: 'Non-Admin Org',
          apiKey: 'non-admin-key',
          isAdmin: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        body: { name: 'New Organization' },
      };

      const res: MockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await registerOrganization(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: 'Only admin organizations can register new organizations',
        })
      );
    });

    it('should handle database errors', async () => {
      const req: MockRequest = {
        body: { name: 'New Organization' },
        organization: { isAdmin: true } as Organization,
      };

      const res: MockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      prismaTestClient.organization.create.mockRejectedValueOnce(new Error('Database error'));

      await registerOrganization(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getOrganization', () => {
    it('should return organization details when accessed by admin', async () => {
      const targetOrg = {
        id: 'target-id',
        name: 'Target Org',
        apiKey: 'target-key',
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const req: MockRequest = {
        organization: {
          id: 'admin-id',
          name: 'Admin Org',
          apiKey: 'admin-key',
          isAdmin: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        params: { id: targetOrg.id },
      };

      const res: MockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      prismaTestClient.organization.findUnique.mockResolvedValueOnce(targetOrg);

      await getOrganization(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { organization: targetOrg },
      });
    });

    it('should return organization details when accessed by own organization', async () => {
      const req: MockRequest = {
        params: { id: 'test-org-id' },
        organization: { id: 'test-org-id', isAdmin: false } as Organization,
      };

      const res: MockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const targetOrg = {
        id: 'test-org-id',
        name: 'Test Organization',
        apiKey: 'test-key',
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaTestClient.organization.findUnique.mockResolvedValueOnce(targetOrg);

      await getOrganization(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { organization: targetOrg },
      });
    });

    it('should return 404 if organization not found', async () => {
      const req: MockRequest = {
        organization: {
          id: 'admin-id',
          name: 'Admin Org',
          apiKey: 'admin-key',
          isAdmin: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        params: { id: 'non-existent-id' },
      };

      const res: MockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      prismaTestClient.organization.findUnique.mockResolvedValueOnce(null);

      await getOrganization(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Organization not found',
        })
      );
    });
  });

  describe('updateOrganization', () => {
    it('should update organization details when called by admin', async () => {
      const targetOrg = {
        id: 'target-id',
        name: 'Target Org',
        apiKey: 'target-key',
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const req: MockRequest = {
        organization: {
          id: 'admin-id',
          name: 'Admin Org',
          apiKey: 'admin-key',
          isAdmin: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        params: { id: targetOrg.id },
        body: { name: 'Updated Name' },
      };

      const res: MockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const updatedOrg = { ...targetOrg, name: 'Updated Name' };
      prismaTestClient.organization.findUnique.mockResolvedValueOnce(targetOrg);
      prismaTestClient.organization.update.mockResolvedValueOnce(updatedOrg);

      await updateOrganization(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { organization: updatedOrg },
      });
    });

    it('should update organization details when called by own organization', async () => {
      const req: MockRequest = {
        params: { id: 'test-org-id' },
        body: { name: 'Updated Organization' },
        organization: { id: 'test-org-id', isAdmin: false } as Organization,
      };

      const res: MockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const targetOrg = {
        id: 'test-org-id',
        name: 'Test Organization',
        apiKey: 'test-key',
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedOrg = { ...targetOrg, name: 'Updated Organization' };
      prismaTestClient.organization.findUnique.mockResolvedValueOnce(targetOrg);
      prismaTestClient.organization.update.mockResolvedValueOnce(updatedOrg);

      await updateOrganization(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { organization: updatedOrg },
      });
    });

    it('should return 404 if organization not found', async () => {
      const req: MockRequest = {
        organization: {
          id: 'admin-id',
          name: 'Admin Org',
          apiKey: 'admin-key',
          isAdmin: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        params: { id: 'non-existent-id' },
        body: { name: 'Updated Name' },
      };

      const res: MockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      prismaTestClient.organization.findUnique.mockResolvedValueOnce(null);

      await updateOrganization(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Organization not found',
        })
      );
    });
  });
}); 