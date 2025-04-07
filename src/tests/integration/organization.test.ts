import request from 'supertest';
import { prismaTestClient, resetOrganizationCount } from '../setup';
import app from '../../index';
import { Organization } from '../setup';

describe('Organization API', () => {
  let adminApiKey: string;
  let testOrg: Organization;
  let adminOrg: Organization;
  let otherOrg: Organization;

  beforeEach(() => {
    resetOrganizationCount();
  });

  beforeAll(async () => {
    await prismaTestClient.$connect();
    adminApiKey = 'test-admin-key';

    // Create a test organization
    const orgResponse = await request(app)
      .post('/api/organizations/register')
      .set('x-api-key', adminApiKey)
      .send({ name: 'Test Organization' });

    expect(orgResponse.status).toBe(201);
    testOrg = orgResponse.body.data.organization;

    // Create another organization for testing access control
    const otherOrgResponse = await request(app)
      .post('/api/organizations/register')
      .set('x-api-key', adminApiKey)
      .send({ name: 'Other Organization' });

    expect(otherOrgResponse.status).toBe(201);
    otherOrg = otherOrgResponse.body.data.organization;

    // Create an admin organization for testing
    adminOrg = await prismaTestClient.organization.create({
      data: {
        name: 'Admin Organization',
        apiKey: 'test-api-key-admin',
        isAdmin: true,
      },
    }) as Organization;
  });

  afterAll(async () => {
    await prismaTestClient.$disconnect();
  });

  describe('POST /api/organizations/register', () => {
    it('should register a new organization when called by admin', async () => {
      const response = await request(app)
        .post('/api/organizations/register')
        .set('x-api-key', adminApiKey)
        .send({ name: 'Test Organization' });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.organization).toHaveProperty('id');
      expect(response.body.data.organization).toHaveProperty('name', 'Test Organization');
      expect(response.body.data.organization).toHaveProperty('apiKey');
    });

    it('should return 403 if called by non-admin', async () => {
      const response = await request(app)
        .post('/api/organizations/register')
        .set('x-api-key', testOrg.apiKey)
        .send({ name: 'Test Organization' });

      expect(response.status).toBe(403);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('Invalid admin API key');
    });

    it('should return 400 if name is missing', async () => {
      const response = await request(app)
        .post('/api/organizations/register')
        .set('x-api-key', adminApiKey)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Organization name is required');
    });
  });

  describe('GET /api/organizations/:id', () => {
    let testOrg: Organization;

    beforeAll(async () => {
      testOrg = await prismaTestClient.organization.create({
        data: {
          name: 'Test Org for GET',
          apiKey: 'test-api-key-' + Date.now(),
          isAdmin: false,
        },
      }) as Organization;
    });

    it('should return organization details when accessed by admin', async () => {
      const response = await request(app)
        .get(`/api/organizations/${testOrg.id}`)
        .set('x-api-key', adminApiKey);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.organization).toHaveProperty('id', testOrg.id);
      expect(response.body.data.organization).toHaveProperty('name', 'Test Org for GET');
    });

    it('should return organization details when accessed by own organization', async () => {
      const response = await request(app)
        .get(`/api/organizations/${testOrg.id}`)
        .set('x-api-key', testOrg.apiKey);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.organization).toHaveProperty('id', testOrg.id);
      expect(response.body.data.organization).toHaveProperty('name', 'Test Org for GET');
    });

    it('should return 403 when accessed by different organization', async () => {
      const response = await request(app)
        .get(`/api/organizations/${testOrg.id}`)
        .set('x-api-key', otherOrg.apiKey);

      expect(response.status).toBe(403);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('Not authorized to access this organization');
    });

    it('should return 401 if API key is missing', async () => {
      const response = await request(app)
        .get(`/api/organizations/${testOrg.id}`);

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('API key is required');
    });

    it('should return 401 if API key is invalid', async () => {
      const response = await request(app)
        .get(`/api/organizations/${testOrg.id}`)
        .set('x-api-key', 'invalid-api-key');

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('Invalid API key');
    });

    it('should return 404 if organization not found', async () => {
      const response = await request(app)
        .get('/api/organizations/non-existent-id')
        .set('x-api-key', adminApiKey);

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('Organization not found');
    });
  });

  describe('PUT /api/organizations/:id', () => {
    let testOrg: Organization;

    beforeAll(async () => {
      testOrg = await prismaTestClient.organization.create({
        data: {
          name: 'Test Org for PUT',
          apiKey: 'test-api-key-' + Date.now(),
          isAdmin: false,
        },
      }) as Organization;
    });

    it('should update organization details when called by admin', async () => {
      const response = await request(app)
        .put(`/api/organizations/${testOrg.id}`)
        .set('x-api-key', adminApiKey)
        .send({ name: 'Updated Organization Name' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.organization).toHaveProperty('id', testOrg.id);
      expect(response.body.data.organization).toHaveProperty('name', 'Updated Organization Name');
    });

    it('should update organization details when called by own organization', async () => {
      const response = await request(app)
        .put(`/api/organizations/${testOrg.id}`)
        .set('x-api-key', testOrg.apiKey)
        .send({ name: 'Updated By Self' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.organization).toHaveProperty('id', testOrg.id);
      expect(response.body.data.organization).toHaveProperty('name', 'Updated By Self');
    });

    it('should return 403 when updated by different organization', async () => {
      const response = await request(app)
        .put(`/api/organizations/${testOrg.id}`)
        .set('x-api-key', otherOrg.apiKey)
        .send({ name: 'Updated By Other' });

      expect(response.status).toBe(403);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('Not authorized to update this organization');
    });

    it('should return 401 if API key is missing', async () => {
      const response = await request(app)
        .put(`/api/organizations/${testOrg.id}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('API key is required');
    });

    it('should return 404 if organization not found', async () => {
      const response = await request(app)
        .put('/api/organizations/non-existent-id')
        .set('x-api-key', adminApiKey)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('Organization not found');
    });
  });

  describe('GET /api/organizations', () => {
    beforeAll(async () => {
      // Create multiple test organizations
      await Promise.all([
        prismaTestClient.organization.create({
          data: {
            name: 'Test Org 1',
            apiKey: 'test-api-key-1',
            isAdmin: false,
          },
        }),
        prismaTestClient.organization.create({
          data: {
            name: 'Test Org 2',
            apiKey: 'test-api-key-2',
            isAdmin: false,
          },
        }),
      ]);
    });

    it('should return paginated organizations when accessed by admin', async () => {
      const response = await request(app)
        .get('/api/organizations')
        .set('x-api-key', adminApiKey)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('organizations');
      expect(Array.isArray(response.body.data.organizations)).toBe(true);
      expect(response.body.data.organizations.length).toBeGreaterThan(0);
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination).toHaveProperty('page', 1);
      expect(response.body.data.pagination).toHaveProperty('limit', 10);
      expect(response.body.data.pagination).toHaveProperty('total');
      expect(response.body.data.pagination).toHaveProperty('pages');
    });

    it('should return 403 if accessed by non-admin', async () => {
      const response = await request(app)
        .get('/api/organizations')
        .set('x-api-key', testOrg.apiKey)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(403);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('Not authorized to list organizations');
    });

    it('should filter organizations by name', async () => {
      const response = await request(app)
        .get('/api/organizations')
        .set('x-api-key', adminApiKey)
        .query({ 
          search: 'Test Org 1',
          page: 1, 
          limit: 10 
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.organizations).toHaveLength(1);
      expect(response.body.data.organizations[0].name).toBe('Test Org 1');
    });

    it('should sort organizations by name', async () => {
      const response = await request(app)
        .get('/api/organizations')
        .set('x-api-key', adminApiKey)
        .query({ 
          sortBy: 'name',
          sortOrder: 'asc',
          page: 1, 
          limit: 10 
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.organizations.length).toBeGreaterThan(1);
      const names = response.body.data.organizations.map((org: any) => org.name);
      expect(names).toEqual([...names].sort());
    });

    it('should return 400 if sortBy is invalid', async () => {
      const response = await request(app)
        .get('/api/organizations')
        .set('x-api-key', adminApiKey)
        .query({ 
          sortBy: 'invalidField',
          page: 1, 
          limit: 10 
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Invalid sort field');
    });
  });
}); 