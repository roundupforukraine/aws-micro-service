import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

// Use mock client in test environment to avoid database interactions
const prismaClient = process.env.NODE_ENV === 'test' 
  ? require('../tests/setup').prismaTestClient 
  : new PrismaClient();

export const adminAuth = async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      status: 'fail',
      message: 'API key is required'
    });
  }

  try {
    const admin = await prismaClient.admin.findUnique({
      where: {
        apiKey: apiKey as string
      }
    });

    if (!admin) {
      return res.status(403).json({
        status: 'fail',
        message: 'Invalid admin API key'
      });
    }

    // Add admin info to request for later use
    req.admin = admin;
    next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error during admin authentication'
    });
  }
}; 