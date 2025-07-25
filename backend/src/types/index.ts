import { Request } from 'express';
import multer from 'multer';

export interface ConversionRequest {
  file: Express.Multer.File;
  format: string;
  quality: 'low' | 'medium' | 'high';
}

export interface ConversionResponse {
  success: boolean;
  message: string;
  downloadUrl?: string;
  originalName?: string;
  convertedName?: string;
  error?: string;
}

export interface SupportedFormats {
  video: string[];
  audio: string[];
  image: string[];
  document: string[];
  archive: string[];
}

export interface StructuredContent {
  title: string;
  paragraphs: string[];
  metadata: Record<string, any>;
}

export type FileType = 'video' | 'audio' | 'image' | 'document' | 'archive' | 'unknown';

export interface QualitySettings {
  video: string;
  audio: string;
}

export interface ConversionConfig {
  maxFileSize: number;
  uploadsDir: string;
  outputDir: string;
  cleanupInterval: number;
  maxAge: number;
}
