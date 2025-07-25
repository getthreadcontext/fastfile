import path from 'path';
import { FileType } from '../types';

export class FileUtils {
  private static readonly videoFormats = [
    '.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.mpeg', '.mpg', 
    '.wmv', '.3gp', '.m4v', '.mts', '.m2ts', '.ts', '.ogv', '.f4v', '.gif'
  ];

  private static readonly audioFormats = [
    '.mp3', '.wav', '.aac', '.flac', '.ogg', '.m4a', '.wma', '.oga', 
    '.aiff', '.amr', '.opus', '.ac3', '.caf', '.dss', '.voc', '.weba'
  ];

  private static readonly imageFormats = [
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif', 
    '.heic', '.ico', '.svg', '.avif', '.psd', '.eps', '.ai', '.cr2', 
    '.arw', '.dng', '.raf', '.nef', '.rw2', '.crw', '.orf', '.srw', 
    '.x3f', '.dcr', '.mrw', '.3fr', '.erf', '.mef', '.mos', '.nrw', 
    '.pef', '.rwl', '.srf'
  ];

  private static readonly documentFormats = [
    '.pdf', '.doc', '.docx', '.odt', '.txt', '.rtf', '.html', '.htm', 
    '.md', '.tex', '.djvu', '.wps', '.abw', '.pages', '.dotx'
  ];

  private static readonly archiveFormats = [
    '.zip', '.tar', '.jar', '.tar.gz', '.tar.bz2', '.tar.xz', '.tgz'
  ];

  static getFileType(filename: string): FileType {
    const extension = path.extname(filename).toLowerCase();
    
    if (this.videoFormats.includes(extension)) return 'video';
    if (this.audioFormats.includes(extension)) return 'audio';
    if (this.imageFormats.includes(extension)) return 'image';
    if (this.documentFormats.includes(extension)) return 'document';
    if (this.archiveFormats.includes(extension)) return 'archive';
    
    return 'unknown';
  }

  static getSupportedFormats() {
    return {
      video: this.videoFormats.map(ext => ext.slice(1)),
      audio: this.audioFormats.map(ext => ext.slice(1)),
      image: this.imageFormats.map(ext => ext.slice(1)),
      document: this.documentFormats.map(ext => ext.slice(1)),
      archive: this.archiveFormats.map(ext => ext.slice(1))
    };
  }

  static isValidFileType(filename: string): boolean {
    return this.getFileType(filename) !== 'unknown';
  }

  static generateUniqueFilename(originalName: string): string {
    const { v4: uuidv4 } = require('uuid');
    return `${uuidv4()}_${originalName}`;
  }
}
