const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.test
dotenv.config({ path: path.resolve(process.cwd(), ".env.test.local") });