import { Request, Response } from 'express';
import { prismaTestClient } from '../setup';
import { createMockRes, createMockNext } from '../helpers';
import * as transactionController from '../../controllers/transactionController';
import { Transaction, Organization, Prisma } from '@prisma/client';

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

      (prismaTestClient.transaction.findUnique as jest.Mock).mockResolvedValueOnce(mockTransaction);
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
            metadata: { description: 'Updated transaction' },
          }),
        },
      });
    });

    it('should return 404 if transaction not found', async () => {
      const mockReq = createMockReq();
      (prismaTestClient.transaction.findFirst as jest.Mock).mockResolvedValueOnce(null);

      await transactionController.updateTransaction(mockReq, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Transaction not found',
      });
    });

    it('should return 403 if trying to update another organization\'s transaction', async () => {
      const mockReq = createMockReq();
      const differentOrgTransaction = {
        id: mockTransactionId,
        organizationId: 'different-org-id',
        originalAmount: new Prisma.Decimal('15.75'),
        roundedAmount: new Prisma.Decimal('16.00'),
        donationAmount: new Prisma.Decimal('0.25'),
        metadata: { description: 'Original transaction' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prismaTestClient.transaction.findFirst as jest.Mock).mockResolvedValueOnce(differentOrgTransaction);

      await transactionController.updateTransaction(mockReq, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Not authorized to update this transaction',
      });
    });

    it('should return 400 if trying to update financial data', async () => {
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

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Cannot update transaction amounts',
      });
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

      (prismaTestClient.transaction.findUnique as jest.Mock).mockResolvedValueOnce(mockTransaction);
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
            metadata: { description: 'Updated by admin' },
          }),
        },
      });
    });
  });
}); 