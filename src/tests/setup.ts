import { PrismaClient, Organization, Transaction, Prisma } from '@prisma/client';
import { jest } from '@jest/globals';
import { AppError } from '../middleware/errorHandler';

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

// Export types for use in tests
export { Organization, Transaction };

type DeepMockProxy<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? jest.Mock
    : T[K] extends object
    ? DeepMockProxy<T[K]>
    : T[K];
};

// Store for test data
const organizationStore = new Map<string, Organization>();
const transactionStore = new Map<string, Transaction>();

// Create a type-safe mock client
export const prismaTestClient = {
  organization: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    deleteMany: jest.fn(),
  },
  transaction: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    aggregate: jest.fn(),
    deleteMany: jest.fn(),
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
} as unknown as DeepMockProxy<PrismaClient>;

// Initialize mock implementations
prismaTestClient.organization.create.mockImplementation((data: any) => {
  const org = {
    id: data.data.isAdmin ? 'admin-org-id' : '1fc7e4e8-1258-495b-9fd0-44c45a5e17c7',
    name: data.data.name,
    apiKey: data.data.isAdmin ? 'test-admin-key' : 'test-api-key',
    isAdmin: data.data.isAdmin ?? false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return Promise.resolve(org);
});

prismaTestClient.organization.findUnique.mockImplementation((data: any) => {
  // Handle admin organization lookup by API key
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
  
  // Handle test organization lookup by API key
  if (data.where.apiKey === 'test-api-key') {
    return Promise.resolve({
      id: '1fc7e4e8-1258-495b-9fd0-44c45a5e17c7',
      name: 'Test Org for GET',
      apiKey: 'test-api-key',
      isAdmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Handle other organization lookup by API key
  if (data.where.apiKey === 'other-api-key') {
    return Promise.resolve({
      id: 'other-org-id',
      name: 'Other Organization',
      apiKey: 'other-api-key',
      isAdmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  
  // Handle test organization lookup by ID
  if (data.where.id === '1fc7e4e8-1258-495b-9fd0-44c45a5e17c7') {
    return Promise.resolve({
      id: '1fc7e4e8-1258-495b-9fd0-44c45a5e17c7',
      name: 'Test Org for GET',
      apiKey: 'test-api-key',
      isAdmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Handle admin organization lookup by ID
  if (data.where.id === 'admin-org-id') {
    return Promise.resolve({
      id: 'admin-org-id',
      name: 'Admin Organization',
      apiKey: 'test-admin-key',
      isAdmin: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Handle test organization lookup by ID for update tests
  if (data.where.id === 'test-id') {
    return Promise.resolve({
      id: 'test-id',
      name: 'Test Organization',
      apiKey: 'test-api-key',
      isAdmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Handle other organization lookup by ID
  if (data.where.id === 'other-org-id') {
    return Promise.resolve({
      id: 'other-org-id',
      name: 'Other Organization',
      apiKey: 'other-api-key',
      isAdmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Handle invalid API key
  if (data.where.apiKey === 'invalid-api-key') {
    return Promise.resolve(null);
  }
  
  return Promise.resolve(null);
});

prismaTestClient.organization.update.mockImplementation((data: any) => {
  // Check if organization exists and belongs to the requesting organization
  const org = prismaTestClient.organization.findUnique({ where: { id: data.where.id } }) as Promise<Organization>;
  if (!org) {
    throw new AppError('Organization not found', 404);
  }

  // If not admin and trying to update another organization
  if (data.where.organizationId && data.where.organizationId !== (org as any).id) {
    throw new AppError('Not authorized to update this organization', 403);
  }

  return Promise.resolve({
    id: data.where.id,
    name: data.data.name,
    apiKey: 'test-api-key',
    isAdmin: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
});

prismaTestClient.organization.findMany.mockImplementation((data: any) => {
  // Check if requester is admin
  const requester = prismaTestClient.organization.findUnique({ 
    where: { apiKey: data.where?.apiKey } 
  }) as Promise<Organization>;
  
  if (!(requester as any)?.isAdmin) {
    throw new AppError('Not authorized to list organizations', 403);
  }

  // If there's a search filter, return filtered results
  if (data.where?.name?.contains) {
    const searchTerm = data.where.name.contains;
    if (searchTerm === 'Test Org 1') {
      return Promise.resolve([{
        id: '1',
        name: 'Test Org 1',
        apiKey: 'test-api-key-1',
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }]);
    }
  }

  // Default response with multiple organizations for sorting tests
  return Promise.resolve([
    {
      id: '1',
      name: 'Test Org 1',
      apiKey: 'test-api-key-1',
      isAdmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      name: 'Test Org 2',
      apiKey: 'test-api-key-2',
      isAdmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  ]);
});

prismaTestClient.transaction.create.mockImplementation((data: any) => {
  const transaction = {
    id: data.data.id || 'test-transaction-id',
    organizationId: data.data.organizationId,
    originalAmount: new Prisma.Decimal(data.data.originalAmount),
    roundedAmount: new Prisma.Decimal(data.data.roundedAmount),
    donationAmount: new Prisma.Decimal(data.data.donationAmount),
    metadata: data.data.metadata || {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  transactionStore.set(transaction.id, transaction);
  return Promise.resolve(transaction);
});

prismaTestClient.transaction.findFirst.mockImplementation((data: any) => {
  if (data.where.id === 'non-existent-id') {
    return Promise.resolve(null);
  }

  // Find transaction by ID
  const transaction = transactionStore.get(data.where.id);
  if (!transaction) {
    return Promise.resolve(null);
  }

  // If organizationId is specified, check if it matches
  if (data.where.organizationId && transaction.organizationId !== data.where.organizationId) {
    return Promise.resolve(null);
  }

  return Promise.resolve(transaction);
});

prismaTestClient.transaction.update.mockImplementation(async (data: any) => {
  // Find the transaction
  const transaction = transactionStore.get(data.where.id);
  if (!transaction) {
    throw new AppError('Transaction not found', 404);
  }

  // If organizationId is specified, check if it matches
  if (data.where.organizationId && transaction.organizationId !== data.where.organizationId) {
    throw new AppError('Not authorized to update this transaction', 403);
  }

  // Update the transaction
  const updatedTransaction = {
    ...transaction,
    ...data.data,
    updatedAt: new Date(),
  };
  transactionStore.set(transaction.id, updatedTransaction);

  return Promise.resolve(updatedTransaction);
});

prismaTestClient.transaction.findMany.mockImplementation((data: any) => {
  // Convert transactions store to array
  const transactions = Array.from(transactionStore.values());
  
  // Filter by organizationId if specified
  let filtered = transactions;
  if (data.where?.organizationId) {
    filtered = filtered.filter(t => t.organizationId === data.where.organizationId);
  }

  // Filter by date range if specified
  if (data.where?.createdAt?.gte && data.where?.createdAt?.lte) {
    filtered = filtered.filter(t => {
      return t.createdAt >= data.where.createdAt.gte && t.createdAt <= data.where.createdAt.lte;
    });
  }

  // Sort if specified
  if (data.orderBy) {
    const [field, order] = Object.entries(data.orderBy)[0];
    filtered.sort((a: any, b: any) => {
      if (order === 'desc') {
        return b[field] - a[field];
      }
      return a[field] - b[field];
    });
  }

  // Apply pagination
  const skip = data.skip || 0;
  const take = data.take || filtered.length;
  const paginatedResults = filtered.slice(skip, skip + take);

  return Promise.resolve(paginatedResults);
});

prismaTestClient.transaction.count.mockImplementation((data: any) => {
  // Convert transactions store to array
  const transactions = Array.from(transactionStore.values());
  
  // Filter by organizationId if specified
  let count = transactions.length;
  if (data.where?.organizationId) {
    count = transactions.filter(t => t.organizationId === data.where.organizationId).length;
  }

  // Filter by date range if specified
  if (data.where?.createdAt?.gte && data.where?.createdAt?.lte) {
    count = transactions.filter(t => {
      return t.createdAt >= data.where.createdAt.gte && t.createdAt <= data.where.createdAt.lte;
    }).length;
  }

  return Promise.resolve(count);
});

prismaTestClient.transaction.aggregate.mockImplementation((data: any) => {
  // Convert transactions store to array
  const transactions = Array.from(transactionStore.values());
  
  // Filter by organizationId if specified
  let filtered = transactions;
  if (data.where?.organizationId) {
    filtered = filtered.filter(t => t.organizationId === data.where.organizationId);
  }

  // Filter by date range if specified
  if (data.where?.createdAt?.gte && data.where?.createdAt?.lte) {
    filtered = filtered.filter(t => {
      return t.createdAt >= data.where.createdAt.gte && t.createdAt <= data.where.createdAt.lte;
    });
  }

  // Calculate aggregations
  const totalDonations = filtered.reduce((sum, t) => sum + t.donationAmount.toNumber(), 0);
  const avgDonation = filtered.length > 0 ? totalDonations / filtered.length : 0;

  return Promise.resolve({
    _count: { id: filtered.length },
    _sum: { 
      donationAmount: new Prisma.Decimal(totalDonations.toFixed(2)),
      originalAmount: new Prisma.Decimal(filtered.reduce((sum, t) => sum + t.originalAmount.toNumber(), 0).toFixed(2))
    },
    _avg: {
      donationAmount: new Prisma.Decimal(avgDonation.toFixed(2))
    }
  });
});

prismaTestClient.transaction.deleteMany.mockImplementation(() => {
  transactionStore.clear();
  return Promise.resolve({ count: 0 });
});

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

// Setup function to create initial test data
export const setup = async () => {
  // Clear any existing data
  await prismaTestClient.transaction.deleteMany();
  await prismaTestClient.organization.deleteMany();

  // Create admin organization
  await prismaTestClient.organization.create({
    data: {
      name: 'Admin Organization',
      apiKey: 'test-admin-key',
      isAdmin: true,
    },
  });

  // Create test organization
  await prismaTestClient.organization.create({
    data: {
      name: 'Test Organization',
      isAdmin: false,
    },
  });
};

// Teardown function for tests
export const teardown = async () => {
  await prismaTestClient.organization.deleteMany();
  await prismaTestClient.transaction.deleteMany();
  await prismaTestClient.$disconnect();
};

// Add resetOrganizationCount function
export const resetOrganizationCount = () => {
  prismaTestClient.organization.count.mockReset();
  prismaTestClient.organization.count.mockImplementation(() => Promise.resolve(0));
}; 