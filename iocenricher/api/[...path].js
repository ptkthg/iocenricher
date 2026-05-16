// Vercel serverless entry point — routes all /api/* requests to the Express app.
// Vercel auto-detects files in /api as serverless functions.
const app = require('../backend/server');
module.exports = app;
