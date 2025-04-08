import { Request, Response } from 'express';
import { prismaTestClient } from '../setup';
import { createMockRes, createMockNext } from '../helpers';
import * as transactionController from '../../controllers/transactionController';
import { Transaction, Organization, Prisma } from '@prisma/client';
import { AppError } from '../../middleware/errorHandler';

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => prismaTestClient),
}));

describe('Transaction Controller', () => {
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRes = createMockRes();
    mockNext = createMockNext();
    jest.clearAllMocks();
  });

  describe('updateTransaction', () => {
    const mockTransactionId = 'test-transaction-id';
    const mockOrgId = 'test-org-id';
    const mockAdminOrgId = 'admin-org-id';

    const createMockReq = (overrides = {}) => ({
      params: { id: mockTransactionId },
      body: { metadata: { description: 'Updated transaction' } },
      organization: { id: mockOrgId, isAdmin: false } as Organization,
      ...overrides,
    } as unknown as Request);

    it('should update transaction metadata successfully', async () => {
      const mockReq = createMockReq();
      const mockTransaction = {
        id: mockTransactionId,
        organizationId: mockOrgId,
        originalAmount: new Prisma.Decimal('15.75'),
        roundedAmount: new Prisma.Decimal('16.00'),
        donationAmount: new Prisma.Decimal('0.25'),
        metadata: { description: 'Original transaction' },
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Transaction;

      (prismaTestClient.transaction.findFirst as jest.Mock).mockResolvedValueOnce(mockTransaction);
      (prismaTestClient.transaction.update as jest.Mock).mockResolvedValueOnce({
        ...mockTransaction,
        metadata: { description: 'Updated transaction' },
      });

      await transactionController.updateTransaction(mockReq, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          transaction: expect.objectContaining({
            id: mockTransactionId,
            originalAmount: '15.75',
            roundedAmount: '16.00',
            donationAmount: '0.25',
            metadata: { description: 'Updated transaction' },
          }),
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle transaction not found', async () => {
      const mockReq = {
        params: { id: 'non-existent-id' },
        body: { metadata: { description: 'Updated transaction' } },
        organization: { id: 'test-org-id', isAdmin: false },
        get: jest.fn(),
        header: jest.fn(),
      } as unknown as Request;

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      const mockNext = jest.fn();

      // Mock findUnique to return null
      (prismaTestClient.transaction.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await transactionController.updateTransaction(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockNext.mock.calls[0][0].statusCode).toBe(404);
      expect(mockNext.mock.calls[0][0].message).toBe('Transaction not found');
    });

    it('should handle unauthorized update of another organization\'s transaction', async () => {
      const mockReq = {
        params: { id: 'test-transaction-id' },
        body: { metadata: { description: 'Updated transaction' } },
        organization: { id: 'other-org-id', isAdmin: false },
        get: jest.fn(),
        header: jest.fn(),
      } as unknown as Request;

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      const mockNext = jest.fn();

      // Mock findUnique to return a transaction owned by a different organization
      (prismaTestClient.transaction.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'test-transaction-id',
        organizationId: 'test-org-id',
        originalAmount: new Prisma.Decimal('15.75'),
        roundedAmount: new Prisma.Decimal('16.00'),
        donationAmount: new Prisma.Decimal('0.25'),
        metadata: { description: 'Original transaction' },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await transactionController.updateTransaction(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockNext.mock.calls[0][0].statusCode).toBe(403);
      expect(mockNext.mock.calls[0][0].message).toBe('Not authorized to update this transaction');
    });

    it('should handle attempt to update financial data', async () => {
      const mockReq = createMockReq({
        body: {
          originalAmount: '20.00',
          roundedAmount: '21.00',
          donationAmount: '1.00',
        },
      });
      const existingTransaction = {
        id: mockTransactionId,
        organizationId: mockOrgId,
        originalAmount: new Prisma.Decimal('15.75'),
        roundedAmount: new Prisma.Decimal('16.00'),
        donationAmount: new Prisma.Decimal('0.25'),
        metadata: { description: 'Original transaction' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prismaTestClient.transaction.findFirst as jest.Mock).mockResolvedValueOnce(existingTransaction);

      await transactionController.updateTransaction(mockReq, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockNext.mock.calls[0][0].statusCode).toBe(400);
      expect(mockNext.mock.calls[0][0].message).toBe('Cannot update transaction amounts');
    });

    it('should allow admin to update any transaction', async () => {
      const mockReq = createMockReq({
        organization: { id: mockAdminOrgId, isAdmin: true } as Organization,
      });

      const mockTransaction = {
        id: mockTransactionId,
        organizationId: 'different-org-id',
        originalAmount: new Prisma.Decimal('15.75'),
        roundedAmount: new Prisma.Decimal('16.00'),
        donationAmount: new Prisma.Decimal('0.25'),
        metadata: { description: 'Original transaction' },
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Transaction;

      (prismaTestClient.transaction.findFirst as jest.Mock).mockResolvedValueOnce(mockTransaction);
      (prismaTestClient.transaction.update as jest.Mock).mockResolvedValueOnce({
        ...mockTransaction,
        metadata: { description: 'Updated by admin' },
      });

      await transactionController.updateTransaction(mockReq, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          transaction: expect.objectContaining({
            id: mockTransactionId,
            originalAmount: '15.75',
            roundedAmount: '16.00',
            donationAmount: '0.25',
            metadata: { description: 'Updated by admin' },
          }),
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
}); 