import { Request, Response } from 'express';
import { prismaTestClient } from '../../tests/setup';
import { registerOrganization, getOrganization, updateOrganization } from '../organizationController';
import { AppError } from '../../middleware/errorHandler';
import { mockRequest, mockResponse, mockNext, MockResponse } from '../../tests/helpers';
import type { Organization } from '../../tests/setup';

jest.mock('@prisma/client');

describe('Organization Controller', () => {
  let req: Partial<Request>;
  let res: MockResponse;
  let next: jest.Mock;
  let mockOrg: Organization;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    mockOrg = {
      id: '1',
      name: 'Test Org',
      apiKey: 'test-key',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  describe('registerOrganization', () => {
    it('should create a new organization successfully', async () => {
      const orgData = {
        name: 'Test Org',
      };
      req.body = orgData;

      (prismaTestClient.organization.create as jest.Mock).mockResolvedValueOnce({
        id: '1',
        name: 'Test Org',
        apiKey: 'test-key',
      });

      await registerOrganization(req as Request, res as Response, next);

      expect(prismaTestClient.organization.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: orgData.name,
        }),
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          organization: expect.objectContaining({
            id: '1',
            name: 'Test Org',
            apiKey: 'test-key',
          }),
        },
      });
    });

    it('should handle errors when creating organization', async () => {
      const error = new Error('Database error');
      req.body = { name: 'Test Org' };
      (prismaTestClient.organization.create as jest.Mock).mockRejectedValueOnce(error);

      await registerOrganization(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('getOrganization', () => {
    it('should get organization details successfully', async () => {
      req.params = { id: '1' };
      (prismaTestClient.organization.findUnique as jest.Mock).mockResolvedValueOnce(mockOrg);

      await getOrganization(req as Request, res as Response, next);

      expect(prismaTestClient.organization.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          organization: mockOrg,
        },
      });
    });

    it('should handle organization not found', async () => {
      req.params = { id: '1' };
      (prismaTestClient.organization.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await getOrganization(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('updateOrganization', () => {
    it('should update organization successfully', async () => {
      const updateData = {
        name: 'Updated Org',
      };
      req.params = { id: '1' };
      req.body = updateData;
      (prismaTestClient.organization.update as jest.Mock).mockResolvedValueOnce({
        ...mockOrg,
        ...updateData,
      });

      await updateOrganization(req as Request, res as Response, next);

      expect(prismaTestClient.organization.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateData,
      });
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          organization: expect.objectContaining({
            id: '1',
            name: 'Updated Org',
            apiKey: 'test-key',
          }),
        },
      });
    });

    it('should handle errors when updating organization', async () => {
      const error = new Error('Database error');
      req.params = { id: '1' };
      req.body = { name: 'Updated Org' };
      (prismaTestClient.organization.update as jest.Mock).mockRejectedValueOnce(error);

      await updateOrganization(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });
  });
}); 