#!/bin/bash

# Mobile AI Assistant Icon Generator
# Generates all required icon sizes from SVG

echo "🎨 Generating mobile app icons..."

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "⚠️  ImageMagick not installed. Installing..."
    sudo apt-get update && sudo apt-get install -y imagemagick
fi

# Ensure icons directory exists
mkdir -p public/icons

# Icon sizes needed for PWA
sizes=(72 96 128 144 152 192 384 512)

# Generate PNG icons from SVG
for size in "${sizes[@]}"; do
    echo "  Creating icon-${size}x${size}.png..."
    convert -background none -size ${size}x${size} public/icons/icon.svg public/icons/icon-${size}x${size}.png 2>/dev/null || \
    convert -background none public/icons/icon.svg -resize ${size}x${size} public/icons/icon-${size}x${size}.png
done

# Generate favicon
echo "  Creating favicon.ico..."
convert public/icons/icon-192x192.png -define icon:auto-resize=64,48,32,16 public/favicon.ico 2>/dev/null

echo "✅ Icons generated successfully!"
echo ""
echo "Generated icons:"
ls -lh public/icons/icon-*.png
echo ""
echo "📱 Icons are ready for mobile installation!"
