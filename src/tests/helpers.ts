import { PrismaClient } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import { Organization } from '@prisma/client';
import { jest } from '@jest/globals';

const prisma = new PrismaClient();

// Create a test organization
export const createTestOrganization = async (prisma: PrismaClient, data?: any): Promise<Organization> => {
  return prisma.organization.create({
    data: {
      name: data?.name || 'Test Organization',
      apiKey: data?.apiKey || 'test-api-key-' + Date.now(),
      ...data,
    },
  });
};

// Create a test transaction
export const createTestTransaction = async (prisma: PrismaClient, organizationId: string, data?: any) => {
  return prisma.transaction.create({
    data: {
      organizationId,
      originalAmount: data?.originalAmount || 10.50,
      roundedAmount: data?.roundedAmount || 11.00,
      donationAmount: data?.donationAmount || 0.50,
      metadata: data?.metadata || { test: true },
      ...data,
    },
  });
};

export type MockResponse = {
  status: jest.Mock;
  json: jest.Mock;
  send: jest.Mock;
} & Partial<Response>;

export const createMockReq = (overrides = {}): Partial<Request> => {
  return {
    body: {},
    query: {},
    params: {},
    headers: {},
    ...overrides,
  };
};

export const createMockRes = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  return res as MockResponse;
};

export const createMockNext = (): jest.Mock => {
  return jest.fn();
};

// For backward compatibility
export const mockRequest = createMockReq;
export const mockResponse = createMockRes;
export const mockNext = createMockNext; 