const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

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
  },
  fileFilter: (req, file, cb) => {
    // Allow video, audio, and image files
    const allowedTypes = /\.(mp4|avi|mkv|mov|wmv|flv|webm|mp3|wav|aac|flac|ogg|m4a|jpg|jpeg|png|gif|bmp|webp)$/i;
    if (allowedTypes.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only media files are allowed.'));
    }
  }
});

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'FastFile Backend is running' });
});

app.get('/api/formats', (req, res) => {
  const formats = {
    video: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'],
    audio: ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a'],
    image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']
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
    }

    const inputPath = req.file.path;
    const outputFilename = `${path.parse(req.file.filename).name}.${format}`;
    const outputPath = path.join(outputDir, outputFilename);

    console.log(`Converting ${req.file.originalname} to ${format}`);

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
        command = command
          .format('mjpeg')
          .videoCodec('mjpeg')
          .outputOptions(['-vframes', '1', '-q:v', quality === 'high' ? '2' : quality === 'low' ? '8' : '5']);
      } else if (format === 'png') {
        command = command
          .format('png')
          .videoCodec('png')
          .outputOptions(['-vframes', '1']);
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
        command = command
          .format('bmp')
          .videoCodec('bmp')
          .outputOptions(['-vframes', '1']);
      } else if (format === 'webp') {
        command = command
          .format('webp')
          .videoCodec('libwebp')
          .outputOptions(['-vframes', '1', '-quality', quality === 'high' ? '90' : quality === 'low' ? '50' : '70']);
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

app.listen(PORT, () => {
  console.log(`FastFile Backend server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
