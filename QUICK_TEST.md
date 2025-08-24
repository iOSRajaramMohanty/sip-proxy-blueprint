# 🚀 Quick Local Testing Guide

## 🎯 **Goal**

Test the SIP proxy locally while connecting to your remote Asterisk server at `asterisk-service.ada-asia.my:8090`.

## ⚡ **Quick Start (No Docker)**

### 1. **Install Dependencies**

```bash
npm install
```

### 2. **Test Remote Connectivity**

```bash
node test-asterisk-connection.js
```

**Expected**: ✅ TCP connection successful

### 3. **Start SIP Proxy Locally**

```bash
npm run dev
```

**Expected**: Server starts on port 3000

### 4. **Test Local Proxy**

```bash
node test-local-proxy.js
```

**Expected**: Health and stats endpoints respond

### 5. **Test SIP Flow**

```bash
node test-sip-client.js
```

**Expected**: INVITE → 200 OK → BYE → 200 OK

## 🔧 **Configuration**

### **Environment (.env)**

```bash
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
DRACHTIO_HOST=127.0.0.1
DRACHTIO_PORT=9022
TARGET_SIP_SERVER=asterisk-service.ada-asia.my:8090
```

### **Ports Used**

- **3000**: HTTP API (Health/Stats)
- **5060**: SIP Signaling
- **9022**: Drachtio Admin

## 📊 **What We're Testing**

### ✅ **Connectivity**

- Remote Asterisk reachable
- Local proxy responding
- Network connectivity confirmed

### ✅ **SIP Flow**

- INVITE with Opus SDP
- Proxy forwards to Asterisk
- Response handling
- Call cleanup

### ✅ **Media Transcoding**

- Opus → PCMU (browser → Asterisk)
- PCMU → Opus (Asterisk → browser)
- RTPEngine integration

## 🐛 **Troubleshooting**

### **Proxy Not Starting**

```bash
# Check logs
npm run dev

# Check port availability
lsof -i :3000
```

### **Cannot Reach Asterisk**

```bash
# Test connectivity
ping asterisk-service.ada-asia.my
telnet asterisk-service.ada-asia.my 8090
```

### **SIP Errors**

```bash
# Check proxy logs
# Check Drachtio logs
# Verify SDP format
```

## 🎯 **Success Criteria**

### **✅ Test Passes When:**

1. **Health Check**: `http://localhost:3000/health` returns 200
2. **Stats**: `http://localhost:3000/stats` returns call data
3. **SIP Flow**: INVITE → 200 OK → BYE → 200 OK
4. **Logs**: No critical errors

### **❌ Test Fails When:**

1. **Proxy won't start**: Port conflicts, missing dependencies
2. **Asterisk unreachable**: Network/firewall issues
3. **SIP errors**: Configuration problems
4. **Media issues**: RTPEngine not working

## 🚀 **Next Steps**

After successful local testing:

1. **Deploy with Docker**: `docker-compose up -d`
2. **Scale RTPEngine**: Add more workers
3. **Load Balancing**: Configure Nginx
4. **Production**: Deploy to your infrastructure

---

**Ready to test? Run: `npm run dev` 🎉**
