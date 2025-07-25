# Media Converter with Alternative Tools

This media converter now supports a comprehensive fallback system that uses alternative tools when FFmpeg doesn't support certain formats.

## Supported Formats

### FFmpeg Native Support
- **Video**: MP4, AVI, MOV, WebM, MKV, FLV, etc.
- **Audio**: MP3, WAV, AAC, FLAC, OGG, etc.
- **Images**: JPG, PNG, GIF, BMP, WebP, TIFF

### Alternative Tools Support
- **HEIC**: ImageMagick, GraphicsMagick, Sharp
- **ICO**: ImageMagick, GraphicsMagick, FFmpeg fallback
- **PSD**: ImageMagick, GraphicsMagick
- **EPS**: ImageMagick, GraphicsMagick
- **Raw formats**: ImageMagick (CR2, ARW, DNG, etc.)

### Document Support
- **DOC/DOCX**: LibreOffice (primary), Mammoth package (fallback)
- **ODT**: LibreOffice
- **RTF**: LibreOffice (primary), Node.js (fallback)
- **PDF**: LibreOffice (primary), html-pdf package (fallback)
- **HTML/MD**: Native Node.js processing

### Spreadsheet Support
- **XLS/XLSX**: LibreOffice, XLSX package
- **ODS**: LibreOffice
- **CSV/TSV**: PapaParse, native Node.js

### Presentation Support
- **PPT/PPTX**: LibreOffice, unoconv
- **ODP**: LibreOffice
- **KEY**: LibreOffice (limited support)

## Installation

### Linux (Ubuntu/Debian)
```bash
# Run the installation script
chmod +x install-tools.sh
./install-tools.sh
```

### Windows
1. **ImageMagick**: Download from https://imagemagick.org/script/download.php#windows
   - Choose the installer for your system (64-bit recommended)
   - Make sure to check "Install development headers and libraries for C and C++"
   - Add to PATH during installation

2. **LibreOffice**: Download from https://www.libreoffice.org/download/download/
   - Install with default settings
   - Automatically adds command-line tools for conversion
   - **unoconv**: Install Python and run `pip install unoconv` (optional alternative interface)

3. **GraphicsMagick** (optional): Download from http://www.graphicsmagick.org/download.html

### Node.js Packages
The following packages are automatically installed and provide excellent performance:
```bash
npm install sharp xlsx papaparse
```

- **Sharp**: Fast image processing
- **XLSX**: Excel/LibreOffice Calc file processing  
- **PapaParse**: CSV/TSV parsing and conversion

## How It Works

1. **Format Detection**: The converter first checks if LibreOffice supports the conversion
2. **LibreOffice Primary**: Uses LibreOffice for most document, spreadsheet, and presentation formats
3. **Alternative Tools**: If LibreOffice fails, tries:
   - unoconv (alternative LibreOffice interface)
   - ImageMagick/GraphicsMagick (for images)
   - Sharp (fast Node.js image processing)
   - Specialized packages (Mammoth, XLSX, PapaParse)
4. **Node.js Fallback**: Uses pure Node.js packages as final fallback
5. **Error Handling**: Provides clear error messages with installation suggestions

## Supported Workflow

```
Input File → Format Check → Tool Selection → Conversion → Output File
                ↓
            LibreOffice Supported? 
                ↓ Yes
            Try LibreOffice
                ↓ Fail
            Try unoconv
                ↓ Fail  
            Try FFmpeg/ImageMagick/Node.js packages
                ↓ Fail
            Show helpful error message
```

## Quality Settings

All tools support quality settings:
- **Low**: 60% quality, smaller files
- **Medium**: 80% quality, balanced
- **High**: 95% quality, larger files

## Examples

```javascript
// HEIC conversion (uses ImageMagick/Sharp when FFmpeg lacks support)
await converter.convertMedia('input.jpg', 'output.heic', 'heic', 'high');

// ICO conversion (uses ImageMagick with proper sizing)
await converter.convertMedia('input.png', 'output.ico', 'ico', 'medium');

// PSD conversion (uses ImageMagick with flattening)
await converter.convertMedia('input.psd', 'output.jpg', 'jpg', 'high');

// Spreadsheet conversion (Excel to CSV)
await spreadsheetConverter.convertSpreadsheet('input.xlsx', 'output.csv', 'csv');

// Presentation conversion (PowerPoint to PDF)
await presentationConverter.convertPresentation('input.pptx', 'output.pdf', 'pdf');

// LibreOffice Calc to Excel
await spreadsheetConverter.convertSpreadsheet('input.ods', 'output.xlsx', 'xlsx');

// Word document to PDF (uses LibreOffice)
await documentConverter.convertDocument('input.docx', 'output.pdf', '.docx', '.pdf');

// ODT to Word format (uses LibreOffice)
await documentConverter.convertDocument('input.odt', 'output.docx', '.odt', '.docx');
```
