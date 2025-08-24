# 🧪 Local Testing with Remote Asterisk Server

This guide explains how to test the SIP proxy locally while connecting to your remote Asterisk server at `asterisk-service.ada-asia.my:8090`.

## 🎯 **What We're Testing**

- **Local SIP Proxy**: Runs on your machine at `127.0.0.1:5060`
- **Remote Asterisk**: Your production server at `asterisk-service.ada-asia.my:8090`
- **Media Transcoding**: Opus (browser) ↔ PCMU (Asterisk) via RTPEngine
- **B2BUA Workflow**: Complete SIP proxy with media handling

## 🚀 **Quick Start**

### 1. **Test Remote Connectivity**

First, verify you can reach your Asterisk server:

```bash
node test-asterisk-connection.js
```

This will test:

- ✅ TCP connectivity (SIP signaling)
- ✅ UDP connectivity (SIP media)
- ✅ HTTP/HTTPS (if available)

### 2. **Start Local Services**

Run the local SIP proxy stack:

```bash
docker-compose -f docker-compose.local.yml up -d
```

This starts:

- **SIP Proxy App** (Node.js) on port 3000
- **Drachtio Server** on port 5060 (SIP)
- **RTPEngine** on port 22222 (control)

### 3. **Test SIP Proxy**

Use the test client to send INVITE requests:

```bash
node test-sip-client.js
```

## 📋 **Test Scenarios**

### **Scenario 1: Basic Connectivity**

- ✅ Connect to local proxy
- ✅ Send INVITE with Opus SDP
- ✅ Proxy forwards to remote Asterisk
- ✅ Receive response from Asterisk

### **Scenario 2: Media Transcoding**

- 📤 Browser sends Opus codec
- 🔄 RTPEngine transcodes to PCMU
- 📤 Asterisk receives PCMU
- 🔄 RTPEngine transcodes back to Opus
- 📤 Browser receives Opus

### **Scenario 3: Error Handling**

- ❌ Network failures
- ❌ Asterisk unavailable
- ❌ Invalid SDP
- ✅ Graceful degradation

## 🔧 **Configuration**

### **Environment Variables**

```bash
# Copy and customize
cp env.example .env

# Key settings
TARGET_SIP_SERVER=asterisk-service.ada-asia.my:8090
DRACHTIO_HOST=127.0.0.1
DRACHTIO_PORT=9022
RTPENGINE_HOST=127.0.0.1
RTPENGINE_PORT=22222
```

### **Port Mapping**

| Service         | Local Port | Purpose                  |
| --------------- | ---------- | ------------------------ |
| SIP Proxy       | 3000       | HTTP API & Health Checks |
| Drachtio        | 5060       | SIP Signaling            |
| Drachtio Admin  | 9022       | Drachtio Management      |
| RTPEngine       | 22222      | Media Control            |
| RTPEngine Media | 12223      | RTP Streams              |

## 📊 **Monitoring & Debugging**

### **Health Check**

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "healthy",
  "services": {
    "drachtio": "connected",
    "rtpengine": "operational",
    "rtpengine_workers": 3,
    "load_balancer": "operational"
  }
}
```

### **Statistics**

```bash
curl http://localhost:3000/stats
```

### **Logs**

```bash
# SIP Proxy logs
docker logs sip-proxy-local

# Drachtio logs
docker logs drachtio-local

# RTPEngine logs
docker logs rtpengine-local
```

## 🧪 **Manual Testing**

### **Using SIPp (if available)**

```bash
# Send INVITE with Opus SDP
sipp -sn uac 127.0.0.1:5060 \
  -sf opus_invite.xml \
  -m 1 \
  -r 1
```

### **Using curl for HTTP API**

```bash
# Test health endpoint
curl -X GET http://localhost:3000/health

# Test stats endpoint
curl -X GET http://localhost:3000/stats
```

## 🐛 **Troubleshooting**

### **Common Issues**

#### **1. Connection Refused**

```bash
# Check if services are running
docker ps

# Check port availability
netstat -tulpn | grep :5060
```

#### **2. Asterisk Unreachable**

```bash
# Test network connectivity
ping asterisk-service.ada-asia.my

# Test specific port
telnet asterisk-service.ada-asia.my 8090
```

#### **3. RTPEngine Issues**

```bash
# Check RTPEngine status
docker exec rtpengine-local rtpengine-ctl -p 22222 -i list

# Check RTPEngine logs
docker logs rtpengine-local
```

### **Debug Mode**

Enable debug logging:

```bash
# In .env file
LOG_LEVEL=debug

# Restart services
docker-compose -f docker-compose.local.yml restart
```

## 📈 **Performance Testing**

### **Load Testing**

```bash
# Send multiple concurrent calls
for i in {1..10}; do
  node test-sip-client.js &
done
wait
```

### **Media Quality Testing**

- Test with different Opus bitrates
- Verify PCMU quality at Asterisk
- Check RTPEngine transcoding performance

## 🔒 **Security Considerations**

### **Local Testing Only**

- Services bind to `127.0.0.1` only
- No external access to local services
- Remote Asterisk must allow your IP

### **Network Security**

- Verify firewall rules
- Use VPN if required
- Check Asterisk access control lists

## 🎯 **Success Criteria**

### **✅ Test Passes When:**

1. **Connectivity**: Can reach remote Asterisk
2. **SIP Flow**: INVITE → 200 OK → BYE → 200 OK
3. **Media**: RTPEngine handles transcoding
4. **Monitoring**: Health checks pass
5. **Logs**: No critical errors

### **❌ Test Fails When:**

1. **Network**: Cannot reach Asterisk
2. **SIP**: INVITE gets 4xx/5xx response
3. **Media**: RTPEngine errors
4. **Proxy**: Application crashes
5. **Logs**: Critical errors present

## 🚀 **Next Steps**

After successful local testing:

1. **Deploy to Production**: Use `docker-compose.yml`
2. **Scale RTPEngine**: Add more workers
3. **Load Balancing**: Configure Nginx for RTPEngine
4. **Monitoring**: Set up Prometheus/Grafana
5. **Security**: Configure firewalls and access controls

## 📞 **Support**

If you encounter issues:

1. Check the logs: `docker logs <service-name>`
2. Verify connectivity: `node test-asterisk-connection.js`
3. Test SIP flow: `node test-sip-client.js`
4. Review configuration files
5. Check network/firewall settings

---

**Happy Testing! 🎉**
