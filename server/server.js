import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import clinicRoutes from './routes/clinicRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import faqRoutes from './routes/faqRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import integrationRoutes from './routes/integrationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

import { securityHeaders } from './middleware/securityHeaders.js';
import { requestLogger } from './middleware/requestLogger.js';
import { inputSanitizer } from './middleware/inputSanitizer.js';
import { globalLimiter, chatLimiter, appointmentLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDirectory = path.join(__dirname, '../public');

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5000').split(',').map(o => o.trim());

// 1. Security Headers & Request Tracking
app.use(securityHeaders);
app.use(requestLogger);

// 2. CORS Configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, same-origin)
    if (!origin) return callback(null, true);
    if (
      !isProduction ||
      allowedOrigins.includes(origin) ||
      allowedOrigins.includes('*') ||
      origin.endsWith('.railway.app') ||
      origin.endsWith('.up.railway.app')
    ) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy violation: Origin '${origin}' is not allowed.`));
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key', 'x-request-id']
}));

// 3. Payload Limit & Input Sanitization
app.use(express.json({ limit: '100kb' }));
app.use(inputSanitizer);

// 4. Global Rate Limiter
app.use('/api', globalLimiter);

// Serve static frontend from public/
app.use(express.static(publicDirectory));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'carebridge-api',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Admin Dashboard UI Route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'admin.html'));
});

// API Routes with specialized rate limits
app.use('/api/clinics', clinicRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/faq', faqRoutes);
app.use('/api/appointments', appointmentLimiter, appointmentRoutes);
app.use('/api/ai', chatLimiter, chatRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/admin', adminRoutes);

// Fallback for API routes
app.use('/api/*', notFoundHandler);

// Fallback to index.html for root / browser navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'index.html'));
});

// Centralized error handler
app.use(errorHandler);

const primaryPort = parseInt(process.env.PORT, 10) || 8080;
const portsToListen = Array.from(new Set([primaryPort, 8080, 5000].filter(p => !isNaN(p) && p > 0)));

portsToListen.forEach((p) => {
  try {
    const srv = app.listen(p, '0.0.0.0', () => {
      console.log(`🚀 CareBridge Health Network Server running on http://0.0.0.0:${p}`);
      console.log(`🏥 Health check available at: http://0.0.0.0:${p}/health`);
    });
    srv.on('error', (err) => {
      if (err.code !== 'EADDRINUSE') {
        console.warn(`[PORT_BIND] Warning on port ${p}:`, err.message);
      }
    });
  } catch (err) {
    // Port might be in use if multiple entries match
  }
});

export default app;
