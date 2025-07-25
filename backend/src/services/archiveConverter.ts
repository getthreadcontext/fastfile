import fs from 'fs-extra';
import path from 'path';
import archiver from 'archiver';
import unzipper from 'unzipper';
import tar from 'tar';
import StreamZip from 'node-stream-zip';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class ArchiveConverter {
  private supportedFormats: string[] = [];

  constructor() {
    this.initializeSupportedFormats();
  }

  private async initializeSupportedFormats(): Promise<void> {
    // Supported formats using Node.js packages only
    this.supportedFormats = ['.zip', '.jar', '.tar', '.tar.gz', '.tar.bz2', '.tar.xz', '.tgz'];
  }

  isFormatSupported(format: string): boolean {
    return this.supportedFormats.includes(format.toLowerCase());
  }

  getSupportedFormats(): string[] {
    return [...this.supportedFormats];
  }
  async convertArchive(
    inputPath: string,
    outputPath: string,
    inputFormat: string,
    outputFormat: string
  ): Promise<string> {
    // Handle extraction (archive to folder)
    if (outputFormat === '.folder') {
      return this.extractArchive(inputPath, outputPath, inputFormat);
    }
    
    // Handle compression (folder/files to archive)
    if (inputFormat === '.folder') {
      return this.createArchive(inputPath, outputPath, outputFormat);
    }
    
    // Handle archive to archive conversion
    return this.convertArchiveFormat(inputPath, outputPath, inputFormat, outputFormat);
  }

  private async extractArchive(inputPath: string, outputPath: string, inputFormat: string): Promise<string> {
    const extractDir = path.join(path.dirname(outputPath), path.basename(outputPath, '.folder'));
    await fs.ensureDir(extractDir);

    const format = inputFormat.toLowerCase();

    // Check if format is supported
    if (!this.isFormatSupported(format)) {
      throw new Error(`Archive format ${inputFormat} is not supported. Supported formats: ${this.supportedFormats.join(', ')}`);
    }

    switch (format) {
      case '.zip':
      case '.jar':
        await this.extractZip(inputPath, extractDir);
        break;
      
      case '.tar':
      case '.tar.gz':
      case '.tar.bz2':
      case '.tar.xz':
      case '.tgz':
        await this.extractTarWithNode(inputPath, extractDir);
        break;
      
      default:
        throw new Error(`Unsupported archive format for extraction: ${inputFormat}`);
    }

    // Create a summary file
    const files = await this.listDirectoryContents(extractDir);
    const summaryPath = path.join(extractDir, 'extraction_summary.txt');
    await fs.writeFile(summaryPath, `Extracted from: ${path.basename(inputPath)}\nFiles extracted: ${files.length}\n\nContents:\n${files.join('\n')}`);
    
    return extractDir;
  }

  private async createArchive(inputPath: string, outputPath: string, outputFormat: string): Promise<string> {
    const format = outputFormat.toLowerCase();

    // Check if format is supported for creation
    if (!this.isFormatSupported(format) && format !== '.rar') {
      throw new Error(`Archive format ${outputFormat} is not supported for creation. Supported formats: ${this.supportedFormats.join(', ')}`);
    }

    switch (format) {
      case '.zip':
      case '.jar':
        return this.createZip(inputPath, outputPath);
      
      case '.tar':
        return this.createTarWithNode(inputPath, outputPath, 'none');
      
      case '.tar.gz':
      case '.tgz':
        return this.createTarWithNode(inputPath, outputPath, 'gzip');
      
      case '.tar.bz2':
        return this.createTarWithNode(inputPath, outputPath, 'bzip2');
      
      case '.tar.xz':
        return this.createTarWithNode(inputPath, outputPath, 'xz');
      
      default:
        throw new Error(`Unsupported archive format for creation: ${outputFormat}. Supported formats: ${this.supportedFormats.join(', ')}`);
    }
  }

  private async convertArchiveFormat(inputPath: string, outputPath: string, inputFormat: string, outputFormat: string): Promise<string> {
    // Extract to temporary directory
    const tempDir = path.join(path.dirname(outputPath), `temp_${Date.now()}`);
    await this.extractArchive(inputPath, tempDir + '.folder', inputFormat);
    
    // Create new archive from extracted content
    const result = await this.createArchive(tempDir, outputPath, outputFormat);
    
    // Clean up temporary directory
    await fs.remove(tempDir);
    
    return result;
  }

  private async extractZip(inputPath: string, extractDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.createReadStream(inputPath)
        .pipe(unzipper.Extract({ path: extractDir }))
        .on('close', resolve)
        .on('error', reject);
    });
  }

  private async extractTarWithNode(inputPath: string, extractDir: string): Promise<void> {
    try {
      await tar.extract({
        file: inputPath,
        cwd: extractDir
      });
    } catch (error) {
      throw new Error(`TAR extraction failed: ${(error as Error).message}`);
    }
  }

  private async createZip(inputPath: string, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve(outputPath));
      archive.on('error', reject);

      archive.pipe(output);
      
      // Check if input is a directory or file
      const stats = fs.statSync(inputPath);
      if (stats.isDirectory()) {
        archive.directory(inputPath, false);
      } else {
        archive.file(inputPath, { name: path.basename(inputPath) });
      }
      
      archive.finalize();
    });
  }

  private async createTarWithNode(inputPath: string, outputPath: string, compression: 'none' | 'gzip' | 'bzip2' | 'xz'): Promise<string> {
    try {
      const options: any = {
        file: outputPath,
        cwd: path.dirname(inputPath)
      };

      switch (compression) {
        case 'gzip':
          options.gzip = true;
          break;
        case 'bzip2':
          options.bzip = true;
          break;
        case 'xz':
          options.xz = true;
          break;
        // 'none' requires no additional options
      }

      await tar.create(options, [path.basename(inputPath)]);
      return outputPath;
    } catch (error) {
      throw new Error(`TAR creation failed: ${(error as Error).message}`);
    }
  }

  private async listDirectoryContents(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    const scanDirectory = async (currentDir: string, prefix: string = ''): Promise<void> => {
      const items = await fs.readdir(currentDir);
      
      for (const item of items) {
        const itemPath = path.join(currentDir, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isDirectory()) {
          files.push(`${prefix}${item}/`);
          await scanDirectory(itemPath, `${prefix}${item}/`);
        } else {
          files.push(`${prefix}${item}`);
        }
      }
    };
    
    await scanDirectory(dir);
    return files;
  }
}
