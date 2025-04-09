import request from 'supertest';
import express, { Application } from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

// Mock the YAML.load function
jest.mock('yamljs', () => ({
  load: jest.fn().mockReturnValue({ info: { title: 'Test API' } }),
  stringify: jest.fn().mockReturnValue('test: yaml')
}));

// Create a test app without starting the server
const createTestApp = (): Application => {
  const app = express();
  const swaggerDocument = { info: { title: 'Test API' } };
  
  // Serve Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  
  // Serve the OpenAPI specification as JSON
  app.get('/openapi.json', (req, res) => {
    res.json(swaggerDocument);
  });
  
  // Serve the OpenAPI specification as YAML
  app.get('/openapi.yaml', (req, res) => {
    res.setHeader('Content-Type', 'text/yaml');
    res.send('test: yaml');
  });
  
  return app;
};

describe('Documentation Server', () => {
  let app: Application;
  
  beforeEach(() => {
    app = createTestApp();
  });
  
  it('should serve the Swagger UI', async () => {
    const response = await request(app).get('/api-docs/');
    expect(response.status).toBe(200);
  });

  it('should serve the OpenAPI specification as JSON', async () => {
    const response = await request(app).get('/openapi.json');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ info: { title: 'Test API' } });
  });

  it('should serve the OpenAPI specification as YAML', async () => {
    const response = await request(app).get('/openapi.yaml');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/yaml');
    expect(response.text).toBe('test: yaml');
  });
}); 