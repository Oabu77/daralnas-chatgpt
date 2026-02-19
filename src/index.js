/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const connectDB = require('./config/database');
const winston = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const verseRoutes = require('./routes/verses');
const translationRoutes = require('./routes/translations');
const paymentRoutes = require('./routes/payments');
const subscriptionRoutes = require('./routes/subscriptions');
const webhookRoutes = require('./routes/webhooks');
const cardRoutes = require('./routes/cards');

const app = express();
const port = process.env.PORT || 3000;

// Connect to database
connectDB();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Stripe webhook (must be before body parsing)
app.use('/api/webhooks', webhookRoutes);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Special middleware for Stripe webhooks (must be before JSON parsing)
app.use('/api/subscriptions/webhook', express.raw({ type: 'application/json' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/verses', verseRoutes);
app.use('/api/translations', translationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/cards', cardRoutes);

// Payment Links API — serves the generated payment links for the storefront
app.get('/api/payment-links', (req, res) => {
  try {
    const fs = require('fs');
    const linksPath = path.join(__dirname, '../payment-links.json');
    if (fs.existsSync(linksPath)) {
      const data = JSON.parse(fs.readFileSync(linksPath, 'utf8'));
      return res.json(data);
    }
    res.status(404).json({ error: 'Payment links not yet generated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load payment links' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../client/dist')));

// Root route - serve frontend or API info
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, '../client/dist/index.html');
  if (require('fs').existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.json({
    message: 'Welcome to QuranChain-OS',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      verses: '/api/verses',
      translations: '/api/translations',
      payments: '/api/payments',
      subscriptions: '/api/subscriptions',
      cards: '/api/cards',
      health: '/health',
    },
  });
});

// SPA fallback - serve index.html for client-side routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path === '/health') return next();
  const indexPath = path.join(__dirname, '../client/dist/index.html');
  if (require('fs').existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  next();
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  winston.error('Uncaught Exception:', err);
  process.exit(1);
});

// Only listen when run directly (not when imported by tests)
if (require.main === module) {
  const server = app.listen(port, () => {
    winston.info(`QuranChain-OS running on port ${port} in ${process.env.NODE_ENV} mode`);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err, promise) => {
    winston.error('Unhandled Rejection:', err);
    server.close(() => {
      process.exit(1);
    });
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    winston.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
      winston.info('Process terminated');
    });
  });
}

module.exports = app;