#!/bin/bash
# Dependency Update Script for node-red-contrib-wger
# Safe updates based on dependency audit

set -e

echo "========================================="
echo "Node-RED wger Dependency Update Script"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Run this script from the project root.${NC}"
    exit 1
fi

echo "Step 1: Running security audit..."
echo "--------------------------------"
npm audit

echo ""
echo "Step 2: Checking for outdated packages..."
echo "-----------------------------------------"
npm outdated || true

echo ""
echo "Step 3: Safe updates (patch and minor versions)..."
echo "--------------------------------------------------"

# Update validator to latest patch version
echo -e "${YELLOW}Updating validator to latest 13.x version...${NC}"
npm install validator@^13.15.15 --save

# Update node-red-node-test-helper to latest patch
echo -e "${YELLOW}Updating node-red-node-test-helper to 0.3.5...${NC}"
npm install node-red-node-test-helper@^0.3.5 --save-dev

echo ""
echo "Step 4: Running tests to verify updates..."
echo "------------------------------------------"
npm test

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
else
    echo -e "${RED}✗ Tests failed. Please review the failures.${NC}"
    exit 1
fi

echo ""
echo "Step 5: Final security check..."
echo "-------------------------------"
npm audit

echo ""
echo "Step 6: Deduplication and cleanup..."
echo "------------------------------------"
npm dedupe

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Update completed successfully!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Summary of changes:"
echo "- validator: Updated to latest 13.x"
echo "- node-red-node-test-helper: Updated to 0.3.5"
echo ""
echo "Next steps:"
echo "1. Review the changes in package-lock.json"
echo "2. Test with Node-RED manually"
echo "3. Commit the updates"
echo ""
echo "For major updates (Mocha 11, Sinon 21), see:"
echo "docs/DEPENDENCY-MODERNIZATION-PLAN.md"