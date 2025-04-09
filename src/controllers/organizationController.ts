import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { prisma } from '../config/database';
import crypto from 'crypto';
import { generateApiKey } from '../utils/apiKey';
import { SecretsManager } from '@aws-sdk/client-secrets-manager';

const secretsManager = new SecretsManager({ region: process.env.AWS_REGION || 'ap-southeast-1' });

// Use mock client in test environment to avoid database interactions
const prismaClient = process.env.NODE_ENV === 'test' 
  ? require('../tests/setup').prismaTestClient 
  : prisma;

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
export const registerOrganization = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if the requesting organization is an admin
    if (!req.organization?.isAdmin) {
      throw new AppError('Only administrators can register new organizations', 403);
    }

    const { name } = req.body;

    if (!name) {
      throw new AppError('Organization name is required', 400);
    }

    // Generate a unique API key for the organization
    const apiKey = generateApiKey();

    const organization = await prismaClient.organization.create({
      data: {
        name,
        apiKey,
        isAdmin: false // Organizations are never admin by default
      }
    });

    return res.status(201).json({
      status: 'success',
      data: {
        organization
      }
    });
  } catch (error) {
    // Handle Prisma unique constraint violations
    const prismaError = error as PrismaError;
    if (prismaError.code === 'P2002') {
      next(new AppError('An organization with this name already exists', 400));
      return;
    }
    next(error);
  }
};

/**
 * Get organization details by ID
 * 
 * This endpoint retrieves an organization by its ID.
 * It can be accessed by the organization itself or by an admin organization.
 * 
 * @param req - Express request object containing organization ID in params
 * @param res - Express response object
 * @param next - Express next function for error handling
 */
export const getOrganization = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.organization) {
      throw new AppError('Invalid API key', 401);
    }

    const { id } = req.params;

    // Find organization
    const organization = await prismaClient.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      throw new AppError('Organization not found', 404);
    }

    // Check authorization - only allow if admin or same organization
    if (!req.organization.isAdmin && organization.id !== req.organization.id) {
      throw new AppError('Not authorized to access this organization', 403);
    }

    res.status(200).json({
      status: 'success',
      data: {
        organization,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update organization details
 * 
 * This endpoint updates an organization's details.
 * It can be accessed by the organization itself or by an admin organization.
 * 
 * @param req - Express request object containing organization ID in params and updates in body
 * @param res - Express response object
 * @param next - Express next function for error handling
 */
export const updateOrganization = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.organization) {
      throw new AppError('Invalid API key', 401);
    }

    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      throw new AppError('Organization name is required', 400);
    }

    // Find organization first
    const organization = await prismaClient.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      throw new AppError('Organization not found', 404);
    }

    // Check authorization - only allow if admin or same organization
    if (!req.organization.isAdmin && organization.id !== req.organization.id) {
      throw new AppError('Not authorized to update this organization', 403);
    }

    // Update organization
    const updatedOrganization = await prismaClient.organization.update({
      where: { id },
      data: { name },
    });

    res.status(200).json({
      status: 'success',
      data: {
        organization: updatedOrganization,
      },
    });
  } catch (error) {
    // Handle Prisma unique constraint violations
    const prismaError = error as PrismaError;
    if (prismaError.code === 'P2002') {
      next(new AppError('An organization with this name already exists', 400));
      return;
    }
    next(error);
  }
};

/**
 * List organizations with pagination and filtering
 * 
 * This endpoint retrieves a paginated list of organizations.
 * Only admin organizations can access this endpoint.
 * 
 * @param req - Express request object containing pagination and filter parameters
 * @param res - Express response object
 * @param next - Express next function for error handling
 */
export const listOrganizations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.organization) {
      throw new AppError('Invalid API key', 401);
    }

    // Check if user is admin
    if (!req.organization.isAdmin) {
      throw new AppError('Not authorized to list organizations', 403);
    }

    const { page = 1, limit = 10, search, sortBy = 'name', sortOrder = 'asc' } = req.query;

    // Validate sort field
    const allowedSortFields = ['name', 'createdAt', 'updatedAt'];
    if (!allowedSortFields.includes(sortBy as string)) {
      throw new AppError('Invalid sort field', 400);
    }

    // Build query filter
    const where: any = {};
    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive'
      };
    }

    // Fetch organizations and total count in parallel
    const [organizations, totalCount] = await Promise.all([
      prismaClient.organization.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: {
          [sortBy as string]: sortOrder
        }
      }),
      prismaClient.organization.count({ where })
    ]);

    return res.status(200).json({
      status: 'success',
      data: {
        organizations,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / Number(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete organization by ID
 * 
 * This endpoint deletes an organization by its ID.
 * Only admin organizations can access this endpoint.
 * 
 * @param req - Express request object containing organization ID in params
 * @param res - Express response object
 * @param next - Express next function for error handling
 */
export const deleteOrganization = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if the requesting organization is an admin
    if (!req.organization?.isAdmin) {
      throw new AppError('Not authorized to delete organizations', 403);
    }

    // Check if the organization exists
    const existingOrg = await prismaClient.organization.findUnique({
      where: { id },
      include: {
        transactions: true
      }
    });

    if (!existingOrg) {
      throw new AppError('Organization not found', 404);
    }

    // Delete the organization and all its transactions in a transaction
    await prismaClient.$transaction(async (tx: typeof prismaClient) => {
      // First delete all transactions
      await tx.transaction.deleteMany({
        where: { organizationId: id }
      });

      // Then delete the organization
      await tx.organization.delete({
        where: { id }
      });
    });

    return res.status(200).json({
      status: 'success',
      message: 'Organization deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Initialize admin organization
 * 
 * This endpoint creates the initial admin organization if it doesn't exist.
 * It's meant to be called only once during system setup.
 * Requires an initialization key that matches the one stored in AWS Secrets Manager.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function for error handling
 */
export const initializeAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { initKey } = req.body;

    // Get the expected init key from Secrets Manager
    let secretResponse;
    try {
      secretResponse = await secretsManager.getSecretValue({
        SecretId: 'aws-micro-service/init-key'
      });
    } catch (error) {
      throw error;
    }
    
    const expectedInitKey = secretResponse.SecretString;

    if (!initKey || !expectedInitKey || initKey !== expectedInitKey) {
      throw new AppError('Invalid initialization key', 401);
    }

    // Check if admin organization already exists
    const existingAdmin = await prismaClient.organization.findFirst({
      where: { isAdmin: true }
    });

    if (existingAdmin) {
      throw new AppError('Admin organization already exists', 400);
    }

    // Generate a unique API key for the admin organization
    const apiKey = 'admin-key-' + crypto.randomBytes(16).toString('hex');

    // Create the admin organization
    let adminOrg;
    try {
      adminOrg = await prismaClient.organization.create({
        data: {
          name: 'Admin Organization',
          apiKey,
          isAdmin: true
        }
      });
    } catch (error) {
      throw error;
    }

    // Store the admin API key in Secrets Manager for backup
    try {
      await secretsManager.putSecretValue({
        SecretId: 'aws-micro-service/admin-api-key',
        SecretString: apiKey
      });
    } catch (error) {
      // Don't throw here as the admin org is already created
      // but log the error for monitoring
      next(error);
    }

    return res.status(201).json({
      status: 'success',
      data: {
        organization: adminOrg,
        message: 'Admin organization created successfully. Please save the API key as it won\'t be shown again.'
      }
    });
  } catch (error) {
    next(error);
  }
};