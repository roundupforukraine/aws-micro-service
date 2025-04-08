import { Request, Response, NextFunction } from 'express';
import { prismaTestClient } from '../setup';
import { registerOrganization, getOrganization, updateOrganization } from '../../controllers/organizationController';
import { AppError } from '../../middleware/errorHandler';
import { Prisma } from '@prisma/client';

describe('Organization Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      organization: {
        id: 'test-id',
        name: 'Test Organization',
        apiKey: 'test-api-key',
        isAdmin: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('registerOrganization', () => {
    it('should create a new organization when called by admin', async () => {
      mockReq.body = { name: 'New Organization' };
      mockReq.organization = {
        ...mockReq.organization,
        isAdmin: true,
      };

      await registerOrganization(mockReq as Request, mockRes as Response, mockNext);

      expect(prismaTestClient.organization.create).toHaveBeenCalledWith({
        data: {
          name: 'New Organization',
          apiKey: expect.any(String),
          isAdmin: false,
        },
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          organization: expect.any(Object),
        },
      });
    });

    it('should handle duplicate organization names', async () => {
      mockReq.body = { name: 'Existing Organization' };
      mockReq.organization = {
        ...mockReq.organization,
        isAdmin: true,
      };

      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint violation', {
        code: 'P2002',
        clientVersion: '4.0.0',
      });

      (prismaTestClient.organization.create as jest.Mock).mockRejectedValueOnce(prismaError);

      await registerOrganization(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockNext.mock.calls[0][0].statusCode).toBe(400);
      expect(mockNext.mock.calls[0][0].message).toBe('An organization with this name already exists');
    });

    it('should return 403 if called by non-admin', async () => {
      mockReq.body = { name: 'New Organization' };
      mockReq.organization = {
        ...mockReq.organization,
        isAdmin: false,
      };

      await registerOrganization(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: 'Only administrators can register new organizations',
        })
      );
    });
  });

  describe('getOrganization', () => {
    it('should get organization details successfully', async () => {
      mockReq.params = { id: 'test-id' };
      mockReq.organization = {
        ...mockReq.organization,
        isAdmin: true,
      };

      await getOrganization(mockReq as Request, mockRes as Response, mockNext);

      expect(prismaTestClient.organization.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          organization: expect.any(Object),
        },
      });
    });

    it('should allow admin to access any organization', async () => {
      const mockReq = {
        params: { id: 'other-org-id' },
        organization: {
          id: 'admin-org-id',
          isAdmin: true,
        },
        get: jest.fn(),
        header: jest.fn(),
      } as unknown as Request;

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      const mockNext = jest.fn();

      // Mock findUnique to return an organization
      (prismaTestClient.organization.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'other-org-id',
        name: 'Other Organization',
        apiKey: 'other-api-key',
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await getOrganization(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          organization: expect.objectContaining({
            id: 'other-org-id',
            name: 'Other Organization',
          }),
        },
      });
    });

    it('should handle organization not found', async () => {
      mockReq.params = { id: 'non-existent-id' };
      mockReq.organization = {
        ...mockReq.organization,
        isAdmin: true,
      };

      (prismaTestClient.organization.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await getOrganization(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockNext.mock.calls[0][0].statusCode).toBe(404);
      expect(mockNext.mock.calls[0][0].message).toBe('Organization not found');
    });
  });

  describe('updateOrganization', () => {
    it('should update organization successfully', async () => {
      mockReq.params = { id: 'test-id' };
      mockReq.body = { name: 'Updated Organization' };
      mockReq.organization = {
        ...mockReq.organization,
        isAdmin: true,
      };

      await updateOrganization(mockReq as Request, mockRes as Response, mockNext);

      expect(prismaTestClient.organization.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: { name: 'Updated Organization' },
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle organization not found', async () => {
      mockReq.params = { id: 'non-existent-id' };
      mockReq.body = { name: 'Updated Organization' };
      mockReq.organization = {
        ...mockReq.organization,
        isAdmin: true,
      };

      (prismaTestClient.organization.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await updateOrganization(mockReq as Request, mockRes as Response, mockNext);

      expect(prismaTestClient.organization.update).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockNext.mock.calls[0][0].statusCode).toBe(404);
      expect(mockNext.mock.calls[0][0].message).toBe('Organization not found');
    });
  });
}); 