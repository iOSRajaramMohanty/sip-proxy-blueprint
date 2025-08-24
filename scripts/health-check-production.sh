#!/bin/bash

# Production Health Check Script
set -e

echo "🏥 Production Health Check Started..."
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check service health
check_service() {
    local service_name=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -n "🔍 Checking $service_name... "
    
    if curl -s -f "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ HEALTHY${NC}"
        return 0
    else
        echo -e "${RED}❌ UNHEALTHY${NC}"
        return 1
    fi
}

# Function to check container status
check_container() {
    local container_name=$1
    local expected_status=${2:-running}
    
    echo -n "🔍 Checking container $container_name... "
    
    local status=$(docker inspect --format='{{.State.Status}}' "$container_name" 2>/dev/null || echo "not_found")
    
    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}✅ $status${NC}"
        return 0
    else
        echo -e "${RED}❌ $status${NC}"
        return 1
    fi
}

# Function to check port availability
check_port() {
    local port=$1
    local service_name=$2
    
    echo -n "🔍 Checking port $port ($service_name)... "
    
    if netstat -tuln 2>/dev/null | grep -q ":$port "; then
        echo -e "${GREEN}✅ LISTENING${NC}"
        return 0
    else
        echo -e "${RED}❌ NOT LISTENING${NC}"
        return 1
    fi
}

# Initialize counters
healthy_services=0
total_services=0

echo ""
echo "📊 Container Health Check:"
echo "---------------------------"

# Check all containers
containers=(
    "sip-proxy-production"
    "drachtio-production"
    "rtpengine-lb"
    "rtpengine-worker-1"
    "rtpengine-worker-2"
    "webrtc-bridge-production"
    "prometheus"
    "grafana"
)

for container in "${containers[@]}"; do
    total_services=$((total_services + 1))
    if check_container "$container"; then
        healthy_services=$((healthy_services + 1))
    fi
done

echo ""
echo "🌐 Service Health Check:"
echo "------------------------"

# Check SIP Proxy API
total_services=$((total_services + 1))
if check_service "SIP Proxy API" "http://localhost:3000/health"; then
    healthy_services=$((healthy_services + 1))
fi

# Check WebRTC Bridge
total_services=$((total_services + 1))
if check_service "WebRTC Bridge" "http://localhost:8080/health"; then
    healthy_services=$((healthy_services + 1))
fi

# Check Prometheus
total_services=$((total_services + 1))
if check_service "Prometheus" "http://localhost:9090/-/healthy"; then
    healthy_services=$((healthy_services + 1))
fi

# Check Grafana
total_services=$((total_services + 1))
if check_service "Grafana" "http://localhost:3001/api/health"; then
    healthy_services=$((healthy_services + 1))
fi

echo ""
echo "🔌 Port Availability Check:"
echo "----------------------------"

# Check critical ports
ports=(
    "3000:SIP Proxy API"
    "5060:SIP Signaling"
    "8080:WebRTC Bridge"
    "9090:Prometheus"
    "3001:Grafana"
)

for port_info in "${ports[@]}"; do
    port=$(echo "$port_info" | cut -d: -f1)
    service=$(echo "$port_info" | cut -d: -f2)
    total_services=$((total_services + 1))
    if check_port "$port" "$service"; then
        healthy_services=$((healthy_services + 1))
    fi
done

echo ""
echo "📊 Health Check Summary:"
echo "========================"
echo "✅ Healthy Services: $healthy_services"
echo "📋 Total Services: $total_services"
echo "📈 Health Score: $((healthy_services * 100 / total_services))%"

# Determine overall status
if [ $healthy_services -eq $total_services ]; then
    echo -e "${GREEN}🎉 ALL SERVICES ARE HEALTHY!${NC}"
    echo "🚀 Your SIP proxy is production ready!"
    exit 0
elif [ $healthy_services -gt $((total_services / 2)) ]; then
    echo -e "${YELLOW}⚠️  MOST SERVICES ARE HEALTHY${NC}"
    echo "🔧 Some services may need attention"
    exit 1
else
    echo -e "${RED}❌ MANY SERVICES ARE UNHEALTHY${NC}"
    echo "🚨 Production deployment may have issues"
    exit 1
fi 