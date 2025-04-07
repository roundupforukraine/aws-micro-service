import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

// Helper function to calculate round-up amount
const calculateRoundUp = (amount: number): number => {
  const nextPound = Math.ceil(amount);
  return Number((nextPound - amount).toFixed(2));
};

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

    const roundedAmount = Math.ceil(originalAmount);
    const donationAmount = calculateRoundUp(originalAmount);

    const transaction = await prisma.transaction.create({
      data: {
        organizationId,
        originalAmount,
        roundedAmount,
        donationAmount,
        metadata,
      },
    });

    res.status(201).json({
      status: 'success',
      data: {
        transaction,
      },
    });
  } catch (error) {
    next(error);
  }
};

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

    const transaction = await prisma.transaction.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!transaction) {
      throw new AppError('Transaction not found', 404);
    }

    res.status(200).json({
      status: 'success',
      data: {
        transaction,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const listTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.organization) {
      throw new AppError('Organization not found', 404);
    }
    
    const { page = 1, limit = 10, startDate, endDate } = req.query;
    const organizationId = req.organization.id;

    const where: any = { organizationId };
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.transaction.count({ where }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        transactions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

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

    const where: any = { organizationId };
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const [totalTransactions, totalDonations] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.aggregate({
        where,
        _sum: {
          donationAmount: true,
        },
      }),
    ]);

    const donationSum = totalDonations._sum.donationAmount || 0;
    const averageDonation = totalTransactions > 0
      ? Number(donationSum) / totalTransactions
      : 0;

    res.status(200).json({
      status: 'success',
      data: {
        totalTransactions,
        totalDonations: donationSum,
        averageDonation,
      },
    });
  } catch (error) {
    next(error);
  }
}; 