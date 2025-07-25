const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

// Document processing libraries
const mammoth = require('mammoth');
const pdf = require('pdf-parse');
const { htmlToText } = require('html-to-text');
const { marked } = require('marked');
const TurndownService = require('turndown');
const { Document, Packer, Paragraph, TextRun } = require('docx');

// Archive processing libraries
const archiver = require('archiver');
const yauzl = require('yauzl');
const unzipper = require('unzipper');
const { exec } = require('child_process');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Create directories if they don't exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
const outputDir = path.join(__dirname, '..', 'output');
fs.ensureDirSync(uploadsDir);
fs.ensureDirSync(outputDir);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}_${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },  fileFilter: (req, file, cb) => {
    // Allow video, audio, image, document, and archive files
    const allowedTypes = /\.(mp4|avi|mov|mkv|webm|flv|mpeg|mpg|wmv|3gp|m4v|mts|m2ts|ts|ogv|f4v|gif|mp3|wav|aac|flac|ogg|m4a|wma|oga|aiff|amr|opus|ac3|caf|dss|voc|weba|jpg|jpeg|png|bmp|webp|tiff|tif|heic|ico|svg|pdf|avif|psd|eps|ai|cr2|arw|dng|raf|nef|rw2|crw|orf|srw|x3f|dcr|mrw|3fr|erf|mef|mos|nrw|pef|rwl|srf|doc|docx|odt|txt|rtf|html|htm|md|tex|djvu|wps|abw|pages|dotx|zip|rar|7z|tar|gz|bz2)$/i;
    if (allowedTypes.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only media, document, image, and archive files are allowed.'));
    }
  }
});

// Document conversion utilities
const turndownService = new TurndownService();

const getFileType = (filename) => {
  const extension = path.extname(filename).toLowerCase();
  const videoFormats = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.mpeg', '.mpg', '.wmv', '.3gp', '.m4v', '.mts', '.m2ts', '.ts', '.ogv', '.f4v', '.gif'];
  const audioFormats = ['.mp3', '.wav', '.aac', '.flac', '.ogg', '.m4a', '.wma', '.oga', '.aiff', '.amr', '.opus', '.ac3', '.caf', '.dss', '.voc', '.weba'];
  const imageFormats = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif', '.heic', '.ico', '.svg', '.avif', '.psd', '.eps', '.ai', '.cr2', '.arw', '.dng', '.raf', '.nef', '.rw2', '.crw', '.orf', '.srw', '.x3f', '.dcr', '.mrw', '.3fr', '.erf', '.mef', '.mos', '.nrw', '.pef', '.rwl', '.srf'];
  const documentFormats = ['.pdf', '.doc', '.docx', '.odt', '.txt', '.rtf', '.html', '.htm', '.md', '.tex', '.djvu', '.wps', '.abw', '.pages', '.dotx'];
  const archiveFormats = ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'];

  if (videoFormats.includes(extension)) return 'video';
  if (audioFormats.includes(extension)) return 'audio';
  if (imageFormats.includes(extension)) return 'image';
  if (documentFormats.includes(extension)) return 'document';
  if (archiveFormats.includes(extension)) return 'archive';
  return 'unknown';
};

