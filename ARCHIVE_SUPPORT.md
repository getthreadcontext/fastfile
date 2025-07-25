# Archive Support Added! 📦

Your FastFile application now supports archive file compression and extraction! Here's what you can do:

## Supported Archive Formats

### Input Formats
- **ZIP** (.zip) - Standard ZIP archives
- **RAR** (.rar) - WinRAR archives (requires 7z)
- **7Z** (.7z) - 7-Zip archives (requires 7z)
- **TAR** (.tar) - Unix TAR archives
- **GZ** (.gz) - Gzip compressed files
- **BZ2** (.bz2) - Bzip2 compressed files

### Output Formats
- **ZIP** (.zip) - Create ZIP archives
- **7Z** (.7z) - Create 7-Zip archives (requires 7z command)
- **TAR** (.tar) - Create TAR archives
- **EXTRACT** - Extract archive contents to folder

## Example Archive Operations

✅ **ZIP → 7Z**: Convert ZIP archives to 7-Zip format  
✅ **RAR → ZIP**: Convert RAR archives to ZIP format  
✅ **7Z → ZIP**: Convert 7-Zip archives to ZIP format  
✅ **Any Archive → Extract**: Extract contents from any supported archive  
✅ **File → ZIP**: Compress single files into ZIP archives  
✅ **File → TAR**: Create TAR archives from files  

## Archive Features

### Compression
- **High compression ratio** with configurable levels
- **Multiple format support** for different use cases
- **Single file compression** - turn any file into an archive
- **Re-compression** - convert between archive formats

### Extraction
- **Full extraction** of archive contents
- **File listing** - see what's inside archives
- **Format auto-detection** - handles various archive types
- **Safe extraction** with path validation

## Technical Implementation

The archive functionality uses several powerful libraries:
- **archiver** - For creating ZIP and TAR archives
- **yauzl** - For ZIP file parsing and extraction
- **unzipper** - For streaming ZIP extraction
- **7z command** - For RAR and 7Z file handling (when available)

## Requirements

For full RAR and 7Z support, you need:
- **7-Zip** installed on your system
- **7z command** available in PATH

Without 7-Zip:
- ZIP archives work fully ✅
- TAR archives work fully ✅
- RAR/7Z extraction limited ⚠️

## File Size Limits

- Maximum file size: **10MB**
- Archives can contain multiple files
- Extraction creates temporary folders
- Automatic cleanup of temporary files

## How to Use Archives

1. **Upload an archive** - Drag & drop or click to browse
2. **Choose operation**:
   - Select another archive format to convert
   - Select "extract" to unpack contents
3. **Convert** - Click the conversion button
4. **Download** - Get your converted archive or extracted files

## Archive Icons

📦 **Archive files** are marked with a package icon in the interface

Enjoy working with your compressed files! 🚀
