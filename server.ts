import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { initializeSchema } from './src/database/schema';
import { seedDatabase } from './src/database/seed';
import { authenticateToken } from './src/middleware/auth';

import authRoutes from './src/routes/authRoutes';
import productRoutes from './src/routes/productRoutes';
import contentRoutes from './src/routes/contentRoutes';
import libraryRoutes from './src/routes/libraryRoutes';
import walletRoutes from './src/routes/walletRoutes';
import adminRoutes from './src/routes/adminRoutes';
import paymentWebhookRoutes from './src/routes/paymentWebhookRoutes';
import notificationRoutes from './src/routes/notificationRoutes';

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const PORT = isProduction && process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Core Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Attach authenticated user to req
app.use(authenticateToken as any);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentWebhookRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    platform: 'UPI-Pay',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

async function startServer() {
  try {
    // 1. Initialize SQLite Database & Tables
    await initializeSchema();

    // 2. Populate Seed Products & Users
    await seedDatabase();

    // 3. Vite Middleware in Development, Static Serving in Production
    if (!isProduction) {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('[Server] Vite middleware mounted in development mode.');
    } else {
      const distPath = path.resolve(process.cwd(), 'dist');
      if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get('*', (req, res) => {
          res.sendFile(path.join(distPath, 'index.html'));
        });
      }
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[UPI-Pay] Server running at http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('[UPI-Pay] Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
