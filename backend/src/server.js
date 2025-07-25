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
    const allowedTypes = /\.(mp4|avi|mkv|mov|wmv|flv|webm|mp3|wav|aac|flac|ogg|m4a|jpg|jpeg|png|gif|bmp|webp|pdf|docx|doc|txt|md|html|htm|rtf|zip|rar|7z|tar|gz|bz2)$/i;
    if (allowedTypes.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only media, document, and archive files are allowed.'));
    }
  }
});

// Document conversion utilities
const turndownService = new TurndownService();

const getFileType = (filename) => {
  const extension = path.extname(filename).toLowerCase();
  const videoFormats = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm'];
  const audioFormats = ['.mp3', '.wav', '.aac', '.flac', '.ogg', '.m4a'];
  const imageFormats = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
  const documentFormats = ['.pdf', '.docx', '.doc', '.txt', '.md', '.html', '.htm', '.rtf'];
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

  // Extract content based on input format
  switch (inputFormat) {
    case '.pdf':
      const pdfData = await pdf(inputBuffer);
      content = pdfData.text;
      break;
    
    case '.docx':
      const docxResult = await mammoth.extractRawText({ buffer: inputBuffer });
      content = docxResult.value;
      break;
    
    case '.txt':
    case '.md':
    case '.rtf':
      content = inputBuffer.toString('utf8');
      break;
    
    case '.html':
    case '.htm':
      const htmlContent = inputBuffer.toString('utf8');
      content = htmlToText(htmlContent, {
        wordwrap: 130,
        preserveNewlines: true
      });
      break;
    
    default:
      throw new Error(`Unsupported input format: ${inputFormat}`);
  }

  // Convert to output format
  let outputBuffer;
  
  switch (outputFormat) {
    case '.txt':
      outputBuffer = Buffer.from(content, 'utf8');
      break;
    
    case '.md':
      if (inputFormat === '.html' || inputFormat === '.htm') {
        const htmlContent = inputBuffer.toString('utf8');
        content = turndownService.turndown(htmlContent);
      }
      outputBuffer = Buffer.from(content, 'utf8');
      break;
    
    case '.html':
      let htmlContent;
      if (inputFormat === '.md') {
        htmlContent = marked(content);
      } else {
        htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Converted Document</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
        h1, h2, h3 { color: #333; }
        p { margin-bottom: 10px; }
    </style>
</head>
<body>
    <pre style="white-space: pre-wrap; font-family: inherit;">${content}</pre>
</body>
</html>`;
      }
      outputBuffer = Buffer.from(htmlContent, 'utf8');
      break;
    
    case '.docx':
      const doc = new Document({
        sections: [{
          properties: {},
          children: content.split('\n').map(line => 
            new Paragraph({
              children: [new TextRun(line || ' ')],
            })
          ),
        }],
      });
      outputBuffer = await Packer.toBuffer(doc);
      break;
    
    case '.rtf':
      const rtfContent = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}\\f0\\fs24 ${content.replace(/\n/g, '\\par ')}}`;
      outputBuffer = Buffer.from(rtfContent, 'utf8');
      break;
    
    default:
      throw new Error(`Unsupported output format: ${outputFormat}`);
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
    video: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'],
    audio: ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a'],
    image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
    document: ['pdf', 'docx', 'txt', 'md', 'html', 'rtf'],
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
    }else if (fileType === 'archive') {
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
      } else if (format === 'jpg' || format === 'jpeg') {
        // Check if input is already an image
        const inputExt = path.extname(inputPath).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(inputExt)) {
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
        if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(inputExt)) {
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
        if (['.jpg', '.jpeg', '.png', '.bmp', '.webp'].includes(inputExt)) {
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
        if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(inputExt)) {
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
        if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(inputExt)) {
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
