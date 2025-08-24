# 🚀 SIP Proxy Blueprint - Production Deployment Guide

## 📋 Overview

This guide covers deploying your SIP proxy blueprint to production with full monitoring, load balancing, and validation.

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

### 1. Prerequisites

- Docker & Docker Compose installed
- Linux/Unix environment (for production)
- At least 4GB RAM available
- Ports 3000, 5060, 8080, 9090, 3001 available

### 2. Environment Setup

```bash
# Copy production environment file
cp env.production .env

# Edit environment variables
nano .env
```

**Required Environment Variables:**

```bash
# Your Asterisk server
TARGET_SIP_SERVER=your-asterisk-server.com:5060

# Your domain for CORS
CORS_ORIGIN=https://yourdomain.com

# Secure passwords
GRAFANA_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret
```

### 3. Deploy to Production

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Deploy all services
./scripts/deploy-production.sh
```

## 📊 Service Ports

| Service       | Port | Purpose                  |
| ------------- | ---- | ------------------------ |
| SIP Proxy     | 3000 | HTTP API & Health Checks |
| SIP Signaling | 5060 | SIP INVITE/BYE messages  |
| WebRTC Bridge | 8080 | WebSocket connections    |
| Prometheus    | 9090 | Metrics collection       |
| Grafana       | 3001 | Monitoring dashboard     |

## 🔍 Validation & Testing

### 1. Health Check

```bash
# Run comprehensive health check
./scripts/health-check-production.sh
```

### 2. Production Validation Tests

```bash
# Install WebSocket dependency
npm install ws

# Run production validation suite
node test-production-validation.js
```

### 3. Manual Testing

```bash
# Check SIP proxy health
curl http://localhost:3000/health

# Check WebRTC bridge
curl http://localhost:8080/health

# Check Prometheus
curl http://localhost:9090/-/healthy

# Check Grafana
curl http://localhost:3001/api/health
```

## 📈 Monitoring & Observability

### 1. Prometheus Metrics

- **SIP Call Metrics**: INVITE, BYE, success rates
- **RTPEngine Metrics**: Media streams, transcoding stats
- **System Metrics**: CPU, memory, network usage

### 2. Grafana Dashboards

- **SIP Proxy Overview**: Call volume, success rates
- **RTPEngine Performance**: Media quality, transcoding
- **System Health**: Resource utilization, alerts

### 3. Access Monitoring

```bash
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3001
# Username: admin
# Password: (from GRAFANA_PASSWORD env var)
```

## 🔧 Troubleshooting

### Common Issues

#### 1. SIP Proxy Not Starting

```bash
# Check logs
docker logs sip-proxy-production

# Check Drachtio connection
docker logs drachtio-production
```

#### 2. RTPEngine Issues

```bash
# Check RTPEngine workers
docker logs rtpengine-worker-1
docker logs rtpengine-worker-2

# Check load balancer
docker logs rtpengine-lb
```

#### 3. WebRTC Bridge Problems

```bash
# Check WebRTC bridge logs
docker logs webrtc-bridge-production

# Test WebSocket connection
wscat -c ws://localhost:8080
```

### Debug Commands

```bash
# View all container status
docker-compose -f docker-compose.production.yml ps

# View service logs
docker-compose -f docker-compose.production.yml logs -f

# Restart specific service
docker-compose -f docker-compose.production.yml restart sip-proxy-app

# Scale RTPEngine workers
docker-compose -f docker-compose.production.yml up -d --scale rtpengine-worker=3
```

## 🚀 Scaling & Performance

### 1. Horizontal Scaling

```bash
# Scale RTPEngine workers
docker-compose -f docker-compose.production.yml up -d --scale rtpengine-worker=5

# Scale SIP proxy instances
docker-compose -f docker-compose.production.yml up -d --scale sip-proxy-app=3
```

### 2. Load Balancing

- **RTPEngine**: Nginx load balancer distributes media requests
- **SIP Proxy**: Multiple instances behind reverse proxy
- **WebRTC Bridge**: WebSocket connections distributed

### 3. Performance Tuning

```bash
# Increase RTPEngine memory
RTPENGINE_OPTS="--max-load=0.8 --max-load-rtp=0.8"

# Optimize Drachtio
DRACHTIO_LOG_LEVEL=warn
DRACHTIO_MAX_SESSIONS=10000
```

## 🔒 Security Considerations

### 1. Network Security

- **Firewall**: Only expose necessary ports
- **VPN**: Secure access to management interfaces
- **SSL/TLS**: Encrypt SIP and WebRTC traffic

### 2. Authentication

- **Drachtio Secret**: Use strong, unique secrets
- **API Keys**: Implement rate limiting
- **User Management**: Secure Grafana access

### 3. Monitoring Security

- **Prometheus**: Restrict access to metrics
- **Grafana**: Strong passwords, 2FA if possible
- **Logs**: Secure log storage and access

## 📋 Maintenance

### 1. Regular Tasks

```bash
# Daily health checks
./scripts/health-check-production.sh

# Weekly log rotation
docker system prune -f

# Monthly security updates
docker-compose -f docker-compose.production.yml pull
```

### 2. Backup & Recovery

```bash
# Backup configuration
tar -czf sip-proxy-backup-$(date +%Y%m%d).tar.gz \
  docker-compose.production.yml \
  env.production \
  drachtio/ \
  nginx/ \
  monitoring/

# Restore from backup
tar -xzf sip-proxy-backup-YYYYMMDD.tar.gz
```

### 3. Updates

```bash
# Update to new version
git pull origin main
docker-compose -f docker-compose.production.yml build --no-cache
docker-compose -f docker-compose.production.yml up -d
```

## 🎯 Production Checklist

- [ ] Environment variables configured
- [ ] All services deployed and running
- [ ] Health checks passing
- [ ] Production validation tests passing
- [ ] Monitoring dashboards accessible
- [ ] Security measures implemented
- [ ] Backup strategy in place
- [ ] Team trained on operations
- [ ] Documentation updated
- [ ] Go-live approval received

## 🆘 Support

### Getting Help

1. **Check logs first**: `docker logs <container-name>`
2. **Run health checks**: `./scripts/health-check-production.sh`
3. **Review this documentation**
4. **Check GitHub issues**
5. **Contact support team**

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

## 🎉 Success Metrics

Your SIP proxy is production-ready when:

- ✅ All health checks pass
- ✅ Production validation tests pass
- ✅ Monitoring shows healthy metrics
- ✅ WebRTC calls work end-to-end
- ✅ SDP transcoding functions correctly
- ✅ Load testing shows good performance
- ✅ Security measures are implemented

**Congratulations! You now have a production-grade SIP proxy handling real WebRTC calls! 🚀**
