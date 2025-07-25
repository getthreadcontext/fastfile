import path from 'path';
import fs from 'fs-extra';
import { ConversionConfig } from '../types';

export class Config {
  private static instance: Config;
  private config: ConversionConfig;

  private constructor() {
    this.config = {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      uploadsDir: path.join(__dirname, '..', '..', 'uploads'),
      outputDir: path.join(__dirname, '..', '..', 'output'),
      cleanupInterval: 30 * 60 * 1000, // 30 minutes
      maxAge: 60 * 60 * 1000 // 1 hour
    };

    this.ensureDirectories();
  }

  static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  get(): ConversionConfig {
    return this.config;
  }

  private ensureDirectories(): void {
    fs.ensureDirSync(this.config.uploadsDir);
    fs.ensureDirSync(this.config.outputDir);
  }

  updateConfig(updates: Partial<ConversionConfig>): void {
    this.config = { ...this.config, ...updates };
    this.ensureDirectories();
  }
}
