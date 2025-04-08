import request from 'supertest';
import app from '../../index';
import { setup, teardown, prismaTestClient } from '../setup';
import type { Organization, Transaction } from '../setup';

describe('Transaction API', () => {
  let apiKey: string;
  let organizationId: string;
  let transactionId: string;
  let adminApiKey: string;

  beforeAll(async () => {
    await setup();
    adminApiKey = 'test-admin-key';
    apiKey = 'test-api-key';
    organizationId = '1fc7e4e8-1258-495b-9fd0-44c45a5e17c7';

    // Create a test transaction
    const transactionResponse = await request(app)
      .post('/api/transactions')
      .set('x-api-key', apiKey)
      .send({
        originalAmount: '15.75',
        metadata: { description: 'Test transaction' }
      });

    expect(transactionResponse.status).toBe(201);
    transactionId = transactionResponse.body.data.transaction.id;
  });

  afterAll(async () => {
    await teardown();
  });

  describe('POST /api/transactions', () => {
    it('should create a new transaction with round-up calculation', async () => {
      const transactionResponse = await request(app)
        .post('/api/transactions')
        .set('x-api-key', apiKey)
        .send({
          originalAmount: '15.75',
          metadata: { description: 'Test transaction' }
        });

      expect(transactionResponse.status).toBe(201);
      expect(transactionResponse.body.status).toBe('success');
      expect(transactionResponse.body.data.transaction).toHaveProperty('id');
      expect(transactionResponse.body.data.transaction.originalAmount).toBe('15.75');
      expect(transactionResponse.body.data.transaction.roundedAmount).toBe('16.00');
      expect(transactionResponse.body.data.transaction.donationAmount).toBe('0.25');
      expect(transactionResponse.body.data.transaction).toHaveProperty('organizationId', organizationId);
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
          originalAmount: '10.50',
          metadata: { test: true },
        });

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('API key is required');
    });

    it('should return 400 if originalAmount is invalid format', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('x-api-key', apiKey)
        .send({
          originalAmount: 'not-a-number',
          metadata: { description: 'Test transaction' },
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Original amount must be a positive number');
    });

    it('should return 400 if originalAmount is negative', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('x-api-key', apiKey)
        .send({
          originalAmount: '-10.50',
          metadata: { description: 'Test transaction' },
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Original amount must be a positive number');
    });
  });

  describe('GET /api/transactions/:id', () => {
    it('should return transaction details', async () => {
      const response = await request(app)
        .get(`/api/transactions/${transactionId}`)
        .set('x-api-key', apiKey);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.transaction).toHaveProperty('id', transactionId);
      expect(response.body.data.transaction.originalAmount.toString()).toBe('15.75');
      expect(response.body.data.transaction.roundedAmount.toString()).toBe('16.00');
      expect(response.body.data.transaction.donationAmount.toString()).toBe('0.25');
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
            originalAmount: '20.25',
            roundedAmount: '21',
            donationAmount: '0.75',
            metadata: { test: true },
          },
        }),
        prismaTestClient.transaction.create({
          data: {
            organizationId,
            originalAmount: '30.50',
            roundedAmount: '31',
            donationAmount: '0.50',
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

    it('should filter transactions by date range', async () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      
      const endDate = new Date();
      
      const response = await request(app)
        .get('/api/transactions')
        .set('x-api-key', apiKey)
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          page: 1,
          limit: 10
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('transactions');
      expect(Array.isArray(response.body.data.transactions)).toBe(true);
    });

    it('should sort transactions by date', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .set('x-api-key', apiKey)
        .query({
          sortBy: 'createdAt',
          sortOrder: 'desc',
          page: 1,
          limit: 10
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('transactions');
      expect(Array.isArray(response.body.data.transactions)).toBe(true);
    });

    it('should return 400 if sortBy is invalid', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .set('x-api-key', apiKey)
        .query({
          sortBy: 'invalidField',
          page: 1,
          limit: 10
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Invalid sort field');
    });
  });

  describe('GET /api/transactions/report', () => {
    it('should return transaction summary', async () => {
      const response = await request(app)
        .get('/api/transactions/report')
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
        .get('/api/transactions/report')
        .set('x-api-key', apiKey)
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });
  });

  describe('PUT /api/transactions/:id', () => {
    it('should update transaction metadata', async () => {
      const response = await request(app)
        .put(`/api/transactions/${transactionId}`)
        .set('x-api-key', apiKey)
        .send({
          metadata: { 
            description: 'Updated test transaction',
            updated: true 
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.transaction).toHaveProperty('id', transactionId);
      expect(response.body.data.transaction.metadata).toEqual({
        description: 'Updated test transaction',
        updated: true
      });
      // Verify that financial data remains unchanged
      expect(response.body.data.transaction.originalAmount.toString()).toBe('15.75');
      expect(response.body.data.transaction.roundedAmount.toString()).toBe('16.00');
      expect(response.body.data.transaction.donationAmount.toString()).toBe('0.25');
    });

    it('should return 404 if transaction not found', async () => {
      const response = await request(app)
        .put('/api/transactions/non-existent-id')
        .set('x-api-key', apiKey)
        .send({
          metadata: { test: true }
        });

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('Transaction not found');
    });

    it('should return 403 if trying to update another organization\'s transaction', async () => {
      // Create another organization with admin API key
      const otherOrgResponse = await request(app)
        .post('/api/organizations/register')
        .set('x-api-key', adminApiKey)  // Use admin API key for registration
        .send({ name: 'Other Organization' });

      expect(otherOrgResponse.status).toBe(201);  // Verify registration succeeded
      const otherOrgApiKey = otherOrgResponse.body.data.organization.apiKey;
      
      const otherTransactionResponse = await request(app)
        .post('/api/transactions')
        .set('x-api-key', otherOrgApiKey)
        .send({
          originalAmount: '20.50',
          metadata: { description: 'Other org transaction' }
        });

      expect(otherTransactionResponse.status).toBe(201);  // Verify transaction creation succeeded
      const otherTransactionId = otherTransactionResponse.body.data.transaction.id;

      // Try to update other organization's transaction
      const response = await request(app)
        .put(`/api/transactions/${otherTransactionId}`)
        .set('x-api-key', apiKey)
        .send({
          metadata: { test: true }
        });

      expect(response.status).toBe(403);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('Not authorized to update this transaction');
    });

    it('should return 400 if trying to update financial data', async () => {
      const response = await request(app)
        .put(`/api/transactions/${transactionId}`)
        .set('x-api-key', apiKey)
        .send({
          originalAmount: '20.50',
          metadata: { test: true }
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('Cannot update transaction amounts');
    });

    it('should allow admin to update any transaction', async () => {
      const response = await request(app)
        .put(`/api/transactions/${transactionId}`)
        .set('x-api-key', adminApiKey)
        .send({
          metadata: { 
            description: 'Updated by admin',
            updated: true 
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.transaction.metadata).toEqual({
        description: 'Updated by admin',
        updated: true
      });
    });
  });
}); 