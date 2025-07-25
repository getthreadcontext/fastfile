import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class SpreadsheetConverter {
  private supportedFormats: string[] = [];
  private alternativeTools: { [key: string]: boolean } = {
    libreoffice: false,
    xlsx: false,
    papaparse: false
  };

  constructor() {
    this.initializeCapabilities();
  }

  private async initializeCapabilities(): Promise<void> {
    // Always supported formats (using Node.js packages)
    this.supportedFormats = ['.csv', '.tsv'];

    // Check for LibreOffice
    try {
      await execAsync('libreoffice --version');
      this.alternativeTools.libreoffice = true;
      this.supportedFormats.push('.xls', '.xlsx', '.ods');
      console.log('LibreOffice detected - full spreadsheet support enabled');
    } catch (error) {
      console.warn('LibreOffice not available - limited spreadsheet support');
    }

    // Check for Node.js packages
    try {
      require.resolve('xlsx');
      this.alternativeTools.xlsx = true;
      if (!this.supportedFormats.includes('.xlsx')) this.supportedFormats.push('.xlsx');
      if (!this.supportedFormats.includes('.xls')) this.supportedFormats.push('.xls');
      console.log('XLSX package detected');
    } catch (error) {
      console.log('XLSX package not available');
    }

    try {
      require.resolve('papaparse');
      this.alternativeTools.papaparse = true;
      console.log('PapaParse package detected');
    } catch (error) {
      console.log('PapaParse package not available');
    }
  }

  isFormatSupported(format: string): boolean {
    return this.supportedFormats.includes(format.toLowerCase());
  }

  async convertSpreadsheet(
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

    // Handle CSV/TSV conversions
    if (this.isTextFormat(inputFormat) || this.isTextFormat(targetFormat)) {
      return this.convertTextFormats(inputPath, outputPath, inputFormat, targetFormat);
    }

    // Handle Office formats
    if (this.alternativeTools.libreoffice) {
      return this.convertWithLibreOffice(inputPath, outputPath, targetFormat);
    }

    if (this.alternativeTools.xlsx) {
      return this.convertWithXLSX(inputPath, outputPath, inputFormat, targetFormat);
    }

    throw new Error(`No suitable converter available for ${inputFormat} to ${targetFormat}. Please install LibreOffice or the XLSX package.`);
  }

  private isTextFormat(format: string): boolean {
    return ['.csv', '.tsv'].includes(format.toLowerCase());
  }

  private async convertTextFormats(
    inputPath: string,
    outputPath: string,
    inputFormat: string,
    outputFormat: string
  ): Promise<string> {
    if (this.alternativeTools.papaparse) {
      return this.convertWithPapaParse(inputPath, outputPath, inputFormat, outputFormat);
    }

    // Fallback: simple text conversion
    return this.convertTextFormatsSimple(inputPath, outputPath, inputFormat, outputFormat);
  }

  private async convertWithLibreOffice(
    inputPath: string,
    outputPath: string,
    outputFormat: string
  ): Promise<string> {
    const outputDir = path.dirname(outputPath);
    const outputName = path.basename(outputPath, path.extname(outputPath));
    
    let filterType: string;
    switch (outputFormat.toLowerCase()) {
      case '.xlsx':
        filterType = 'Calc MS Excel 2007 XML';
        break;
      case '.xls':
        filterType = 'MS Excel 97';
        break;
      case '.ods':
        filterType = 'calc8';
        break;
      case '.csv':
        filterType = 'Text - txt - csv (StarCalc)';
        break;
      case '.tsv':
        filterType = 'Text - txt - csv (StarCalc)';
        break;
      default:
        filterType = 'calc8';
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

  private async convertWithXLSX(
    inputPath: string,
    outputPath: string,
    inputFormat: string,
    outputFormat: string
  ): Promise<string> {
    try {
      const XLSX = require('xlsx');
      
      // Read the input file
      const workbook = XLSX.readFile(inputPath);
      
      // Convert based on output format
      switch (outputFormat.toLowerCase()) {
        case '.xlsx':
          XLSX.writeFile(workbook, outputPath, { bookType: 'xlsx' });
          break;
        case '.xls':
          XLSX.writeFile(workbook, outputPath, { bookType: 'xls' });
          break;
        case '.csv':
          const csvData = XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]);
          await fs.writeFile(outputPath, csvData);
          break;
        case '.tsv':
          const tsvData = XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]], { FS: '\t' });
          await fs.writeFile(outputPath, tsvData);
          break;
        default:
          throw new Error(`XLSX package doesn't support ${outputFormat} format`);
      }
      
      return outputPath;
    } catch (error) {
      throw new Error(`XLSX conversion failed: ${(error as Error).message}`);
    }
  }

  private async convertWithPapaParse(
    inputPath: string,
    outputPath: string,
    inputFormat: string,
    outputFormat: string
  ): Promise<string> {
    try {
      const Papa = require('papaparse');
      const inputData = await fs.readFile(inputPath, 'utf8');
      
      // Parse input
      const delimiter = inputFormat === '.tsv' ? '\t' : ',';
      const parsed = Papa.parse(inputData, { delimiter, header: false });
      
      // Convert output
      const outputDelimiter = outputFormat === '.tsv' ? '\t' : ',';
      const outputData = Papa.unparse(parsed.data, { delimiter: outputDelimiter });
      
      await fs.writeFile(outputPath, outputData);
      return outputPath;
    } catch (error) {
      throw new Error(`PapaParse conversion failed: ${(error as Error).message}`);
    }
  }

  private async convertTextFormatsSimple(
    inputPath: string,
    outputPath: string,
    inputFormat: string,
    outputFormat: string
  ): Promise<string> {
    try {
      const inputData = await fs.readFile(inputPath, 'utf8');
      
      // Simple delimiter conversion
      let outputData: string;
      if (inputFormat === '.csv' && outputFormat === '.tsv') {
        outputData = inputData.replace(/,/g, '\t');
      } else if (inputFormat === '.tsv' && outputFormat === '.csv') {
        outputData = inputData.replace(/\t/g, ',');
      } else {
        outputData = inputData; // Same format
      }
      
      await fs.writeFile(outputPath, outputData);
      return outputPath;
    } catch (error) {
      throw new Error(`Text format conversion failed: ${(error as Error).message}`);
    }
  }
}
