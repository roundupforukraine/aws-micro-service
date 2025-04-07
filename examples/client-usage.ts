/**
 * Example of using the generated client library
 * 
 * This example demonstrates how to use the generated client library to interact with the API.
 * 
 * To run this example:
 * 1. Generate the client library: npm run generate-client typescript-fetch
 * 2. Install dependencies: npm install
 * 3. Run the example: ts-node examples/client-usage.ts
 */

// Import the generated client
import { DefaultApi, Configuration } from '../generated-client-typescript-fetch';

// Create a configuration with your API key
const config = new Configuration({
  basePath: 'http://localhost:3000/api',
  apiKey: 'your-api-key' // Replace with your actual API key
});

// Create an instance of the API client
const api = new DefaultApi(config);

// Example: Register a new organization (requires admin API key)
async function registerOrganization() {
  try {
    const response = await api.registerOrganization({
      name: 'Example Organization'
    });
    
    console.log('Organization registered:', response.data.organization);
    return response.data.organization;
  } catch (error) {
    console.error('Error registering organization:', error);
    throw error;
  }
}

// Example: Create a transaction
async function createTransaction(organizationApiKey: string) {
  try {
    // Create a new configuration with the organization's API key
    const orgConfig = new Configuration({
      basePath: 'http://localhost:3000/api',
      apiKey: organizationApiKey
    });
    
    const orgApi = new DefaultApi(orgConfig);
    
    const response = await orgApi.createTransaction({
      originalAmount: 10.50,
      metadata: { description: 'Coffee purchase' }
    });
    
    console.log('Transaction created:', response.data.transaction);
    return response.data.transaction;
  } catch (error) {
    console.error('Error creating transaction:', error);
    throw error;
  }
}

// Example: Get transaction details
async function getTransaction(organizationApiKey: string, transactionId: string) {
  try {
    // Create a new configuration with the organization's API key
    const orgConfig = new Configuration({
      basePath: 'http://localhost:3000/api',
      apiKey: organizationApiKey
    });
    
    const orgApi = new DefaultApi(orgConfig);
    
    const response = await orgApi.getTransaction({
      id: transactionId
    });
    
    console.log('Transaction details:', response.data.transaction);
    return response.data.transaction;
  } catch (error) {
    console.error('Error getting transaction:', error);
    throw error;
  }
}

// Example: List transactions
async function listTransactions(organizationApiKey: string) {
  try {
    // Create a new configuration with the organization's API key
    const orgConfig = new Configuration({
      basePath: 'http://localhost:3000/api',
      apiKey: organizationApiKey
    });
    
    const orgApi = new DefaultApi(orgConfig);
    
    const response = await orgApi.listTransactions({
      page: 1,
      limit: 10
    });
    
    console.log('Transactions:', response.data.transactions);
    console.log('Pagination:', response.data.pagination);
    return response.data.transactions;
  } catch (error) {
    console.error('Error listing transactions:', error);
    throw error;
  }
}

// Example: Get transaction report
async function getTransactionReport(organizationApiKey: string) {
  try {
    // Create a new configuration with the organization's API key
    const orgConfig = new Configuration({
      basePath: 'http://localhost:3000/api',
      apiKey: organizationApiKey
    });
    
    const orgApi = new DefaultApi(orgConfig);
    
    const response = await orgApi.getTransactionReport({});
    
    console.log('Transaction report:', response.data.report);
    return response.data.report;
  } catch (error) {
    console.error('Error getting transaction report:', error);
    throw error;
  }
}

// Main function to run all examples
async function main() {
  try {
    // Replace with your admin API key
    const adminApiKey = 'your-admin-api-key';
    
    // Register a new organization
    const organization = await registerOrganization();
    
    // Create a transaction
    const transaction = await createTransaction(organization.apiKey);
    
    // Get transaction details
    await getTransaction(organization.apiKey, transaction.id);
    
    // List transactions
    await listTransactions(organization.apiKey);
    
    // Get transaction report
    await getTransactionReport(organization.apiKey);
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run the examples
main(); 