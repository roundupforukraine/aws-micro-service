import express from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

// Load the OpenAPI specification
const swaggerDocument = YAML.load(path.join(__dirname, '../openapi.yaml'));

// Create Express app
const app = express();

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Serve the OpenAPI specification as JSON
app.get('/openapi.json', (req, res) => {
  res.json(swaggerDocument);
});

// Serve the OpenAPI specification as YAML
app.get('/openapi.yaml', (req, res) => {
  res.setHeader('Content-Type', 'text/yaml');
  res.send(YAML.stringify(swaggerDocument));
});

// Start the server
const PORT = process.env.DOCS_PORT || 3001;
app.listen(PORT, () => {
  console.log(`API Documentation server running at http://localhost:${PORT}/api-docs`);
  console.log(`OpenAPI specification available at http://localhost:${PORT}/openapi.json`);
});

export default app; 