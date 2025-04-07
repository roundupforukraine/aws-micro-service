import { Request, Response } from 'express';
import { Organization } from '@prisma/client';
import { registerOrganization, getOrganization, updateOrganization } from '../../controllers/organizationController';
import { generateApiKey } from '../../utils/apiKey';

// Mock the generateApiKey function
jest.mock('../../utils/apiKey', () => ({
  generateApiKey: jest.fn().mockReturnValue('test-api-key')
}));

// Mock Prisma client
const mockCreate = jest.fn();
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();

jest.mock('../../config/database', () => ({
  prisma: {
    organization: {
      create: (...args: any[]) => mockCreate(...args),
      findUnique: (...args: any[]) => mockFindUnique(...args),
      update: (...args: any[]) => mockUpdate(...args)
    }
  }
}));

describe('Organization Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
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
      body: {},
      params: {},
      organization: mockOrganization
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('registerOrganization', () => {
    it('should create a new organization successfully', async () => {
      mockReq.body = { name: 'New Organization' };
      mockCreate.mockResolvedValueOnce({
        ...mockOrganization,
        name: 'New Organization'
      });

      await registerOrganization(mockReq as Request, mockRes as Response);

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          name: 'New Organization',
          apiKey: 'test-api-key',
          isAdmin: false
        }
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          organization: expect.objectContaining({
            name: 'New Organization',
            apiKey: 'test-api-key'
          })
        }
      });
    });

    it('should return 400 if name is missing', async () => {
      mockReq.body = {};

      await registerOrganization(mockReq as Request, mockRes as Response);

      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Organization name is required'
      });
    });

    it('should handle duplicate organization names', async () => {
      mockReq.body = { name: 'Existing Organization' };
      mockCreate.mockRejectedValueOnce({ code: 'P2002' });

      await registerOrganization(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'An organization with this name already exists'
      });
    });
  });

  describe('getOrganization', () => {
    it('should get organization details successfully', async () => {
      mockReq.params = { id: 'test-id' };
      mockFindUnique.mockResolvedValueOnce(mockOrganization);

      await getOrganization(mockReq as Request, mockRes as Response);

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: 'test-id' }
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          organization: mockOrganization
        }
      });
    });

    it('should return 403 if non-admin tries to access another organization', async () => {
      mockReq.params = { id: 'other-id' };
      mockReq.organization = { ...mockOrganization, isAdmin: false };

      await getOrganization(mockReq as Request, mockRes as Response);

      expect(mockFindUnique).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'You do not have permission to access this organization'
      });
    });

    it('should allow admin to access any organization', async () => {
      mockReq.params = { id: 'other-id' };
      mockReq.organization = { ...mockOrganization, isAdmin: true };
      mockFindUnique.mockResolvedValueOnce(mockOrganization);

      await getOrganization(mockReq as Request, mockRes as Response);

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: 'other-id' }
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 if organization not found', async () => {
      mockReq.params = { id: 'test-id' };
      mockFindUnique.mockResolvedValueOnce(null);

      await getOrganization(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Organization not found'
      });
    });
  });

  describe('updateOrganization', () => {
    it('should update organization successfully', async () => {
      mockReq.params = { id: 'test-id' };
      mockReq.body = { name: 'Updated Organization' };
      mockUpdate.mockResolvedValueOnce({
        ...mockOrganization,
        name: 'Updated Organization'
      });

      await updateOrganization(mockReq as Request, mockRes as Response);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: { name: 'Updated Organization' }
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          organization: expect.objectContaining({
            name: 'Updated Organization'
          })
        }
      });
    });

    it('should return 403 if non-admin tries to update another organization', async () => {
      mockReq.params = { id: 'other-id' };
      mockReq.organization = { ...mockOrganization, isAdmin: false };
      mockReq.body = { name: 'Updated Organization' };

      await updateOrganization(mockReq as Request, mockRes as Response);

      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'You do not have permission to update this organization'
      });
    });

    it('should allow admin to update any organization', async () => {
      mockReq.params = { id: 'other-id' };
      mockReq.organization = { ...mockOrganization, isAdmin: true };
      mockReq.body = { name: 'Updated Organization' };
      mockUpdate.mockResolvedValueOnce({
        ...mockOrganization,
        id: 'other-id',
        name: 'Updated Organization'
      });

      await updateOrganization(mockReq as Request, mockRes as Response);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'other-id' },
        data: { name: 'Updated Organization' }
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle duplicate organization names', async () => {
      mockReq.params = { id: 'test-id' };
      mockReq.body = { name: 'Existing Organization' };
      mockUpdate.mockRejectedValueOnce({ code: 'P2002' });

      await updateOrganization(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'An organization with this name already exists'
      });
    });

    it('should return 404 if organization not found', async () => {
      mockReq.params = { id: 'test-id' };
      mockReq.body = { name: 'Updated Organization' };
      mockUpdate.mockRejectedValueOnce({ code: 'P2025' });

      await updateOrganization(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Organization not found'
      });
    });
  });
}); 