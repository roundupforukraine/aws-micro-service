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
// export { Organization, Transaction };

type DeepMockProxy<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? jest.Mock
    : T[K] extends object
    ? DeepMockProxy<T[K]>
    : T[K];
};

// Store for test data
const organizationStore = new Map<string, Organization>();
let orgCounter = 0;
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
prismaTestClient.organization.create.mockImplementation(((args: Prisma.OrganizationCreateArgs) => {
  const orgId = args.data.isAdmin ? 'admin-org-id' : `test-org-${++orgCounter}`;
  const apiKey = args.data.apiKey ?? (args.data.isAdmin ? 'test-admin-key' : `test-api-key-${orgCounter}`);
  
  const org: Organization = {
    id: orgId,
    name: args.data.name ?? 'Test Organization',
    apiKey: apiKey,
    isAdmin: args.data.isAdmin ?? false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  organizationStore.set(org.id, org);
  organizationStore.set(org.apiKey, org); // Store by apiKey too for lookup
  return Promise.resolve(org);
}) as any);

prismaTestClient.organization.findUnique.mockImplementation(((args: Prisma.OrganizationFindUniqueArgs) => {
  let org: Organization | undefined;
  if (args.where.id) {
    org = organizationStore.get(args.where.id);
  } else if (args.where.apiKey) {
    org = organizationStore.get(args.where.apiKey);
  }
  
  // Preserve original behavior for specific test keys/IDs if needed, otherwise rely on store
  if (!org && args.where.apiKey === 'invalid-api-key') {
    return Promise.resolve(null);
  }
  if (!org && args.where.id === 'non-existent-id') {
      return Promise.resolve(null);
  }
  
  return Promise.resolve(org ?? null);
}) as any);

prismaTestClient.organization.update.mockImplementation(((args: Prisma.OrganizationUpdateArgs) => {
  if (!args.where?.id) {
    throw new Error('Update requires an ID in the where clause');
  }
  const org = organizationStore.get(args.where.id);
  if (!org) {
    throw new Error('Organization not found');
  }

  // Apply updates - Simplified
  let updatedData: Partial<Organization> = {};
  if (typeof args.data === 'function') {
     // Note: Handling the function update case is complex, providing a basic structure
     // const resolvedData = args.data(org); // Prisma types might be more specific
     // updatedData = resolvedData as Partial<Organization>;
     console.warn('Function update in mock not fully implemented'); 
     updatedData = {}; // Placeholder
  } else {
     updatedData = args.data as Partial<Organization>; // Assume it's a partial object
  }

  const updatedOrg = { 
    ...org, 
    ...updatedData,
    updatedAt: new Date() 
  };

  organizationStore.set(updatedOrg.id, updatedOrg);
  if (updatedOrg.apiKey !== org.apiKey && updatedOrg.apiKey) { // Update apiKey index if changed
      if (org.apiKey) organizationStore.delete(org.apiKey);
      organizationStore.set(updatedOrg.apiKey, updatedOrg);
  }

  return Promise.resolve(updatedOrg);
}) as any);

prismaTestClient.organization.findMany.mockImplementation(((args?: Prisma.OrganizationFindManyArgs) => {
  let orgs = Array.from(organizationStore.values());

  // Filtering (simplified example)
  if (args?.where?.name && typeof args.where.name === 'object' && 'contains' in args.where.name && args.where.name.contains !== undefined) {
    // Assuming contains is a string for mock purposes
    const searchTerm = (args.where.name.contains as string).toLowerCase(); 
    orgs = orgs.filter(o => o.name.toLowerCase().includes(searchTerm));
  }

  // Sorting (simplified example - handles single object orderBY)
  if (args?.orderBy && !Array.isArray(args.orderBy)) {
    const sortKey = Object.keys(args.orderBy)[0] as keyof Organization;
    if (sortKey in orgs[0]) { // Basic check if key exists
        const sortOrder = (args.orderBy as any)[sortKey] === 'desc' ? -1 : 1;
        orgs.sort((a, b) => {
            // Basic sort, might need refinement for different types
            const valA = a[sortKey];
            const valB = b[sortKey];
            if (valA < valB) return -1 * sortOrder;
            if (valA > valB) return 1 * sortOrder;
            return 0;
        });
    }
  }

  // Pagination
  const skip = args?.skip ?? 0;
  const take = args?.take ?? orgs.length;
  orgs = orgs.slice(skip, skip + take);

  return Promise.resolve(orgs);
}) as any);

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
  await prismaTestClient.$connect();
  // Optional: Reset stores before each test run if needed
  resetOrganizationCount();
  transactionStore.clear(); 
};

// Teardown function for tests
export const teardown = async () => {
  await prismaTestClient.$disconnect();
};

// Add resetOrganizationCount function
export const resetOrganizationCount = () => {
  orgCounter = 0;
  organizationStore.clear();
  // Add admin org back if needed for all tests
  const adminOrg: Organization = {
    id: 'admin-org-id',
    name: 'Admin Organization',
    apiKey: 'test-admin-key',
    isAdmin: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  organizationStore.set(adminOrg.id, adminOrg);
  organizationStore.set(adminOrg.apiKey, adminOrg);
};

// REMOVED redundant export block
// export {
//   setup,
//   teardown,
//   prismaTestClient,
//   Organization,
//   Transaction,
//   resetOrganizationCount
// }; 