# Dockerfile for Drachtio SIP Server
# Deploy on Render.com with automatic scaling

FROM drachtio/drachtio-server:latest

# Install health check tools
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Copy configuration
COPY drachtio.conf.xml /etc/drachtio.conf.xml

# Create health check endpoint
RUN echo '#!/bin/bash\n\
echo "HTTP/1.1 200 OK"\n\
echo "Content-Type: text/plain"\n\
echo "Content-Length: 2"\n\
echo ""\n\
echo "OK"' > /usr/local/bin/health-check.sh && \
    chmod +x /usr/local/bin/health-check.sh

# Expose ports
EXPOSE 9022 5060 5061

# Health check - Drachtio doesn't have HTTP health endpoint
# HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
#   CMD wget --quiet --tries=1 --spider http://localhost:9022/health || exit 1

# Start Drachtio
CMD ["drachtio", "-f", "/etc/drachtio.conf.xml"] 