import fs from 'fs-extra';
import path from 'path';
import { Config } from '../config/config';

interface FileRecord {
  filename: string;
  createdAt: Date;
  timeout: NodeJS.Timeout;
}

export class CleanupManager {
  private static instance: CleanupManager;
  private fileRecords: Map<string, FileRecord> = new Map();
  private readonly FILE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds
  private config = Config.getInstance().get();

  private constructor() {}

  static getInstance(): CleanupManager {
    if (!CleanupManager.instance) {
      CleanupManager.instance = new CleanupManager();
    }
    return CleanupManager.instance;
  }

  /**
   * Clear uploads and output directories on startup
   */
  async clearDirectoriesOnStartup(): Promise<void> {
    try {
      console.log('🧹 Clearing directories on startup...');
      
      // Clear uploads directory
      if (await fs.pathExists(this.config.uploadsDir)) {
        await fs.emptyDir(this.config.uploadsDir);
        console.log(`✅ Cleared uploads directory: ${this.config.uploadsDir}`);
      } else {
        await fs.ensureDir(this.config.uploadsDir);
        console.log(`📁 Created uploads directory: ${this.config.uploadsDir}`);
      }

      // Clear output directory
      if (await fs.pathExists(this.config.outputDir)) {
        await fs.emptyDir(this.config.outputDir);
        console.log(`✅ Cleared output directory: ${this.config.outputDir}`);
      } else {
        await fs.ensureDir(this.config.outputDir);
        console.log(`📁 Created output directory: ${this.config.outputDir}`);
      }

      console.log('🎉 Directory cleanup completed');
    } catch (error) {
      console.error('❌ Error during directory cleanup:', error);
    }
  }

  /**
   * Track a file for automatic deletion after 5 minutes
   */
  trackFile(filename: string): void {
    // If file is already tracked, clear the old timeout
    if (this.fileRecords.has(filename)) {
      clearTimeout(this.fileRecords.get(filename)!.timeout);
    }

    const timeout = setTimeout(async () => {
      await this.deleteFile(filename);
    }, this.FILE_EXPIRY_TIME);

    this.fileRecords.set(filename, {
      filename,
      createdAt: new Date(),
      timeout
    });

    console.log(`📝 Tracking file for deletion: ${filename} (expires in 5 minutes)`);
  }

  /**
   * Check if a file has expired
   */
  isFileExpired(filename: string): boolean {
    const record = this.fileRecords.get(filename);
    if (!record) {
      return true; // File not tracked = expired
    }

    const now = new Date();
    const elapsed = now.getTime() - record.createdAt.getTime();
    return elapsed > this.FILE_EXPIRY_TIME;
  }

  /**
   * Delete a file and remove from tracking
   */
  private async deleteFile(filename: string): Promise<void> {
    try {
      const filePath = path.join(this.config.outputDir, filename);
      
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath);
        console.log(`🗑️ Auto-deleted expired file: ${filename}`);
      }

      // Remove from tracking
      const record = this.fileRecords.get(filename);
      if (record) {
        clearTimeout(record.timeout);
        this.fileRecords.delete(filename);
      }
    } catch (error) {
      console.error(`❌ Error deleting file ${filename}:`, error);
    }
  }

  /**
   * Manually remove a file from tracking (for immediate cleanup)
   */
  stopTracking(filename: string): void {
    const record = this.fileRecords.get(filename);
    if (record) {
      clearTimeout(record.timeout);
      this.fileRecords.delete(filename);
      console.log(`⏹️ Stopped tracking file: ${filename}`);
    }
  }

  /**
   * Get cleanup statistics
   */
  getStats(): { trackedFiles: number; oldestFile?: string; newestFile?: string } {
    const files = Array.from(this.fileRecords.values());
    
    if (files.length === 0) {
      return { trackedFiles: 0 };
    }

    const sorted = files.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    
    return {
      trackedFiles: files.length,
      oldestFile: sorted[0].filename,
      newestFile: sorted[sorted.length - 1].filename
    };
  }

  /**
   * Clean up all resources on server shutdown
   */
  cleanup(): void {
    console.log('🧹 Cleaning up CleanupManager...');
    
    for (const record of this.fileRecords.values()) {
      clearTimeout(record.timeout);
    }
    
    this.fileRecords.clear();
    console.log('✅ CleanupManager cleanup completed');
  }
}
