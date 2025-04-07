import { Request, Response } from 'express';
import { prismaTestClient } from '../../tests/setup';
import { createTransaction, getTransaction, listTransactions, getTransactionReport } from '../transactionController';
import { AppError } from '../../middleware/errorHandler';
import { mockRequest, mockResponse, mockNext, MockResponse } from '../../tests/helpers';
import type { Organization, Transaction } from '../../tests/setup';

jest.mock('@prisma/client');

describe('Transaction Controller', () => {
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
    req.organization = mockOrg;
  });

  describe('createTransaction', () => {
    it('should create a new transaction successfully', async () => {
      const transactionData = {
        originalAmount: 10.50,
        metadata: { source: 'test' },
      };
      req.body = transactionData;

      const mockTransaction: Transaction = {
        id: '1',
        organizationId: mockOrg.id,
        originalAmount: 10.50,
        roundedAmount: 11.00,
        donationAmount: 0.50,
        metadata: { source: 'test' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaTestClient.transaction.create as jest.Mock).mockResolvedValueOnce(mockTransaction);

      await createTransaction(req as Request, res as Response, next);

      expect(prismaTestClient.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: mockOrg.id,
          originalAmount: transactionData.originalAmount,
          metadata: transactionData.metadata,
        }),
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          transaction: mockTransaction,
        },
      });
    });

    it('should handle errors when creating transaction', async () => {
      const error = new AppError('Database error', 500);
      req.body = {
        originalAmount: 10.50,
        metadata: { source: 'test' },
      };
      (prismaTestClient.transaction.create as jest.Mock).mockRejectedValueOnce(error);

      await createTransaction(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('getTransaction', () => {
    it('should get transaction details successfully', async () => {
      const mockTransaction: Transaction = {
        id: '1',
        organizationId: mockOrg.id,
        originalAmount: 10.50,
        roundedAmount: 11.00,
        donationAmount: 0.50,
        metadata: { source: 'test' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      req.params = { id: '1' };
      (prismaTestClient.transaction.findFirst as jest.Mock).mockResolvedValueOnce(mockTransaction);

      await getTransaction(req as Request, res as Response, next);

      expect(prismaTestClient.transaction.findFirst).toHaveBeenCalledWith({
        where: {
          id: '1',
          organizationId: mockOrg.id,
        },
      });
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          transaction: mockTransaction,
        },
      });
    });

    it('should handle transaction not found', async () => {
      req.params = { id: '1' };
      (prismaTestClient.transaction.findFirst as jest.Mock).mockResolvedValueOnce(null);

      await getTransaction(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('listTransactions', () => {
    it('should return paginated transactions', async () => {
      const mockTransactions: Transaction[] = [{
        id: '1',
        organizationId: mockOrg.id,
        originalAmount: 10.50,
        roundedAmount: 11.00,
        donationAmount: 0.50,
        metadata: { source: 'test' },
        createdAt: new Date(),
        updatedAt: new Date(),
      }];

      req.query = { page: '1', limit: '10' };
      (prismaTestClient.transaction.findMany as jest.Mock).mockResolvedValueOnce(mockTransactions);
      (prismaTestClient.transaction.count as jest.Mock).mockResolvedValueOnce(1);

      await listTransactions(req as Request, res as Response, next);

      expect(prismaTestClient.transaction.findMany).toHaveBeenCalledWith({
        where: { organizationId: mockOrg.id },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          transactions: mockTransactions,
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            pages: 1,
          },
        },
      });
    });
  });

  describe('getTransactionReport', () => {
    it('should return transaction summary', async () => {
      (prismaTestClient.transaction.count as jest.Mock).mockResolvedValueOnce(10);
      (prismaTestClient.transaction.aggregate as jest.Mock).mockResolvedValueOnce({
        _sum: { donationAmount: 5.00 },
      });

      await getTransactionReport(req as Request, res as Response, next);

      expect(prismaTestClient.transaction.count).toHaveBeenCalledWith({
        where: { organizationId: mockOrg.id },
      });
      expect(prismaTestClient.transaction.aggregate).toHaveBeenCalledWith({
        where: { organizationId: mockOrg.id },
        _sum: { donationAmount: true },
      });
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          totalTransactions: 10,
          totalDonations: 5.00,
          averageDonation: 0.50,
        },
      });
    });
  });
}); 