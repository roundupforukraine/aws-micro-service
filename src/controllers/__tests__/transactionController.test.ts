import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prismaTestClient, Organization, Transaction } from '../../tests/setup';
import {
  createTransaction,
  getTransaction,
  listTransactions,
  getTransactionReport,
} from '../transactionController';

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

describe('Transaction Controller', () => {
  let mockOrg: Organization;
  let mockTransaction: Transaction;
  const next = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockOrg = {
      id: 'test-org-id',
      name: 'Test Organization',
      apiKey: 'test-api-key',
      isAdmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockTransaction = {
      id: 'test-transaction-id',
      organizationId: mockOrg.id,
      originalAmount: new Prisma.Decimal(10.75),
      roundedAmount: new Prisma.Decimal(11.00),
      donationAmount: new Prisma.Decimal(0.25),
      metadata: { description: 'Test transaction' },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  describe('createTransaction', () => {
    it('should create a new transaction', async () => {
      const req: MockRequest = {
        organization: mockOrg,
        body: {
          originalAmount: 10.75,
          metadata: { description: 'Test transaction' },
        },
      };

      const res: MockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      prismaTestClient.transaction.create.mockResolvedValueOnce(mockTransaction);

      await createTransaction(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { transaction: mockTransaction },
      });
    });

    it('should handle database errors', async () => {
      const req: MockRequest = {
        organization: mockOrg,
        body: {
          originalAmount: 10.75,
          metadata: { description: 'Test transaction' },
        },
      };

      const res: MockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      prismaTestClient.transaction.create.mockRejectedValueOnce(new Error('Database error'));

      await createTransaction(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getTransaction', () => {
    it('should return transaction details', async () => {
      const req: MockRequest = {
        organization: mockOrg,
        params: { id: 'test-transaction-id' },
      };

      const res: MockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      prismaTestClient.transaction.findFirst.mockResolvedValueOnce(mockTransaction);

      await getTransaction(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { transaction: mockTransaction },
      });
    });

    it('should return 404 if transaction not found', async () => {
      const req: MockRequest = {
        organization: mockOrg,
        params: { id: 'non-existent-id' },
      };

      const res: MockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      prismaTestClient.transaction.findFirst.mockResolvedValueOnce(null);

      await getTransaction(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Transaction not found',
        })
      );
    });
  });

  describe('listTransactions', () => {
    it('should return paginated transactions', async () => {
      const req: MockRequest = {
        organization: mockOrg,
        query: { page: '1', limit: '10' },
      };

      const res: MockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const transactions = [mockTransaction];
      const total = 1;

      prismaTestClient.transaction.findMany.mockResolvedValueOnce(transactions);
      prismaTestClient.transaction.count.mockResolvedValueOnce(total);

      await listTransactions(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          transactions,
          total,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });
    });
  });

  describe('getTransactionReport', () => {
    it('should return transaction summary', async () => {
      const req: MockRequest = {
        organization: mockOrg,
        query: {},
      };

      const res: MockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const totalTransactions = 1;
      const totalDonations = new Prisma.Decimal(0.25);

      prismaTestClient.transaction.aggregate.mockResolvedValueOnce({
        _count: { _all: totalTransactions },
        _sum: { donationAmount: totalDonations },
        _avg: { donationAmount: totalDonations },
        _min: { donationAmount: totalDonations },
        _max: { donationAmount: totalDonations },
      });

      await getTransactionReport(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          totalTransactions,
          totalDonations,
          averageDonation: totalDonations,
        },
      });
    });
  });
}); 