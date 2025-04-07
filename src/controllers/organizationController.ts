import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

// Use mock client in test environment
const prisma = process.env.NODE_ENV === 'test' 
  ? require('../tests/setup').prismaTestClient 
  : new PrismaClient();

interface PrismaError extends Error {
  code?: string;
}

export const registerOrganization = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name } = req.body;

    // Check if the authenticated user has admin privileges
    if (!req.organization?.isAdmin) {
      return next(new AppError('Only administrators can register new organizations', 403));
    }

    const organization = await prisma.organization.create({
      data: {
        name,
        apiKey: generateApiKey(),
      },
    });

    res.status(201).json({
      status: 'success',
      data: {
        organization: {
          id: organization.id,
          name: organization.name,
          apiKey: organization.apiKey,
        },
      },
    });
  } catch (error) {
    next(new AppError('Failed to create organization', 500));
  }
};

export const getOrganization = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Only allow access to own organization unless admin
    if (!req.organization?.isAdmin && req.organization?.id !== id) {
      return next(new AppError('Not authorized to access this organization', 403));
    }

    const organization = await prisma.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      return next(new AppError('Organization not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        organization,
      },
    });
  } catch (error) {
    next(new AppError('Failed to get organization', 500));
  }
};

export const updateOrganization = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Only allow access to own organization unless admin
    if (!req.organization?.isAdmin && req.organization?.id !== id) {
      return next(new AppError('Not authorized to update this organization', 403));
    }

    const organization = await prisma.organization.update({
      where: { id },
      data: { name },
    });

    res.status(200).json({
      status: 'success',
      data: {
        organization,
      },
    });
  } catch (error) {
    const prismaError = error as PrismaError;
    if (prismaError.code === 'P2025') {
      return next(new AppError('Organization not found', 404));
    }
    next(new AppError('Failed to update organization', 500));
  }
};

function generateApiKey(): string {
  return 'api-key-' + Math.random().toString(36).substring(2) + Date.now().toString(36);
} 