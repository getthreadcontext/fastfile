import fs from 'fs-extra';
import path from 'path';
import mammoth from 'mammoth';
import pdf from 'pdf-parse';
import { htmlToText } from 'html-to-text';
import { marked } from 'marked';
import TurndownService from 'turndown';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { StructuredContent } from '../types';

export class DocumentConverter {
  private turndownService: TurndownService;

  constructor() {
    this.turndownService = new TurndownService();
  }

  async convertDocument(
    inputPath: string, 
    outputPath: string, 
    inputFormat: string, 
    outputFormat: string
  ): Promise<string> {
    const inputBuffer = await fs.readFile(inputPath);
    const structuredContent = await this.parseInput(inputBuffer, inputFormat);
    const outputBuffer = await this.generateOutput(structuredContent, outputFormat, inputFormat);
    
    await fs.writeFile(outputPath, outputBuffer);
    return outputPath;
  }

  private async parseInput(inputBuffer: Buffer, inputFormat: string): Promise<StructuredContent> {
    let content = '';
    let structuredContent: StructuredContent = { 
      title: '', 
      paragraphs: [], 
      metadata: {} 
    }; 

    switch (inputFormat) {
      case '.pdf':
        const pdfData = await pdf(inputBuffer);
        content = pdfData.text;
        const pdfLines = content.split('\n').filter(line => line.trim());
        structuredContent.title = pdfLines[0] || 'Converted PDF Document';
        structuredContent.paragraphs = pdfLines.slice(1).filter(line => line.length > 10);
        break;

      case '.docx':
      case '.dotx':
        const docxResult = await mammoth.extractRawText({ buffer: inputBuffer });
        content = docxResult.value;
        const docxLines = content.split('\n').filter(line => line.trim());
        structuredContent.title = docxLines[0] || 'Converted DOCX Document';
        structuredContent.paragraphs = docxLines.slice(1).filter(line => line.length > 5);
        break;

      case '.doc':
        const docText = inputBuffer.toString('utf8');
        content = docText.replace(/[\x00-\x1F\x7F-\xFF]/g, ' ')
                        .replace(/\s+/g, ' ')
                        .split(' ')
                        .filter(word => word.length > 2 && /^[a-zA-Z0-9\s.,!?'-]+$/.test(word))
                        .join(' ');
        structuredContent.title = 'Converted DOC Document';
        structuredContent.paragraphs = content.split('.').filter(p => p.trim().length > 20);
        break;

      case '.odt':
        try {
          const odfContent = inputBuffer.toString('utf8');
          const titleMatch = odfContent.match(/<text:h[^>]*>(.*?)<\/text:h>/);
          const paragraphMatches = odfContent.match(/<text:p[^>]*>(.*?)<\/text:p>/g);
          
          structuredContent.title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '') : 'Converted ODT Document';
          structuredContent.paragraphs = paragraphMatches ? 
            paragraphMatches.map(p => p.replace(/<[^>]*>/g, '').trim()).filter(p => p.length > 10) : 
            ['Content could not be fully parsed from ODT format'];
        } catch (err) {
          structuredContent.title = 'ODT Document';
          structuredContent.paragraphs = ['Error reading ODT file: ' + (err as Error).message];
        }
        break;

      case '.html':
      case '.htm':
        const htmlContent = inputBuffer.toString('utf8');
        const titleHtmlMatch = htmlContent.match(/<title[^>]*>(.*?)<\/title>/i);
        structuredContent.title = titleHtmlMatch ? titleHtmlMatch[1] : 'HTML Document';
        
        content = htmlToText(htmlContent, {
          wordwrap: 80
        });
        structuredContent.paragraphs = content.split('\n\n').filter(p => p.trim().length > 10);
        break;

      case '.md':
        content = inputBuffer.toString('utf8');
        const mdLines = content.split('\n');
        const titleLine = mdLines.find(line => line.startsWith('#'));
        structuredContent.title = titleLine ? titleLine.replace(/^#+\s*/, '') : 'Markdown Document';
        structuredContent.paragraphs = mdLines.filter(line => 
          !line.startsWith('#') && line.trim().length > 0
        );
        break;

      case '.txt':
        content = inputBuffer.toString('utf8');
        const txtLines = content.split('\n').filter(line => line.trim());
        structuredContent.title = txtLines[0] || 'Text Document';
        structuredContent.paragraphs = txtLines.slice(1);
        break;

      case '.rtf':
        content = inputBuffer.toString('utf8');
        content = content.replace(/\\[a-z]+\d*\s?/g, '')
                        .replace(/[{}]/g, '')
                        .replace(/\s+/g, ' ')
                        .trim();
        structuredContent.title = 'RTF Document';
        structuredContent.paragraphs = content.split('.').filter(p => p.trim().length > 10);
        break;

      case '.tex':
        content = inputBuffer.toString('utf8');
        const titleMatch = content.match(/\\title\{([^}]+)\}/);
        const sectionMatches = content.match(/\\section\{([^}]+)\}/g);
        
        structuredContent.title = titleMatch ? titleMatch[1] : 'LaTeX Document';
        structuredContent.paragraphs = sectionMatches ? 
          sectionMatches.map(s => s.replace(/\\section\{([^}]+)\}/, '$1')) : 
          content.replace(/\\[a-z]+\{[^}]*\}/g, '').split('\n').filter(line => line.trim());
        break;

