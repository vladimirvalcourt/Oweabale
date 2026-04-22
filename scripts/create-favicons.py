#!/usr/bin/env python3
from PIL import Image
import os

# Source image
source = 'public/favicon-new.jpg'
img = Image.open(source)

# Sizes to create
sizes = {
    'public/favicon-16x16.png': (16, 16),
    'public/favicon-32x32.png': (32, 32),
    'public/apple-touch-icon.png': (180, 180),
    'public/icons/icon-192x192.png': (192, 192),
    'public/icons/icon-512x512.png': (512, 512),
}

for output_path, size in sizes.items():
    resized = img.resize(size, Image.Resampling.LANCZOS)
    resized.save(output_path, 'PNG')
    print(f'✓ Created {output_path} ({size[0]}x{size[1]})')

# Clean up temporary file
os.remove('public/favicon-new.jpg')
print('\n✅ All favicons created successfully!')
