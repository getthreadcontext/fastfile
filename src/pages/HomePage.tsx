import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Container, 
  Paper, 
  Title, 
  Text, 
  Group, 
  Stack, 
  Button, 
  Select, 
  Switch, 
  Progress, 
  Alert,
  Badge,
  Card,
  Divider,
  Center,
  Anchor
} from '@mantine/core';
import { Dropzone, FileWithPath } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import { 
  IconUpload, 
  IconX, 
  IconFileText, 
  IconDownload, 
  IconSettings, 
  IconVideo, 
  IconMusic, 
  IconPhoto, 
  IconFileZip,
  IconCheck,
  IconAlertCircle
} from '@tabler/icons-react';

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
  document: string[];
  spreadsheet: string[];
  presentation: string[];
  archive: string[];
}

const HomePage = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [outputFormat, setOutputFormat] = useState<string>('');
  const [useCompression, setUseCompression] = useState<boolean>(false);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [conversionResult, setConversionResult] = useState<ConversionResponse | null>(null);
  const [supportedFormats, setSupportedFormats] = useState<SupportedFormats>({
    video: [],
    audio: [],
    image: [],
    document: [],
    spreadsheet: [],
    presentation: [],
    archive: []
  });
  const [conversionProgress, setConversionProgress] = useState(0);

  // Fetch supported formats on component mount
  useEffect(() => {
    fetchSupportedFormats();
  }, []);

  const fetchSupportedFormats = async () => {
    try {
      const response = await fetch('/api/formats');
      const formats = await response.json();
      setSupportedFormats(formats);
    } catch (error) {
      console.error('Error fetching supported formats:', error);
      notifications.show({
        title: 'Connection Error',
        message: 'Could not fetch supported formats. Using defaults.',
        color: 'orange',
      });
      // Set default formats if API fails
      setSupportedFormats({
        video: ['mp4', 'avi', 'mov', 'webm', 'mkv'],
        audio: ['mp3', 'wav', 'aac', 'flac', 'ogg'],
        image: ['jpg', 'png', 'webp', 'gif', 'bmp'],
        document: ['pdf', 'docx', 'txt'],
        spreadsheet: ['xlsx', 'csv'],
        presentation: ['pptx'],
        archive: ['zip', '7z']
      });
    }
  };

  const handleFileSelect = useCallback((files: FileWithPath[]) => {
    const file = files[0];
    if (file) {
      // Check file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > maxSize) {
        notifications.show({
          title: 'File Too Large',
          message: `Maximum size is 10MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`,
          color: 'red',
        });
        return;
      }
      
      setSelectedFile(file);
      setConversionResult(null);
      setConversionProgress(0);
      setOutputFormat('');
    }
  }, []);

  const handleConvert = async () => {
    if (!selectedFile || !outputFormat) {
      notifications.show({
        title: 'Missing Information',
        message: 'Please select a file and output format',
        color: 'orange',
      });
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
    formData.append('useCompression', useCompression.toString());

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      });

      const result: ConversionResponse = await response.json();
      setConversionProgress(100);
      setConversionResult(result);
      
      if (result.success) {
        notifications.show({
          title: 'Conversion Complete',
          message: 'Your file has been converted successfully!',
          color: 'green',
          icon: <IconCheck size={16} />,
        });
      } else {
        notifications.show({
          title: 'Conversion Failed',
          message: result.message || 'An error occurred during conversion',
          color: 'red',
          icon: <IconAlertCircle size={16} />,
        });
      }
    } catch (error) {
      console.error('Conversion error:', error);
      setConversionResult({
        success: false,
        error: 'Network error',
        message: 'Failed to connect to conversion service'
      });
      notifications.show({
        title: 'Network Error',
        message: 'Failed to connect to conversion service',
        color: 'red',
      });
    } finally {
      clearInterval(progressInterval);
      setIsConverting(false);
    }
  };

  const handleDownload = () => {
    if (conversionResult?.downloadUrl) {
      // Create a temporary link to trigger download
      const link = document.createElement('a');
      link.href = conversionResult.downloadUrl;
      link.download = conversionResult.convertedName || 'converted-file';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Handle potential download errors
      fetch(conversionResult.downloadUrl, { method: 'HEAD' })
        .then(response => {
          if (response.status === 410) {
            notifications.show({
              title: 'Download Expired',
              message: 'This download link has expired. Files are only available for 5 minutes after conversion.',
              color: 'orange',
              icon: <IconAlertCircle size={16} />,
            });
          } else if (response.status === 404) {
            notifications.show({
              title: 'File Not Found',
              message: 'The converted file could not be found. It may have been deleted.',
              color: 'red',
              icon: <IconAlertCircle size={16} />,
            });
          }
        })
        .catch(() => {
          // If HEAD request fails, the actual download might still work
          console.log('Could not verify download link status');
        });
    }
  };

  const getFileType = (filename: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase();
    const videoFormats = ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'mpeg', 'mpg', 'wmv', '3gp', 'm4v'];
    const audioFormats = ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a', 'wma'];
    const imageFormats = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'heic', 'ico', 'svg'];
    const documentFormats = ['pdf', 'doc', 'docx', 'odt', 'txt', 'rtf', 'html'];
    const spreadsheetFormats = ['xls', 'xlsx', 'ods', 'csv'];
    const presentationFormats = ['ppt', 'pptx', 'odp'];
    const archiveFormats = ['zip', 'rar', '7z', 'tar', 'gz'];

    if (videoFormats.includes(extension || '')) return 'video';
    if (audioFormats.includes(extension || '')) return 'audio';
    if (imageFormats.includes(extension || '')) return 'image';
    if (documentFormats.includes(extension || '')) return 'document';
    if (spreadsheetFormats.includes(extension || '')) return 'spreadsheet';
    if (presentationFormats.includes(extension || '')) return 'presentation';
    if (archiveFormats.includes(extension || '')) return 'archive';
    return 'unknown';
  };

  const getAvailableFormats = () => {
    if (!selectedFile) return [];
    
    const fileType = getFileType(selectedFile.name);
    switch (fileType) {
      case 'video':
        return [...supportedFormats.video, ...supportedFormats.audio, 'gif'];
      case 'audio':
        return supportedFormats.audio;
      case 'image':
        return supportedFormats.image;
      case 'document':
        return supportedFormats.document;
      case 'spreadsheet':
        return supportedFormats.spreadsheet;
      case 'presentation':
        return supportedFormats.presentation;
      case 'archive':
        return supportedFormats.archive;
      default:
        return [];
    }
  };

  const getFileIcon = (filename: string) => {
    const fileType = getFileType(filename);
    switch (fileType) {
      case 'video': return <IconVideo size={20} />;
      case 'audio': return <IconMusic size={20} />;
      case 'image': return <IconPhoto size={20} />;
      case 'document': return <IconFileText size={20} />;
      case 'spreadsheet': return <IconFileText size={20} />;
      case 'presentation': return <IconFileText size={20} />;
      case 'archive': return <IconFileZip size={20} />;
      default: return <IconFileText size={20} />;
    }
  };

  const isMediaFile = (filename: string) => {
    const fileType = getFileType(filename);
    return ['video', 'audio', 'image'].includes(fileType);
  };

  return (
    <Container size="md">
      <Stack gap="xl">
        <div>
          <Title order={1} mb="xs">
            File Converter
          </Title>
          <Text c="dimmed" size="lg">
            Convert your files to different formats with ease. Supports video, audio, images, documents, and more.
          </Text>
        </div>

        <Paper shadow="sm" p="xl" radius="md">
          <Stack gap="lg">
            <Dropzone
              onDrop={handleFileSelect}
              onReject={() => {
                notifications.show({
                  title: 'File Rejected',
                  message: 'Please check file type and size requirements',
                  color: 'red',
                });
              }}
              maxSize={10 * 1024 * 1024} // 10MB
              accept={{
                'video/*': [],
                'audio/*': [],
                'image/*': [],
                'application/*': [],
                'text/*': []
              }}
            >
              <Group justify="center" gap="xl" mih={220} style={{ pointerEvents: 'none' }}>
                <Dropzone.Accept>
                  <IconUpload
                    size={52}
                    color="var(--mantine-color-blue-6)"
                  />
                </Dropzone.Accept>
                <Dropzone.Reject>
                  <IconX
                    size={52}
                    color="var(--mantine-color-red-6)"
                  />
                </Dropzone.Reject>
                <Dropzone.Idle>
                  <IconUpload size={52} color="var(--mantine-color-dimmed)" />
                </Dropzone.Idle>

                <div>
                  <Text size="xl" inline>
                    Drag files here or click to select files
                  </Text>
                  <Text size="sm" c="dimmed" inline mt={7}>
                    Attach files up to 10MB in size. We support video, audio, images, documents, spreadsheets, presentations, and archives.
                  </Text>
                </div>
              </Group>
            </Dropzone>

            {selectedFile && (
              <Card withBorder p="md">
                <Group justify="space-between">
                  <Group gap="sm">
                    {getFileIcon(selectedFile.name)}
                    <div>
                      <Text fw={500}>{selectedFile.name}</Text>
                      <Text size="sm" c="dimmed">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </Text>
                    </div>
                  </Group>
                  <Badge color="blue" variant="light">
                    {getFileType(selectedFile.name).toUpperCase()}
                  </Badge>
                </Group>
              </Card>
            )}

            {selectedFile && (
              <>
                <Divider />
                <Stack gap="md">
                  <Group gap="md" align="end">
                    <Select
                      label="Output Format"
                      placeholder="Select format"
                      value={outputFormat}
                      onChange={(value) => setOutputFormat(value || '')}
                      data={getAvailableFormats().map(format => ({
                        value: format,
                        label: format.toUpperCase()
                      }))}
                      flex={1}
                    />
                    
                    {isMediaFile(selectedFile.name) && (
                      <Switch
                        label="Enable compression"
                        description="Reduce file size"
                        checked={useCompression}
                        onChange={(event) => setUseCompression(event.currentTarget.checked)}
                      />
                    )}
                  </Group>

                  <Button
                    onClick={handleConvert}
                    disabled={!outputFormat || isConverting}
                    loading={isConverting}
                    leftSection={<IconSettings size={16} />}
                    size="lg"
                    fullWidth
                  >
                    {isConverting ? 'Converting...' : 'Convert File'}
                  </Button>
                </Stack>
              </>
            )}

            {isConverting && (
              <Card withBorder p="md">
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text fw={500}>Converting {selectedFile?.name}</Text>
                    <Text size="sm" c="dimmed">{Math.round(conversionProgress)}%</Text>
                  </Group>
                  <Progress value={conversionProgress} animated />
                  <Text size="sm" c="dimmed">
                    Converting to {outputFormat?.toUpperCase()}...
                  </Text>
                </Stack>
              </Card>
            )}

            {conversionResult && (
              <Alert
                color={conversionResult.success ? 'green' : 'red'}
                icon={conversionResult.success ? <IconCheck size={16} /> : <IconAlertCircle size={16} />}
              >
                <Stack gap="xs">
                  <Text fw={500}>
                    {conversionResult.success ? 'Conversion Complete!' : 'Conversion Failed'}
                  </Text>
                  <Text size="sm">{conversionResult.message}</Text>
                  
                  {conversionResult.success && conversionResult.downloadUrl && (
                    <Group mt="sm">
                      <Button
                        leftSection={<IconDownload size={16} />}
                        onClick={handleDownload}
                        variant="light"
                      >
                        Download {conversionResult.convertedName}
                      </Button>
                    </Group>
                  )}
                  
                  {conversionResult.error && (
                    <Text size="sm" c="red">
                      Error: {conversionResult.error}
                    </Text>
                  )}
                </Stack>
              </Alert>
            )}
          </Stack>
        </Paper>

        <Center>
          <Text size="sm" c="dimmed">
            Having issues? Check our{' '}
            <Anchor component={Link} to="/docs" size="sm" c="blue">
              documentation
            </Anchor>{' '}
            for help and supported formats.
          </Text>
        </Center>
      </Stack>
    </Container>
  );
};

export default HomePage;
