import { Request, Response } from 'express';
import { createTransaction, getTransaction, listTransactions, getTransactionReport } from '../transactionController';
import { prismaTestClient } from '../../tests/setup';
import { Organization, Transaction } from '../../tests/setup';

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => prismaTestClient),
}));

describe('Transaction Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;
  let mockOrg: Organization;
  let mockTransaction: Transaction;

  beforeEach(() => {
    mockOrg = {
      id: 'test-id',
      name: 'Test Organization',
      apiKey: 'test-api-key',
      isAdmin: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockTransaction = {
      id: 'test-transaction-id',
      organizationId: mockOrg.id,
      originalAmount: 10.75,
      roundedAmount: 11.00,
      donationAmount: 0.25,
      metadata: { description: 'Test transaction' },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockReq = {
      body: {
        originalAmount: 10.75,
        metadata: { description: 'Test transaction' },
      },
      params: { id: 'test-transaction-id' },
      organization: mockOrg,
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockNext = jest.fn();
  });

  describe('createTransaction', () => {
    it('should create a new transaction', async () => {
      prismaTestClient.transaction.create.mockResolvedValueOnce(mockTransaction);

      await createTransaction(mockReq as Request, mockRes as Response, mockNext);

      expect(prismaTestClient.transaction.create).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          transaction: mockTransaction,
        },
      });
    });

    it('should handle errors', async () => {
      prismaTestClient.transaction.create.mockRejectedValueOnce(new Error('Database error'));

      await createTransaction(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 500,
        message: 'Failed to create transaction',
      }));
    });
  });

  describe('getTransaction', () => {
    it('should return transaction details', async () => {
      prismaTestClient.transaction.findFirst.mockResolvedValueOnce(mockTransaction);

      await getTransaction(mockReq as Request, mockRes as Response, mockNext);

      expect(prismaTestClient.transaction.findFirst).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          transaction: mockTransaction,
        },
      });
    });

    it('should return 404 if transaction not found', async () => {
      prismaTestClient.transaction.findFirst.mockResolvedValueOnce(null);

      await getTransaction(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 404,
        message: 'Transaction not found',
      }));
    });
  });

  describe('listTransactions', () => {
    it('should return paginated transactions', async () => {
      const transactions = [mockTransaction];
      const total = 1;
      const page = 1;
      const limit = 10;

      prismaTestClient.transaction.findMany.mockResolvedValueOnce(transactions);
      prismaTestClient.transaction.count.mockResolvedValueOnce(total);

      mockReq.query = { page: '1', limit: '10' };

      await listTransactions(mockReq as Request, mockRes as Response, mockNext);

      expect(prismaTestClient.transaction.findMany).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          transactions,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
          },
        },
      });
    });
  });

  describe('getTransactionReport', () => {
    it('should return transaction report', async () => {
      const totalDonations = 100;
      prismaTestClient.transaction.aggregate.mockResolvedValueOnce({
        _sum: { donationAmount: totalDonations },
      });

      await getTransactionReport(mockReq as Request, mockRes as Response, mockNext);

      expect(prismaTestClient.transaction.aggregate).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          totalDonations,
        },
      });
    });
  });
}); 