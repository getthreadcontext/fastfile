#!/bin/bash

# Installation script for additional image processing tools
# This script works on Ubuntu/Debian systems

echo "Installing additional image processing tools..."

# Update package lists
sudo apt update

# Install ImageMagick
echo "Installing ImageMagick..."
sudo apt install -y imagemagick

# Install GraphicsMagick (alternative to ImageMagick)
echo "Installing GraphicsMagick..."
sudo apt install -y graphicsmagick

# Install additional image format support
echo "Installing additional format support..."
sudo apt install -y libheif-dev libheif1

# Configure ImageMagick policy (often needed for PDF/SVG)
echo "Configuring ImageMagick policy..."
sudo sed -i 's/<policy domain="coder" rights="none" pattern="PDF" \/>/<policy domain="coder" rights="read|write" pattern="PDF" \/>/g' /etc/ImageMagick-6/policy.xml
sudo sed -i 's/<policy domain="coder" rights="none" pattern="SVG" \/>/<policy domain="coder" rights="read|write" pattern="SVG" \/>/g' /etc/ImageMagick-6/policy.xml

echo "Installation completed!"
echo "You can now convert HEIC, ICO, PSD, EPS and other formats."
