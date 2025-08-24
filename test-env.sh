#!/bin/bash

# Test script to verify environment variables are loaded correctly
echo "🧪 Testing Environment Variable Loading..."
echo "========================================"

# Check if environment file exists
if [ ! -f "env.production.simple" ]; then
    echo "❌ env.production.simple file not found!"
    exit 1
fi

echo "📋 Loading environment variables..."
set -a  # automatically export all variables
source env.production.simple
set +a  # stop automatically exporting

echo "✅ Environment variables loaded. Testing key variables:"
echo ""

# Test key variables
echo "🔧 Core Configuration:"
echo "   NODE_ENV: ${NODE_ENV:-'NOT SET'}"
echo "   PORT: ${PORT:-'NOT SET'}"
echo "   LOG_LEVEL: ${LOG_LEVEL:-'NOT SET'}"
echo ""

echo "📞 SIP Configuration:"
echo "   DRACHTIO_SECRET: ${DRACHTIO_SECRET:-'NOT SET'}"
echo "   TARGET_SIP_SERVER: ${TARGET_SIP_SERVER:-'NOT SET'}"
echo "   CORS_ORIGIN: ${CORS_ORIGIN:-'NOT SET'}"
echo ""

echo "🔌 RTPEngine Configuration:"
echo "   RTPENGINE_HOST: ${RTPENGINE_HOST:-'NOT SET'}"
echo "   RTPENGINE_PORT: ${RTPENGINE_PORT:-'NOT SET'}"
echo ""

echo "🌐 WebRTC Configuration:"
echo "   SIP_PROXY_URL: ${SIP_PROXY_URL:-'NOT SET'}"
echo "   WS_PORT: ${WS_PORT:-'NOT SET'}"
echo ""

echo "🔒 Security Configuration:"
echo "   JWT_SECRET: ${JWT_SECRET:-'NOT SET'}"
echo "   RATE_LIMIT_MAX_REQUESTS: ${RATE_LIMIT_MAX_REQUESTS:-'NOT SET'}"
echo ""

# Check if all required variables are set
required_vars=("NODE_ENV" "DRACHTIO_SECRET" "TARGET_SIP_SERVER" "CORS_ORIGIN")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -eq 0 ]; then
    echo "🎉 All required environment variables are set!"
    echo "✅ Ready for deployment!"
else
    echo "❌ Missing required environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "🔧 Please update env.production.simple with the missing values."
    exit 1
fi 