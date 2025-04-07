import { PrismaClient, Prisma } from '@prisma/client';
import { jest } from '@jest/globals';

// Mock Prisma namespace for Decimal
jest.mock('@prisma/client', () => {
  const originalModule = jest.requireActual('@prisma/client') as typeof import('@prisma/client');
  return {
    ...originalModule,
    Prisma: {
      ...originalModule.Prisma,
      Decimal: class Decimal {
        private value: string | number;
        constructor(value: string | number) {
          this.value = value;
          return this;
        }
        toString(): string {
          return String(this.value);
        }
      },
    },
  };
});

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
export const prismaTestClient = {
  organization: {
    create: jest.fn().mockImplementation((data: any) => {
      return Promise.resolve({
        id: 'test-org-id',
        name: data.data.name,
        apiKey: data.data.apiKey || 'test-api-key',
        isAdmin: data.data.isAdmin || false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }),
    findUnique: jest.fn().mockImplementation((data: any) => {
      if (data.where.apiKey === 'test-admin-key') {
        return Promise.resolve({
          id: 'admin-org-id',
          name: 'Admin Organization',
          apiKey: 'test-admin-key',
          isAdmin: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      return Promise.resolve({
        id: 'test-org-id',
        name: 'Test Organization',
        apiKey: data.where.apiKey,
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }),
    update: jest.fn().mockImplementation((data: any) => {
      return Promise.resolve({
        id: data.where.id,
        name: data.data.name,
        apiKey: 'test-api-key',
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }),
    count: jest.fn().mockImplementation(() => Promise.resolve(1)),
  },
  transaction: {
    create: jest.fn().mockImplementation((data: any) => {
      return Promise.resolve({
        id: 'test-transaction-id',
        organizationId: data.data.organizationId,
        originalAmount: new Prisma.Decimal(data.data.originalAmount),
        roundedAmount: new Prisma.Decimal(data.data.roundedAmount),
        donationAmount: new Prisma.Decimal(data.data.donationAmount),
        metadata: data.data.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }),
    findUnique: jest.fn().mockImplementation((data: any) => {
      return Promise.resolve({
        id: data.where.id,
        organizationId: 'test-org-id',
        originalAmount: new Prisma.Decimal('15.75'),
        roundedAmount: new Prisma.Decimal('16.00'),
        donationAmount: new Prisma.Decimal('0.25'),
        metadata: { description: 'Test transaction' },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }),
    findFirst: jest.fn().mockImplementation((data: any) => {
      return Promise.resolve({
        id: data.where.id,
        organizationId: data.where.organizationId || 'test-org-id',
        originalAmount: new Prisma.Decimal('15.75'),
        roundedAmount: new Prisma.Decimal('16.00'),
        donationAmount: new Prisma.Decimal('0.25'),
        metadata: { description: 'Test transaction' },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }),
    findMany: jest.fn().mockImplementation(() => Promise.resolve([])),
    count: jest.fn().mockImplementation(() => Promise.resolve(1)),
    update: jest.fn().mockImplementation((data: any) => {
      return Promise.resolve({
        id: data.where.id,
        organizationId: 'test-org-id',
        originalAmount: new Prisma.Decimal('15.75'),
        roundedAmount: new Prisma.Decimal('16.00'),
        donationAmount: new Prisma.Decimal('0.25'),
        metadata: data.data.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }),
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
    findFirst: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
  };
};

// Function to create an admin organization for testing
export const createAdminOrg = async () => {
  return prismaTestClient.organization.create({
    data: {
      name: 'Admin Organization',
      apiKey: 'test-admin-key',
      isAdmin: true,
    },
  });
};

// Setup function for tests
export const setup = async () => {
  // Create admin organization first
  await createAdminOrg();
};

// Teardown function for tests
export const teardown = async () => {
  jest.clearAllMocks();
}; 