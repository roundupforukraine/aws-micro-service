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
    if (orgs.length > 0 && sortKey in orgs[0]) { 
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

prismaTestClient.transaction.create.mockImplementation(((args: Prisma.TransactionCreateArgs) => {
  if (!args.data.organizationId) {
    throw new Error('organizationId is required to create a transaction');
  }
  const transactionId = `test-tx-${Date.now()}-${Math.random()}`;
  // Ensure metadata adheres to JsonValue (no undefined)
  const safeMetadata = JSON.parse(JSON.stringify(args.data.metadata ?? {})); 
  const transaction: Transaction = {
    id: transactionId,
    organizationId: args.data.organizationId,
    originalAmount: new Prisma.Decimal(args.data.originalAmount?.toString() ?? '0'),
    roundedAmount: new Prisma.Decimal(args.data.roundedAmount?.toString() ?? '0'),
    donationAmount: new Prisma.Decimal(args.data.donationAmount?.toString() ?? '0'),
    metadata: safeMetadata, // Use sanitized metadata
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  transactionStore.set(transaction.id, transaction);
  return Promise.resolve(transaction);
}) as any);

prismaTestClient.transaction.findFirst.mockImplementation(((args: Prisma.TransactionFindFirstArgs) => {
  // Simplified: find first matching transaction in store
  // Ignores complex where clauses, orderBy, etc. for now
  for (const transaction of transactionStore.values()) {
    let match = true;
    if (args.where) {
      if (args.where.id && transaction.id !== args.where.id) match = false;
      if (args.where.organizationId && transaction.organizationId !== args.where.organizationId) match = false;
      // Add other simple where conditions if needed
    }
    if (match) return Promise.resolve(transaction);
  }
  return Promise.resolve(null);
}) as any);

prismaTestClient.transaction.findUnique.mockImplementation(((args: Prisma.TransactionFindUniqueArgs) => {
  // Check if id exists before getting from store
  const transaction = args.where.id ? transactionStore.get(args.where.id) : undefined;
  return Promise.resolve(transaction ?? null);
}) as any);

prismaTestClient.transaction.update.mockImplementation(((args: Prisma.TransactionUpdateArgs) => {
  if (!args.where?.id) {
    throw new Error('Update requires an ID in the where clause');
  }
  const transaction = transactionStore.get(args.where.id);
  if (!transaction) {
     // Mimic Prisma P2025
     throw new Prisma.PrismaClientKnownRequestError(
        'An operation failed because it depends on one or more records that were required but not found. {cause}',
        { code: 'P2025', clientVersion: 'mock' }
     );
  }

  const updatedData = args.data as Partial<Transaction>; 
  // Ensure metadata adheres to JsonValue
  const newMetadata = updatedData.metadata !== undefined ? updatedData.metadata : transaction.metadata;
  const safeNewMetadata = JSON.parse(JSON.stringify(newMetadata));

  const updatedTransaction: Transaction = { 
    ...transaction, 
    ...updatedData, 
    originalAmount: updatedData.originalAmount ? new Prisma.Decimal(updatedData.originalAmount.toString()) : transaction.originalAmount,
    roundedAmount: updatedData.roundedAmount ? new Prisma.Decimal(updatedData.roundedAmount.toString()) : transaction.roundedAmount,
    donationAmount: updatedData.donationAmount ? new Prisma.Decimal(updatedData.donationAmount.toString()) : transaction.donationAmount,
    metadata: safeNewMetadata, // Use sanitized metadata
    updatedAt: new Date() 
  };

  transactionStore.set(updatedTransaction.id, updatedTransaction);
  return Promise.resolve(updatedTransaction);
}) as any);

prismaTestClient.transaction.findMany.mockImplementation(((args?: Prisma.TransactionFindManyArgs) => {
  // Basic implementation: return all transactions from store
  // Needs refinement for where, pagination, sorting
  let transactions = Array.from(transactionStore.values());
  // TODO: Implement filtering, sorting, pagination
  return Promise.resolve(transactions);
}) as any);

prismaTestClient.transaction.count.mockImplementation(((args?: Prisma.TransactionCountArgs) => {
    // Basic implementation based on store size / filtering
    // TODO: Implement filtering based on args.where
    return Promise.resolve(transactionStore.size);
}) as any);

prismaTestClient.transaction.aggregate.mockImplementation(((args: Prisma.TransactionAggregateArgs) => {
    // Basic mock for aggregation - sums donationAmount
    // TODO: Implement filtering based on args.where
    let totalDonations = new Prisma.Decimal(0);
    let count = 0;
    for (const tx of transactionStore.values()) {
        // Add where clause filtering here if needed
        totalDonations = totalDonations.plus(tx.donationAmount);
        count++;
    }
    const avg = count > 0 ? totalDonations.dividedBy(new Prisma.Decimal(count)) : new Prisma.Decimal(0);

    // Structure depends on what fields are requested in args (_sum, _count, _avg)
    return Promise.resolve({
        _sum: { donationAmount: totalDonations },
        _count: { _all: count },
        _avg: { donationAmount: avg }
        // Add other aggregates (_min, _max) if needed
    });
}) as any);

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