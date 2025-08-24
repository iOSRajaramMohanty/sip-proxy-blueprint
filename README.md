# 🚀 SIP Proxy Blueprint

**End-to-end call works: Browser (Opus) ↔ Node.js SIP Proxy ↔ rtpengine ↔ Legacy Asterisk (PCMU)**

A production-ready SIP proxy that handles WebRTC calls from browsers, transcodes Opus to PCMU, and integrates with Asterisk servers.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WebRTC        │    │   SIP Proxy     │    │   Asterisk      │
│   Browser       │───▶│   (Drachtio)    │───▶│   Server        │
│   (Opus)        │    │   + RTPEngine   │    │   (PCMU)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Monitoring    │
                       │  Prometheus +   │
                       │    Grafana      │
                       └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Docker** and Docker Compose
- **Git** for cloning the repository
- **Microphone access** for WebRTC testing

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/sip-proxy-blueprint.git
cd sip-proxy-blueprint

# Install dependencies
cd app
npm install
cd ..
```

### 2. Environment Configuration

```bash
# Copy environment file
cp env.example .env

# Edit environment variables
nano .env
```

**Required Environment Variables:**

```bash
# Your Asterisk server
TARGET_SIP_SERVER=asterisk-service.ada-asia.my:5060

# Drachtio secret (default: cymru)
DRACHTIO_SECRET=cymru

# CORS origin for your domain
CORS_ORIGIN=http://localhost:3000
```

## 🧪 Testing End-to-End Functionality

### Method 1: Local Development Testing (Recommended for Development)

#### Start the SIP Proxy Locally

```bash
# Start the SIP proxy application
cd app
npm run dev
```

This starts the SIP proxy on `http://localhost:3000` and SIP signaling on port `5060`.

#### Test SIP Functionality

```bash
# Test 1: Basic SIP INVITE flow
node test-sip-client.js

# Test 2: End-to-end call simulation
node test-end-to-end-call.js

# Test 3: Real SIP integration
node test-real-sip-integration.js
```

#### Test WebRTC Browser Integration

```bash
# Open WebRTC test page in browser
open test-webrtc-browser.html

# Open advanced WebRTC test page
open test-real-webrtc-browser.html
```

**Browser Test Steps:**

1. Allow microphone access when prompted
2. Click "Start Call" to begin WebRTC test
3. Watch real-time progress through all test phases
4. Verify SDP transcoding from Opus to PCMU
5. Click "End Call" to complete the test

### Method 2: Docker-Based Testing

#### Start Services with Docker Compose

```bash
# Start local Docker services
docker-compose -f docker-compose.local.yml up -d

# Check service status
docker-compose -f docker-compose.local.yml ps

# View logs
docker-compose -f docker-compose.local.yml logs -f
```

#### Test Docker Services

```bash
# Test SIP proxy health
curl http://localhost:3000/health

# Test SIP proxy statistics
curl http://localhost:3000/stats

# Test SIP signaling
node test-sip-client.js
```

### Method 3: Production Deployment Testing

#### Deploy Full Production Stack

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Deploy all production services
./scripts/deploy-production.sh
```

#### Validate Production Deployment

```bash
# Run comprehensive health check
./scripts/health-check-production.sh

# Run production validation tests
node test-production-validation.js

# Check individual services
curl http://localhost:3000/health      # SIP Proxy
curl http://localhost:8080/health      # WebRTC Bridge
curl http://localhost:9090/-/healthy   # Prometheus
curl http://localhost:3001/api/health  # Grafana
```

## 📊 Test Results You Should See

### Successful SIP Call Flow

```
🌐 WebRTC Setup ✅
📤 SDP Offer (Opus) ✅
🔗 SIP Proxy Connection ✅
🔄 SDP Transcoding (Opus→PCMU) ✅
📞 Asterisk Call Establishment ✅
🎵 Audio Flow ✅
📤 ACK & BYE Handling ✅
```

### Expected SDP Changes

```
Before (Browser): m=audio 10000 RTP/AVP 111
After (Asterisk):  m=audio 10000 RTP/AVP 0

