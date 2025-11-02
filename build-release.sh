#!/bin/bash

# build-release.sh
# Local release package builder for Chaser OSS
# Usage: ./build-release.sh [version]
# Example: ./build-release.sh 0.1.0

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get version from argument or manifest.json
if [ -n "$1" ]; then
  VERSION="$1"
else
  VERSION=$(grep '"version"' manifest.json | head -1 | sed 's/.*"version": "\([^"]*\)".*/\1/')
  echo -e "${YELLOW}No version specified, using version from manifest.json: ${VERSION}${NC}"
fi

echo -e "${GREEN}Building Chaser OSS v${VERSION}${NC}"

# Validate version format (semantic versioning)
if ! [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
  echo -e "${RED}Error: Invalid version format. Expected: X.Y.Z or X.Y.Z-prerelease${NC}"
  exit 1
fi

# Check required files exist
REQUIRED_FILES=("manifest.json" "background.js" "content/content.js" "content/ui.js" "README.md")
for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo -e "${RED}Error: Required file not found: $file${NC}"
    exit 1
  fi
done

# Verify manifest version matches specified version
MANIFEST_VERSION=$(grep '"version"' manifest.json | head -1 | sed 's/.*"version": "\([^"]*\)".*/\1/')
if [ "$MANIFEST_VERSION" != "$VERSION" ]; then
  echo -e "${RED}Error: manifest.json version ($MANIFEST_VERSION) does not match specified version ($VERSION)${NC}"
  echo -e "${YELLOW}Update manifest.json or run without version argument${NC}"
  exit 1
fi

# Create dist directory
mkdir -p dist

# Define output filename
OUTPUT_ZIP="dist/chaser-oss-v${VERSION}.zip"
OUTPUT_CHECKSUM="dist/chaser-oss-v${VERSION}.zip.sha256"

# Remove old release files if they exist
if [ -f "$OUTPUT_ZIP" ]; then
  echo -e "${YELLOW}Removing existing release package${NC}"
  rm -f "$OUTPUT_ZIP" "$OUTPUT_CHECKSUM"
fi

# Create ZIP archive
echo -e "${GREEN}Creating ZIP archive...${NC}"
zip -r "$OUTPUT_ZIP" \
  manifest.json \
  background.js \
  content/ \
  assets/ \
  README.md \
  LICENSE \
  banner.png \
  -x "*.DS_Store" \
  -x "*/.DS_Store" \
  -x "*.git*" \
  -q

if [ $? -ne 0 ]; then
  echo -e "${RED}Error: Failed to create ZIP archive${NC}"
  exit 1
fi

# Generate SHA256 checksum
echo -e "${GREEN}Generating SHA256 checksum...${NC}"
if command -v sha256sum &> /dev/null; then
  # Linux
  (cd dist && sha256sum "chaser-oss-v${VERSION}.zip" > "chaser-oss-v${VERSION}.zip.sha256")
elif command -v shasum &> /dev/null; then
  # macOS
  (cd dist && shasum -a 256 "chaser-oss-v${VERSION}.zip" > "chaser-oss-v${VERSION}.zip.sha256")
else
  echo -e "${RED}Error: No SHA256 utility found (sha256sum or shasum)${NC}"
  exit 1
fi

# Display results
echo -e "${GREEN}✓ Release package created successfully${NC}"
echo ""
echo "Package: $OUTPUT_ZIP"
echo "Size: $(du -h "$OUTPUT_ZIP" | cut -f1)"
echo ""
echo "Checksum file: $OUTPUT_CHECKSUM"
echo ""
echo -e "${GREEN}SHA256:${NC}"
cat "$OUTPUT_CHECKSUM"
echo ""

# Verify checksum
echo -e "${GREEN}Verifying checksum...${NC}"
if command -v sha256sum &> /dev/null; then
  (cd dist && sha256sum -c "chaser-oss-v${VERSION}.zip.sha256")
elif command -v shasum &> /dev/null; then
  (cd dist && shasum -a 256 -c "chaser-oss-v${VERSION}.zip.sha256")
fi

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Checksum verification passed${NC}"
else
  echo -e "${RED}✗ Checksum verification failed${NC}"
  exit 1
fi

# List contents of ZIP
echo ""
echo -e "${GREEN}Archive contents:${NC}"
unzip -l "$OUTPUT_ZIP"

echo ""
echo -e "${GREEN}✓ Build complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Test the extension from the ZIP:"
echo "     unzip $OUTPUT_ZIP -d test-build"
echo "     Load 'test-build' as unpacked extension in Chrome"
echo ""
echo "  2. If everything works, create a release:"
echo "     git tag -a v${VERSION} -m 'Release v${VERSION}'"
echo "     git push origin v${VERSION}"
echo ""
