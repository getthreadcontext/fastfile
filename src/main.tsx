import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
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
document.title = 'FastFile Converter - Y2K Digital Media Suite';
document.head.innerHTML += `
  <meta name="description" content="Convert your media files with retro Y2K style - FastFile Converter">
  <meta name="keywords" content="file converter, media converter, video converter, audio converter, image converter, y2k, retro">
  <meta name="author" content="FastFile Converter">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>">
`;

// Set up the body styling
document.body.style.margin = '0';
document.body.style.padding = '0';
document.body.style.fontFamily = 'Share Tech Mono, monospace';
document.body.style.backgroundColor = '#0a0a0a';
document.body.style.color = '#00ffff';
document.body.style.overflow = 'hidden auto';

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
