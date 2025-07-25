# Document Conversion Support Added! 📄

Your FastFile application now supports document and text file conversions! Here's what you can do:

## Supported Document Formats

### Input Formats
- **PDF** (.pdf) - Extract text from PDF files
- **DOCX** (.docx) - Microsoft Word documents  
- **TXT** (.txt) - Plain text files
- **Markdown** (.md) - Markdown files
- **HTML** (.html, .htm) - Web pages
- **RTF** (.rtf) - Rich Text Format

### Output Formats
- **PDF** - Convert to PDF (coming soon)
- **DOCX** - Microsoft Word format
- **TXT** - Plain text
- **Markdown** (.md) - Markdown format
- **HTML** - Web page format
- **RTF** - Rich Text Format

## Example Conversions

✅ **PDF → TXT**: Extract text content from PDF files  
✅ **DOCX → MD**: Convert Word documents to Markdown  
✅ **HTML → TXT**: Strip HTML tags and get clean text  
✅ **MD → HTML**: Convert Markdown to styled web pages  
✅ **TXT → DOCX**: Create Word documents from text  
✅ **Any → RTF**: Convert to Rich Text Format  

## How to Use

1. **Upload a document** - Click the upload area or drag & drop
2. **Select output format** - Choose from the available formats  
3. **Click convert** - Let the magic happen!
4. **Download result** - Get your converted file

## Technical Details

The document conversion uses several powerful libraries:
- **mammoth** - For DOCX text extraction
- **pdf-parse** - For PDF text extraction  
- **html-to-text** - For HTML to text conversion
- **marked** - For Markdown to HTML conversion
- **turndown** - For HTML to Markdown conversion
- **docx** - For creating DOCX files

## File Size Limits

- Maximum file size: **10MB**
- Supports batch conversion (one file at a time)
- Automatic cleanup of temporary files

Enjoy converting your documents! 🚀
