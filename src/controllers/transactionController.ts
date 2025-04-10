import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { prisma } from '../config/database';

// Use mock client in test environment to avoid database interactions
const prismaClient = process.env.NODE_ENV === 'test' 
  ? require('../tests/setup').prismaTestClient 
  : prisma;

/**
 * Calculate the round-up amount for a transaction
 * 
 * This function takes the original amount and calculates how much needs to be
 * rounded up to the next pound, which becomes the donation amount.
 * 
 * @param amount - The original transaction amount
 * @returns The round-up amount (difference to next pound)
 */
const calculateRoundUp = (amount: number): number => {
  const nextPound = Math.ceil(amount);
  return Number((nextPound - amount).toFixed(2));
};

/**
 * Serialize a transaction object to ensure Decimal values are properly converted to strings
 */
const serializeTransaction = (transaction: any) => {
  const serialized = { ...transaction };
  if (serialized.originalAmount) {
    serialized.originalAmount = serialized.originalAmount.toString();
  }
  if (serialized.roundedAmount) {
    serialized.roundedAmount = serialized.roundedAmount.toString();
  }
  if (serialized.donationAmount) {
    serialized.donationAmount = serialized.donationAmount.toString();
  }
  return serialized;
};

/**
 * Create a new transaction
 * 
 * This endpoint creates a new transaction and calculates the round-up amount
 * for donation. The transaction is associated with the authenticated organization.
 * 
 * @param req - Express request object containing transaction details in body
 * @param res - Express response object
 * @param next - Express next function for error handling
 */
