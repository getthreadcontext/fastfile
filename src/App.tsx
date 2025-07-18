import React, { useState, useCallback, useEffect } from 'react';
import './App.css';

interface ConversionResponse {
  success: boolean;
  message: string;
  downloadUrl?: string;
  originalName?: string;
  convertedName?: string;
  error?: string;
}

interface SupportedFormats {
  video: string[];
  audio: string[];
  image: string[];
}

// Matrix-like background effect
const MatrixBackground = () => {
  const [characters, setCharacters] = useState<string[]>([]);
  
  useEffect(() => {
    const chars = "01※◊◈◇◉◎●○◐◑◒◓◔◕◖◗◘◙◚◛◜◝◞◟◠◡◢◣◤◥◦◧◨◩◪◫◬◭◮◯";
    const newChars = [];
    for (let i = 0; i < 50; i++) {
      newChars.push(chars[Math.floor(Math.random() * chars.length)]);
    }
    setCharacters(newChars);
  }, []);

  return (
    <div className="matrix-bg">
      {characters.map((char, index) => (
        <span
          key={index}
          className="matrix-char"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${3 + Math.random() * 4}s`
          }}
        >
          {char}
        </span>
      ))}
    </div>
  );
};

// Loading progress bar component
const LoadingBar = ({ progress }: { progress: number }) => (
  <div className="loading-container">
    <div className="loading-bar">
      <div 
        className="loading-fill"
        style={{ width: `${progress}%` }}
      />
    </div>
    <div className="loading-text">PROCESSING... {progress}%</div>
  </div>
);

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [outputFormat, setOutputFormat] = useState<string>('');
  const [quality, setQuality] = useState<string>('medium');
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [conversionResult, setConversionResult] = useState<ConversionResponse | null>(null);
  const [supportedFormats, setSupportedFormats] = useState<SupportedFormats>({
    video: [],
    audio: [],
    image: []
  });
  const [conversionProgress, setConversionProgress] = useState(0);

  // Fetch supported formats on component mount
  useEffect(() => {
    fetchSupportedFormats();
  }, []);

  const fetchSupportedFormats = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/formats');
      const formats = await response.json();
      setSupportedFormats(formats);
    } catch (error) {
      console.error('Error fetching supported formats:', error);
    }
  };

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > maxSize) {
        alert(`File too large! Maximum size is 10MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`);
        event.target.value = ''; // Clear the input
        return;
      }
      
      setSelectedFile(file);
      setConversionResult(null);
      setConversionProgress(0);
    }
  }, []);

  const handleFormatChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setOutputFormat(event.target.value);
  }, []);

  const handleQualityChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setQuality(event.target.value);
  }, []);

  const handleConvert = async () => {
    if (!selectedFile || !outputFormat) {
      alert('Please select a file and output format');
      return;
    }

    setIsConverting(true);
    setConversionResult(null);
    setConversionProgress(0);

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setConversionProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 10;
      });
    }, 500);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('format', outputFormat);
    formData.append('quality', quality);

    try {
      const response = await fetch('http://localhost:3001/api/convert', {
        method: 'POST',
        body: formData,
      });

      const result: ConversionResponse = await response.json();
      setConversionProgress(100);
      setConversionResult(result);
    } catch (error) {
      console.error('Conversion error:', error);
      setConversionResult({
        success: false,
        error: 'Network error',
        message: 'Failed to connect to conversion service'
      });
    } finally {
      clearInterval(progressInterval);
      setIsConverting(false);
    }
  };

  const handleDownload = () => {
    if (conversionResult?.downloadUrl) {
      window.open(`http://localhost:3001${conversionResult.downloadUrl}`, '_blank');
    }
  };

  const getFileType = (filename: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase();
    const videoFormats = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'];
    const audioFormats = ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a'];
    const imageFormats = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];

    if (videoFormats.includes(extension || '')) return 'video';
    if (audioFormats.includes(extension || '')) return 'audio';
    if (imageFormats.includes(extension || '')) return 'image';
    return 'unknown';
  };

  const getAvailableFormats = () => {
    if (!selectedFile) return [];
    
    const fileType = getFileType(selectedFile.name);
    switch (fileType) {
      case 'video':
        return [...supportedFormats.video, ...supportedFormats.audio, ...supportedFormats.image];
      case 'audio':
        return supportedFormats.audio;
      case 'image':
        return supportedFormats.image;
      default:
        return [];
    }
  };

  const getFileIcon = (filename: string) => {
    const fileType = getFileType(filename);
    switch (fileType) {
      case 'video': return '📹';
      case 'audio': return '🎵';
      case 'image': return '🖼️';
      default: return '📄';
    }
  };

  return (
    <div className="App">
      <MatrixBackground />
      <div className="cyber-grid"></div>
      
      <main className="main-content">
        <div className="terminal-window">
          <div className="terminal-header">
            <div className="terminal-buttons">
              <div className="terminal-button red"></div>
              <div className="terminal-button yellow"></div>
              <div className="terminal-button green"></div>
            </div>
            <div className="terminal-title">FastFile.exe</div>
          </div>
          
          <div className="terminal-content">
            <div className="upload-zone">
              <div className="upload-border">
                <label htmlFor="file-input" className="upload-label">
                  {selectedFile ? (
                    <div className="file-info">
                      <span className="file-icon">{getFileIcon(selectedFile.name)}</span>
                      <span className="file-name">{selectedFile.name}</span>
                      <span className={`file-size ${selectedFile.size > 8 * 1024 * 1024 ? 'size-warning' : ''}`}>
                        ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                  ) : (
                    <div className="upload-prompt">
                      <div className="upload-icon">⬆</div>
                      <div>DRAG FILES HERE OR CLICK TO BROWSE</div>
                      <div className="upload-hint">Supported: Video • Audio • Images</div>
                      <div className="upload-limit">Maximum file size: 10MB</div>
                    </div>
                  )}
                </label>
                <input
                  id="file-input"
                  type="file"
                  accept=".mp4,.avi,.mkv,.mov,.wmv,.flv,.webm,.mp3,.wav,.aac,.flac,.ogg,.m4a,.jpg,.jpeg,.png,.gif,.bmp,.webp"
                  onChange={handleFileSelect}
                  className="file-input"
                />
              </div>
            </div>

            {selectedFile && (
              <div className="control-panel">
                <div className="control-group">
                  <label className="control-label">OUTPUT FORMAT:</label>
                  <select
                    value={outputFormat}
                    onChange={handleFormatChange}
                    className="cyber-select"
                  >
                    <option value="">-- SELECT FORMAT --</option>
                    {getAvailableFormats().map(format => (
                      <option key={format} value={format}>
                        {format.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="control-group">
                  <label className="control-label">QUALITY LEVEL:</label>
                  <select
                    value={quality}
                    onChange={handleQualityChange}
                    className="cyber-select"
                  >
                    <option value="low">LOW COMPRESSION</option>
                    <option value="medium">MEDIUM QUALITY</option>
                    <option value="high">HIGH DEFINITION</option>
                  </select>
                </div>

                <button
                  onClick={handleConvert}
                  disabled={!outputFormat || isConverting}
                  className="cyber-button"
                >
                  {isConverting ? 'PROCESSING...' : 'INITIALIZE CONVERSION'}
                </button>
              </div>
            )}

            {isConverting && (
              <div className="conversion-status">
                <div className="status-header">CONVERSION IN PROGRESS...</div>
                <LoadingBar progress={conversionProgress} />
                <div className="status-text">
                  Processing {selectedFile?.name} → {outputFormat?.toUpperCase()}
                </div>
              </div>
            )}

            {conversionResult && (
              <div className={`result-panel ${conversionResult.success ? 'success' : 'error'}`}>
                <div className="result-header">
                  {conversionResult.success ? '✓ CONVERSION COMPLETE' : '✗ CONVERSION FAILED'}
                </div>
                <div className="result-message">{conversionResult.message}</div>
                
                {conversionResult.success && conversionResult.downloadUrl && (
                  <div className="download-section">
                    <div className="conversion-info">
                      {conversionResult.originalName} → {conversionResult.convertedName}
                    </div>
                    <button onClick={handleDownload} className="download-button">
                      ⬇ DOWNLOAD FILE
                    </button>
                  </div>
                )}
                
                {conversionResult.error && (
                  <div className="error-details">ERROR: {conversionResult.error}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
