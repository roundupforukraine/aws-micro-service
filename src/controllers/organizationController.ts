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
    console.log('[initializeAdmin] Request received', { body: req.body });
    const { initKey } = req.body;

    // Get the expected init key from Secrets Manager
    console.log('[initializeAdmin] Attempting to get init key from Secrets Manager');
    let secretResponse;
    try {
      secretResponse = await secretsManager.getSecretValue({
        SecretId: 'aws-micro-service/init-key'
      });
      console.log('[initializeAdmin] Successfully retrieved init key from Secrets Manager');
    } catch (error) {
      console.error('[initializeAdmin] Failed to get init key from Secrets Manager:', error);
      throw error;
    }
    
    const expectedInitKey = secretResponse.SecretString;

    console.log('[initializeAdmin] Validating init key', { 
      receivedKeyLength: initKey?.length, 
      expectedKeyLength: expectedInitKey?.length,
      matches: initKey === expectedInitKey 
    });

    if (!initKey || !expectedInitKey || initKey !== expectedInitKey) {
      console.log('[initializeAdmin] Invalid initialization key provided');
      throw new AppError('Invalid initialization key', 401);
    }

    // Check if admin organization already exists
    console.log('[initializeAdmin] Checking for existing admin');
    const existingAdmin = await prismaClient.organization.findFirst({
      where: { isAdmin: true }
    });
    console.log('[initializeAdmin] Admin check result:', { exists: !!existingAdmin });

    if (existingAdmin) {
      console.log('[initializeAdmin] Admin organization already exists');
      throw new AppError('Admin organization already exists', 400);
    }

    // Generate a unique API key for the admin organization
    const apiKey = 'admin-key-' + crypto.randomBytes(16).toString('hex');

    // Create the admin organization
    console.log('[initializeAdmin] Creating admin organization');
    let adminOrg;
    try {
      adminOrg = await prismaClient.organization.create({
        data: {
          name: 'Admin Organization',
          apiKey,
          isAdmin: true
        }
      });
      console.log('[initializeAdmin] Successfully created admin organization');
    } catch (error) {
      console.error('[initializeAdmin] Failed to create admin organization:', error);
      throw error;
    }

    // Store the admin API key in Secrets Manager for backup
    console.log('[initializeAdmin] Storing admin API key in Secrets Manager');
    try {
      await secretsManager.putSecretValue({
        SecretId: 'aws-micro-service/admin-api-key',
        SecretString: apiKey
      });
      console.log('[initializeAdmin] Successfully stored admin API key');
    } catch (error) {
      console.error('[initializeAdmin] Failed to store admin API key:', error);
      // Don't throw here as the admin org is already created
      // but log the error for monitoring
    }

    return res.status(201).json({
      status: 'success',
      data: {
        organization: adminOrg,
        message: 'Admin organization created successfully. Please save the API key as it won\'t be shown again.'
      }
    });
  } catch (error) {
    console.error('[initializeAdmin] Error in initialization process:', error);
    next(error);
  }
}; 