import { Request, Response } from 'express';
import { prismaTestClient, Organization } from '../../tests/setup';
import { registerOrganization, getOrganization, updateOrganization } from '../organizationController';
import { AppError } from '../../middleware/errorHandler';
import { mockRequest, mockResponse, mockNext, MockResponse } from '../../tests/helpers';

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => prismaTestClient),
}));

describe('Organization Controller', () => {
  let req: Partial<Request>;
  let res: MockResponse;
  let next: jest.Mock;
  let mockOrg: Organization;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      organization: { id: 'test-org-id', isAdmin: true } as Organization,
    };
    res = mockResponse();
    next = mockNext();
    mockOrg = {
      id: '1',
      name: 'Test Org',
      apiKey: 'test-key',
      isAdmin: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    jest.clearAllMocks();
  });

  describe('registerOrganization', () => {
    it('should create a new organization when called by admin', async () => {
      req.body = { name: 'New Organization' };
      req.organization = { isAdmin: true } as Organization;

      await registerOrganization(req as Request, res as Response, next);

      expect(prismaTestClient.organization.create).toHaveBeenCalledWith({
        data: { name: 'New Organization' },
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { organization: expect.any(Object) },
      });
    });

    it('should return 403 if called by non-admin', async () => {
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

    it('should handle database errors', async () => {
      req.body = { name: 'New Organization' };
      req.organization = { isAdmin: true } as Organization;
      prismaTestClient.organization.create.mockRejectedValueOnce(new Error('Database error'));

      await registerOrganization(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'Failed to create organization',
        })
      );
    });
  });

  describe('getOrganization', () => {
    it('should return organization details when accessed by admin', async () => {
      req.params = { id: 'test-org-id' };
      req.organization = { isAdmin: true } as Organization;
      prismaTestClient.organization.findUnique.mockResolvedValueOnce({
        id: 'test-org-id',
        name: 'Test Organization',
      } as Organization);

      await getOrganization(req as Request, res as Response, next);

      expect(prismaTestClient.organization.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-org-id' },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { organization: expect.any(Object) },
      });
    });

    it('should return organization details when accessed by own organization', async () => {
      req.params = { id: 'test-org-id' };
      req.organization = { id: 'test-org-id', isAdmin: false } as Organization;
      prismaTestClient.organization.findUnique.mockResolvedValueOnce({
        id: 'test-org-id',
        name: 'Test Organization',
      } as Organization);

      await getOrganization(req as Request, res as Response, next);

      expect(prismaTestClient.organization.findUnique).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 if organization not found', async () => {
      req.params = { id: 'non-existent-id' };
      req.organization = { isAdmin: true } as Organization;
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
      req.params = { id: 'test-org-id' };
      req.body = { name: 'Updated Organization' };
      req.organization = { isAdmin: true } as Organization;
      prismaTestClient.organization.findUnique.mockResolvedValueOnce({
        id: 'test-org-id',
        name: 'Test Organization',
      } as Organization);

      await updateOrganization(req as Request, res as Response, next);

      expect(prismaTestClient.organization.update).toHaveBeenCalledWith({
        where: { id: 'test-org-id' },
        data: { name: 'Updated Organization' },
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should update organization details when called by own organization', async () => {
      req.params = { id: 'test-org-id' };
      req.body = { name: 'Updated Organization' };
      req.organization = { id: 'test-org-id', isAdmin: false } as Organization;
      prismaTestClient.organization.findUnique.mockResolvedValueOnce({
        id: 'test-org-id',
        name: 'Test Organization',
      } as Organization);

      await updateOrganization(req as Request, res as Response, next);

      expect(prismaTestClient.organization.update).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 if organization not found', async () => {
      req.params = { id: 'non-existent-id' };
      req.body = { name: 'Updated Organization' };
      req.organization = { isAdmin: true } as Organization;
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