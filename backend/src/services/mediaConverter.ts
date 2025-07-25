import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs-extra';
import { exec } from 'child_process';
import { promisify } from 'util';
import { QualitySettings } from '../types';

const execAsync = promisify(exec);

export class MediaConverter {
  private supportedFormats: Set<string> = new Set();
  private alternativeTools: { [key: string]: boolean } = {
    imagemagick: false,
    graphicsmagick: false,
    sharp: false
  };

  constructor() {
    this.initializeCapabilities();
  }

  private async initializeCapabilities(): Promise<void> {
    // Check FFmpeg supported formats
    try {
      const { stdout } = await execAsync('ffmpeg -formats');
      this.parseSupportedFormats(stdout);
    } catch (error) {
      console.warn('Could not get FFmpeg formats:', error);
    }

    // Check for alternative tools
    await this.checkAlternativeTools();
  }

  private parseSupportedFormats(output: string): void {
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes('E ') || line.includes('DE')) {
        // Extract format name (after the flags)
        const match = line.match(/[DE]\s+(\w+)/);
        if (match) {
          this.supportedFormats.add(match[1].toLowerCase());
        }
      }
    }
  }

  private async checkAlternativeTools(): Promise<void> {
    // Check ImageMagick
    try {
      await execAsync('magick -version');
      this.alternativeTools.imagemagick = true;
      console.log('ImageMagick detected');
    } catch (error) {
      try {
        await execAsync('convert -version');
        this.alternativeTools.imagemagick = true;
        console.log('ImageMagick (legacy convert) detected');
      } catch (error2) {
        console.log('ImageMagick not available');
      }
    }

    // Check GraphicsMagick
    try {
      await execAsync('gm version');
      this.alternativeTools.graphicsmagick = true;
      console.log('GraphicsMagick detected');
    } catch (error) {
      console.log('GraphicsMagick not available');
    }

    // Check if Sharp is available (Node.js package)
    try {
      require.resolve('sharp');
      this.alternativeTools.sharp = true;
      console.log('Sharp package detected');
    } catch (error) {
      console.log('Sharp package not available');
    }
  }
  async convertMedia(
    inputPath: string,
    outputPath: string,
    format: string,
    quality: 'low' | 'medium' | 'high'
  ): Promise<string> {
    const outputFormat = format.startsWith('.') ? format.slice(1) : format;
    
    // Check if this is a format that needs special handling
    if (this.needsAlternativeTool(outputFormat)) {
      return this.convertWithAlternativeTool(inputPath, outputPath, outputFormat, quality);
    }

    // Check if FFmpeg supports this format
    if (!this.isFFmpegFormatSupported(outputFormat)) {
      console.warn(`FFmpeg doesn't support ${outputFormat}, trying alternative tools`);
      return this.convertWithAlternativeTool(inputPath, outputPath, outputFormat, quality);
    }

    // Use FFmpeg for supported formats
    return this.convertWithFFmpeg(inputPath, outputPath, outputFormat, quality);
  }

  private needsAlternativeTool(format: string): boolean {
    const specialFormats = ['heic', 'ico', 'psd', 'eps', 'ai', 'cr2', 'arw', 'dng', 'raf', 'nef', 'rw2', 'crw', 'orf', 'srw', 'x3f', 'dcr', 'mrw', '3fr', 'erf', 'mef', 'mos', 'nrw', 'pef', 'rwl', 'srf'];
    return specialFormats.includes(format.toLowerCase());
  }

  private isFFmpegFormatSupported(format: string): boolean {
    return this.supportedFormats.has(format.toLowerCase());
  }

  private async convertWithAlternativeTool(
    inputPath: string,
    outputPath: string,
    format: string,
    quality: 'low' | 'medium' | 'high'
  ): Promise<string> {
    const outputFormat = format.toLowerCase();

    // Try ImageMagick first (best support for various formats)
    if (this.alternativeTools.imagemagick) {
      try {
        return await this.convertWithImageMagick(inputPath, outputPath, outputFormat, quality);
      } catch (error) {
        console.warn('ImageMagick conversion failed:', error);
      }
    }

    // Try GraphicsMagick as fallback
    if (this.alternativeTools.graphicsmagick) {
      try {
        return await this.convertWithGraphicsMagick(inputPath, outputPath, outputFormat, quality);
      } catch (error) {
        console.warn('GraphicsMagick conversion failed:', error);
      }
    }

    // Try Sharp for image formats
    if (this.alternativeTools.sharp && this.isImageFormat(outputFormat)) {
      try {
        return await this.convertWithSharp(inputPath, outputPath, outputFormat, quality);
      } catch (error) {
        console.warn('Sharp conversion failed:', error);
      }
    }

    // Final fallback: try FFmpeg anyway (might work with different settings)
    try {
      return await this.convertWithFFmpeg(inputPath, outputPath, outputFormat, quality);
    } catch (error) {
      throw new Error(`Conversion to ${format} failed: No suitable converter available. Please install ImageMagick, GraphicsMagick, or Sharp for better format support. Original error: ${(error as Error).message}`);
    }
  }

  private getQualitySettings(format: string, quality: 'low' | 'medium' | 'high'): QualitySettings {
    const qualityMap = {
      low: { video: '500k', audio: '96k' },
      medium: { video: '1000k', audio: '128k' },
      high: { video: '2000k', audio: '192k' }
    };
    return qualityMap[quality] || qualityMap.medium;
  }

  private applySimpleFormatSettings(
    command: any,
    format: string,
    inputExt: string,
    quality: 'low' | 'medium' | 'high'
  ): any {
    const outputFormat = format.toLowerCase();
    
    // Basic quality settings
    const qualityMap = {
      low: { crf: '28', bitrate: '500k', audioBitrate: '96k' },
      medium: { crf: '23', bitrate: '1000k', audioBitrate: '128k' },
      high: { crf: '18', bitrate: '2000k', audioBitrate: '192k' }
    };
    
    const qualitySettings = qualityMap[quality];

    switch (outputFormat) {
      // Video formats
      case 'mp4':
        return command
          .videoCodec('libx264')
          .audioCodec('aac')
          .outputOptions(['-crf', qualitySettings.crf])
          .format('mp4');

      case 'avi':
        return command
          .videoCodec('libx264')
          .audioCodec('mp3')
          .outputOptions(['-b:v', qualitySettings.bitrate])
          .format('avi');

      case 'mov':
        return command
          .videoCodec('libx264')
          .audioCodec('aac')
          .outputOptions(['-crf', qualitySettings.crf])
          .format('mov');

      case 'webm':
        return command
          .videoCodec('libvpx-vp9')
          .audioCodec('libvorbis')
          .outputOptions(['-crf', qualitySettings.crf])
          .format('webm');

      // Audio formats
      case 'mp3':
        return command
          .audioCodec('libmp3lame')
          .outputOptions(['-b:a', qualitySettings.audioBitrate])
          .format('mp3');

      case 'aac':
        return command
          .audioCodec('aac')
          .outputOptions(['-b:a', qualitySettings.audioBitrate])
          .format('adts');

      case 'wav':
        return command
          .audioCodec('pcm_s16le')
          .format('wav');

      case 'flac':
        return command
          .audioCodec('flac')
          .format('flac');

      case 'ogg':
        return command
          .audioCodec('libvorbis')
          .outputOptions(['-b:a', qualitySettings.audioBitrate])
          .format('ogg');

      // Image formats
      case 'jpg':
      case 'jpeg':
        return command
          .outputOptions(['-vframes', '1'])
          .outputOptions(['-q:v', this.getJpegQuality(quality)])
          .format('image2');

      case 'png':
        return command
          .outputOptions(['-vframes', '1'])
          .format('image2');

      case 'gif':
        if (this.isVideoFile(inputExt)) {
          return command
            .outputOptions(['-vf', 'fps=10,scale=320:-1:flags=lanczos'])
            .outputOptions(['-t', '10'])
            .format('gif');
        } else {
          return command
            .outputOptions(['-vframes', '1'])
            .format('gif');
        }

      case 'bmp':
        return command
          .outputOptions(['-vframes', '1'])
          .format('image2');

      case 'webp':
        return command
          .outputOptions(['-vframes', '1'])
          .outputOptions(['-quality', '80'])
          .format('webp');

      case 'tiff':
      case 'tif':
        return command
          .outputOptions(['-vframes', '1'])
          .format('image2');

      // Default case - just set the format
      default:
        return command.format(outputFormat);
    }
  }

  private getJpegQuality(quality: 'low' | 'medium' | 'high'): string {
    switch (quality) {
      case 'low': return '8';
      case 'medium': return '5';
      case 'high': return '2';
      default: return '5';
    }
  }

  private isVideoFile(extension: string): boolean {
    const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.mpeg', '.mpg', '.wmv', '.3gp', '.m4v'];
    return videoExtensions.includes(extension.toLowerCase());
  }

  private applyFormatSettings(
    command: ffmpeg.FfmpegCommand,
    format: string,
    inputExt: string,
    qualitySettings: QualitySettings
  ): ffmpeg.FfmpegCommand {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif', '.heic', '.ico', '.svg', '.avif', '.psd', '.eps', '.ai', '.cr2', '.arw', '.dng', '.raf', '.nef', '.rw2', '.crw', '.orf', '.srw', '.x3f', '.dcr', '.mrw', '.3fr', '.erf', '.mef', '.mos', '.nrw', '.pef', '.rwl', '.srf'];

    switch (format) {
      // Video formats
      case 'mp4':
        return command
          .format('mp4')
          .videoCodec('libx264')
          .audioCodec('aac')
          .videoBitrate(qualitySettings.video)
          .audioBitrate(qualitySettings.audio);

      case 'webm':
        return command
          .format('webm')
          .videoCodec('libvpx-vp9')
          .audioCodec('libopus')
          .videoBitrate(qualitySettings.video)
          .audioBitrate(qualitySettings.audio);

      case 'avi':
        return command
          .format('avi')
          .videoCodec('libx264')
          .audioCodec('aac');

      case 'mkv':
        return command
          .format('matroska')
          .videoCodec('libx264')
          .audioCodec('aac');

      case 'mov':
        return command
          .format('mov')
          .videoCodec('libx264')
          .audioCodec('aac');

      // Audio formats
      case 'mp3':
        return command
          .format('mp3')
          .audioCodec('libmp3lame')
          .audioBitrate(qualitySettings.audio);

      case 'wav':
        return command
          .format('wav')
          .audioCodec('pcm_s16le');

      case 'aac':
        return command
          .format('aac')
          .audioCodec('aac')
          .audioBitrate(qualitySettings.audio);

      case 'flac':
        return command
          .format('flac')
          .audioCodec('flac');

      case 'ogg':
        return command
          .format('ogg')
          .audioCodec('libvorbis')
          .audioBitrate(qualitySettings.audio);

      case 'wma':
        return command
          .format('asf')
          .audioCodec('wmav2')
          .audioBitrate(qualitySettings.audio);

      case 'opus':
        return command
          .format('ogg')
          .audioCodec('libopus')
          .audioBitrate(qualitySettings.audio);

      // Image formats
      case 'jpg':
      case 'jpeg':
        if (imageExtensions.includes(inputExt)) {
          return command
            .format('image2')
            .videoCodec('mjpeg')
            .outputOptions(['-q:v', this.getImageQuality('jpeg', qualitySettings)]);
        } else {
          return command
            .format('image2')
            .videoCodec('mjpeg')
            .outputOptions(['-vframes', '1', '-q:v', this.getImageQuality('jpeg', qualitySettings)]);
        }

      case 'png':
        if (imageExtensions.includes(inputExt)) {
          return command
            .format('image2')
            .videoCodec('png');
        } else {
          return command
            .format('image2')
            .videoCodec('png')
            .outputOptions(['-vframes', '1']);
        }

      case 'gif':
        if (imageExtensions.includes(inputExt)) {
          return command
            .format('gif')
            .outputOptions(['-vf', 'scale=320:-1:flags=lanczos']);
        } else {
          return command
            .format('gif')
            .outputOptions(['-vf', 'fps=10,scale=320:-1:flags=lanczos'])
            .outputOptions(['-t', '10']);
        }

      case 'webp':
        return command
          .format('webp')
          .videoCodec('libwebp');

      case 'bmp':
        if (imageExtensions.includes(inputExt)) {
          return command
            .format('image2')
            .videoCodec('bmp');
        } else {
          return command
            .format('image2')
            .videoCodec('bmp')
            .outputOptions(['-vframes', '1']);
        }

      case 'tiff':
        return command
          .format('image2')
          .videoCodec('tiff');

      case 'heic':
        return command
          .format('heif')
          .videoCodec('libheif');

      case 'avif':
        return command
          .format('avif')
          .videoCodec('libavif')
          .outputOptions(['-crf', '30']);

      default:
        return command.format(format);
    }
  }

  private getImageQuality(format: string, qualitySettings: QualitySettings): string {
    // For JPEG quality (1-31, lower is better)
    if (format === 'jpeg') {
      const quality = qualitySettings.video;
      if (quality.includes('500k')) return '8'; // low
      if (quality.includes('1000k')) return '5'; // medium
      return '2'; // high
    }
    return '5';
  }

  private isSpecialImageFormat(format: string): boolean {
    const specialFormats = ['.ico', '.psd', '.xcf', '.eps', '.ai', '.indd'];
    return specialFormats.includes(format.toLowerCase());
  }

  private async convertSpecialImageFormat(inputPath: string, outputPath: string, outputFormat: string): Promise<string> {
    const tempPngPath = outputPath.replace(path.extname(outputPath), '.png');
    
    try {
      // First convert to PNG using FFmpeg with proper format specification
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .output(tempPngPath)
          .outputOptions([
            '-y',
            '-f', 'image2',
            '-vframes', '1',
            '-c:v', 'png'
          ])
          .on('end', () => resolve())
          .on('error', reject)
          .run();
      });

      // Then convert PNG to target format using ImageMagick if available
      switch (outputFormat.toLowerCase()) {
        case '.ico':
          await this.convertToIco(tempPngPath, outputPath);
          break;
        
        default:
          // For other special formats, keep as PNG for now
          await fs.move(tempPngPath, outputPath);
          break;
      }

      // Clean up temp file if it still exists
      if (await fs.pathExists(tempPngPath) && tempPngPath !== outputPath) {
        await fs.remove(tempPngPath);
      }

      return outputPath;
    } catch (error) {
      console.error('Special image format conversion error:', error);
      
      // Fallback: try direct conversion without intermediate PNG
      try {
        await this.convertToIcoDirectly(inputPath, outputPath);
        return outputPath;
      } catch (fallbackError) {
        console.error('Direct ICO conversion also failed:', fallbackError);
        // Clean up temp file on error
        if (await fs.pathExists(tempPngPath)) {
          await fs.remove(tempPngPath);
        }
        throw new Error(`Image conversion failed: ${(error as Error).message}`);
      }
    }
  }

  private async convertToIco(inputPath: string, outputPath: string): Promise<void> {
    try {
      // Try using ImageMagick convert command
      await execAsync(`magick "${inputPath}" -resize 256x256 "${outputPath}"`);
    } catch (error) {
      console.warn('ImageMagick not available, trying alternative ICO conversion');
      
      try {
        // Alternative: use FFmpeg with specific ICO settings
        await new Promise<void>((resolve, reject) => {
          ffmpeg(inputPath)
            .output(outputPath)
            .outputOptions([
              '-y',
              '-vf', 'scale=256:256:flags=lanczos',
              '-f', 'image2',
              '-c:v', 'png'
            ])
            .on('end', () => resolve())
            .on('error', reject)
            .run();
        });
      } catch (ffmpegError) {
        // Final fallback: just rename PNG to ICO
        console.warn('ICO conversion failed, keeping as PNG with ICO extension');
        await fs.move(inputPath, outputPath);
      }
    }
  }

  private async convertToIcoDirectly(inputPath: string, outputPath: string): Promise<void> {
    // Try direct conversion with different FFmpeg approaches
    const methods = [
      // Method 1: Simple image2 format
      () => new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .output(outputPath)
          .outputOptions([
            '-y',
            '-vf', 'scale=256:256',
            '-f', 'image2'
          ])
          .on('end', () => resolve())
          .on('error', reject)
          .run();
      }),
      
      // Method 2: Force codec
      () => new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .output(outputPath)
          .outputOptions([
            '-y',
            '-vf', 'scale=256:256',
            '-c:v', 'bmp'
          ])
          .on('end', () => resolve())
          .on('error', reject)
          .run();
      }),

      // Method 3: Just copy and rename
      async () => {
        const tempPath = outputPath.replace('.ico', '.png');
        await fs.copy(inputPath, tempPath);
        await fs.move(tempPath, outputPath);
      }
    ];

    for (const method of methods) {
      try {
        await method();
        return;
      } catch (error) {
        console.warn('ICO conversion method failed, trying next method:', error);
      }
    }

    throw new Error('All ICO conversion methods failed');
  }

  private async convertWithFFmpeg(
    inputPath: string,
    outputPath: string,
    format: string,
    quality: 'low' | 'medium' | 'high'
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const inputExt = path.extname(inputPath).toLowerCase();
      
      let command = ffmpeg(inputPath)
        .output(outputPath)
        .outputOptions(['-y']); // Always overwrite output file

      // Apply simple format-specific settings for common formats
      command = this.applySimpleFormatSettings(command, format, inputExt, quality);

      command
        .on('start', (commandLine) => {
          console.log('FFmpeg command:', commandLine);
        })
        .on('stderr', (stderrLine) => {
          console.log('FFmpeg stderr:', stderrLine);
        })
        .on('end', () => {
          console.log('Conversion completed');
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          reject(err);
        })
        .run();
    });
  }

  private async convertWithImageMagick(
    inputPath: string,
    outputPath: string,
    format: string,
    quality: 'low' | 'medium' | 'high'
  ): Promise<string> {
    const qualityValue = this.getImageMagickQuality(quality);
    let command: string;

    // Use magick command for newer ImageMagick versions, convert for older versions
    const magickCmd = 'magick';

    switch (format.toLowerCase()) {
      case 'heic':
        command = `${magickCmd} "${inputPath}" -quality ${qualityValue} "${outputPath}"`;
        break;
      case 'ico':
        command = `${magickCmd} "${inputPath}" -resize 256x256 -quality ${qualityValue} "${outputPath}"`;
        break;
      case 'eps':
        command = `${magickCmd} "${inputPath}" -quality ${qualityValue} "${outputPath}"`;
        break;
      case 'psd':
        command = `${magickCmd} "${inputPath}" -flatten -quality ${qualityValue} "${outputPath}"`;
        break;
      default:
        command = `${magickCmd} "${inputPath}" -quality ${qualityValue} "${outputPath}"`;
        break;
    }

    try {
      await execAsync(command);
      return outputPath;
    } catch (error) {
      throw new Error(`ImageMagick conversion failed: ${(error as Error).message}`);
    }
  }

  private async convertWithGraphicsMagick(
    inputPath: string,
    outputPath: string,
    format: string,
    quality: 'low' | 'medium' | 'high'
  ): Promise<string> {
    const qualityValue = this.getImageMagickQuality(quality);
    let command: string;

    switch (format.toLowerCase()) {
      case 'heic':
        command = `gm convert "${inputPath}" -quality ${qualityValue} "${outputPath}"`;
        break;
      case 'ico':
        command = `gm convert "${inputPath}" -resize 256x256 -quality ${qualityValue} "${outputPath}"`;
        break;
      default:
        command = `gm convert "${inputPath}" -quality ${qualityValue} "${outputPath}"`;
        break;
    }

    try {
      await execAsync(command);
      return outputPath;
    } catch (error) {
      throw new Error(`GraphicsMagick conversion failed: ${(error as Error).message}`);
    }
  }

  private async convertWithSharp(
    inputPath: string,
    outputPath: string,
    format: string,
    quality: 'low' | 'medium' | 'high'
  ): Promise<string> {
    try {
      const sharp = require('sharp');
      const qualityValue = this.getSharpQuality(quality);
      
      let pipeline = sharp(inputPath);

      switch (format.toLowerCase()) {
        case 'heic':
          pipeline = pipeline.heif({ quality: qualityValue });
          break;
        case 'jpeg':
        case 'jpg':
          pipeline = pipeline.jpeg({ quality: qualityValue });
          break;
        case 'png':
          pipeline = pipeline.png({ quality: qualityValue });
          break;
        case 'webp':
          pipeline = pipeline.webp({ quality: qualityValue });
          break;
        case 'avif':
          pipeline = pipeline.avif({ quality: qualityValue });
          break;
        case 'tiff':
        case 'tif':
          pipeline = pipeline.tiff({ quality: qualityValue });
          break;
        default:
          throw new Error(`Sharp doesn't support ${format} format`);
      }

      await pipeline.toFile(outputPath);
      return outputPath;
    } catch (error) {
      throw new Error(`Sharp conversion failed: ${(error as Error).message}`);
    }
  }

  private isImageFormat(format: string): boolean {
    const imageFormats = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'tif', 'heic', 'ico', 'svg', 'avif', 'psd', 'eps', 'ai'];
    return imageFormats.includes(format.toLowerCase());
  }

  private getImageMagickQuality(quality: 'low' | 'medium' | 'high'): string {
    switch (quality) {
      case 'low': return '60';
      case 'medium': return '80';
      case 'high': return '95';
      default: return '80';
    }
  }

  private getSharpQuality(quality: 'low' | 'medium' | 'high'): number {
    switch (quality) {
      case 'low': return 60;
      case 'medium': return 80;
      case 'high': return 95;
      default: return 80;
    }
  }
}
