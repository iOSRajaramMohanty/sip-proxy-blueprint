# SIP Proxy Blueprint with Kamailio

## 🎯 **Overview**

This implementation replaces Drachtio with **Kamailio** for ARM64 compatibility, providing a robust SIP proxy solution that works natively on ARM64 architectures (including Apple Silicon Macs and ARM64 servers).

## 🏗️ **Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WebRTC        │    │   SIP Proxy     │    │   Kamailio      │
│   Bridge        │◄──►│   (Node.js)     │◄──►│   SIP Server    │
│   (Port 8081)   │    │   (Port 3001)   │    │   (Port 5060)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   RTPEngine     │
                       │   Load Balancer │
                       │   (Port 22229)  │
                       └─────────────────┘
```

## 🚀 **Key Benefits**

- ✅ **ARM64 Native**: Works on Apple Silicon Macs and ARM64 servers
- ✅ **Production Ready**: Simplified deployment with Docker Compose
- ✅ **SIP Standards Compliant**: Full SIP protocol support
- ✅ **RTPEngine Integration**: Media transcoding and load balancing
- ✅ **WebRTC Bridge**: Browser-based calling support

## 📋 **Prerequisites**

- Docker and Docker Compose
- Node.js 18+ (for development)
- ARM64 compatible system (or x86_64 with emulation)

## 🛠️ **Installation & Deployment**

### **1. Quick Start (Production)**

```bash
# Deploy with Kamailio
./scripts/deploy-production.sh
```

### **2. Manual Deployment**

```bash
# Build and start services
docker-compose -f docker-compose.kamailio.yml up -d

# Check status
docker-compose -f docker-compose.kamailio.yml ps

# View logs
docker-compose -f docker-compose.kamailio.yml logs -f
```

### **3. Development Mode**

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test
```

## 🔧 **Configuration**

### **Environment Variables**

Create `env.production.simple`:

```bash
# SIP Proxy Configuration
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Kamailio Configuration
KAMAILIO_HOST=kamailio-server
KAMAILIO_PORT=5060

# Target SIP Server (Your Asterisk)
TARGET_SIP_SERVER=asterisk-service.ada-asia.my:5060

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com
```

### **Kamailio Configuration**

The Kamailio configuration is in `kamailio/kamailio.cfg` and includes:

- SIP message routing
- Basic proxy functionality
- TCP/UDP support
- Error handling

## 📡 **API Endpoints**

### **Health Check**

```bash
GET http://localhost:3001/health
```

### **Statistics**

```bash
GET http://localhost:3001/stats
```

### **SIP Messages**

```bash
POST http://localhost:3001/sip
Content-Type: application/sdp
```

## 🧪 **Testing**

### **Test Kamailio Connection**

```bash
node test-kamailio.js
```

### **Test SIP Proxy Health**

```bash
curl http://localhost:3001/health | jq
```

### **Test Statistics**

```bash
curl http://localhost:3001/stats | jq
```

## 🔍 **Monitoring & Debugging**

### **View Service Logs**

```bash
# SIP Proxy logs
docker logs sip-proxy-app-production -f

# Kamailio logs
docker logs kamailio-server-production -f

# WebRTC Bridge logs
docker logs webrtc-bridge-production -f
```

### **Check Service Status**

```bash
docker-compose -f docker-compose.kamailio.yml ps
```

### **Health Monitoring**

```bash
# Check all services
curl http://localhost:3001/health | jq

# Monitor call statistics
curl http://localhost:3001/stats | jq
```

## 🚨 **Troubleshooting**

### **Common Issues**

1. **Kamailio Connection Failed**

   - Check if Kamailio container is running
   - Verify port mappings in docker-compose
   - Check Kamailio logs for errors

2. **SIP Messages Not Forwarded**

   - Verify Kamailio configuration
   - Check network connectivity between containers
   - Review SIP message format

3. **RTPEngine Issues**
   - Ensure RTPEngine load balancer is running
   - Check worker configurations
   - Verify media ports are accessible

### **Debug Commands**

```bash
# Test Kamailio directly
telnet localhost 5062

# Check container networking
docker network ls
docker network inspect sip-proxy-blueprint_sip-network

# Test SIP proxy endpoint
curl -X POST http://localhost:3001/sip \
  -H "Content-Type: application/sdp" \
  -d "OPTIONS sip:test@localhost SIP/2.0\r\n..."
```

## 📊 **Performance & Scaling**

### **Load Balancing**

- RTPEngine workers for media processing
- Round-robin distribution
- Health monitoring and failover

### **Resource Optimization**

- Kamailio: 4 child processes
- SIP Proxy: Single Node.js instance
- WebRTC Bridge: WebSocket server

### **Monitoring**

- Call statistics tracking
- Memory usage monitoring
- Uptime tracking

## 🔒 **Security**

- Helmet.js for HTTP security headers
- CORS configuration
- Input validation
- Error handling without information leakage

## 📈 **Production Considerations**

1. **High Availability**

   - Use external load balancer
   - Multiple Kamailio instances
   - Database backend for user location

2. **Monitoring**

   - Prometheus metrics
   - Grafana dashboards
   - Log aggregation

3. **Backup & Recovery**
   - Configuration backups
   - Database backups
   - Disaster recovery procedures

## 🤝 **Support & Contributing**

- Report issues in the repository
- Submit pull requests for improvements
- Follow the existing code style
- Add tests for new features

## 📄 **License**

MIT License - see LICENSE file for details.

---

**Ready for Production Deployment! 🚀**

Your SIP proxy is now configured with Kamailio and ready to handle real-world SIP traffic on ARM64 systems.
