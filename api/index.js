/**
 * Vercel serverless entry — mounts the Express API (routes under /api/v1).
 */
const app = require("../prisma-backend/dist/app.js").default;

module.exports = app;
