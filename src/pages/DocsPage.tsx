import { 
  Container, 
  Title, 
  Text, 
  Stack, 
  Paper, 
  List, 
  Badge, 
  Group, 
  Alert,
  Card,
  Grid,
  ThemeIcon,
  Code
} from '@mantine/core';
import { 
  IconInfoCircle,
  IconShield,
  IconClock
} from '@tabler/icons-react';

const DocsPage = () => {
  const httpMethods = [
    {
      method: 'GET',
      endpoint: '/api/formats',
      description: 'Get all supported file formats',
      color: 'green'
    },
    {
      method: 'POST',
      endpoint: '/api/convert',
      description: 'Upload and convert a file',
      color: 'blue'
    },
    {
      method: 'GET',
      endpoint: '/api/download/:filename',
      description: 'Download converted file',
      color: 'green'
    },
    {
      method: 'GET',
      endpoint: '/api/health',
      description: 'Get server health status',
      color: 'green'
    },
    {
      method: 'GET',
      endpoint: '/api/cleanup/stats',
      description: 'Get cleanup statistics',
      color: 'green'
    }
  ];

  const errorCodes = [
    {
      code: 'DOWNLOAD_EXPIRED',
      status: '410 Gone',
      description: 'Download link has expired (5+ minutes old)'
    },
    {
      code: 'FILE_NOT_FOUND',
      status: '404 Not Found',
      description: 'Requested file does not exist'
    },
    {
      code: 'DOWNLOAD_ERROR',
      status: '500 Internal Server Error',
      description: 'Error occurred during file download'
    }
  ];

  return (
    <Container size="md">
      <Stack gap="xl">
        <div>
          <Title order={1} mb="xs">
            API Documentation
          </Title>
          <Text c="dimmed" size="lg">
            Complete API reference for the FastFile conversion service.
          </Text>
        </div>

        <Alert 
          icon={<IconInfoCircle size={16} />} 
          title="Base URL" 
          color="blue"
          variant="light"
        >
          All API endpoints are prefixed with: <Code>https://beta-fastfile.captain.dum88.nl/api</Code>
        </Alert>

        <Paper shadow="sm" p="xl" radius="md">
          <Stack gap="lg">
            <div>
              <Title order={2} mb="sm">
                API Endpoints
              </Title>
              <Text c="dimmed">
                Overview of all available endpoints and their purposes.
              </Text>
            </div>

            <Stack gap="md">
              {httpMethods.map((endpoint, index) => (
                <Card key={index} withBorder>
                  <Group justify="space-between" mb="sm">
                    <Group gap="md">
                      <Badge color={endpoint.color} variant="filled">
                        {endpoint.method}
                      </Badge>
                      <Code>{endpoint.endpoint}</Code>
                    </Group>
                  </Group>
                  <Text size="sm" c="dimmed">
                    {endpoint.description}
                  </Text>
                </Card>
              ))}
            </Stack>
          </Stack>
        </Paper>

        <Paper shadow="sm" p="xl" radius="md">
          <Stack gap="lg">
            <div>
              <Title order={2} mb="sm">
                File Conversion
              </Title>
              <Text c="dimmed">
                Convert files using multipart form data upload.
              </Text>
            </div>

            <Card withBorder p="md">
              <Stack gap="sm">
                <Group gap="sm">
                  <Badge color="blue" variant="filled">POST</Badge>
                  <Code>/api/convert</Code>
                </Group>
                
                <Text size="sm" fw={500}>Request Body (multipart/form-data):</Text>
                <List spacing="xs" size="sm">
                  <List.Item><Code>file</Code> - The file to convert (required)</List.Item>
                  <List.Item><Code>format</Code> - Target format (e.g., "mp4", "pdf") (required)</List.Item>
                  <List.Item><Code>useCompression</Code> - "true" or "false" for media files (optional)</List.Item>
                </List>

                <Text size="sm" fw={500} mt="md">Response (JSON):</Text>
                <Paper p="sm" style={{ backgroundColor: '#2a2a2a' }}>
                  <Text size="xs" style={{ fontFamily: 'monospace', whiteSpace: 'pre' }}>
{`{
  "success": true,
  "message": "Conversion completed successfully",
  "downloadUrl": "/api/download/filename.ext",
  "originalName": "original.ext",
  "convertedName": "converted.ext"
}`}
                  </Text>
                </Paper>
              </Stack>
            </Card>
          </Stack>
        </Paper>

        <Paper shadow="sm" p="xl" radius="md">
          <Stack gap="lg">
            <div>
              <Title order={2} mb="sm">
                File Download
              </Title>
              <Text c="dimmed">
                Download converted files with automatic cleanup.
              </Text>
            </div>

            <Card withBorder p="md">
              <Stack gap="sm">
                <Group gap="sm">
                  <Badge color="green" variant="filled">GET</Badge>
                  <Code>/api/download/:filename</Code>
                </Group>
                
                <Text size="sm" fw={500}>Parameters:</Text>
                <List spacing="xs" size="sm">
                  <List.Item><Code>filename</Code> - Name of the converted file</List.Item>
                </List>

                <Alert color="orange" variant="light" icon={<IconClock size={14} />}>
                  <Text size="sm">
                    <strong>Important:</strong> Download links expire after 5 minutes. Files are automatically deleted.
                  </Text>
                </Alert>

                <Text size="sm" fw={500} mt="md">Success Response:</Text>
                <List spacing="xs" size="sm">
                  <List.Item>File stream with appropriate Content-Type headers</List.Item>
                  <List.Item>Content-Disposition: attachment</List.Item>
                  <List.Item>File is deleted after successful download</List.Item>
                </List>
              </Stack>
            </Card>
          </Stack>
        </Paper>

        <Paper shadow="sm" p="xl" radius="md">
          <Stack gap="lg">
            <div>
              <Title order={2} mb="sm">
                Supported Formats
              </Title>
              <Text c="dimmed">
                Complete list of supported file formats organized by category.
              </Text>
            </div>

            <Grid>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Card withBorder h="100%">
                  <Stack gap="md">
                    <Group gap="sm">
                      <ThemeIcon color="blue" size="lg" variant="light">
                        <IconInfoCircle size={20} />
                      </ThemeIcon>
                      <div>
                        <Text fw={600}>Video Files</Text>
                        <Text size="sm" c="dimmed">
                          Video files for movies, clips, and recordings
                        </Text>
                      </div>
                    </Group>
                    
                    <Group gap="xs">
                      {['MP4', 'AVI', 'MOV', 'MKV', 'WEBM', 'FLV', 'MPEG', 'WMV', '3GP'].map((format) => (
                        <Badge key={format} variant="light" size="sm">
                          {format}
                        </Badge>
                      ))}
                    </Group>
                  </Stack>
                </Card>
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Card withBorder h="100%">
                  <Stack gap="md">
                    <Group gap="sm">
                      <ThemeIcon color="green" size="lg" variant="light">
                        <IconInfoCircle size={20} />
                      </ThemeIcon>
                      <div>
                        <Text fw={600}>Audio Files</Text>
                        <Text size="sm" c="dimmed">
                          Audio files for music, podcasts, and sound
                        </Text>
                      </div>
                    </Group>
                    
                    <Group gap="xs">
                      {['MP3', 'WAV', 'AAC', 'FLAC', 'OGG', 'M4A', 'WMA'].map((format) => (
                        <Badge key={format} variant="light" size="sm">
                          {format}
                        </Badge>
                      ))}
                    </Group>
                  </Stack>
                </Card>
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Card withBorder h="100%">
                  <Stack gap="md">
                    <Group gap="sm">
                      <ThemeIcon color="orange" size="lg" variant="light">
                        <IconInfoCircle size={20} />
                      </ThemeIcon>
                      <div>
                        <Text fw={600}>Image Files</Text>
                        <Text size="sm" c="dimmed">
                          Image files for photos and graphics
                        </Text>
                      </div>
                    </Group>
                    
                    <Group gap="xs">
                      {['JPG', 'PNG', 'WEBP', 'GIF', 'BMP', 'TIFF', 'HEIC', 'SVG'].map((format) => (
                        <Badge key={format} variant="light" size="sm">
                          {format}
                        </Badge>
                      ))}
                    </Group>
                  </Stack>
                </Card>
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Card withBorder h="100%">
                  <Stack gap="md">
                    <Group gap="sm">
                      <ThemeIcon color="red" size="lg" variant="light">
                        <IconInfoCircle size={20} />
                      </ThemeIcon>
                      <div>
                        <Text fw={600}>Document Files</Text>
                        <Text size="sm" c="dimmed">
                          Document files for text and presentations
                        </Text>
                      </div>
                    </Group>
                    
                    <Group gap="xs">
                      {['PDF', 'DOCX', 'TXT', 'RTF', 'HTML'].map((format) => (
                        <Badge key={format} variant="light" size="sm">
                          {format}
                        </Badge>
                      ))}
                    </Group>
                  </Stack>
                </Card>
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Card withBorder h="100%">
                  <Stack gap="md">
                    <Group gap="sm">
                      <ThemeIcon color="purple" size="lg" variant="light">
                        <IconInfoCircle size={20} />
                      </ThemeIcon>
                      <div>
                        <Text fw={600}>Archive Files</Text>
                        <Text size="sm" c="dimmed">
                          Archive files for compression and backup
                        </Text>
                      </div>
                    </Group>
                    
                    <Group gap="xs">
                      {['ZIP', 'RAR', '7Z', 'TAR', 'GZ'].map((format) => (
                        <Badge key={format} variant="light" size="sm">
                          {format}
                        </Badge>
                      ))}
                    </Group>
                  </Stack>
                </Card>
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Card withBorder h="100%">
                  <Stack gap="md">
                    <Group gap="sm">
                      <ThemeIcon color="teal" size="lg" variant="light">
                        <IconInfoCircle size={20} />
                      </ThemeIcon>
                      <div>
                        <Text fw={600}>Spreadsheet Files</Text>
                        <Text size="sm" c="dimmed">
                          Spreadsheet files for data and calculations
                        </Text>
                      </div>
                    </Group>
                    
                    <Group gap="xs">
                      {['XLSX', 'CSV', 'ODS'].map((format) => (
                        <Badge key={format} variant="light" size="sm">
                          {format}
                        </Badge>
                      ))}
                    </Group>
                  </Stack>
                </Card>
              </Grid.Col>
            </Grid>

            <Card withBorder p="md" mt="md">
              <Stack gap="sm">
                <Group gap="sm">
                  <Badge color="green" variant="filled">GET</Badge>
                  <Code>/api/formats</Code>
                </Group>
                
                <Text size="sm" fw={500}>Get formats programmatically (JSON Response):</Text>
                <Paper p="sm" style={{ backgroundColor: '#2a2a2a' }}>
                  <Text size="xs" style={{ fontFamily: 'monospace', whiteSpace: 'pre' }}>
{`{
  "video": ["mp4", "avi", "mov", "mkv", "webm", "flv", "mpeg", "wmv", "3gp"],
  "audio": ["mp3", "wav", "aac", "flac", "ogg", "m4a", "wma"],
  "image": ["jpg", "png", "webp", "gif", "bmp", "tiff", "heic", "svg"],
  "document": ["pdf", "docx", "txt", "rtf", "html"],
  "spreadsheet": ["xlsx", "csv", "ods"],
  "presentation": ["pptx", "odp", "key"],
  "archive": ["zip", "rar", "7z", "tar", "gz"]
}`}
                  </Text>
                </Paper>
              </Stack>
            </Card>
          </Stack>
        </Paper>

        <Paper shadow="sm" p="xl" radius="md">
          <Stack gap="lg">
            <div>
              <Title order={2} mb="sm">
                Error Codes
              </Title>
              <Text c="dimmed">
                Standard HTTP status codes and custom error responses.
              </Text>
            </div>

            <Stack gap="md">
              {errorCodes.map((error, index) => (
                <Card key={index} withBorder>
                  <Group justify="space-between" mb="xs">
                    <Code color="red">{error.code}</Code>
                    <Badge color="red" variant="light">
                      {error.status}
                    </Badge>
                  </Group>
                  <Text size="sm" c="dimmed">
                    {error.description}
                  </Text>
                </Card>
              ))}
            </Stack>

            <Alert color="red" variant="light" icon={<IconInfoCircle size={16} />}>
              <Text size="sm">
                <strong>Note:</strong> All error responses include a JSON body with 
                <Code>error</Code>, <Code>message</Code>, and <Code>code</Code> fields.
              </Text>
            </Alert>
          </Stack>
        </Paper>

        <Paper shadow="sm" p="xl" radius="md">
          <Stack gap="lg">
            <div>
              <Title order={2} mb="sm">
                Rate Limits & Constraints
              </Title>
              <Text c="dimmed">
                Current limitations and constraints of the API.
              </Text>
            </div>

            <Grid>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Card withBorder h="100%">
                  <Stack gap="md">
                    <Group gap="sm">
                      <ThemeIcon color="orange" size="lg" variant="light">
                        <IconShield size={20} />
                      </ThemeIcon>
                      <Text fw={600}>File Constraints</Text>
                    </Group>
                    
                    <List spacing="xs" size="sm">
                      <List.Item>Maximum file size: 10MB</List.Item>
                      <List.Item>Single file per request</List.Item>
                      <List.Item>5-minute download expiry</List.Item>
                      <List.Item>Automatic file cleanup</List.Item>
                      <List.Item>No file persistence</List.Item>
                    </List>
                  </Stack>
                </Card>
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Card withBorder h="100%">
                  <Stack gap="md">
                    <Group gap="sm">
                      <ThemeIcon color="blue" size="lg" variant="light">
                        <IconClock size={20} />
                      </ThemeIcon>
                      <Text fw={600}>Processing Limits</Text>
                    </Group>
                    
                    <List spacing="xs" size="sm">
                      <List.Item>No concurrent request limits</List.Item>
                      <List.Item>Processing time varies by file size</List.Item>
                      <List.Item>No batch processing</List.Item>
                      <List.Item>Memory-based processing</List.Item>
                      <List.Item>Server restart clears all files</List.Item>
                    </List>
                  </Stack>
                </Card>
              </Grid.Col>
            </Grid>
          </Stack>
        </Paper>

        <Paper shadow="sm" p="xl" radius="md">
          <Stack gap="lg">
            <div>
              <Title order={2} mb="sm">
                Example Usage
              </Title>
              <Text c="dimmed">
                Code examples for common API usage patterns.
              </Text>
            </div>

            <Card withBorder p="md">
              <Stack gap="sm">
                <Text fw={500}>JavaScript/Fetch Example:</Text>
                <Paper p="sm" style={{ backgroundColor: '#2a2a2a' }}>
                  <Text size="xs" style={{ fontFamily: 'monospace', whiteSpace: 'pre' }}>
{`// Convert a file
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('format', 'pdf');
formData.append('useCompression', 'false');

const response = await fetch('https://beta-fastfile.captain.dum88.nl/api/convert', {
  method: 'POST',
  body: formData
});

const result = await response.json();
if (result.success) {
  // Download the file
  window.open('https://beta-fastfile.captain.dum88.nl' + result.downloadUrl, '_blank');
}`}
                  </Text>
                </Paper>
              </Stack>
            </Card>

            <Card withBorder p="md">
              <Stack gap="sm">
                <Text fw={500}>cURL Example:</Text>
                <Paper p="sm" style={{ backgroundColor: '#2a2a2a' }}>
                  <Text size="xs" style={{ fontFamily: 'monospace', whiteSpace: 'pre' }}>
{`# Convert a file
curl -X POST https://beta-fastfile.captain.dum88.nl/api/convert \\
  -F "file=@document.docx" \\
  -F "format=pdf" \\
  -F "useCompression=false"

# Get supported formats
curl https://beta-fastfile.captain.dum88.nl/api/formats

# Check server health
curl https://beta-fastfile.captain.dum88.nl/api/health`}
                  </Text>
                </Paper>
              </Stack>
            </Card>
          </Stack>
        </Paper>

        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
          <Stack gap="xs">
            <Text fw={500}>Development Notes</Text>
            <Text size="sm">
              This API is currently in beta. File processing happens on the server, 
              and all files are automatically cleaned up after 5 minutes or on server restart. 
              No data is persisted between sessions.
            </Text>
          </Stack>
        </Alert>
      </Stack>
    </Container>
  );
};

export default DocsPage;