Before: a=rtpmap:111 opus/48000/2
After:  a=rtpmap:0 PCMU/8000
```

## 🔍 Troubleshooting

### Common Issues and Solutions

#### 1. SIP Proxy Not Starting

```bash
# Check if port 3000 is available
lsof -i :3000

# Check Node.js version
node --version

# Check dependencies
cd app && npm list
```

#### 2. Drachtio Connection Issues

```bash
# Check Drachtio secret in .env
echo $DRACHTIO_SECRET

# Verify Drachtio is running
docker ps | grep drachtio

# Check Drachtio logs
docker logs drachtio-local
```

#### 3. Asterisk Connectivity Problems

```bash
# Test UDP connectivity to Asterisk
node test-udp-5060.js

# Test SIP OPTIONS to Asterisk
node test-sip-options.js

# Verify Asterisk configuration
# Check pjsip_env.conf has bind=0.0.0.0:5060
```

#### 4. WebRTC Browser Issues

```bash
# Check browser console for errors
# Verify microphone permissions
# Check WebRTC support: https://caniuse.com/rtcpeerconnection
```

### Debug Commands

```bash
# View SIP proxy logs
tail -f app/logs/app.log

# Check Docker container status
docker ps -a

# Test network connectivity
telnet localhost 5060
telnet localhost 3000

# Check system resources
htop
df -h
```

## 📈 Monitoring and Observability

### Health Check Endpoints

- **SIP Proxy**: `http://localhost:3000/health`
- **Statistics**: `http://localhost:3000/stats`
- **Metrics**: `http://localhost:3000/metrics`

### Log Levels

```bash
# Set log level in .env
LOG_LEVEL=debug    # Most verbose
LOG_LEVEL=info     # Standard
LOG_LEVEL=warn     # Warnings only
LOG_LEVEL=error    # Errors only
```

## 🚀 Production Deployment

### Full Production Stack

```bash
# Deploy with monitoring
./scripts/deploy-production.sh

# Access monitoring dashboards
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3001 (admin/admin123)
```

### Scaling

```bash
# Scale RTPEngine workers
docker-compose -f docker-compose.production.yml up -d --scale rtpengine-worker=5

# Scale SIP proxy instances
docker-compose -f docker-compose.production.yml up -d --scale sip-proxy-app=3
```

## 📋 Test Checklist

### Development Testing

- [ ] SIP proxy starts without errors
- [ ] Health check endpoint responds
- [ ] SIP INVITE flow works
- [ ] SDP transcoding (Opus → PCMU) functions
- [ ] WebRTC browser tests pass
- [ ] End-to-end call simulation successful

### Production Testing

- [ ] All Docker services running
- [ ] Health checks passing
- [ ] Production validation tests pass
- [ ] Monitoring dashboards accessible
- [ ] Load testing successful
- [ ] Security measures implemented

## 🎯 Success Metrics

Your SIP proxy is working correctly when:

- ✅ **SIP Proxy**: Responds to health checks and handles INVITE requests
- ✅ **SDP Transcoding**: Opus (111) successfully converts to PCMU (0)
- ✅ **Asterisk Integration**: Calls reach your Asterisk server
- ✅ **WebRTC Support**: Browser tests complete successfully
- ✅ **End-to-End Flow**: Complete INVITE → 200 OK → ACK → BYE cycle
- ✅ **Codec Conversion**: Audio transcoding between Opus and PCMU

## 🔌 How Others Can Use This SIP Proxy + RTPEngine Service

### 🎯 **Service Overview**

This SIP Proxy service acts as a **WebRTC-to-Legacy SIP bridge**, enabling modern web applications to communicate with traditional telephony systems. It's perfect for:

- **Web Applications** needing voice/video calling capabilities
- **Contact Centers** requiring WebRTC agent interfaces
- **Mobile Apps** with VoIP functionality
- **Legacy System Integration** (Asterisk, FreeSWITCH, etc.)
- **Multi-tenant SaaS** platforms

### 🚀 **Integration Methods**

#### **Method 1: Direct SIP Integration (Recommended)**

