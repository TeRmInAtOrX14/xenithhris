require('dotenv').config();

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://postgres.aldlnbdvkczqpfjatyyh:JmTBKCxsu2vnrH2l@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?schema=public&pgbouncer=true";
}
if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL = "postgresql://postgres.aldlnbdvkczqpfjatyyh:JmTBKCxsu2vnrH2l@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres?schema=public";
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "JmTBKCxsu2vnrH2l";
}
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// Security & Parsing Middlewares
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // Check if the origin matches localhost, 127.0.0.1, or local subnets
    const isLocal = origin.startsWith('http://localhost') || 
                    origin.startsWith('http://127.0.0.1') || 
                    /^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin);
                    
    const allowedOrigins = [
      'https://hris.artxenith.com',
      'https://xenithhris.vercel.app',
      process.env.FRONTEND_URL
    ].filter(Boolean);

    if (isLocal || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(morgan('dev'));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Import Routes
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employee');
const attendanceRoutes = require('./routes/attendance');
const requestRoutes = require('./routes/request');
const campaignRoutes = require('./routes/campaign');
const loanRoutes = require('./routes/loan');
const payrollRoutes = require('./routes/payroll');
const documentRoutes = require('./routes/document');
const systemRoutes = require('./routes/system');
const salesRoutes = require('./routes/sales');
const financeRoutes = require('./routes/finance');

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/finance', financeRoutes);

// Global Error Handler
app.use(errorHandler);

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`HRIS Backend running on port ${PORT}`);
  });
}

module.exports = app;