export const createTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.organization) {
      throw new AppError('Organization not found', 404);
    }
    
    const { originalAmount, metadata } = req.body;
    const organizationId = req.organization.id;

    // Validate originalAmount
    if (!originalAmount || isNaN(Number(originalAmount)) || Number(originalAmount) <= 0) {
      throw new AppError('Original amount must be a positive number', 400);
    }

    // Calculate rounded amount and donation amount
    const roundedAmount = Math.ceil(Number(originalAmount));
    const donationAmount = calculateRoundUp(Number(originalAmount));

    // Create transaction in database
    const transaction = await prismaClient.transaction.create({
      data: {
        organizationId,
        originalAmount,
        roundedAmount,
        donationAmount,
        metadata,
      },
    });

    // Return success response with created transaction
    res.status(201).json({
      status: 'success',
      data: {
        transaction: serializeTransaction(transaction),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get transaction details
 * 
 * This endpoint retrieves a specific transaction by ID.
 * Organizations can only access their own transactions.
 * 
 * @param req - Express request object containing transaction ID in params
 * @param res - Express response object
 * @param next - Express next function for error handling
 */
export const getTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.organization) {
      throw new AppError('Organization not found', 404);
    }
    
    const { id } = req.params;
    const organizationId = req.organization.id;

    // Build query filter
    const where: any = { id };
    // Only filter by organizationId for non-admin users
    if (!req.organization.isAdmin) {
      where.organizationId = organizationId;
    }

    // Find transaction by ID and organization ID
    const transaction = await prismaClient.transaction.findFirst({
      where,
    });

    // Return 404 if transaction not found
    if (!transaction) {
      throw new AppError('Transaction not found', 404);
    }

    // Return success response with transaction details
    res.status(200).json({
      status: 'success',
      data: {
        transaction: serializeTransaction(transaction),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List transactions with pagination and date filtering
 * 
 * This endpoint retrieves a paginated list of transactions for the authenticated
 * organization. Results can be filtered by date range.
 * 
 * @param req - Express request object containing pagination and filter parameters
 * @param res - Express response object
 * @param next - Express next function for error handling
 */
export const listTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.organization) {
      throw new AppError('Organization not found', 404);
    }
    
    const { page = 1, limit = 10, startDate, endDate, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const organizationId = req.organization.id;

    // Validate sort field
    const allowedSortFields = ['createdAt', 'originalAmount', 'roundedAmount', 'donationAmount'];
    if (sortBy && !allowedSortFields.includes(sortBy as string)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid sort field'
      });
    }

    // Build query filter
    const where: any = {};
    // Only filter by organizationId for non-admin users
    if (!req.organization.isAdmin) {
      where.organizationId = organizationId;
    }
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    // Fetch transactions and total count in parallel
    const [transactions, totalCount] = await Promise.all([
      prismaClient.transaction.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: {
          [sortBy as string]: sortOrder,
        },
      }),
      prismaClient.transaction.count({ where }),
    ]);

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / Number(limit));

    // Return success response with transactions and pagination info
    res.status(200).json({
      status: 'success',
      data: {
        transactions: transactions.map(serializeTransaction),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalCount,
          pages: totalPages,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get transaction report summary
 * 
 * This endpoint generates a summary report of transactions for the authenticated
 * organization. The report includes total transactions, total donations, and
 * average donation amount. Results can be filtered by date range.
 * 
 * @param req - Express request object containing date filter parameters
 * @param res - Express response object
 * @param next - Express next function for error handling
 */
export const getTransactionReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.organization) {
      throw new AppError('Organization not found', 404);
    }

    const { startDate, endDate } = req.query;
    const organizationId = req.organization.id;

    // Build query filter
    const where: any = {};
    // Only filter by organizationId for non-admin users
    if (!req.organization.isAdmin) {
      where.organizationId = organizationId;
    }
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    // Get total transactions and aggregate donation amounts
    const [totalTransactions, aggregations] = await Promise.all([
      prismaClient.transaction.count({ where }),
      prismaClient.transaction.aggregate({
        where,
        _sum: {
          donationAmount: true,
        },
        _avg: {
          donationAmount: true,
        },
      }),
    ]);

    const totalDonations = aggregations?._sum?.donationAmount?.toString() || '0';
    const averageDonation = aggregations?._avg?.donationAmount?.toString() || '0';

    // Return success response with report data
    res.status(200).json({
      status: 'success',
      data: {
        totalTransactions,
        totalDonations,
        averageDonation,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update transaction metadata
 * 
 * This endpoint updates the metadata of a specific transaction.
 * Organizations can only update their own transactions, while admins can update any transaction.
 * Financial data (amounts) cannot be updated.
 * 
 * @param req - Express request object containing transaction ID in params and updates in body
 * @param res - Express response object
 * @param next - Express next function for error handling
 */
export const updateTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.organization) {
      throw new AppError('Organization not found', 404);
    }

    const { id } = req.params;
    const { metadata } = req.body;
    const organizationId = req.organization.id;

    // Check for attempts to update financial data
    const protectedFields = ['originalAmount', 'roundedAmount', 'donationAmount'];
    if (protectedFields.some(field => field in req.body)) {
      throw new AppError('Cannot update transaction amounts', 400);
    }

    // Find the transaction first to check authorization
    const transaction = await prismaClient.transaction.findUnique({
      where: { id }
    });

    if (!transaction) {
      throw new AppError('Transaction not found', 404);
    }

    // Check authorization - only allow if admin or same organization
    if (!req.organization.isAdmin && transaction.organizationId !== organizationId) {
      throw new AppError('Not authorized to update this transaction', 403);
    }

    // Update transaction
    const updatedTransaction = await prismaClient.transaction.update({
      where: { id },
      data: { metadata },
    });

    // Return success response
    res.status(200).json({
      status: 'success',
      data: {
        transaction: serializeTransaction(updatedTransaction),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete transaction by ID
 * 
 * This endpoint deletes a transaction by its ID.
 * Only admin organizations can access this endpoint.
 * 
 * @param req - Express request object containing transaction ID in params
 * @param res - Express response object
 * @param next - Express next function for error handling
 */
export const deleteTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Check if the requesting organization is an admin
    if (!req.organization?.isAdmin) {
      throw new AppError('Not authorized to delete transactions', 403);
    }

    // Check if the transaction exists
    const existingTransaction = await prismaClient.transaction.findUnique({
      where: { id }
    });

    if (!existingTransaction) {
      throw new AppError('Transaction not found', 404);
    }

    // Delete the transaction
    await prismaClient.transaction.delete({
      where: { id }
    });

    return res.status(200).json({
      status: 'success',
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}; 