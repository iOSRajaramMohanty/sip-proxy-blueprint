# 🚀 Render.com Deployment Guide for SIP Proxy Blueprint

This guide will walk you through deploying your SIP Proxy + RTPEngine service on [Render.com](https://render.com/), a modern cloud platform perfect for startups and small teams.

## 🎯 Why Render.com?

[Render.com](https://render.com/) is an excellent choice for deploying SIP proxy services because it offers:

- **🚀 Automatic Deploys**: Deploy on every Git push with zero downtime
- **📈 Load-Based Autoscaling**: Automatically scale based on traffic patterns
- **🔒 Private Networking**: Secure communication between services
- **🛡️ DDoS Protection**: Built-in protection against attacks
- **🔐 Managed SSL**: Automatic HTTPS certificates
- **🏗️ Infrastructure as Code**: Define everything in Blueprint files
- **💰 Cost-Effective**: Free tier + affordable starter plans

## 📋 Prerequisites

Before deploying, ensure you have:

- ✅ **GitHub/GitLab Repository** with your SIP proxy code
- ✅ **Render.com Account** (free to sign up)
- ✅ **Asterisk Server** accessible from the internet
- ✅ **Domain Name** (optional, for custom URLs)

## 🚀 Step-by-Step Deployment

### **Step 1: Prepare Your Repository**

Ensure your repository has the following structure:

```
sip-proxy-blueprint/
├── app/
│   ├── package.json
│   ├── proxy.js
│   └── webrtc-bridge.js
├── drachtio/
│   ├── Dockerfile
│   └── drachtio.conf.xml
├── nginx/
│   ├── Dockerfile
│   └── rtpengine.conf
├── rtpengine/
│   └── Dockerfile
├── render.yaml
├── docker-compose.production.yml
└── README.md
```

### **Step 2: Create Render Blueprint**

The `render.yaml` file defines your entire infrastructure:

```yaml
# render.yaml - Infrastructure as Code
services:
  # SIP Proxy Web Service
  - type: web
    name: sip-proxy-app
    runtime: node
    plan: starter
    buildCommand: |
      cd app && npm ci --only=production
    startCommand: cd app && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3000
      - key: DRACHTIO_SECRET
        sync: false # Set in dashboard
      - key: TARGET_SIP_SERVER
        sync: false # Set in dashboard
    healthCheckPath: /health
    autoDeploy: true
    scaling:
      minInstances: 1
      maxInstances: 10
      targetCPUPercent: 70

  # Drachtio SIP Server
  - type: web
    name: drachtio-server
    runtime: docker
    plan: starter
    dockerfilePath: ./drachtio/Dockerfile
    dockerContext: ./drachtio
    healthCheckPath: /health
    autoDeploy: true

  # WebRTC Bridge
  - type: web
    name: webrtc-bridge
    runtime: node
    plan: starter
    buildCommand: |
      cd app && npm ci --only=production
    startCommand: cd app && node webrtc-bridge.js
    healthCheckPath: /health
    autoDeploy: true

databases:
  - name: sip-proxy-redis
    databaseName: sip_proxy
    plan: free
```

### **Step 3: Deploy on Render**

#### **Option A: Deploy via Git (Recommended)**

1. **Push your code to GitHub/GitLab**

   ```bash
   git add .
   git commit -m "Add Render deployment configuration"
   git push origin main
   ```

2. **Connect to Render**
   - Go to [https://render.com/](https://render.com/)
   - Click "New +" → "Blueprint"
   - Connect your Git repository
   - Select the `render.yaml` file
   - Click "Apply"

#### **Option B: Deploy via Render CLI**

```bash
# Install Render CLI
npm install -g @render/cli

# Login to Render
render login

# Deploy from local directory
render blueprint apply
```

### **Step 4: Configure Environment Variables**

In the Render dashboard, set these required environment variables:

```bash
# Required for SIP Proxy
DRACHTIO_SECRET=your-secret-key-here
TARGET_SIP_SERVER=your-asterisk-server:5060
CORS_ORIGIN=https://your-domain.com

# Optional
LOG_LEVEL=info
ENABLE_MONITORING=true
ENABLE_LOGGING=true
```

**How to set environment variables:**

1. Go to your service in Render dashboard
2. Click "Environment" tab
3. Add each variable with its value
4. Click "Save Changes"

### **Step 5: Set Up Custom Domain (Optional)**

1. **In Render Dashboard:**

   - Go to your service
   - Click "Settings" → "Custom Domains"
   - Add your domain (e.g., `sip.yourdomain.com`)

2. **Update DNS Records:**

   - Add CNAME record pointing to your Render service
   - Wait for DNS propagation (usually 5-15 minutes)

3. **SSL Certificate:**
   - Render automatically provisions SSL certificates
   - HTTPS will be enabled automatically

## 🔧 Service Configuration

### **Service URLs After Deployment**

Your services will be available at:

- **SIP Proxy**: `https://sip-proxy-app.onrender.com`
- **WebRTC Bridge**: `https://webrtc-bridge.onrender.com`
- **Drachtio**: `https://drachtio-server.onrender.com`
- **RTPEngine LB**: `https://rtpengine-lb.onrender.com`

### **Health Check Endpoints**

Each service provides health checks:

- `/health` - Basic health status
- `/stats` - Service statistics
- `/metrics` - Performance metrics

## 📊 Monitoring & Scaling

### **Automatic Scaling**

Render automatically scales your services based on:

- **CPU Usage**: Target 70% CPU utilization
- **Traffic Patterns**: Scale up during peak hours
- **Instance Limits**: Min 1, Max 10 instances

### **Health Monitoring**

- **Real-time Logs**: Stream logs in dashboard
- **Performance Metrics**: CPU, memory, response time
- **Auto-restart**: Failed services restart automatically
- **Slack Notifications**: Get alerts for issues

### **Cost Optimization**

- **Free Tier**: 750 hours/month for development
- **Starter Plan**: $7/month for production use
- **Professional Plan**: $25/month for high-traffic
- **Auto-scaling**: Only pay for resources you use

## 🔒 Security & Networking

### **Private Networking**

Services communicate securely:

- Internal service discovery
- No public internet exposure
- Secure inter-service communication

### **SSL/TLS**

- Automatic HTTPS certificates
- TLS 1.2+ encryption
- HSTS headers enabled

### **Access Control**

- IP allowlisting (optional)
- Environment variable encryption
- Secure credential management

## 🚨 Troubleshooting

### **Common Issues**

#### **1. Build Failures**

```bash
# Check build logs in Render dashboard
# Common issues:
# - Missing dependencies in package.json
# - Incorrect build commands
# - Node.js version compatibility
```

#### **2. Service Not Starting**

```bash
# Check startup logs
# Verify environment variables
# Check health check endpoints
```

#### **3. Connection Issues**

```bash
# Verify service URLs
# Check CORS configuration
# Test health endpoints
```

### **Debug Commands**

```bash
# Check service status
curl https://your-service.onrender.com/health

# View real-time logs
# Use Render dashboard → Logs tab

# Test SIP connectivity
telnet your-service.onrender.com 5060
```

### **Support Resources**

- **Render Documentation**: [docs.render.com](https://docs.render.com/)
- **Community Forum**: [community.render.com](https://community.render.com/)
- **Status Page**: [status.render.com](https://status.render.com/)

## 🎯 Production Checklist

Before going live, ensure:

- [ ] **Environment Variables**: All required vars set
- [ ] **Health Checks**: All services responding to `/health`
- [ ] **Custom Domain**: DNS configured (if using)
- [ ] **SSL Certificates**: HTTPS working properly
- [ ] **Monitoring**: Logs and metrics accessible
- [ ] **Scaling**: Auto-scaling configured
- [ ] **Backup**: Database backups enabled
- [ ] **Alerts**: Slack notifications configured

## 🚀 Next Steps

After successful deployment:

1. **Test Your Services**

   ```bash
   # Test SIP proxy
   curl https://sip-proxy-app.onrender.com/health

   # Test WebRTC bridge
   curl https://webrtc-bridge.onrender.com/health
   ```

2. **Update Client Applications**

   - Point to new Render URLs
   - Update CORS origins
   - Test end-to-end functionality

3. **Monitor Performance**

   - Watch scaling behavior
   - Monitor costs
   - Track service health

4. **Set Up CI/CD**
   - Enable auto-deploy on Git push
   - Configure staging environment
   - Set up automated testing

## 🎉 Congratulations!

You've successfully deployed your SIP Proxy service on [Render.com](https://render.com/)!

Your service now benefits from:

- ✅ **Automatic scaling** based on traffic
- ✅ **Zero-downtime deployments** on every push
- ✅ **Managed infrastructure** with health monitoring
- ✅ **Built-in security** with SSL and DDoS protection
- ✅ **Cost optimization** with pay-per-use pricing

**Happy deploying! 🚀**

---

**Need help?** Check the [Render documentation](https://docs.render.com/) or visit the [community forum](https://community.render.com/).
