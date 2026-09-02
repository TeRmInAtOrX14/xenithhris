require('dotenv').config();

// Ensure critical database and JWT environment variables are available in Vercel serverless functions
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://postgres.aldlnbdvkczqpfjatyyh:JmTBKCxsu2vnrH2l@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?schema=public&pgbouncer=true";
}
if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL = "postgresql://postgres.aldlnbdvkczqpfjatyyh:JmTBKCxsu2vnrH2l@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres?schema=public";
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "JmTBKCxsu2vnrH2l";
}

const app = require('../backend/src/server');

module.exports = app;
