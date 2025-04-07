import { PrismaClient, Prisma } from '@prisma/client';
import { jest } from '@jest/globals';
import dotenv from 'dotenv';

// Load environment variables from .env.test file
dotenv.config({ path: '.env.test' });

// Create mock functions for organization methods
const mockOrganizationCreate = jest.fn();
const mockOrganizationFindUnique = jest.fn();
const mockOrganizationUpdate = jest.fn();
const mockOrganizationDeleteMany = jest.fn();

// Create mock functions for transaction methods
const mockTransactionCreate = jest.fn();
const mockTransactionFindUnique = jest.fn();
const mockTransactionFindFirst = jest.fn();
const mockTransactionFindMany = jest.fn();
const mockTransactionCount = jest.fn();
const mockTransactionAggregate = jest.fn();
const mockTransactionDeleteMany = jest.fn();

// Define interfaces for our models
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
  originalAmount: Prisma.Decimal;
  roundedAmount: Prisma.Decimal;
  donationAmount: Prisma.Decimal;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Create mock organization data
const mockOrganization: Organization = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Test Organization',
  apiKey: 'test-api-key',
  isAdmin: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Create mock transaction data
const mockTransaction: Transaction = {
  id: '123e4567-e89b-12d3-a456-426614174001',
  organizationId: mockOrganization.id,
  originalAmount: new Prisma.Decimal(10.99),
  roundedAmount: new Prisma.Decimal(11.00),
  donationAmount: new Prisma.Decimal(0.01),
  metadata: { test: true },
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Create mock Prisma client
const prismaTestClient = {
  organization: {
    create: mockOrganizationCreate,
    findUnique: mockOrganizationFindUnique,
    update: mockOrganizationUpdate,
    deleteMany: mockOrganizationDeleteMany,
  },
  transaction: {
    create: mockTransactionCreate,
    findUnique: mockTransactionFindUnique,
    findFirst: mockTransactionFindFirst,
    findMany: mockTransactionFindMany,
    count: mockTransactionCount,
    aggregate: mockTransactionAggregate,
    deleteMany: mockTransactionDeleteMany,
  },
  $connect: jest.fn(() => Promise.resolve()),
  $disconnect: jest.fn(() => Promise.resolve()),
} as unknown as jest.Mocked<PrismaClient>;

// Set up default mock implementations
mockOrganizationCreate.mockImplementation(async (args: any) => ({
  ...mockOrganization,
  ...args.data,
}));

mockOrganizationFindUnique.mockImplementation(async (args: any) => {
  if (args.where.apiKey === mockOrganization.apiKey) {
    return mockOrganization;
  }
  return null;
});

mockOrganizationUpdate.mockImplementation(async (args: any) => ({
  ...mockOrganization,
  ...args.data,
}));

mockOrganizationDeleteMany.mockImplementation(async () => ({
  count: 1,
}));

// Set up default mock implementations for transaction methods
mockTransactionCreate.mockImplementation(async (args: any) => ({
  ...mockTransaction,
  ...args.data,
}));

mockTransactionFindUnique.mockImplementation(async (args: any) => {
  if (args.where.id === mockTransaction.id) {
    return mockTransaction;
  }
  return null;
});

mockTransactionFindFirst.mockImplementation(async () => mockTransaction);

mockTransactionFindMany.mockImplementation(async () => [mockTransaction]);

mockTransactionCount.mockImplementation(async () => 1);

mockTransactionAggregate.mockImplementation(async () => ({
  _sum: {
    donationAmount: new Prisma.Decimal(0.01),
  },
}));

mockTransactionDeleteMany.mockImplementation(async () => ({
  count: 1,
}));

// Export setup and teardown functions
export const setup = async () => {
  await prismaTestClient.transaction.deleteMany();
  await prismaTestClient.organization.deleteMany();
};

export const teardown = async () => {
  await prismaTestClient.$disconnect();
};

// Export the mock client and mock data for use in tests
export { prismaTestClient, mockOrganization, mockTransaction };

// Global test setup
beforeAll(() => {
  // Clear all mocks before each test suite
  jest.clearAllMocks();
});

// Global test teardown
afterAll(() => {
  // Clean up after all tests
  jest.resetAllMocks();
}); 