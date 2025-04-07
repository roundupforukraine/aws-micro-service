import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { prisma } from '../config/database';
import { generateApiKey } from '../utils/apiKey';

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
export const registerOrganization = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        status: 'fail',
        message: 'Organization name is required'
      });
    }

    // Generate a unique API key for the organization
    const apiKey = generateApiKey();

    const organization = await prisma.organization.create({
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
      return res.status(400).json({
        status: 'fail',
        message: 'An organization with this name already exists'
      });
    }

    return res.status(500).json({
      status: 'error',
      message: 'Failed to create organization'
    });
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
export const getOrganization = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if the requesting organization is the same as the requested organization
    // or if the requesting organization is an admin
    if (req.organization.id !== id && !req.organization.isAdmin) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to access this organization'
      });
    }

    const organization = await prisma.organization.findUnique({
      where: { id }
    });

    if (!organization) {
      return res.status(404).json({
        status: 'fail',
        message: 'Organization not found'
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        organization
      }
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve organization'
    });
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
export const updateOrganization = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Check if the requesting organization is the same as the requested organization
    // or if the requesting organization is an admin
    if (req.organization.id !== id && !req.organization.isAdmin) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to update this organization'
      });
    }

    // Prevent changing isAdmin status
    const organization = await prisma.organization.update({
      where: { id },
      data: { name }
    });

    return res.status(200).json({
      status: 'success',
      data: {
        organization
      }
    });
  } catch (error) {
    // Handle Prisma unique constraint violations
    const prismaError = error as PrismaError;
    if (prismaError.code === 'P2002') {
      return res.status(400).json({
        status: 'fail',
        message: 'An organization with this name already exists'
      });
    }

    // Handle Prisma record not found
    if (prismaError.code === 'P2025') {
      return res.status(404).json({
        status: 'fail',
        message: 'Organization not found'
      });
    }

    return res.status(500).json({
      status: 'error',
      message: 'Failed to update organization'
    });
  }
}; 