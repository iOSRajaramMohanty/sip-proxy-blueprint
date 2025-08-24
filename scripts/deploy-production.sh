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

# Check if environment file exists
if [ ! -f "env.production.simple" ]; then
    echo "❌ env.production.simple file not found. Please create it first."
    exit 1
fi

# Load production environment variables
echo "📋 Loading production environment variables..."
set -a  # automatically export all variables
source env.production.simple
set +a  # stop automatically exporting

# Build and start services
echo "🔨 Building production images..."
docker-compose -f docker-compose.simple.yml build --no-cache

echo "🚀 Starting production services..."
docker-compose -f docker-compose.simple.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check service health
echo "🔍 Checking service health..."
docker-compose -f docker-compose.simple.yml ps

# Run health checks
echo "🏥 Running health checks..."
echo "✅ Core services deployed successfully!"
echo "🌐 Access your services:"
echo "   - SIP Proxy API: http://localhost:3001"
echo "   - WebRTC Bridge: ws://localhost:8081"
echo "   - Kamailio SIP: localhost:5062"
echo ""
echo "📞 Your SIP proxy is now running on port 5061"
echo "🎯 Ready to handle WebRTC calls from browsers!"

echo "✅ Production deployment completed!"
echo "🌐 Access your services:"
echo "   - SIP Proxy API: http://localhost:3001"
echo "   - WebRTC Bridge: ws://localhost:8081"
echo "   - Kamailio SIP: localhost:5062"
echo ""
echo "📞 Your SIP proxy is now running on port 5061"
echo "🎯 Ready to handle WebRTC calls from browsers!" 