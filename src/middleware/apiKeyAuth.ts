import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from './errorHandler';

// Use mock client in test environment to avoid database interactions
const prismaClient = process.env.NODE_ENV === 'test' 
  ? require('../tests/setup').prismaTestClient 
  : new PrismaClient();

/**
 * API Key Authentication Middleware
 * 
 * This middleware authenticates requests using an API key provided in the
 * 'x-api-key' header. It verifies the API key against the database and
 * attaches the associated organization to the request object for use in
 * subsequent middleware and route handlers.
 * 
 * The middleware:
 * 1. Extracts the API key from the request header
 * 2. Validates the API key against the database
 * 3. Attaches the organization to the request object
 * 4. Proceeds to the next middleware or throws an error
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function for error handling
 */
export const apiKeyAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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