```javascript
// Example: Node.js application integrating with SIP Proxy
const net = require("net");

class SIPClient {
  constructor(proxyHost = "localhost", proxyPort = 5060) {
    this.proxyHost = proxyHost;
    this.proxyPort = proxyPort;
  }

  async makeCall(targetNumber, sdpOffer) {
    return new Promise((resolve, reject) => {
      const client = new net.Socket();

      client.connect(this.proxyPort, this.proxyHost, () => {
        const invite = this.createINVITE(targetNumber, sdpOffer);
        client.write(invite);
      });

      client.on("data", (data) => {
        const response = data.toString();
        if (response.includes("200 OK")) {
          resolve(response);
        } else if (response.includes("4") || response.includes("5")) {
          reject(new Error(response));
        }
      });

      client.on("error", reject);
    });
  }

  createINVITE(target, sdp) {
    return [
      `INVITE sip:${target}@asterisk-service.ada-asia.my SIP/2.0`,
      "Via: SIP/2.0/TCP localhost:5060;branch=z9hG4bK" + Date.now(),
      "Max-Forwards: 70",
      `To: <sip:${target}@asterisk-service.ada-asia.my>`,
      "From: <sip:webapp@localhost>;tag=" + Date.now(),
      "Call-ID: " + Date.now() + "@localhost",
      "CSeq: 1 INVITE",
      "User-Agent: WebApp-SIPClient",
      "Content-Type: application/sdp",
      "Content-Length: " + sdp.length,
      "",
      sdp,
    ].join("\r\n");
  }
}

// Usage example
const sipClient = new SIPClient("your-proxy-host.com", 5060);
sipClient
  .makeCall("1234", opusSdpOffer)
  .then((response) => console.log("Call established:", response))
  .catch((error) => console.error("Call failed:", error));
```

#### **Method 2: HTTP API Integration**

```javascript
// Example: Using the SIP Proxy's HTTP API
class SIPProxyAPI {
  constructor(baseUrl = "http://localhost:3000") {
    this.baseUrl = baseUrl;
  }

  async createCall(callData) {
    const response = await fetch(`${this.baseUrl}/invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target: callData.target,
        sdp: callData.sdp,
        caller: callData.caller,
        callId: callData.callId,
      }),
    });

    return response.json();
  }

  async getCallStatus(callId) {
    const response = await fetch(`${this.baseUrl}/call/${callId}`);
    return response.json();
  }

  async endCall(callId) {
    const response = await fetch(`${this.baseUrl}/call/${callId}`, {
      method: "DELETE",
    });
    return response.json();
  }

  async getStats() {
    const response = await fetch(`${this.baseUrl}/stats`);
    return response.json();
  }
}

// Usage example
const sipProxy = new SIPProxyAPI("https://your-proxy-domain.com");
const callResult = await sipProxy.createCall({
  target: "1234",
  sdp: opusSdpOffer,
  caller: "webapp",
  callId: "call-" + Date.now(),
});
```

#### **Method 3: WebRTC Bridge Integration**

```javascript
// Example: WebRTC application using the WebSocket bridge
class WebRTCBridge {
  constructor(bridgeUrl = "ws://localhost:8080") {
    this.bridgeUrl = bridgeUrl;
    this.ws = null;
    this.peerConnection = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.bridgeUrl);

      this.ws.onopen = () => {
        console.log("Connected to WebRTC Bridge");
        resolve();
      };

      this.ws.onerror = reject;
    });
  }

  async startCall(targetNumber) {
    // Create RTCPeerConnection
    this.peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    // Get user media
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => {
      this.peerConnection.addTrack(track, stream);
    });

    // Create offer
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    // Send to bridge
    this.ws.send(
      JSON.stringify({
        type: "offer",
        target: targetNumber,
        sdp: offer.sdp,
      })
    );
  }

  onIncomingCall(callback) {
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "incoming-call") {
        callback(message);
      }
    };
  }
}

// Usage example
const bridge = new WebRTCBridge("wss://your-bridge-domain.com");
await bridge.connect();

