#!/bin/bash

################################################################################
# Deployment Script for Check-In Bot
# Builds and deploys the bot to Firebase
################################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Check-In Bot - Deployment${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI not found${NC}"
    echo -e "${YELLOW}Install with: npm install -g firebase-tools${NC}"
    exit 1
fi

# Check if logged in to Firebase
if ! firebase projects:list &> /dev/null 2>&1; then
    echo -e "${RED}❌ Not logged in to Firebase${NC}"
    echo -e "${YELLOW}Run: firebase login${NC}"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
    echo -e "${YELLOW}Creating from .env.example...${NC}"
    cp .env.example .env
    echo -e "${RED}❌ Please configure .env file with your credentials${NC}"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    npm install
fi

# Build TypeScript
echo -e "${BLUE}🔨 Building TypeScript...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build successful${NC}"
echo ""

# Ask for deployment confirmation
echo -e "${YELLOW}Ready to deploy to Firebase${NC}"
read -p "Continue with deployment? (y/N): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

# Deploy to Firebase
echo -e "${BLUE}☁️  Deploying to Firebase...${NC}"
firebase deploy --only functions,firestore

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✅ Deployment successful!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""

# Get function URL
FUNCTION_URL=$(firebase functions:config:get 2>/dev/null | grep -o 'https://[^"]*slackBot' || echo "")

if [ -n "$FUNCTION_URL" ]; then
    echo -e "${BLUE}📝 Your function URL:${NC}"
    echo -e "   $FUNCTION_URL"
    echo ""
fi

echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Update Slack app URLs with your function URL"
echo -e "  2. Test slash commands in Slack"
echo -e "  3. Monitor logs: ${BLUE}firebase functions:log${NC}"
echo ""
echo -e "${GREEN}🎉 Your bot is live!${NC}"
echo ""