# Image Format Conversion Fix - Round 2 🛠️

## Problem Identified
The error "Output format png is not available" occurred because FFmpeg didn't recognize the format parameters we were using for image conversions.

## Root Cause
- Using incorrect format specifiers like `format('png')` and `format('bmp')`
- Adding redundant `-f` output options that conflicted with format specification
- FFmpeg expects `image2` format for single image outputs

## Solution Applied

### Before (Broken)
```javascript
// Incorrect format specification
command = command
  .format('png')
  .outputOptions(['-f', 'png']);
```

### After (Fixed)
```javascript
// Correct image format specification
command = command
  .format('image2')
  .videoCodec('png');
```

## Complete Format Fixes

### ✅ PNG Conversion
- **Format**: `image2` (FFmpeg's single image format)
- **Codec**: `png` (PNG encoder)
- **Usage**: Handles JPG→PNG, PNG→PNG, etc.

### ✅ JPG/JPEG Conversion  
- **Format**: `image2`
- **Codec**: `mjpeg` (JPEG encoder)
- **Quality**: `-q:v` parameter for compression control

### ✅ BMP Conversion
- **Format**: `image2`
- **Codec**: `bmp` (BMP encoder)
- **Usage**: Any image format to uncompressed BMP

### ✅ WebP Conversion
- **Format**: `webp` (WebP has its own format)
- **Codec**: `libwebp` (WebP encoder)
- **Quality**: `-quality` parameter for WebP compression

## Key Changes Made

1. **Standardized Format**: Use `image2` for PNG, JPG, BMP conversions
2. **Removed Conflicting Options**: Eliminated redundant `-f` parameters
3. **Proper Codecs**: Match codec to output format (png, mjpeg, bmp)
4. **Quality Control**: Maintain quality settings for lossy formats

## Now Working Conversions ✅

- **JPG ↔ PNG**: Bidirectional conversion with transparency support
- **Any Image → BMP**: Uncompressed bitmap output
- **Any Image → WebP**: Modern web format with quality control
- **Video → Image**: Frame extraction still works (with `-vframes 1`)

## Technical Notes

- `image2` format tells FFmpeg we're outputting a single image
- Codec selection determines the actual image format encoding
- Quality parameters vary by format (q:v for JPEG, quality for WebP)
- Video-to-image extraction retains `-vframes 1` for single frame

The fix ensures proper FFmpeg format specification while maintaining backward compatibility with existing video-to-image functionality.
