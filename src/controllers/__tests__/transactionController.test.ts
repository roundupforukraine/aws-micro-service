import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import {
  createTransaction,
  getTransaction,
  listTransactions,
  getTransactionReport,
} from '../transactionController';
import { prismaTestClient } from '../../tests/setup';
import { AppError } from '../../middleware/errorHandler';
// Import helper functions
import { createMockReq, createMockRes, createMockNext } from '../../tests/helpers';

// Create partial types for mocking
type MockRequest = Partial<Request> & {
  organization?: any;
  body?: any;
  params?: any;
  query?: any;
};

type MockResponse = Partial<Response> & {
  status: jest.Mock;
  json: jest.Mock;
};

describe('Transaction Controller', () => {
  let mockOrg: any;
  let mockTransaction: any;
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

      (prismaTestClient.transaction.create as jest.Mock).mockResolvedValueOnce({
        ...mockTransaction,
        originalAmount: new Prisma.Decimal(10.75),
        roundedAmount: new Prisma.Decimal(11.00),
        donationAmount: new Prisma.Decimal(0.25),
      });

      await createTransaction(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          transaction: expect.objectContaining({
            id: expect.any(String),
            organizationId: expect.any(String),
            originalAmount: expect.any(String),
            roundedAmount: expect.any(String),
            donationAmount: expect.any(String),
            metadata: expect.any(Object),
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
          }),
        },
      });
    });

    it('should handle database errors', async () => {
      const req = {
        organization: {
          id: 'test-org-id',
          isAdmin: false,
        },
        body: {
          originalAmount: '10.75',
          metadata: {
            description: 'Test transaction',
          },
        },
      } as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      const next = jest.fn() as NextFunction;

      // Mock database error
      (prismaTestClient.transaction.create as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

      await createTransaction(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getTransaction', () => {
    it('should return transaction details', async () => {
      // Use imported helper functions
      const req = createMockReq({ params: { id: 'tx1' }, organization: { id: 'org1', isAdmin: false } }); 
      const res = createMockRes();
      const next = createMockNext();

      // Mock findFirst
      const mockTx = {
        id: 'tx1',
        organizationId: 'org1',
        originalAmount: new Prisma.Decimal('10.50'),
        roundedAmount: new Prisma.Decimal('11.00'),
        donationAmount: new Prisma.Decimal('0.50'),
        metadata: { test: 'data' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prismaTestClient.transaction.findFirst as jest.Mock).mockResolvedValueOnce(mockTx);

      await getTransaction(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          transaction: expect.objectContaining({
            id: expect.any(String),
            organizationId: expect.any(String),
            originalAmount: expect.any(String),
            roundedAmount: expect.any(String),
            donationAmount: expect.any(String),
            metadata: expect.any(Object),
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
          }),
        },
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

      (prismaTestClient.transaction.findFirst as jest.Mock).mockResolvedValueOnce(null);

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

      const transactions = [{
        ...mockTransaction,
        originalAmount: new Prisma.Decimal(10.75),
        roundedAmount: new Prisma.Decimal(11.00),
        donationAmount: new Prisma.Decimal(0.25),
      }];
      const total = 1;

      (prismaTestClient.transaction.findMany as jest.Mock).mockResolvedValueOnce(transactions);
      (prismaTestClient.transaction.count as jest.Mock).mockResolvedValueOnce(total);

      await listTransactions(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          transactions: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              organizationId: expect.any(String),
              originalAmount: expect.any(String),
              roundedAmount: expect.any(String),
              donationAmount: expect.any(String),
              metadata: expect.any(Object),
              createdAt: expect.any(Date),
              updatedAt: expect.any(Date),
            }),
          ]),
          pagination: expect.objectContaining({
            page: expect.any(Number),
            limit: expect.any(Number),
            total: expect.any(Number),
            pages: expect.any(Number),
          }),
        },
      });
    });
  });

  describe('getTransactionReport', () => {
    it('should return transaction report', async () => {
      const req: MockRequest = {
        organization: mockOrg,
        query: { startDate: '2024-01-01', endDate: '2024-12-31' },
      };

      const res: MockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      (prismaTestClient.transaction.aggregate as jest.Mock).mockResolvedValueOnce({
        _count: { id: 1 },
        _sum: { donationAmount: new Prisma.Decimal(0.25) },
      });

      await getTransactionReport(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          totalTransactions: expect.any(Number),
          totalDonations: expect.any(String),
          averageDonation: expect.any(String),
        },
      });
    });
  });
}); 