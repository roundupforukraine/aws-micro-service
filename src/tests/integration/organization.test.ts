import request from 'supertest';
import { prismaTestClient, resetOrganizationCount } from '../setup';
import app from '../../index';
import { Organization } from '../setup';

describe('Organization API', () => {
  let adminApiKey: string;
  let testOrg: Organization;
  let adminOrg: Organization;

  beforeEach(() => {
    resetOrganizationCount();
  });

  beforeAll(async () => {
    await prismaTestClient.$connect();
    adminApiKey = 'test-admin-key';

    // Create a test organization
    const response = await request(app)
      .post('/api/organizations/register')
      .set('x-api-key', adminApiKey)
      .send({ name: 'Test Organization' });

    expect(response.status).toBe(201);
    testOrg = response.body.data.organization;

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
      const otherOrg = await prismaTestClient.organization.create({
        data: {
          name: 'Other Organization',
          apiKey: 'test-api-key-other',
          isAdmin: false,
        },
      }) as Organization;

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
      const otherOrg = await prismaTestClient.organization.create({
        data: {
          name: 'Other Organization',
          apiKey: 'test-api-key-other',
          isAdmin: false,
        },
      }) as Organization;

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
}); 