      default:
        structuredContent.title = `Converted ${inputFormat.toUpperCase().slice(1)} Document`;
        structuredContent.paragraphs = ['Basic content extraction'];
        break;
    }

    return structuredContent;
  }

  private async generateOutput(
    structuredContent: StructuredContent, 
    outputFormat: string, 
    inputFormat: string
  ): Promise<Buffer> {
    switch (outputFormat) {
      case '.txt':
        const txtOutput = `${structuredContent.title}\n${'='.repeat(structuredContent.title.length)}\n\n${structuredContent.paragraphs.join('\n\n')}\n\n--- Converted by FastFile ---`;
        return Buffer.from(txtOutput, 'utf8');

      case '.md':
        let mdOutput = `# ${structuredContent.title}\n\n`;
        if (inputFormat === '.html' || inputFormat === '.htm') {
          const htmlContent = structuredContent.paragraphs.join('\n\n');
          mdOutput += this.turndownService.turndown(htmlContent);
        } else {
          mdOutput += structuredContent.paragraphs.map(p => `${p}\n`).join('\n');
        }
        mdOutput += `\n\n---\n*Converted from ${inputFormat.slice(1).toUpperCase()} by FastFile*`;
        return Buffer.from(mdOutput, 'utf8');

      case '.html':
        return this.generateHtmlOutput(structuredContent, inputFormat);

      case '.docx':
      case '.dotx':
        return this.generateDocxOutput(structuredContent, inputFormat);

      case '.rtf':
        return this.generateRtfOutput(structuredContent, inputFormat);

      case '.tex':
        return this.generateTexOutput(structuredContent, inputFormat);

      case '.odt':
        return this.generateOdtOutput(structuredContent, inputFormat);

      default:
        throw new Error(`Unsupported output format: ${outputFormat}`);
    }
  }

  private generateHtmlOutput(structuredContent: StructuredContent, inputFormat: string): Buffer {
    const htmlOutput = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${structuredContent.title}</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            max-width: 800px; 
            margin: 40px auto; 
            padding: 20px;
            color: #333;
            background-color: #fafafa;
        }
        h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        p { margin-bottom: 15px; text-align: justify; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 0.9em; color: #666; }
    </style>
</head>
<body>
    <h1>${structuredContent.title}</h1>
    ${structuredContent.paragraphs.map(p => `    <p>${p}</p>`).join('\n')}
    <div class="footer">
        <em>Converted from ${inputFormat.slice(1).toUpperCase()} by FastFile</em>
    </div>
</body>
</html>`;
    return Buffer.from(htmlOutput, 'utf8');
  }

  private async generateDocxOutput(structuredContent: StructuredContent, inputFormat: string): Promise<Buffer> {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [new TextRun({ text: structuredContent.title, bold: true, size: 32 })],
            spacing: { after: 400 }
          }),
          ...structuredContent.paragraphs.map(paragraph => 
            new Paragraph({
              children: [new TextRun(paragraph)],
              spacing: { after: 200 }
            })
          ),
          new Paragraph({
            children: [new TextRun({ 
              text: `\n--- Converted from ${inputFormat.slice(1).toUpperCase()} by FastFile ---`, 
              italics: true, 
              size: 18 
            })],
            spacing: { before: 400 }
          })
        ],
      }],
    });
    return await Packer.toBuffer(doc);
  }

  private generateRtfOutput(structuredContent: StructuredContent, inputFormat: string): Buffer {
    const rtfOutput = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0\\froman\\fcharset0 Times New Roman;}{\\f1\\fswiss\\fcharset0 Arial;}}
{\\colortbl;\\red0\\green0\\blue0;\\red0\\green0\\blue255;}
\\f0\\fs24
{\\f1\\fs32\\b ${structuredContent.title}\\par}
\\par
${structuredContent.paragraphs.map(p => `${p.replace(/\n/g, '\\par ')}\\par\\par`).join('')}
{\\i --- Converted from ${inputFormat.slice(1).toUpperCase()} by FastFile ---}
}`;
    return Buffer.from(rtfOutput, 'utf8');
  }

  private generateTexOutput(structuredContent: StructuredContent, inputFormat: string): Buffer {
    const texOutput = `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[margin=1in]{geometry}
\\usepackage{fancyhdr}
\\title{${structuredContent.title}}
\\author{FastFile Converter}
\\date{\\today}

\\begin{document}
\\maketitle

${structuredContent.paragraphs.map(p => `${p.replace(/([#$%&_{}])/g, '\\$1')}\n\n`).join('')}

\\vfill
\\hrule
\\begin{center}
\\textit{Converted from ${inputFormat.slice(1).toUpperCase()} by FastFile}
\\end{center}

\\end{document}`;
    return Buffer.from(texOutput, 'utf8');
  }

  private generateOdtOutput(structuredContent: StructuredContent, inputFormat: string): Buffer {
    const odtOutput = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
                 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0">
  <office:styles>
    <style:style style:name="Title" style:family="paragraph">
      <style:text-properties fo:font-size="18pt" fo:font-weight="bold"/>
    </style:style>
  </office:styles>
  <office:body>
    <office:text>
      <text:h text:style-name="Title" text:outline-level="1">${structuredContent.title}</text:h>
      ${structuredContent.paragraphs.map(p => `<text:p>${p}</text:p>`).join('\n      ')}
      <text:p>
        <text:span text:style-name="Italic">--- Converted from ${inputFormat.slice(1).toUpperCase()} by FastFile ---</text:span>
      </text:p>
    </office:text>
  </office:body>
</office:document>`;
    return Buffer.from(odtOutput, 'utf8');
  }
}
