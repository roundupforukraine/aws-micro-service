import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from './errorHandler';
import { prisma } from '../config/database';

// Use mock client in test environment to avoid database interactions
const prismaClient = process.env.NODE_ENV === 'test' 
  ? require('../tests/setup').prismaTestClient 
  : prisma;

/**
 * Admin Authentication Middleware
 * 
 * This middleware authenticates requests using an admin API key provided in the
 * 'x-api-key' header. It verifies the API key against organizations with isAdmin=true.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function for error handling
 */
export const adminAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract API key from request header
    const apiKey = req.header('x-api-key');

    // Return 401 if API key is missing
    if (!apiKey) {
      throw new AppError('API key is required', 401);
    }

    // Find admin organization by API key
    const adminOrg = await prismaClient.organization.findUnique({
      where: { apiKey },
    });

    // Return 403 if API key is not an admin key
    if (!adminOrg || !adminOrg.isAdmin) {
      throw new AppError('Invalid admin API key', 403);
    }

    // Attach admin organization to request for use in routes
    req.organization = adminOrg;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * API Key Authentication Middleware
 * 
 * This middleware authenticates requests using an organization API key provided in the
 * 'x-api-key' header. It verifies the API key against the Organization table.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function for error handling
 */
export const apiKeyAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract API key from request header
    const apiKey = req.header('x-api-key');

    // Return 401 if API key is missing
    if (!apiKey) {
      throw new AppError('API key is required', 401);
    }

    // Find organization by API key
    const organization = await prismaClient.organization.findUnique({
      where: { apiKey },
    });

    // Return 401 if API key is invalid
    if (!organization) {
      throw new AppError('Invalid API key', 401);
    }

    // Attach organization to request for use in routes
    req.organization = organization;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Combined Authentication Middleware
 * 
 * This middleware authenticates requests using either an admin API key or an organization API key.
 * It first checks if the API key belongs to an admin organization, and if not, checks if it belongs to a regular organization.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function for error handling
 */
export const combinedAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract API key from request header
    const apiKey = req.header('x-api-key');

    // Return 401 if API key is missing
    if (!apiKey) {
      throw new AppError('API key is required', 401);
    }

    // Find organization by API key
    const organization = await prismaClient.organization.findUnique({
      where: { apiKey },
    });

    // Return 401 if API key is invalid
    if (!organization) {
      throw new AppError('Invalid API key', 401);
    }

    // Attach organization to request for use in routes
    req.organization = organization;
    next();
  } catch (error) {
    next(error);
  }
}; 