import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest';
import {
  createTransaction,
  getTransaction,
  listTransactions,
  getTransactionReport,
} from '../controllers/transactionController';

const router = Router();

// Create new transaction
router.post(
  '/',
  [
    body('originalAmount')
      .isFloat({ min: 0 })
      .withMessage('Original amount must be a positive number'),
    body('metadata')
      .isObject()
      .withMessage('Metadata must be an object'),
  ],
  validateRequest,
  createTransaction
);

// Get transaction details
router.get(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid transaction ID'),
  ],
  validateRequest,
  getTransaction
);

// List transactions
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date'),
  ],
  validateRequest,
  listTransactions
);

// Get transaction report
router.get(
  '/reports/summary',
  [
    query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date'),
  ],
  validateRequest,
  getTransactionReport
);

export default router; 