bridge.onIncomingCall((callData) => {
  console.log("Incoming call from:", callData.caller);
  // Handle incoming call
});

await bridge.startCall("1234");
```

### 🌐 **Deployment Options for Others**

#### **Option 1: Self-Hosted (Recommended for Enterprise)**

```bash
# Clone and deploy on your infrastructure
git clone https://github.com/yourusername/sip-proxy-blueprint.git
cd sip-proxy-blueprint

# Configure for your environment
cp env.example .env
# Edit .env with your settings

# Deploy with Docker
./scripts/deploy-production.sh

# Your service will be available at:
# SIP Proxy: your-domain.com:3000
# SIP Signaling: your-domain.com:5060
# WebRTC Bridge: your-domain.com:8080
```

#### **Option 2: Cloud Deployment (AWS, GCP, Azure)**

```yaml
# Example: AWS ECS Task Definition
{
  "family": "sip-proxy",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions":
    [
      {
        "name": "sip-proxy-app",
        "image": "your-registry/sip-proxy:latest",
        "portMappings":
          [
            { "containerPort": 3000, "protocol": "tcp" },
            { "containerPort": 5060, "protocol": "tcp" },
          ],
        "environment":
          [
            { "name": "NODE_ENV", "value": "production" },
            { "name": "TARGET_SIP_SERVER", "value": "your-asterisk:5060" },
          ],
      },
    ],
}
```

#### **Option 3: Kubernetes Deployment**

```yaml
# Example: Kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sip-proxy
spec:
  replicas: 3
  selector:
    matchLabels:
      app: sip-proxy
  template:
    metadata:
      labels:
        app: sip-proxy
    spec:
      containers:
        - name: sip-proxy
          image: your-registry/sip-proxy:latest
          ports:
            - containerPort: 3000
            - containerPort: 5060
          env:
            - name: NODE_ENV
              value: "production"
            - name: TARGET_SIP_SERVER
              value: "your-asterisk:5060"
---
apiVersion: v1
kind: Service
metadata:
  name: sip-proxy-service
spec:
  selector:
    app: sip-proxy
  ports:
    - port: 3000
      targetPort: 3000
    - port: 5060
      targetPort: 5060
  type: LoadBalancer
```

### 🔧 **Configuration for Different Use Cases**

#### **Use Case 1: Contact Center Integration**

```bash
# Environment configuration for contact center
NODE_ENV=production
TARGET_SIP_SERVER=asterisk-contact-center:5060
DRACHTIO_SECRET=your-secret
LOG_LEVEL=info
CORS_ORIGIN=https://your-cc-domain.com

# Enable contact center features
ENABLE_CALL_RECORDING=true
ENABLE_CDR_LOGGING=true
ENABLE_QUEUE_MANAGEMENT=true
```

#### **Use Case 2: Multi-tenant SaaS Platform**

```bash
# Environment configuration for multi-tenant
NODE_ENV=production
TARGET_SIP_SERVER=asterisk-saas:5060
DRACHTIO_SECRET=your-secret
LOG_LEVEL=info
CORS_ORIGIN=https://your-saas-domain.com

# Multi-tenant features
ENABLE_TENANT_ISOLATION=true
ENABLE_BILLING_INTEGRATION=true
ENABLE_USAGE_ANALYTICS=true
```

#### **Use Case 3: Mobile App Backend**

```bash
# Environment configuration for mobile app
NODE_ENV=production
TARGET_SIP_SERVER=asterisk-mobile:5060
DRACHTIO_SECRET=your-secret
LOG_LEVEL=info
CORS_ORIGIN=https://your-api-domain.com

# Mobile-specific features
ENABLE_PUSH_NOTIFICATIONS=true
ENABLE_MOBILE_OPTIMIZATION=true
ENABLE_OFFLINE_SUPPORT=true
```

### 📱 **Client SDK Examples**

#### **JavaScript/TypeScript SDK**

```typescript
// npm install sip-proxy-client
import { SIPProxyClient } from "sip-proxy-client";

