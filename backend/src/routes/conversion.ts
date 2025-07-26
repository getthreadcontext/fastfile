import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs-extra';
import { Config } from '../config/config';
import { DocumentConverter } from '../services/documentConverter';
import { MediaConverter } from '../services/mediaConverter';
import { ArchiveConverter } from '../services/archiveConverter';
import { SpreadsheetConverter } from '../services/spreadsheetConverter';
import { PresentationConverter } from '../services/presentationConverter';
import { FileUtils } from '../utils/fileUtils';
import { CleanupManager } from '../utils/cleanupManager';
import { upload } from '../middleware/index';
import type { ConversionResponse } from '../types/index';

const router = Router();
const config = Config.getInstance().get();
const cleanupManager = CleanupManager.getInstance();

// Initialize services
const documentConverter = new DocumentConverter();
const mediaConverter = new MediaConverter();
const archiveConverter = new ArchiveConverter();
const spreadsheetConverter = new SpreadsheetConverter();
const presentationConverter = new PresentationConverter();

// Get supported formats
router.get('/formats', (req: Request, res: Response) => {
  const formats = FileUtils.getSupportedFormats();
  res.json(formats);
});

// Upload and convert file
router.post('/convert', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { format, useCompression = 'false' } = req.body;
    if (!format) {
      return res.status(400).json({ error: 'Target format not specified' });
    }

    const inputPath = req.file.path;
    const inputFormat = path.extname(req.file.originalname).toLowerCase();
    const outputFormat = format.startsWith('.') ? format : `.${format}`;
    const shouldCompress = useCompression === 'true';
    
    const outputFilename = `${path.basename(req.file.originalname, inputFormat)}${outputFormat}`;
    const outputPath = path.join(config.outputDir, outputFilename);

    let resultPath: string;
    const fileType = FileUtils.getFileType(req.file.originalname);

    // Route to appropriate converter
    switch (fileType) {
      case 'document':
        resultPath = await documentConverter.convertDocument(
          inputPath,
          outputPath,
          inputFormat,
          outputFormat
        );
        break;

      case 'spreadsheet':
        resultPath = await spreadsheetConverter.convertSpreadsheet(
          inputPath,
          outputPath,
          outputFormat
        );
        break;

      case 'presentation':
        resultPath = await presentationConverter.convertPresentation(
          inputPath,
          outputPath,
          outputFormat
        );
        break;

      case 'video':
      case 'audio':
      case 'image':
        resultPath = await mediaConverter.convertMedia(
          inputPath,
          outputPath,
          outputFormat,
          'medium', // Default quality
          shouldCompress
        );
        break;

      case 'archive':
        resultPath = await archiveConverter.convertArchive(
          inputPath,
          outputPath,
          inputFormat,
          outputFormat
        );
        break;

      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }

    // Clean up input file
    await fs.remove(inputPath);

    // Track the output file for automatic cleanup after 5 minutes
    const finalOutputFilename = path.basename(resultPath);
    cleanupManager.trackFile(finalOutputFilename);

    const response: ConversionResponse = {
      success: true,
      message: 'Conversion completed successfully',
      downloadUrl: `/api/download/${finalOutputFilename}`,
      originalName: req.file.originalname,
      convertedName: finalOutputFilename
    };

    res.json(response);

  } catch (error) {
    console.error('Conversion error:', error);
    
    // Clean up files on error
    if (req.file?.path) {
      await fs.remove(req.file.path).catch(() => {});
    }

    res.status(500).json({ 
      error: 'Conversion failed', 
      details: (error as Error).message 
    });
  }
});

// Download converted file
router.get('/download/:filename', async (req: Request, res: Response) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(config.outputDir, filename);

    // Check if file has expired
    if (cleanupManager.isFileExpired(filename)) {
      return res.status(410).json({ 
        error: 'DOWNLOAD_EXPIRED',
        message: 'Download link has expired. Files are only available for 5 minutes after conversion.',
        code: 'DOWNLOAD_EXPIRED'
      });
    }

    // Check if file exists
    if (!(await fs.pathExists(filePath))) {
      return res.status(404).json({ 
        error: 'FILE_NOT_FOUND',
        message: 'File not found. It may have been deleted or never existed.',
        code: 'FILE_NOT_FOUND'
      });
    }

    // Set appropriate headers
    const stats = await fs.stat(filePath);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Determine content type
    const ext = path.extname(filename).toLowerCase();
    const contentType = getContentType(ext);
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    // Stop tracking and clean up file after download
    fileStream.on('end', async () => {
      try {
        cleanupManager.stopTracking(filename);
        await fs.remove(filePath);
        console.log(`🗑️ File downloaded and cleaned up: ${filename}`);
      } catch (error) {
        console.error('Error cleaning up file after download:', error);
      }
    });

    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      res.status(500).json({ 
        error: 'DOWNLOAD_ERROR',
        message: 'Error occurred while downloading the file.',
        code: 'DOWNLOAD_ERROR'
      });
    });

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ 
      error: 'DOWNLOAD_ERROR',
      message: 'Download failed due to server error.',
      code: 'DOWNLOAD_ERROR'
    });
  }
});

// Get supported formats
router.get('/formats', (req: Request, res: Response) => {
  const formats = FileUtils.getSupportedFormats();
  res.json(formats);
});

// Get cleanup statistics (for debugging/monitoring)
router.get('/cleanup/stats', (req: Request, res: Response) => {
  const stats = cleanupManager.getStats();
  res.json({
    ...stats,
    fileExpiryTime: '5 minutes',
    timestamp: new Date().toISOString()
  });
});

// Health check
router.get('/health', (req: Request, res: Response) => {
  const stats = cleanupManager.getStats();
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    trackedFiles: stats.trackedFiles
  });
});

// Helper function to determine content type
function getContentType(extension: string): string | null {
  const contentTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.md': 'text/markdown',
    '.mp4': 'video/mp4',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed'
  };
  
  return contentTypes[extension] || null;
}

export default router;
