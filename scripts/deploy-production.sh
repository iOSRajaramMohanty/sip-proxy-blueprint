#!/bin/bash

# Production Deployment Script for SIP Proxy Blueprint
set -e

echo "🚀 Starting Production Deployment..."
echo "====================================="

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env.production exists
if [ ! -f "env.production" ]; then
    echo "❌ env.production file not found. Please create it first."
    exit 1
fi

# Load production environment variables
echo "📋 Loading production environment variables..."
export $(cat env.production | xargs)

# Build and start services
echo "🔨 Building production images..."
docker-compose -f docker-compose.production.yml build --no-cache

echo "🚀 Starting production services..."
docker-compose -f docker-compose.production.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check service health
echo "🔍 Checking service health..."
docker-compose -f docker-compose.production.yml ps

# Run health checks
echo "🏥 Running health checks..."
./scripts/health-check-production.sh

echo "✅ Production deployment completed!"
echo "🌐 Access your services:"
echo "   - SIP Proxy API: http://localhost:3000"
echo "   - WebRTC Bridge: ws://localhost:8080"
echo "   - Prometheus: http://localhost:9090"
echo "   - Grafana: http://localhost:3001 (admin/admin123)"
echo ""
echo "📞 Your SIP proxy is now running on port 5060"
echo "🎯 Ready to handle WebRTC calls from browsers!" 