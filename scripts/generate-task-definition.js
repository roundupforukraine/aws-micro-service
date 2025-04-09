const fs = require('fs');
const path = require('path');

// Load AWS credentials to get account ID and region
function loadAwsCredentials() {
  try {
    const credentialsPath = path.join(__dirname, '..', 'aws-credentials.json');
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    return credentials.aws;
  } catch (error) {
    console.error('Error loading AWS credentials:', error.message);
    process.exit(1);
  }
}

// Generate task definition from template
function generateTaskDefinition(templateName, outputName, additionalReplacements = {}) {
  const awsConfig = loadAwsCredentials();
  const accountId = awsConfig.credentials.accessKeyId.split('AKIA')[1].substring(0, 12);
  const region = awsConfig.region;
  
  // Read the template
  const templatePath = path.join(__dirname, '..', templateName);
  let template = fs.readFileSync(templatePath, 'utf8');
  
  // Replace placeholders with actual values
  template = template.replace(/ACCOUNT_ID/g, accountId);
  template = template.replace(/REGION/g, region);
  
  // Apply additional replacements
  Object.entries(additionalReplacements).forEach(([key, value]) => {
    template = template.replace(new RegExp(key, 'g'), value);
  });
  
  // Write the generated task definition
  const outputPath = path.join(__dirname, '..', outputName);
  fs.writeFileSync(outputPath, template);
  
  console.log(`Task definition generated at ${outputPath}`);
  console.log(`Using AWS Account ID: ${accountId}`);
  console.log(`Using AWS Region: ${region}`);
}

// Generate both task definition files
function generateAllTaskDefinitions() {
  // Generate simple task definition
  generateTaskDefinition('simple-task-definition.template.json', 'simple-task-definition.json');
  
  // Generate main task definition with image tag
  const imageTag = `${new Date().toISOString().split('T')[0].replace(/-/g, '')}-arm64`;
  generateTaskDefinition('task-definition.template.json', 'task-definition.json', {
    'IMAGE_TAG': imageTag,
    'DATABASE_URL_PLACEHOLDER': process.env.DATABASE_URL || 'postgresql://dbadmin:password@localhost:5432/microservice'
  });
}

// Run the script
generateAllTaskDefinitions(); 