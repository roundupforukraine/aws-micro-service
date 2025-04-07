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
  roundedAmount: number;
  donationAmount: number;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateOrganizationArgs {
  data: Partial<Organization>;
}

interface FindUniqueOrganizationArgs {
  where: {
    id?: string;
    apiKey?: string;
  };
}

interface UpdateOrganizationArgs {
  where: {
    id: string;
  };
  data: Partial<Organization>;
}

interface CreateTransactionArgs {
  data: Partial<Transaction>;
}

const mockOrganization = {
  id: 'test-org-id',
  name: 'Test Organization',
  apiKey: 'test-api-key',
  isAdmin: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTransaction = {
  id: 'test-transaction-id',
  organizationId: 'test-org-id',
  originalAmount: 9.99,
  roundedAmount: 10.00,
  donationAmount: 0.01,
  metadata: { description: 'Test transaction' },
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const prismaTestClient = {
  organization: {
    create: jest.fn().mockImplementation((args: any) => Promise.resolve({ ...mockOrganization, ...args.data })),
    findUnique: jest.fn().mockImplementation((args: any) => {
      if (args.where.apiKey?.startsWith('test-api-key')) {
        return Promise.resolve(mockOrganization);
      }
      return Promise.resolve(null);
    }),
    update: jest.fn().mockImplementation((args: any) => Promise.resolve({ ...mockOrganization, ...args.data })),
    deleteMany: jest.fn().mockImplementation(() => Promise.resolve({ count: 1 })),
  },
  transaction: {
    create: jest.fn().mockImplementation((args: any) => Promise.resolve({ ...mockTransaction, ...args.data })),
    findFirst: jest.fn().mockImplementation(() => Promise.resolve(mockTransaction)),
    findMany: jest.fn().mockImplementation(() => Promise.resolve([mockTransaction])),
    count: jest.fn().mockImplementation(() => Promise.resolve(1)),
    aggregate: jest.fn().mockImplementation(() => Promise.resolve({
      _sum: {
        donationAmount: 0.01,
      },
    })),
  },
  $disconnect: jest.fn(),
} as unknown as PrismaClient;

// Set up default mock implementations
mockOrganizationCreate.mockImplementation(async (args: any) => {
  return {
    id: 'test-org-id',
    name: args.data.name,
    apiKey: args.data.apiKey || 'test-api-key',
    isAdmin: args.data.isAdmin || false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
});

mockOrganizationFindUnique.mockImplementation(async (args: any) => {
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

mockOrganizationUpdate.mockImplementation(async (args: any) => {
  return {
    id: args.where.id,
    name: args.data.name,
    apiKey: 'test-api-key',
    isAdmin: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
});

mockOrganizationDeleteMany.mockImplementation(async () => {
  return { count: 0 };
});

mockTransactionDeleteMany.mockImplementation(async () => {
  return { count: 0 };
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