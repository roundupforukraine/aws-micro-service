import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from './errorHandler';

// Use mock client in test environment
const prisma = process.env.NODE_ENV === 'test' 
  ? require('../tests/setup').prismaTestClient 
  : new PrismaClient();

export const apiKeyAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const apiKey = req.header('x-api-key');

    if (!apiKey) {
      throw new AppError('API key is required', 401);
    }

    const organization = await prisma.organization.findUnique({
      where: { apiKey },
    });

    if (!organization) {
      throw new AppError('Invalid API key', 401);
    }

    // Add organization to request for use in routes
    req.organization = organization;
    next();
  } catch (error) {
    next(error);
  }
}; 