const convertDocument = async (inputPath, outputPath, inputFormat, outputFormat) => {
  const inputBuffer = await fs.readFile(inputPath);
  let content = '';
  let structuredContent = { title: '', paragraphs: [], metadata: {} };

  // Extract content based on input format with better parsing
  switch (inputFormat) {
    case '.pdf':
      const pdfData = await pdf(inputBuffer);
      content = pdfData.text;
      // Parse PDF structure
      const pdfLines = content.split('\n').filter(line => line.trim());
      structuredContent.title = pdfLines[0] || 'Converted PDF Document';
      structuredContent.paragraphs = pdfLines.slice(1).filter(line => line.length > 10);
      break;
    
    case '.docx':
    case '.dotx':
      const docxResult = await mammoth.extractRawText({ buffer: inputBuffer });
      content = docxResult.value;
      // Parse DOCX structure
      const docxLines = content.split('\n').filter(line => line.trim());
      structuredContent.title = docxLines[0] || 'Converted DOCX Document';
      structuredContent.paragraphs = docxLines.slice(1).filter(line => line.length > 5);
      break;
    
    case '.doc':
      // Enhanced DOC parsing - extract readable text
      const docText = inputBuffer.toString('utf8');
      // Remove binary characters and extract readable text
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
        // Extract text from ODT XML structure
        const titleMatch = odfContent.match(/<text:h[^>]*>(.*?)<\/text:h>/);
        const paragraphMatches = odfContent.match(/<text:p[^>]*>(.*?)<\/text:p>/g);
        
        structuredContent.title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '') : 'Converted ODT Document';
        structuredContent.paragraphs = paragraphMatches ? 
          paragraphMatches.map(p => p.replace(/<[^>]*>/g, '').trim()).filter(p => p.length > 10) : 
          ['Content could not be fully parsed from ODT format'];
        content = structuredContent.title + '\n\n' + structuredContent.paragraphs.join('\n\n');
      } catch (err) {
        content = 'Error reading ODT file: ' + err.message;
        structuredContent.paragraphs = [content];
      }
      break;
    
    case '.txt':
      content = inputBuffer.toString('utf8');
      const txtLines = content.split('\n').filter(line => line.trim());
      structuredContent.title = txtLines[0] || 'Text Document';
      structuredContent.paragraphs = txtLines.slice(1);
      break;
      
    case '.md':
      content = inputBuffer.toString('utf8');
      // Parse markdown structure
      const mdLines = content.split('\n');
      const titleLine = mdLines.find(line => line.startsWith('#'));
      structuredContent.title = titleLine ? titleLine.replace(/^#+\s*/, '') : 'Markdown Document';
      structuredContent.paragraphs = mdLines.filter(line => 
        !line.startsWith('#') && line.trim().length > 0
      );
      break;
      
    case '.rtf':
      content = inputBuffer.toString('utf8');
      // Parse RTF and extract clean text
      content = content.replace(/\\[a-z]+\d*\s?/g, '') // Remove RTF commands
                      .replace(/[{}]/g, '') // Remove braces
                      .replace(/\s+/g, ' ') // Normalize spaces
                      .trim();
      structuredContent.title = 'RTF Document';
      structuredContent.paragraphs = content.split('.').filter(p => p.trim().length > 10);
      break;
      
    case '.tex':
      content = inputBuffer.toString('utf8');
      // Parse LaTeX structure
      const titleMatch = content.match(/\\title\{([^}]+)\}/);
      const sectionMatches = content.match(/\\section\{([^}]+)\}/g);
      
      structuredContent.title = titleMatch ? titleMatch[1] : 'LaTeX Document';
      structuredContent.paragraphs = sectionMatches ? 
        sectionMatches.map(s => s.replace(/\\section\{([^}]+)\}/, '$1')) : 
        content.replace(/\\[a-z]+\{[^}]*\}/g, '').split('\n').filter(line => line.trim());
      break;
    
    case '.html':
    case '.htm':
      const htmlContent = inputBuffer.toString('utf8');
      // Extract title and content with better parsing
      const titleHtmlMatch = htmlContent.match(/<title[^>]*>(.*?)<\/title>/i);
      structuredContent.title = titleHtmlMatch ? titleHtmlMatch[1] : 'HTML Document';
      
      // Extract clean text content
      content = htmlToText(htmlContent, {
        wordwrap: 80,
        preserveNewlines: true,
        hideLinkHrefIfSameAsText: true,
        ignoreImage: true
      });
      structuredContent.paragraphs = content.split('\n\n').filter(p => p.trim().length > 10);
      break;
    
    case '.djvu':
    case '.wps':
    case '.abw':
    case '.pages':
      // Enhanced parsing for specialized formats
      const rawText = inputBuffer.toString('utf8');
      content = rawText.replace(/[\x00-\x1F\x7F-\xFF]/g, ' ')
                      .replace(/\s+/g, ' ')
                      .trim();
      structuredContent.title = `Converted ${inputFormat.toUpperCase().slice(1)} Document`;
      structuredContent.paragraphs = content ? [content.substring(0, 1000) + '...'] : ['No readable content found'];
      break;
    
    default:
      throw new Error(`Unsupported input format: ${inputFormat}`);
  }

  // Convert to output format with proper formatting
  let outputBuffer;
  
  switch (outputFormat) {
    case '.txt':
      // Create clean, formatted plain text
      const txtOutput = `${structuredContent.title}
${'='.repeat(structuredContent.title.length)}

${structuredContent.paragraphs.join('\n\n')}

--- Converted by FastFile ---`;
      outputBuffer = Buffer.from(txtOutput, 'utf8');
      break;
    
    case '.md':
      // Create properly formatted Markdown
      let mdOutput = `# ${structuredContent.title}\n\n`;
      if (inputFormat === '.html' || inputFormat === '.htm') {
        const htmlContent = inputBuffer.toString('utf8');
        mdOutput += turndownService.turndown(htmlContent);
      } else {
        mdOutput += structuredContent.paragraphs.map(p => `${p}\n`).join('\n');
      }
      mdOutput += `\n\n---
*Converted from ${inputFormat.slice(1).toUpperCase()} by FastFile*`;
      outputBuffer = Buffer.from(mdOutput, 'utf8');
      break;
    
    case '.html':
      // Create well-formatted HTML document
      let htmlOutput;
      if (inputFormat === '.md') {
        const markdownContent = structuredContent.paragraphs.join('\n\n');
        const convertedHtml = marked(markdownContent);
        htmlOutput = `<!DOCTYPE html>
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
        h2, h3 { color: #34495e; margin-top: 30px; }
        p { margin-bottom: 15px; text-align: justify; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 0.9em; color: #666; }
    </style>
</head>
<body>
    <h1>${structuredContent.title}</h1>
    ${convertedHtml}
    <div class="footer">
        <em>Converted from ${inputFormat.slice(1).toUpperCase()} by FastFile</em>
    </div>
</body>
</html>`;
      } else {
        htmlOutput = `<!DOCTYPE html>
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
      }
      outputBuffer = Buffer.from(htmlOutput, 'utf8');
      break;
  }

  await fs.writeFile(outputPath, outputBuffer);
  return outputPath;
};

const convertArchive = async (inputPath, outputPath, inputFormat, outputFormat) => {
  return new Promise((resolve, reject) => {
    
    // Handle extraction (archive to folder)
    if (outputFormat === '.folder') {
      const extractDir = path.join(path.dirname(outputPath), path.basename(outputPath, '.folder'));
      fs.ensureDirSync(extractDir);

      if (inputFormat === '.zip') {
        // Extract ZIP file
        fs.createReadStream(inputPath)
          .pipe(unzipper.Extract({ path: extractDir }))
          .on('close', () => {
            // Create a text file listing the extracted contents
            const listFile = path.join(extractDir, 'extracted_files.txt');
            const files = fs.readdirSync(extractDir, { recursive: true });
            fs.writeFileSync(listFile, `Extracted files:\n${files.join('\n')}`);
            resolve(listFile);
          })
          .on('error', reject);
      } else if (inputFormat === '.rar' || inputFormat === '.7z' || inputFormat === '.bz2') {
        // Use 7z command for RAR, 7Z, and BZ2 files
        const cmd = `7z x "${inputPath}" -o"${extractDir}" -y`;
        exec(cmd, (error, stdout, stderr) => {
          if (error) {
            reject(new Error(`Extraction failed: ${error.message}`));
            return;
          }
          // Create a text file listing the extracted contents
          const listFile = path.join(extractDir, 'extracted_files.txt');
          const files = fs.readdirSync(extractDir, { recursive: true });
          fs.writeFileSync(listFile, `Extracted files:\n${files.join('\n')}`);
          resolve(listFile);
        });
      } else if (inputFormat === '.gz') {
        // Extract gzip file
        const gunzip = require('zlib').createGunzip();
        const input = fs.createReadStream(inputPath);
        const originalName = path.basename(inputPath, '.gz');
        const outputFile = path.join(extractDir, originalName);
        const output = fs.createWriteStream(outputFile);
        
        input.pipe(gunzip).pipe(output);
        output.on('finish', () => {
          const listFile = path.join(extractDir, 'extracted_files.txt');
          fs.writeFileSync(listFile, `Extracted files:\n${originalName}`);
          resolve(listFile);
        });
        output.on('error', reject);
      } else {
        reject(new Error(`Unsupported archive format for extraction: ${inputFormat}`));
      }
      return;
    }

    // Handle compression (files to archive)
    if (outputFormat === '.zip') {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve(outputPath));
      archive.on('error', reject);
      archive.pipe(output);

      // If input is an archive, extract first then recompress
      if (['.rar', '.7z'].includes(inputFormat)) {
        const tempDir = path.join(path.dirname(inputPath), 'temp_extract');
        fs.ensureDirSync(tempDir);
        
        const extractCmd = `7z x "${inputPath}" -o"${tempDir}" -y`;
        exec(extractCmd, (error) => {
          if (error) {
            reject(new Error(`Extraction failed: ${error.message}`));
            return;
          }
          
          // Add extracted files to new archive
          archive.directory(tempDir, false);
          archive.finalize();
          
          // Clean up temp directory
          setTimeout(() => fs.removeSync(tempDir), 1000);
        });
      } else {
        // Single file to zip
        archive.file(inputPath, { name: path.basename(inputPath) });
        archive.finalize();
      }
    } else if (outputFormat === '.tar') {
      const archive = archiver('tar');
      const output = fs.createWriteStream(outputPath);
      
      output.on('close', () => resolve(outputPath));
      archive.on('error', reject);
      archive.pipe(output);
      
      archive.file(inputPath, { name: path.basename(inputPath) });
      archive.finalize();
    } else if (outputFormat === '.7z') {
      // Use 7z command to create 7z archive
      const cmd = `7z a "${outputPath}" "${inputPath}"`;
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`7z compression failed: ${error.message}`));
          return;
        }
        resolve(outputPath);
      });
    } else if (outputFormat === '.gz') {
      // Create gzip compressed file
      const gzip = require('zlib').createGzip();
      const input = fs.createReadStream(inputPath);
      const output = fs.createWriteStream(outputPath);
      
      input.pipe(gzip).pipe(output);
      output.on('finish', () => resolve(outputPath));
      output.on('error', reject);
    } else if (outputFormat === '.bz2') {
      // Use 7z command to create bz2 archive
      const cmd = `7z a -tbzip2 "${outputPath}" "${inputPath}"`;
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`bzip2 compression failed: ${error.message}`));
          return;
        }
        resolve(outputPath);
      });
    } else {
      reject(new Error(`Unsupported output format: ${outputFormat}`));
    }
  });
};

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'FastFile Backend is running' });
});

app.get('/api/formats', (req, res) => {
  const formats = {
    video: ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'mpeg', 'mpg', 'wmv', '3gp', 'm4v', 'mts', 'm2ts', 'ts', 'ogv', 'f4v', 'gif'],
    audio: ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a', 'wma', 'oga', 'aiff', 'amr', 'opus', 'ac3', 'caf', 'dss', 'voc', 'weba'],
    image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'tif', 'heic', 'ico', 'svg', 'avif', 'psd', 'eps', 'ai'],
    document: ['pdf', 'doc', 'docx', 'odt', 'txt', 'rtf', 'html', 'md', 'tex', 'djvu', 'wps', 'abw', 'pages', 'dotx'],
    archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2']
  };
  res.json(formats);
});

app.post('/api/convert', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { format, quality } = req.body;
    
    if (!format) {
      return res.status(400).json({ error: 'Output format is required' });
    }    const inputPath = req.file.path;
    const outputFilename = `${path.parse(req.file.filename).name}.${format}`;
    const outputPath = path.join(outputDir, outputFilename);

    console.log(`Converting ${req.file.originalname} to ${format}`);

    const fileType = getFileType(req.file.originalname);
    const inputFormat = path.extname(req.file.originalname).toLowerCase();
    const outputFormat = `.${format}`;    if (fileType === 'document') {
      // Handle document conversion
      try {
        const documentOutputPath = await convertDocument(inputPath, outputPath, inputFormat, outputFormat);
        
        // Clean up input file
        fs.removeSync(inputPath);

        res.json({
          success: true,
          message: 'Document converted successfully',
          downloadUrl: `/api/download/${outputFilename}`,
          originalName: req.file.originalname,
          convertedName: outputFilename
        });
        return;
      } catch (docError) {
        console.error('Document conversion error:', docError);
        
        // Clean up files on error
        if (fs.existsSync(inputPath)) {
          fs.removeSync(inputPath);
        }
        
        res.status(500).json({
          success: false,
          error: 'Document conversion failed',
          message: docError.message
        });
        return;
      }
    }

    if (fileType === 'archive') {
      // Handle archive conversion
      try {
        const archiveOutputPath = await convertArchive(inputPath, outputPath, inputFormat, outputFormat);
        
        // Clean up input file
        fs.removeSync(inputPath);

        res.json({
          success: true,
          message: 'Archive converted successfully',
          downloadUrl: `/api/download/${outputFilename}`,
          originalName: req.file.originalname,
          convertedName: outputFilename
        });
        return;
      } catch (archiveError) {
        console.error('Archive conversion error:', archiveError);
        
        // Clean up files on error
        if (fs.existsSync(inputPath)) {
          fs.removeSync(inputPath);
        }
        
        res.status(500).json({
          success: false,
          error: 'Archive conversion failed',
          message: archiveError.message
        });
        return;
      }
    }

    // Start conversion
    const conversionPromise = new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath)
        .output(outputPath)
        .outputOptions(['-y']); // Always overwrite output file

      // Apply quality settings based on format
      const getQualityValue = (format, quality) => {
        const qualityMap = {
          low: { video: '500k', audio: '96k' },
          medium: { video: '1000k', audio: '128k' },
          high: { video: '2000k', audio: '192k' }
        };
        return qualityMap[quality] || qualityMap.medium;
      };

      const qualitySettings = getQualityValue(format, quality);

      if (format === 'mp4') {
        command = command
          .format('mp4')
          .videoCodec('libx264')
          .audioCodec('aac')
          .videoBitrate(qualitySettings.video)
          .audioBitrate(qualitySettings.audio);
      } else if (format === 'webm') {
        command = command
          .format('webm')
          .videoCodec('libvpx-vp9')
          .audioCodec('libopus')
          .videoBitrate(qualitySettings.video)
          .audioBitrate(qualitySettings.audio);
      } else if (format === 'mp3') {
        command = command
          .format('mp3')
          .audioCodec('libmp3lame')
          .audioBitrate(qualitySettings.audio);
      } else if (format === 'wav') {
        command = command
          .format('wav')
          .audioCodec('pcm_s16le');
      } else if (format === 'aac') {
        command = command
          .format('aac')
          .audioCodec('aac')
          .audioBitrate(qualitySettings.audio);
      } else if (format === 'flac') {
        command = command
          .format('flac')
          .audioCodec('flac');
      } else if (format === 'ogg') {
        command = command
          .format('ogg')
          .audioCodec('libvorbis')
          .audioBitrate(qualitySettings.audio);
      } else if (format === 'wma') {
        command = command
          .format('asf')
          .audioCodec('wmav2')
          .audioBitrate(qualitySettings.audio);
      } else if (format === 'oga') {
        command = command
          .format('ogg')
          .audioCodec('libvorbis')
          .audioBitrate(qualitySettings.audio);
      } else if (format === 'aiff') {
        command = command
          .format('aiff')
          .audioCodec('pcm_s16be');
      } else if (format === 'amr') {
        command = command
          .format('amr')
          .audioCodec('libopencore_amrnb')
          .audioBitrate('12.2k');
      } else if (format === 'opus') {
        command = command
          .format('ogg')
          .audioCodec('libopus')
          .audioBitrate(qualitySettings.audio);
      } else if (format === 'ac3') {
        command = command
          .format('ac3')
          .audioCodec('ac3')
          .audioBitrate(qualitySettings.audio);
      } else if (format === 'caf') {
        command = command
          .format('caf')
          .audioCodec('pcm_s16le');
      } else if (format === 'dss') {
        command = command
          .format('dss')
          .audioCodec('dss_sp');
      } else if (format === 'voc') {
        command = command
          .format('voc')
          .audioCodec('pcm_u8');
      } else if (format === 'weba') {
        command = command
          .format('webm')
          .audioCodec('libopus')
          .audioBitrate(qualitySettings.audio);
      } else if (format === 'jpg' || format === 'jpeg') {
        // Check if input is already an image
        const inputExt = path.extname(inputPath).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif', '.heic', '.ico', '.svg', '.avif', '.psd', '.eps', '.ai', '.cr2', '.arw', '.dng', '.raf', '.nef', '.rw2', '.crw', '.orf', '.srw', '.x3f', '.dcr', '.mrw', '.3fr', '.erf', '.mef', '.mos', '.nrw', '.pef', '.rwl', '.srf'].includes(inputExt)) {
          // Image to JPG conversion
          command = command
            .format('image2')
            .videoCodec('mjpeg')
            .outputOptions(['-q:v', quality === 'high' ? '2' : quality === 'low' ? '8' : '5']);
        } else {
          // Video to JPG conversion (extract frame)
          command = command
            .format('image2')
            .videoCodec('mjpeg')
            .outputOptions(['-vframes', '1', '-q:v', quality === 'high' ? '2' : quality === 'low' ? '8' : '5']);
        }
      } else if (format === 'png') {
        // Check if input is already an image
        const inputExt = path.extname(inputPath).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif', '.heic', '.ico', '.svg', '.avif', '.psd', '.eps', '.ai', '.cr2', '.arw', '.dng', '.raf', '.nef', '.rw2', '.crw', '.orf', '.srw', '.x3f', '.dcr', '.mrw', '.3fr', '.erf', '.mef', '.mos', '.nrw', '.pef', '.rwl', '.srf'].includes(inputExt)) {
          // Image to PNG conversion
          command = command
            .format('image2')
            .videoCodec('png');
        } else {
          // Video to PNG conversion (extract frame)
          command = command
            .format('image2')
            .videoCodec('png')
            .outputOptions(['-vframes', '1']);
        }
      } else if (format === 'gif') {
        // For image to GIF conversion
        const inputExt = path.extname(inputPath).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif', '.heic', '.ico', '.svg', '.avif', '.psd', '.eps', '.ai', '.cr2', '.arw', '.dng', '.raf', '.nef', '.rw2', '.crw', '.orf', '.srw', '.x3f', '.dcr', '.mrw', '.3fr', '.erf', '.mef', '.mos', '.nrw', '.pef', '.rwl', '.srf'].includes(inputExt)) {
          // Convert static image to single-frame GIF
          command = command
            .format('gif')
            .outputOptions(['-vf', 'scale=320:-1:flags=lanczos'])
            .outputOptions(['-y']);
        } else {
          // For video to GIF conversion
          command = command
            .format('gif')
            .outputOptions(['-vf', 'fps=10,scale=320:-1:flags=lanczos'])
            .outputOptions(['-t', '10'])
            .outputOptions(['-y']);
        }
      } else if (format === 'bmp') {
        // Check if input is already an image
        const inputExt = path.extname(inputPath).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif', '.heic', '.ico', '.svg', '.avif', '.psd', '.eps', '.ai', '.cr2', '.arw', '.dng', '.raf', '.nef', '.rw2', '.crw', '.orf', '.srw', '.x3f', '.dcr', '.mrw', '.3fr', '.erf', '.mef', '.mos', '.nrw', '.pef', '.rwl', '.srf'].includes(inputExt)) {
          // Image to BMP conversion
          command = command
            .format('image2')
            .videoCodec('bmp');
        } else {
          // Video to BMP conversion (extract frame)
          command = command
            .format('image2')
            .videoCodec('bmp')
            .outputOptions(['-vframes', '1']);
        }
      } else if (format === 'webp') {
        // Check if input is already an image
        const inputExt = path.extname(inputPath).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif', '.heic', '.ico', '.svg', '.avif', '.psd', '.eps', '.ai', '.cr2', '.arw', '.dng', '.raf', '.nef', '.rw2', '.crw', '.orf', '.srw', '.x3f', '.dcr', '.mrw', '.3fr', '.erf', '.mef', '.mos', '.nrw', '.pef', '.rwl', '.srf'].includes(inputExt)) {
          // Image to WebP conversion
          command = command
            .format('webp')
            .videoCodec('libwebp')
            .outputOptions(['-quality', quality === 'high' ? '90' : quality === 'low' ? '50' : '70']);
        } else {
          // Video to WebP conversion (extract frame)
          command = command
            .format('webp')
            .videoCodec('libwebp')
            .outputOptions(['-vframes', '1', '-quality', quality === 'high' ? '90' : quality === 'low' ? '50' : '70']);
        }
      } else if (format === 'tiff' || format === 'tif') {
        // TIFF format conversion
        const inputExt = path.extname(inputPath).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif', '.heic', '.ico', '.svg', '.avif', '.psd', '.eps', '.ai', '.cr2', '.arw', '.dng', '.raf', '.nef', '.rw2', '.crw', '.orf', '.srw', '.x3f', '.dcr', '.mrw', '.3fr', '.erf', '.mef', '.mos', '.nrw', '.pef', '.rwl', '.srf'].includes(inputExt)) {
          command = command
            .format('image2')
            .videoCodec('tiff');
        } else {
          command = command
            .format('image2')
            .videoCodec('tiff')
            .outputOptions(['-vframes', '1']);
        }
      } else if (format === 'heic') {
        // HEIC format conversion (requires libheif)
        const inputExt = path.extname(inputPath).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif', '.heic', '.ico', '.svg', '.avif', '.psd', '.eps', '.ai', '.cr2', '.arw', '.dng', '.raf', '.nef', '.rw2', '.crw', '.orf', '.srw', '.x3f', '.dcr', '.mrw', '.3fr', '.erf', '.mef', '.mos', '.nrw', '.pef', '.rwl', '.srf'].includes(inputExt)) {
          command = command
            .format('heif')
            .videoCodec('libheif');
        } else {
          command = command
            .format('heif')
            .videoCodec('libheif')
            .outputOptions(['-vframes', '1']);
        }
      } else if (format === 'ico') {
        // ICO format conversion
        const inputExt = path.extname(inputPath).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif', '.heic', '.ico', '.svg', '.avif', '.psd', '.eps', '.ai', '.cr2', '.arw', '.dng', '.raf', '.nef', '.rw2', '.crw', '.orf', '.srw', '.x3f', '.dcr', '.mrw', '.3fr', '.erf', '.mef', '.mos', '.nrw', '.pef', '.rwl', '.srf'].includes(inputExt)) {
          command = command
            .format('ico')
            .outputOptions(['-vf', 'scale=256:256']);
        } else {
          command = command
            .format('ico')
            .outputOptions(['-vframes', '1', '-vf', 'scale=256:256']);
        }
      } else if (format === 'avif') {
        // AVIF format conversion (requires libavif)
        const inputExt = path.extname(inputPath).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif', '.heic', '.ico', '.svg', '.avif', '.psd', '.eps', '.ai', '.cr2', '.arw', '.dng', '.raf', '.nef', '.rw2', '.crw', '.orf', '.srw', '.x3f', '.dcr', '.mrw', '.3fr', '.erf', '.mef', '.mos', '.nrw', '.pef', '.rwl', '.srf'].includes(inputExt)) {
          command = command
            .format('avif')
            .videoCodec('libavif')
            .outputOptions(['-crf', quality === 'high' ? '15' : quality === 'low' ? '35' : '25']);
        } else {
          command = command
            .format('avif')
            .videoCodec('libavif')
            .outputOptions(['-vframes', '1', '-crf', quality === 'high' ? '15' : quality === 'low' ? '35' : '25']);
        }
      } else if (format === 'svg') {
        // SVG is vector format - convert to raster first, then to SVG (not ideal but functional)
        const inputExt = path.extname(inputPath).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif', '.heic', '.ico', '.svg', '.avif', '.psd', '.eps', '.ai', '.cr2', '.arw', '.dng', '.raf', '.nef', '.rw2', '.crw', '.orf', '.srw', '.x3f', '.dcr', '.mrw', '.3fr', '.erf', '.mef', '.mos', '.nrw', '.pef', '.rwl', '.srf'].includes(inputExt)) {
          // Note: SVG output from raster is not ideal - consider using imagemagick for better results
          command = command
            .format('image2')
            .videoCodec('png');
        } else {
          command = command
            .format('image2')
            .videoCodec('png')
            .outputOptions(['-vframes', '1']);
        }
      } else {
       // Default format handling
       command = command.format(format);
      }

      command
       .on('start', (commandLine) => {
          console.log('FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          if (progress.percent && !isNaN(progress.percent)) {
            console.log(`Processing: ${Math.round(progress.percent)}% done`);
          }
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

    const finalOutputPath = await conversionPromise;

    // Clean up input file
    fs.removeSync(inputPath);

    res.json({
      success: true,
      message: 'File converted successfully',
      downloadUrl: `/api/download/${outputFilename}`,
      originalName: req.file.originalname,
      convertedName: outputFilename
    });

  } catch (error) {
    console.error('Conversion error:', error);
    
    // Clean up files on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.removeSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: 'Conversion failed',
      message: error.message
    });
  }
});

    
  

app.get('/api/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(outputDir, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.download(filePath, filename, (err) => {
    if (err) {
      console.error('Download error:', err);
      res.status(500).json({ error: 'Download failed' });
    } else {
      // Clean up the file after download
      setTimeout(() => {
        fs.removeSync(filePath);
      }, 5000); // Delete after 5 seconds
    }
  });
});

// Clean up old files periodically
setInterval(() => {
  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // 1 hour

  [uploadsDir, outputDir].forEach(dir => {
    fs.readdir(dir, (err, files) => {
      if (err) return;
      
      files.forEach(file => {
        const filePath = path.join(dir, file);
        fs.stat(filePath, (err, stats) => {
          if (err) return;
          
          if (now - stats.mtime.getTime() > maxAge) {
            fs.removeSync(filePath);
            console.log(`Cleaned up old file: ${file}`);
          }
        });
      });
    });
  });
}, 30 * 60 * 1000); // Run every 30 minutes

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
  }
  res.status(500).json({ error: error.message });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`FastFile Backend server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
