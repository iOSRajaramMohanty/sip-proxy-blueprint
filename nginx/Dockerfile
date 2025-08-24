# Dockerfile for Nginx RTPEngine Load Balancer
# Deploy on Render.com for media proxy load balancing

FROM nginx:alpine

# Install health check tools
RUN apk add --no-cache \
    wget \
    curl \
    netcat-openbsd

# Copy configuration
COPY rtpengine.conf /etc/nginx/nginx.conf

# Create health check endpoint
RUN echo 'server {\n\
    listen 22222;\n\
    location /health {\n\
        access_log off;\n\
        return 200 "OK";\n\
        add_header Content-Type text/plain;\n\
    }\n\
    location / {\n\
        proxy_pass http://rtpengine-backend;\n\
        proxy_set_header Host $host;\n\
        proxy_set_header X-Real-IP $remote_addr;\n\
    }\n\
}' > /etc/nginx/conf.d/health.conf

# Expose port
EXPOSE 22222

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:22222/health || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"] 