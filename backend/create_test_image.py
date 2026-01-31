#!/usr/bin/env python
"""Create a minimal valid PNG for testing."""

# Minimal 1x1 red PNG
png_data = (
    b'\x89PNG\r\n\x1a\n'
    b'\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde'
    b'\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0\x00\x00\x00\x03\x00\x01\x00\x18\xdd\x8d\xb4'
    b'\x00\x00\x00\x00IEND\xaeB`\x82'
)

with open('test_photo.png', 'wb') as f:
    f.write(png_data)

print(f'Created test_photo.png ({len(png_data)} bytes)')
