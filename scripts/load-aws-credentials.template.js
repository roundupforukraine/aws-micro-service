const fs = require('fs');
const path = require('path');

function loadAwsCredentials() {
  try {
    const credentialsPath = path.join(__dirname, '..', 'aws-credentials.json');
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    
    // Set AWS environment variables
    process.env.AWS_REGION = credentials.aws.region;
    process.env.AWS_ACCESS_KEY_ID = credentials.aws.credentials.accessKeyId;
    process.env.AWS_SECRET_ACCESS_KEY = credentials.aws.credentials.secretAccessKey;
    
    // Set API environment variables
    process.env.API_BASE_URL = credentials.api.baseUrl;
    process.env.ADMIN_API_KEY = credentials.api.adminApiKey;
    
    console.log('AWS and API credentials loaded successfully');
  } catch (error) {
    console.error('Error loading credentials:', error.message);
    process.exit(1);
  }
}

// Export the function to be used by other scripts
module.exports = loadAwsCredentials; 