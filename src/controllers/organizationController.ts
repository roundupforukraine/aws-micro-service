import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

// Use mock client in test environment to avoid database interactions
const prisma = process.env.NODE_ENV === 'test' 
  ? require('../tests/setup').prismaTestClient 
  : new PrismaClient();

// Extend Error type to include Prisma-specific error codes
interface PrismaError extends Error {
  code?: string;
}

/**
 * Register a new organization
 * 
 * This endpoint is restricted to admin organizations only.
 * It creates a new organization with a generated API key.
 * 
 * @param req - Express request object containing organization name in body
 * @param res - Express response object
 * @param next - Express next function for error handling
 */
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

    // Create new organization with generated API key
    const organization = await prisma.organization.create({
      data: {
        name,
        apiKey: generateApiKey(),
      },
    });

    // Return success response with organization details
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

/**
 * Get organization details
 * 
 * This endpoint allows organizations to view their own details
 * or admin organizations to view any organization's details.
 * 
 * @param req - Express request object containing organization ID in params
 * @param res - Express response object
 * @param next - Express next function for error handling
 */
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

    // Find organization by ID
    const organization = await prisma.organization.findUnique({
      where: { id },
    });

    // Return 404 if organization not found
    if (!organization) {
      return next(new AppError('Organization not found', 404));
    }

    // Return success response with organization details
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

/**
 * Update organization details
 * 
 * This endpoint allows organizations to update their own details
 * or admin organizations to update any organization's details.
 * 
 * @param req - Express request object containing organization ID in params and updated name in body
 * @param res - Express response object
 * @param next - Express next function for error handling
 */
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

    // Update organization details
    const organization = await prisma.organization.update({
      where: { id },
      data: { name },
    });

    // Return success response with updated organization details
    res.status(200).json({
      status: 'success',
      data: {
        organization,
      },
    });
  } catch (error) {
    const prismaError = error as PrismaError;
    // Handle case where organization doesn't exist
    if (prismaError.code === 'P2025') {
      return next(new AppError('Organization not found', 404));
    }
    next(new AppError('Failed to update organization', 500));
  }
};

/**
 * Generate a unique API key for a new organization
 * 
 * @returns A unique API key string
 */
function generateApiKey(): string {
  return 'api-key-' + Math.random().toString(36).substring(2) + Date.now().toString(36);
} 