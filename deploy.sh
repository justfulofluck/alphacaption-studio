#!/bin/bash

# =================================================================
# AlphaCaption Studio - Build & Push Script
# =================================================================

# Configuration
DOCKER_USER="bgtuser"
FRONTEND_IMAGE="alphacaption-frontend"
BACKEND_IMAGE="alphacaption-backend"

# Use tag from argument or default to "latest"
TAG=${1:-latest}

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Build & Push - Target Tag: ${TAG} ${NC}"

# Ensure we are in the root directory
cd "$(dirname "$0")"

# 1. Build & Push Backend
echo -e "\n${BLUE}------------ BACKEND ------------${NC}"
echo -e "${BLUE}📦 Building Backend Image...${NC}"
docker build -t $DOCKER_USER/$BACKEND_IMAGE:$TAG ./server

echo -e "${BLUE}📤 Pushing Backend Image to Docker Hub...${NC}"
docker push $DOCKER_USER/$BACKEND_IMAGE:$TAG

# 2. Build & Push Frontend
echo -e "\n${BLUE}------------ FRONTEND ------------${NC}"

# Note: Check if .env.prod exists for the build context
if [ -f "./.env.prod" ]; then
    echo -e "${YELLOW}📝 Copying .env.prod to frontend/.env for production build...${NC}"
    cp .env.prod ./frontend/.env
fi

echo -e "${BLUE}📦 Building Frontend Image...${NC}"
docker build -t $DOCKER_USER/$FRONTEND_IMAGE:$TAG ./frontend

echo -e "${BLUE}📤 Pushing Frontend Image to Docker Hub...${NC}"
docker push $DOCKER_USER/$FRONTEND_IMAGE:$TAG

# Clean up temporary .env
if [ -f "./frontend/.env" ]; then
    echo -e "${YELLOW}🧹 Cleaning up frontend/.env...${NC}"
    rm ./frontend/.env
fi

echo -e "\n${GREEN}=========================================${NC}"
echo -e "${GREEN}✅ ALL IMAGES DEPLOYED SUCCESSFULLY!${NC}"
echo -e "${GREEN}Frontend: $DOCKER_USER/$FRONTEND_IMAGE:$TAG${NC}"
echo -e "${GREEN}Backend:  $DOCKER_USER/$BACKEND_IMAGE:$TAG${NC}"
echo -e "${GREEN}=========================================${NC}"
