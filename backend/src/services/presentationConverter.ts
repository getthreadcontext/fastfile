import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class PresentationConverter {
  private supportedFormats: string[] = [];
  private alternativeTools: { [key: string]: boolean } = {
    libreoffice: false,
    unoconv: false
  };

  constructor() {
    this.initializeCapabilities();
  }

  private async initializeCapabilities(): Promise<void> {
    // Check for LibreOffice
    try {
      await execAsync('libreoffice --version');
      this.alternativeTools.libreoffice = true;
      this.supportedFormats.push('.ppt', '.pptx', '.odp');
      console.log('LibreOffice detected - presentation support enabled');
    } catch (error) {
      console.warn('LibreOffice not available - no presentation support');
    }

    // Check for unoconv (alternative LibreOffice interface)
    try {
      await execAsync('unoconv --version');
      this.alternativeTools.unoconv = true;
      if (!this.supportedFormats.includes('.ppt')) this.supportedFormats.push('.ppt', '.pptx', '.odp');
      console.log('unoconv detected - additional presentation support');
    } catch (error) {
      console.log('unoconv not available');
    }
  }

  isFormatSupported(format: string): boolean {
    return this.supportedFormats.includes(format.toLowerCase());
  }

  async convertPresentation(
    inputPath: string,
    outputPath: string,
    outputFormat: string
  ): Promise<string> {
    const inputFormat = path.extname(inputPath).toLowerCase();
    const targetFormat = outputFormat.startsWith('.') ? outputFormat : '.' + outputFormat;

    // Check if formats are supported
    if (!this.isFormatSupported(inputFormat)) {
      throw new Error(`Input format ${inputFormat} is not supported. Supported formats: ${this.supportedFormats.join(', ')}`);
    }

    if (!this.isFormatSupported(targetFormat)) {
      throw new Error(`Output format ${targetFormat} is not supported. Supported formats: ${this.supportedFormats.join(', ')}`);
    }

    // Try LibreOffice first
    if (this.alternativeTools.libreoffice) {
      try {
        return await this.convertWithLibreOffice(inputPath, outputPath, targetFormat);
      } catch (error) {
        console.warn('LibreOffice conversion failed, trying unoconv');
      }
    }

    // Try unoconv as fallback
    if (this.alternativeTools.unoconv) {
      try {
        return await this.convertWithUnoconv(inputPath, outputPath, targetFormat);
      } catch (error) {
        console.warn('unoconv conversion failed');
      }
    }

    throw new Error(`No suitable converter available for ${inputFormat} to ${targetFormat}. Please install LibreOffice.`);
  }

  private async convertWithLibreOffice(
    inputPath: string,
    outputPath: string,
    outputFormat: string
  ): Promise<string> {
    const outputDir = path.dirname(outputPath);
    
    let filterType: string;
    switch (outputFormat.toLowerCase()) {
      case '.pptx':
        filterType = 'Impress MS PowerPoint 2007 XML';
        break;
      case '.ppt':
        filterType = 'MS PowerPoint 97';
        break;
      case '.odp':
        filterType = 'impress8';
        break;
      case '.pdf':
        filterType = 'impress_pdf_Export';
        break;
      default:
        filterType = 'impress8';
    }

    try {
      const command = `libreoffice --headless --convert-to ${outputFormat.slice(1)} --filter-name="${filterType}" --outdir "${outputDir}" "${inputPath}"`;
      await execAsync(command);
      
      // LibreOffice creates files with specific naming, so we may need to rename
      const expectedOutput = path.join(outputDir, path.basename(inputPath, path.extname(inputPath)) + outputFormat);
      if (await fs.pathExists(expectedOutput) && expectedOutput !== outputPath) {
        await fs.move(expectedOutput, outputPath);
      }
      
      return outputPath;
    } catch (error) {
      throw new Error(`LibreOffice conversion failed: ${(error as Error).message}`);
    }
  }

  private async convertWithUnoconv(
    inputPath: string,
    outputPath: string,
    outputFormat: string
  ): Promise<string> {
    const outputDir = path.dirname(outputPath);
    const outputName = path.basename(outputPath, path.extname(outputPath));
    
    let format: string;
    switch (outputFormat.toLowerCase()) {
      case '.pptx':
        format = 'pptx';
        break;
      case '.ppt':
        format = 'ppt';
        break;
      case '.odp':
        format = 'odp';
        break;
      case '.pdf':
        format = 'pdf';
        break;
      default:
        format = outputFormat.slice(1);
    }

    try {
      const command = `unoconv -f ${format} -o "${outputPath}" "${inputPath}"`;
      await execAsync(command);
      
      return outputPath;
    } catch (error) {
      throw new Error(`unoconv conversion failed: ${(error as Error).message}`);
    }
  }

  // Convert presentation to images (useful for previews)
  async convertToImages(
    inputPath: string,
    outputDir: string,
    imageFormat: string = 'png'
  ): Promise<string[]> {
    if (!this.alternativeTools.libreoffice) {
      throw new Error('LibreOffice is required for presentation to image conversion');
    }

    try {
      // Convert to PDF first, then to images
      const tempPdfPath = path.join(outputDir, 'temp.pdf');
      await this.convertWithLibreOffice(inputPath, tempPdfPath, '.pdf');
      
      // Use ImageMagick to convert PDF pages to images
      const outputPattern = path.join(outputDir, `slide-%d.${imageFormat}`);
      const command = `magick "${tempPdfPath}" "${outputPattern}"`;
      await execAsync(command);
      
      // Clean up temp PDF
      await fs.remove(tempPdfPath);
      
      // Return list of created image files
      const files = await fs.readdir(outputDir);
      const imageFiles = files
        .filter(file => file.startsWith('slide-') && file.endsWith(`.${imageFormat}`))
        .map(file => path.join(outputDir, file))
        .sort();
      
      return imageFiles;
    } catch (error) {
      throw new Error(`Presentation to images conversion failed: ${(error as Error).message}`);
    }
  }
}