const client = new SIPProxyClient({
  proxyUrl: "https://your-proxy.com",
  bridgeUrl: "wss://your-bridge.com",
  credentials: {
    apiKey: "your-api-key",
    secret: "your-secret",
  },
});

// Make a call
const call = await client.createCall({
  target: "+1234567890",
  options: {
    audio: true,
    video: false,
    recording: true,
  },
});

// Handle call events
call.on("connected", () => console.log("Call connected"));
call.on("disconnected", () => console.log("Call ended"));
call.on("error", (error) => console.error("Call error:", error));
```

#### **React Hook Example**

```typescript
// React hook for SIP calls
import { useState, useEffect } from "react";
import { useSIPCall } from "sip-proxy-react";

function CallComponent() {
  const [targetNumber, setTargetNumber] = useState("");
  const { call, isConnected, makeCall, endCall } = useSIPCall({
    proxyUrl: "https://your-proxy.com",
  });

  const handleCall = async () => {
    try {
      await makeCall(targetNumber);
    } catch (error) {
      console.error("Call failed:", error);
    }
  };

  return (
    <div>
      <input
        value={targetNumber}
        onChange={(e) => setTargetNumber(e.target.value)}
        placeholder="Enter phone number"
      />
      <button onClick={handleCall} disabled={isConnected}>
        {isConnected ? "End Call" : "Make Call"}
      </button>
      {isConnected && <button onClick={endCall}>End Call</button>}
    </div>
  );
}
```

### 🔒 **Security Considerations for Production**

```bash
# Security configuration
ENABLE_HTTPS=true
ENABLE_WSS=true
ENABLE_AUTHENTICATION=true
ENABLE_RATE_LIMITING=true
ENABLE_IP_WHITELISTING=true

# SSL/TLS configuration
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem
SSL_CA_PATH=/path/to/ca.pem

# Authentication
JWT_SECRET=your-super-secret-jwt-key
API_KEY_REQUIRED=true
```

### 📊 **Monitoring and Analytics**

```bash
# Enable monitoring
ENABLE_PROMETHEUS=true
ENABLE_GRAFANA=true
ENABLE_ALERTING=true
ENABLE_LOGGING=true

# Custom metrics
ENABLE_CALL_METRICS=true
ENABLE_PERFORMANCE_METRICS=true
ENABLE_BUSINESS_METRICS=true
```

## 📚 Additional Resources

### Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment guide
- [API Documentation](./docs/API.md) - HTTP API reference
- [Configuration Guide](./docs/CONFIG.md) - Environment variables and settings

### Test Files

- `test-sip-client.js` - Basic SIP functionality testing
- `test-end-to-end-call.js` - Complete call flow simulation
- `test-real-sip-integration.js` - Real SIP integration testing
- `test-production-validation.js` - Production deployment validation
- `test-webrtc-browser.html` - WebRTC browser testing
- `test-real-webrtc-browser.html` - Advanced WebRTC testing

### Scripts

- `scripts/deploy-production.sh` - Production deployment
- `scripts/health-check-production.sh` - Production health checks

## 🆘 Getting Help

### Support Steps

1. **Check logs first**: `docker logs <container-name>` or `tail -f app/logs/app.log`
2. **Run health checks**: `./scripts/health-check-production.sh`
3. **Review this README** and troubleshooting section
4. **Check GitHub issues** for similar problems
5. **Contact support team** with logs and error details

### Emergency Procedures

```bash
# Stop all services
docker-compose -f docker-compose.production.yml down

# Restart specific service
docker-compose -f docker-compose.production.yml restart <service>

# Rollback to previous version
git checkout <previous-tag>
./scripts/deploy-production.sh
```

## 🎉 Congratulations!

**You now have a fully functional SIP proxy that can handle real WebRTC calls from browsers!**

The system successfully:

- **Receives WebRTC calls** with Opus codec from browsers
- **Transcodes audio** from Opus to PCMU for Asterisk compatibility
- **Handles complete call flows** with proper SIP signaling
- **Provides monitoring** and observability
- **Scales horizontally** for production workloads

**🚀 Your SIP proxy blueprint is production-ready!**

---

**Happy calling! 📞🎵**
