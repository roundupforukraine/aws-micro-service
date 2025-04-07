import { PrismaClient } from '@prisma/client';
import { jest } from '@jest/globals';
import dotenv from 'dotenv';

// Load environment variables from .env.test file
dotenv.config({ path: '.env.test' });

// Define interfaces for our mock types
export interface Organization {
  id: string;
  name: string;
  apiKey: string;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  organizationId: string;
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  convertedCurrency: string;
  exchangeRate: number;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Create mock PrismaClient with proper typing
const mockOrganization = {
  create: jest.fn(),
  findUnique: jest.fn(),
  update: jest.fn(),
};

const mockTransaction = {
  create: jest.fn(),
  findFirst: jest.fn(),
  findMany: jest.fn(),
  count: jest.fn(),
  aggregate: jest.fn(),
};

export const prismaTestClient = {
  organization: mockOrganization,
  transaction: mockTransaction,
  $connect: jest.fn(),
  $disconnect: jest.fn(),
} as unknown as PrismaClient;

// Set up default mock implementations
mockOrganization.create.mockImplementation(async (args: any) => {
  return {
    id: 'test-org-id',
    name: args.data.name,
    apiKey: args.data.apiKey || 'test-api-key',
    isAdmin: args.data.isAdmin || false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
});

mockOrganization.findUnique.mockImplementation(async (args: any) => {
  if (args.where.apiKey?.startsWith('test-api-key-')) {
    return {
      id: 'test-org-id',
      name: 'Test Organization',
      apiKey: args.where.apiKey,
      isAdmin: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  return null;
});

mockOrganization.update.mockImplementation(async (args: any) => {
  return {
    id: args.where.id,
    name: args.data.name,
    apiKey: 'test-api-key',
    isAdmin: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
});

// Set up global test configuration
beforeAll(() => {
  jest.clearAllMocks();
});

afterAll(async () => {
  await prismaTestClient.$disconnect();
});

// Global setup
beforeAll(async () => {
  // Any global setup needed before running tests
  await prismaTestClient.transaction.deleteMany();
  await prismaTestClient.organization.deleteMany();
});

// Global teardown
afterAll(async () => {
  // Any global cleanup needed after running tests
  await prismaTestClient.$disconnect();
});

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Global setup function
export const setup = async () => {
  // Clean up the database before tests
  await prismaTestClient.transaction.deleteMany();
  await prismaTestClient.organization.deleteMany();
};

// Global teardown function
export const teardown = async () => {
  // Close the Prisma client connection
  await prismaTestClient.$disconnect();
}; 