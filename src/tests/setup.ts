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
        private value: number;
        constructor(value: string | number) {
          this.value = Number(value);
        }
        toString(): string {
          return this.value.toFixed(2);
        }
        minus(other: Decimal): Decimal {
          return new Decimal(this.value - other.value);
        }
        plus(other: Decimal): Decimal {
          return new Decimal(this.value + other.value);
        }
        times(other: Decimal): Decimal {
          return new Decimal(this.value * other.value);
        }
        dividedBy(other: Decimal): Decimal {
          return new Decimal(this.value / other.value);
        }
        toNumber(): number {
          return this.value;
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
  organizationId: string;
  originalAmount: Prisma.Decimal;
  roundedAmount: Prisma.Decimal;
  donationAmount: Prisma.Decimal;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

// Create mock functions with proper Jest mock types
const mockCreate = jest.fn() as jest.Mock;
const mockFindUnique = jest.fn() as jest.Mock;
const mockUpdate = jest.fn() as jest.Mock;
const mockFindMany = jest.fn() as jest.Mock;
const mockCount = jest.fn() as jest.Mock;
const mockTransactionCreate = jest.fn() as jest.Mock;
const mockTransactionFindFirst = jest.fn() as jest.Mock;
const mockTransactionFindMany = jest.fn() as jest.Mock;
const mockTransactionCount = jest.fn() as jest.Mock;
const mockTransactionUpdate = jest.fn() as jest.Mock;
const mockTransactionAggregate = jest.fn() as jest.Mock;

const mockClient = {
  organization: {
    create: mockCreate,
    findUnique: mockFindUnique,
    update: mockUpdate,
    findMany: mockFindMany,
    count: mockCount,
  },
  transaction: {
    create: mockTransactionCreate,
    findFirst: mockTransactionFindFirst,
    findMany: mockTransactionFindMany,
    count: mockTransactionCount,
    update: mockTransactionUpdate,
    aggregate: mockTransactionAggregate,
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
} as unknown as PrismaClient;

export const prismaTestClient = mockClient;

// Initialize mock implementations
mockCreate.mockImplementation((data: any) => {
  return Promise.resolve({
    id: 'test-org-id',
    name: data.data.name,
    apiKey: 'test-api-key-' + Date.now(),
    isAdmin: data.data.isAdmin || false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
});

mockFindUnique.mockImplementation((data: any) => {
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
  if (data.where.id === 'non-existent-id') {
    return Promise.resolve(null);
  }
  return Promise.resolve({
    id: data.where.id || '1fc7e4e8-1258-495b-9fd0-44c45a5e17c7',
    name: data.where.id === 'test-org-id' ? 'Test Org for GET' : 'Test Organization',
    apiKey: data.where.apiKey || 'test-api-key',
    isAdmin: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
});

mockUpdate.mockImplementation((data: any) => {
  return Promise.resolve({
    id: data.where.id,
    name: data.data.name,
    apiKey: 'test-api-key',
    isAdmin: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
});

mockFindMany.mockImplementation((data: any) => {
  const orgs = [
    {
      id: 'test-org-id-1',
      name: 'Test Org 1',
      apiKey: 'test-api-key-1',
      isAdmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'test-org-id-2',
      name: 'Test Org 2',
      apiKey: 'test-api-key-2',
      isAdmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  if (data.where?.name?.contains) {
    return Promise.resolve(orgs.filter(org => org.name.includes(data.where.name.contains)));
  }

  return Promise.resolve(orgs);
});

mockCount.mockImplementation(() => Promise.resolve(2));

mockTransactionCreate.mockImplementation((data: any) => {
  return Promise.resolve({
    id: '1',
    organizationId: data.data.organizationId,
    originalAmount: new Prisma.Decimal(data.data.originalAmount),
    roundedAmount: new Prisma.Decimal(data.data.roundedAmount),
    donationAmount: new Prisma.Decimal(data.data.donationAmount),
    metadata: data.data.metadata,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
});

mockTransactionFindFirst.mockImplementation((data: any) => {
  if (data.where.id === 'non-existent-id') {
    return Promise.resolve(null);
  }
  return Promise.resolve({
    id: data.where.id,
    organizationId: '1fc7e4e8-1258-495b-9fd0-44c45a5e17c7',
    originalAmount: new Prisma.Decimal('15.75'),
    roundedAmount: new Prisma.Decimal('16.00'),
    donationAmount: new Prisma.Decimal('0.25'),
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  });
});

mockTransactionFindMany.mockImplementation(() => {
  return Promise.resolve([
    {
      id: '1',
      organizationId: '1fc7e4e8-1258-495b-9fd0-44c45a5e17c7',
      originalAmount: new Prisma.Decimal('15.75'),
      roundedAmount: new Prisma.Decimal('16.00'),
      donationAmount: new Prisma.Decimal('0.25'),
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      organizationId: '1fc7e4e8-1258-495b-9fd0-44c45a5e17c7',
      originalAmount: new Prisma.Decimal('25.50'),
      roundedAmount: new Prisma.Decimal('26.00'),
      donationAmount: new Prisma.Decimal('0.50'),
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
});

mockTransactionUpdate.mockImplementation((data: any) => {
  if (data.where.id === 'non-existent-id') {
    return Promise.resolve(null);
  }
  return Promise.resolve({
    id: data.where.id,
    organizationId: '1fc7e4e8-1258-495b-9fd0-44c45a5e17c7',
    originalAmount: new Prisma.Decimal('15.75'),
    roundedAmount: new Prisma.Decimal('16.00'),
    donationAmount: new Prisma.Decimal('0.25'),
    metadata: data.data.metadata,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
});

mockTransactionAggregate.mockImplementation(() => {
  return Promise.resolve({
    _count: { _all: 2 },
    _sum: { donationAmount: new Prisma.Decimal('0.75') },
    _avg: { donationAmount: new Prisma.Decimal('0.375') },
    _min: { donationAmount: new Prisma.Decimal('0.25') },
    _max: { donationAmount: new Prisma.Decimal('0.50') },
  });
});

// Function to create an admin organization for testing
export const createAdminOrg = async () => {
  return mockClient.organization.create({
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

// Add resetOrganizationCount function
export const resetOrganizationCount = () => {
  mockCount.mockReset();
  mockCount.mockImplementation(() => Promise.resolve(0));
}; 