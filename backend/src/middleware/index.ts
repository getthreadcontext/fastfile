import express from 'express';
import multer from 'multer';
import path from 'path';
import { Config } from '../config/config';
import { FileUtils } from '../utils/fileUtils';

const config = Config.getInstance().get();

// Configure multer for file uploads
export const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

export const upload = multer({ 
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
  fileFilter: (req, file, cb) => {
    const fileType = FileUtils.getFileType(file.originalname);
    if (fileType === 'unknown') {
      cb(new Error('Unsupported file type'));
    } else {
      cb(null, true);
    }
  }
});

// Error handling middleware
export const errorHandler = (error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
  }
  
  res.status(500).json({ error: 'Internal server error' });
};

// Request logging middleware
export const requestLogger = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
};

// CORS configuration
export const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourapp.com'] // Add your production domains
    : ['http://localhost:5173', 'http://localhost:3000'], // Development origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
