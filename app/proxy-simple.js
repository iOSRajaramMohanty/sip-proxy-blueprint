const express = require("express");
const winston = require("winston");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const http = require("http");
const net = require("net");

require("dotenv").config();

// Configure logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "sip-proxy" },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

// Target SIP server configuration
const targetSipServer =
  process.env.TARGET_SIP_SERVER || "asterisk-service.ada-asia.my:5060";
const [targetHost, targetPort] = targetSipServer.split(":");

// RTPEngine configuration
const rtpengineLb = {
  host: "127.0.0.1",
  port: 22229,
};

// Call tracking
const activeCalls = new Map();
let totalCalls = 0;

function trackCall(callId, direction = "inbound") {
  const callInfo = {
    id: callId,
    direction,
    startTime: new Date(),
    status: "active",
  };

  activeCalls.set(callId, callInfo);
  totalCalls++;

  logger.info(`Call started: ${callId} (${direction})`);
  return callInfo;
}

function endCall(callId) {
  const call = activeCalls.get(callId);
  if (call) {
    call.status = "ended";
    call.endTime = new Date();
    call.duration = call.endTime - call.startTime;

    activeCalls.delete(callId);
    logger.info(`Call ended: ${callId}, duration: ${call.duration}ms`);
  }
}

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};
app.use(cors(corsOptions));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check endpoint
app.get("/health", (req, res) => {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: {
      sip_proxy: "operational",
      target_server: `${targetHost}:${targetPort}`,
      rtpengine: "operational",
    },
  };

  res.json(health);
});

// Statistics endpoint
app.get("/stats", (req, res) => {
  const stats = {
    calls: {
      active: activeCalls.size,
      total: totalCalls,
    },
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    target: {
      host: targetHost,
      port: targetPort,
    },
  };

  res.json(stats);
});

// SIP endpoint for receiving SIP messages
app.post(
  "/sip",
  express.raw({ type: "application/sdp", limit: "10mb" }),
  async (req, res) => {
    try {
      const sipMessage = req.body.toString();
      logger.info(
        "Received SIP message:",
        sipMessage.substring(0, 200) + "..."
      );

      // Extract Call-ID for tracking
      const callIdMatch = sipMessage.match(/Call-ID:\s*(.+)/i);
      if (callIdMatch) {
        const callId = callIdMatch[1].trim();

        if (sipMessage.includes("INVITE")) {
          trackCall(callId, "inbound");
        } else if (
          sipMessage.includes("BYE") ||
          sipMessage.includes("CANCEL")
        ) {
          endCall(callId);
        }
      }

      // Forward to target SIP server
      await forwardToTarget(sipMessage, req, res);
    } catch (error) {
      logger.error("Error handling SIP message:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Forward SIP message to target server
async function forwardToTarget(sipMessage, req, res) {
  try {
    // Create TCP connection to target SIP server
    const client = new net.Socket();

    const response = await new Promise((resolve, reject) => {
      client.connect(targetPort, targetHost, () => {
        logger.debug(
          `Connected to target SIP server at ${targetHost}:${targetPort}`
        );
        client.write(sipMessage);
      });

      client.on("data", (data) => {
        const response = data.toString();
        client.destroy();
        resolve(response);
      });

      client.on("error", (error) => {
        client.destroy();
        reject(error);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        client.destroy();
        reject(new Error("Timeout connecting to target SIP server"));
      }, 5000);
    });

    // Send response back to client
    res.set("Content-Type", "application/sdp");
    res.send(response);
  } catch (error) {
    logger.error("Failed to forward to target SIP server:", error);
    res
      .status(502)
      .json({ error: "Bad Gateway - Target SIP server unavailable" });
  }
}

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error("Unhandled error:", error);
  res.status(500).json({ error: "Internal server error" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`SIP Proxy server listening on port ${PORT}`);
  logger.info(`Health check available at http://localhost:${PORT}/health`);
  logger.info(`Statistics available at http://localhost:${PORT}/stats`);
  logger.info(`Target SIP server: ${targetHost}:${targetPort}`);
  logger.info(`Ready to handle SIP traffic!`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
});

module.exports = app;
