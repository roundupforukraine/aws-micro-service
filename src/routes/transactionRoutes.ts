import { Router } from 'express';
import { body, query } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest';
import { apiKeyAuth } from '../middleware/apiKeyAuth';
import {
  createTransaction,
  getTransaction,
  listTransactions,
  getTransactionReport,
} from '../controllers/transactionController';

const router = Router();

/**
 * Transaction Routes
 * 
 * This router defines the following endpoints:
 * 
 * POST /api/transactions
 * - Create a new transaction
 * - Requires: valid API key, originalAmount (positive number), metadata (object)
 * - Returns: created transaction details
 * 
 * GET /api/transactions/:id
 * - Get transaction details by ID
 * - Requires: valid API key, transaction ID (UUID)
 * - Returns: transaction details
 * 
 * GET /api/transactions
 * - List transactions with pagination and filtering
 * - Requires: valid API key
 * - Optional query params: page, limit, startDate, endDate
 * - Returns: paginated list of transactions
 * 
 * GET /api/transactions/report
 * - Generate transaction report
 * - Requires: valid API key
 * - Optional query params: startDate, endDate
 * - Returns: transaction summary statistics
 */

// Create a new transaction
router.post(
  '/',
  [
    body('originalAmount').isFloat({ min: 0 }).withMessage('Original amount must be a positive number'),
    body('metadata').isObject().withMessage('Metadata must be an object'),
    validateRequest,
    apiKeyAuth,
  ],
  createTransaction
);

// Get transaction details
router.get(
  '/:id',
  [
    body('id').isUUID().withMessage('Invalid transaction ID'),
    validateRequest,
    apiKeyAuth,
  ],
  getTransaction
);

// List transactions with pagination and filtering
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
    validateRequest,
    apiKeyAuth,
  ],
  listTransactions
);

// Generate transaction report
router.get(
  '/report',
  [
    query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
    validateRequest,
    apiKeyAuth,
  ],
  getTransactionReport
);

export default router; 