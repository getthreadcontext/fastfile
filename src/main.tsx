import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/dropzone/styles.css'
import '@mantine/spotlight/styles.css'
import '@mantine/code-highlight/styles.css'
import './index.css'
import App from './App.tsx'

// Create the root element if it doesn't exist
let rootElement = document.getElementById('root');
if (!rootElement) {
  rootElement = document.createElement('div');
  rootElement.id = 'root';
  document.body.appendChild(rootElement);
}

// Set up the document title and meta tags
document.title = 'FastFile - Modern File Converter';
document.head.innerHTML += `
  <meta name="description" content="Modern file converter with sleek UI - FastFile">
  <meta name="keywords" content="file converter, media converter, video converter, audio converter, image converter">
  <meta name="author" content="FastFile">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>">
`;

createRoot(rootElement).render(
  <StrictMode>
    <MantineProvider 
      defaultColorScheme="dark"
      theme={{
        colors: {
          dark: [
            '#C1C2C5',
            '#A6A7AB',
            '#909296',
            '#5c5f66',
            '#373A40',
            '#2C2E33',
            '#25262b',
            '#1A1B1E',
            '#141517',
            '#0a0a0a',
          ],
        },
        primaryColor: 'blue',
        defaultRadius: 'md',
      }}
    >
      <Notifications />
      <App />
    </MantineProvider>
  </StrictMode>,
)
