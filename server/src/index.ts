import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

import { connectDB } from './config/db';
import { errorHandler, notFound } from './middlewares/error';
import { globalLimiter } from './middlewares/rateLimiter';

import authRoutes from './routes/auth';
import fileRoutes from './routes/files';
import pdfRoutes from './routes/pdf';
import imageRoutes from './routes/image';
import ocrRoutes from './routes/ocr';
import convertRoutes from './routes/convert';
import activityRoutes from './routes/activity';
import languageRoutes from './routes/language';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect Database
connectDB();

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  // Expose compression size headers so the client can read them on blob responses
  exposedHeaders: ['X-Original-Size', 'X-Compressed-Size', 'X-Target-Bytes', 'X-Target-Met'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Rate limiting
app.use(globalLimiter);

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'DocFusion API is running', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/image', imageRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/convert', convertRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/language', languageRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║         DocFusion API Server          ║
  ║   Running on http://localhost:${PORT}   ║
  ╚══════════════════════════════════════╝
  `);
});

export default app;
