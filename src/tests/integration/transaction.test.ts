import request from 'supertest';
import { setup, teardown, prismaTestClient } from '../setup';
import app from '../../index';
import type { Organization, Transaction } from '../setup';

describe('Transaction API', () => {
  let organizationId: string;
  let apiKey: string;

  beforeAll(async () => {
    await setup();
    
    // Create a test organization
    const org = await prismaTestClient.organization.create({
      data: {
        name: 'Test Org for Transactions',
        apiKey: 'test-api-key-' + Date.now(),
      },
    }) as Organization;
    organizationId = org.id;
    apiKey = org.apiKey;
  });

  afterAll(async () => {
    await teardown();
  });

  describe('POST /api/transactions', () => {
    it('should create a new transaction with round-up calculation', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('x-api-key', apiKey)
        .send({
          originalAmount: 10.50,
          metadata: { test: true, customer: 'John Doe' },
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.transaction).toHaveProperty('id');
      expect(response.body.data.transaction).toHaveProperty('originalAmount', 10.50);
      expect(response.body.data.transaction).toHaveProperty('roundedAmount', 11);
      expect(response.body.data.transaction).toHaveProperty('donationAmount', 0.50);
      expect(response.body.data.transaction).toHaveProperty('metadata');
      expect(response.body.data.transaction.metadata).toHaveProperty('test', true);
      expect(response.body.data.transaction.metadata).toHaveProperty('customer', 'John Doe');
    });

    it('should return 400 if originalAmount is missing', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('x-api-key', apiKey)
        .send({
          metadata: { test: true },
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Original amount must be a positive number');
    });

    it('should return 401 if API key is missing', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .send({
          originalAmount: 10.50,
          metadata: { test: true },
        });

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('API key is required');
    });
  });

  describe('GET /api/transactions/:id', () => {
    let transactionId: string;

    beforeAll(async () => {
      // Create a test transaction
      const transaction = await prismaTestClient.transaction.create({
        data: {
          organizationId,
          originalAmount: 15.75,
          roundedAmount: 16,
          donationAmount: 0.25,
          metadata: { test: true },
        },
      }) as Transaction;
      transactionId = transaction.id;
    });

    it('should return transaction details', async () => {
      const response = await request(app)
        .get(`/api/transactions/${transactionId}`)
        .set('x-api-key', apiKey);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.transaction).toHaveProperty('id', transactionId);
      expect(response.body.data.transaction).toHaveProperty('originalAmount', 15.75);
      expect(response.body.data.transaction).toHaveProperty('roundedAmount', 16);
      expect(response.body.data.transaction).toHaveProperty('donationAmount', 0.25);
    });

    it('should return 404 if transaction not found', async () => {
      const response = await request(app)
        .get('/api/transactions/non-existent-id')
        .set('x-api-key', apiKey);

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('Transaction not found');
    });
  });

  describe('GET /api/transactions', () => {
    beforeAll(async () => {
      // Create multiple test transactions
      await Promise.all([
        prismaTestClient.transaction.create({
          data: {
            organizationId,
            originalAmount: 20.25,
            roundedAmount: 21,
            donationAmount: 0.75,
            metadata: { test: true },
          },
        }),
        prismaTestClient.transaction.create({
          data: {
            organizationId,
            originalAmount: 30.50,
            roundedAmount: 31,
            donationAmount: 0.50,
            metadata: { test: true },
          },
        }),
      ]);
    });

    it('should return paginated transactions', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .set('x-api-key', apiKey)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('transactions');
      expect(Array.isArray(response.body.data.transactions)).toBe(true);
      expect(response.body.data.transactions.length).toBeGreaterThan(0);
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination).toHaveProperty('page', 1);
      expect(response.body.data.pagination).toHaveProperty('limit', 10);
      expect(response.body.data.pagination).toHaveProperty('total');
      expect(response.body.data.pagination).toHaveProperty('pages');
    });
  });

  describe('GET /api/transactions/reports/summary', () => {
    it('should return transaction summary', async () => {
      const response = await request(app)
        .get('/api/transactions/reports/summary')
        .set('x-api-key', apiKey);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('totalTransactions');
      expect(response.body.data).toHaveProperty('totalDonations');
      expect(response.body.data).toHaveProperty('averageDonation');
    });

    it('should filter report by date range', async () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      
      const endDate = new Date();
      
      const response = await request(app)
        .get('/api/transactions/reports/summary')
        .set('x-api-key', apiKey)
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });
  });
}); 