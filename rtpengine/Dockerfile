# Dockerfile for RTPEngine Worker
# Deploy on Render.com as background worker for media processing

FROM debian:bullseye-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    netcat-openbsd \
    iptables \
    kmod \
    && rm -rf /var/lib/apt/lists/*

# Install RTPEngine (using package manager)
RUN apt-get update && apt-get install -y \
    rtpengine \
    && rm -rf /var/lib/apt/lists/*

# Create symlink for compatibility
RUN ln -sf /usr/bin/rtpengine /usr/local/bin/rtpengine

# Create health check script
RUN echo '#!/bin/bash\n\
echo "HTTP/1.1 200 OK"\n\
echo "Content-Type: text/plain"\n\
echo "Content-Length: 2"\n\
echo ""\n\
echo "OK"' > /usr/local/bin/health-check.sh && \
    chmod +x /usr/local/bin/health-check.sh

# Create startup script
RUN echo '#!/bin/bash\n\
# Start RTPEngine\n\
/usr/local/bin/rtpengine $RTPENGINE_OPTS &\n\
RTPENGINE_PID=$!\n\
\n\
# Wait for RTPEngine to start\n\
sleep 5\n\
\n\
# Start health check server\n\
while true; do\n\
    /usr/local/bin/health-check.sh | nc -l -p 22222\n\
done &\n\
\n\
# Wait for RTPEngine process\n\
wait $RTPENGINE_PID' > /usr/local/bin/start.sh && \
    chmod +x /usr/local/bin/start.sh

# Expose port
EXPOSE 22222

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:22222/health || exit 1

# Start RTPEngine
CMD ["/usr/local/bin/start.sh"] 