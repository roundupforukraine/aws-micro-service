import express from 'express';
import { createTransaction, getTransaction, listTransactions, getTransactionReport } from '../controllers/transactionController';
import { combinedAuth } from '../middleware/authMiddleware';

const router = express.Router();

/**
 * Transaction Routes
 * 
 * This router defines the following endpoints:
 * 
 * POST /api/transactions
 * - Create a new transaction
 * - Requires: valid API key (admin or organization), originalAmount (number), organizationId (UUID)
 * - Returns: transaction details
 * 
 * GET /api/transactions/:id
 * - Get transaction details by ID
 * - Requires: valid API key (admin or organization), transaction ID (UUID)
 * - Returns: transaction details
 * 
 * GET /api/transactions
 * - Get all transactions for an organization
 * - Requires: valid API key (admin or organization), organizationId (UUID, optional)
 * - Returns: list of transactions
 * 
 * GET /api/transactions/report
 * - Get transaction summary for an organization
 * - Requires: valid API key (admin or organization), organizationId (UUID, optional)
 * - Returns: transaction summary
 */

// All transaction routes require authentication
router.post('/', combinedAuth, createTransaction);
router.get('/report', combinedAuth, getTransactionReport);
router.get('/:id', combinedAuth, getTransaction);
router.get('/', combinedAuth, listTransactions);

export default router; 