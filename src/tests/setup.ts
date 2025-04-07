import { PrismaClient, Prisma } from '@prisma/client';
import { jest } from '@jest/globals';

// Define Organization interface for testing
export interface Organization {
  id: string;
  name: string;
  apiKey: string;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Define Transaction interface for testing
export interface Transaction {
  id: string;
  originalAmount: Prisma.Decimal;
  roundedAmount: Prisma.Decimal;
  donationAmount: Prisma.Decimal;
  organizationId: string;
  metadata: { description: string };
  createdAt: Date;
  updatedAt: Date;
}

// Track number of organizations for count mock
let organizationCount = 0;

// Function to reset organization count
export const resetOrganizationCount = () => {
  organizationCount = 0;
};

// Mock Prisma client for testing
const prismaTestClient = {
  organization: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  transaction: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
} as unknown as PrismaClient & {
  organization: {
    create: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
  };
  transaction: {
    create: jest.Mock;
    findUnique: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
  };
};

// Set up default mock implementations
prismaTestClient.organization.create.mockImplementation((data: any) => {
  organizationCount++;
  return Promise.resolve({
    id: 'test-org-id',
    name: data.data.name,
    apiKey: data.data.apiKey,
    isAdmin: data.data.isAdmin,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
});

prismaTestClient.organization.findUnique.mockImplementation((data: any) => Promise.resolve({
  id: 'test-org-id',
  name: 'Test Organization',
  apiKey: data.where.apiKey,
  isAdmin: data.where.apiKey === 'test-api-key-admin',
  createdAt: new Date(),
  updatedAt: new Date(),
}));

prismaTestClient.organization.update.mockImplementation((data: any) => Promise.resolve({
  id: data.where.id,
  name: data.data.name,
  apiKey: 'test-api-key',
  isAdmin: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}));

prismaTestClient.organization.count.mockImplementation(() => Promise.resolve(organizationCount));

prismaTestClient.transaction.create.mockImplementation((data: any) => Promise.resolve({
  id: 'test-transaction-id',
  originalAmount: new Prisma.Decimal(data.data.originalAmount),
  roundedAmount: new Prisma.Decimal(data.data.roundedAmount),
  donationAmount: new Prisma.Decimal(data.data.donationAmount),
  organizationId: data.data.organizationId,
  metadata: data.data.metadata,
  createdAt: new Date(),
  updatedAt: new Date(),
}));

prismaTestClient.transaction.findUnique.mockImplementation((data: any) => Promise.resolve({
  id: 'test-transaction-id',
  originalAmount: new Prisma.Decimal('15.75'),
  roundedAmount: new Prisma.Decimal('16.00'),
  donationAmount: new Prisma.Decimal('0.25'),
  organizationId: data.where.id,
  metadata: { description: 'Test transaction' },
  createdAt: new Date(),
  updatedAt: new Date(),
}));

prismaTestClient.transaction.findMany.mockImplementation(() => Promise.resolve([
  {
    id: 'test-transaction-id',
    originalAmount: new Prisma.Decimal('15.75'),
    roundedAmount: new Prisma.Decimal('16.00'),
    donationAmount: new Prisma.Decimal('0.25'),
    organizationId: 'test-org-id',
    metadata: { description: 'Test transaction' },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]));

prismaTestClient.transaction.count.mockImplementation(() => Promise.resolve(1));

// Test lifecycle management functions
export const setup = async () => {
  // Clear all mocks before each test suite
  jest.clearAllMocks();
  await prismaTestClient.$connect();
};

export const teardown = async () => {
  // Clean up after all tests
  jest.resetAllMocks();
  await prismaTestClient.$disconnect();
};

export { prismaTestClient }; 