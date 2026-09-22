// Vercel's zero-config Node.js runtime auto-detects any file under /api
// as a serverless function. Re-exporting the existing Express app here
// (instead of fighting the legacy `builds`/`routes` vercel.json format)
// is the most reliable way to deploy an Express app on Vercel.
module.exports = require('../src/app.js');
