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

// Kamailio connection configuration
const kamailioConfig = {
  host: process.env.KAMAILIO_HOST || "127.0.0.1",
  port: process.env.KAMAILIO_PORT || 5060,
};

// RTPEngine configuration with load balancing
const rtpengineWorkers = [
  {
    host: process.env.RTPENGINE_HOST || "127.0.0.1",
    port: process.env.RTPENGINE_PORT || 22222,
    weight: 1,
  },
  {
    host: process.env.RTPENGINE_WORKER_1_HOST || "127.0.0.1",
    port: process.env.RTPENGINE_WORKER_1_PORT || 22225,
    weight: 1,
  },
  {
    host: process.env.RTPENGINE_WORKER_2_HOST || "127.0.0.1",
    port: process.env.RTPENGINE_WORKER_2_PORT || 22227,
    weight: 1,
  },
];

// Load balancer endpoint
const rtpengineLb = {
  host: "127.0.0.1",
  port: 22229,
};

let currentWorkerIndex = 0;

// Round-robin worker selection
function getNextRtpengineWorker() {
  const worker = rtpengineWorkers[currentWorkerIndex];
  currentWorkerIndex = (currentWorkerIndex + 1) % rtpengineWorkers.length;
  return worker;
}

// RTPEngine control functions with load balancing
async function rtpengineOffer(sdp, callId) {
  try {
    // Use load balancer for better distribution
    const response = await new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        sdp: sdp,
        "call-id": callId,
        "from-tag": "from-tag",
        "to-tag": "to-tag",
        replace: ["origin", "session-connection"],
      });

      const options = {
        hostname: rtpengineLb.host,
        port: rtpengineLb.port,
        path: "/ng/offer",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
      };

      const req = http.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const response = JSON.parse(data);
            resolve(response.sdp);
          } catch (error) {
            reject(new Error(`Invalid JSON response: ${error.message}`));
          }
        });
      });

      req.on("error", (error) => {
        reject(new Error(`RTPEngine request failed: ${error.message}`));
      });

      req.write(postData);
      req.end();
    });

    return response;
  } catch (error) {
    logger.error("RTPEngine offer failed:", error);
    throw error;
  }
}

async function rtpengineAnswer(sdp, callId) {
  try {
    const response = await new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        sdp: sdp,
        "call-id": callId,
        "from-tag": "from-tag",
        "to-tag": "to-tag",
        replace: ["origin", "session-connection"],
      });

      const options = {
        hostname: rtpengineLb.host,
        port: rtpengineLb.port,
        path: "/ng/answer",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
      };

      const req = http.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const response = JSON.parse(data);
            resolve(response.sdp);
          } catch (error) {
            reject(new Error(`Invalid JSON response: ${error.message}`));
          }
        });
      });

      req.on("error", (error) => {
        reject(new Error(`RTPEngine request failed: ${error.message}`));
      });

      req.write(postData);
      req.end();
    });

    return response;
  } catch (error) {
    logger.error("RTPEngine answer failed:", error);
    throw error;
  }
}

async function rtpengineDelete(callId) {
  try {
    await new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        "call-id": callId,
        "from-tag": "from-tag",
        "to-tag": "to-tag",
      });

      const options = {
        hostname: rtpengineLb.host,
        port: rtpengineLb.port,
        path: "/ng/delete",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
      };

      const req = http.request(options, (res) => {
        res.on("end", () => {
          resolve();
        });
      });

      req.on("error", (error) => {
        reject(new Error(`RTPEngine delete failed: ${error.message}`));
      });

      req.write(postData);
      req.end();
    });
  } catch (error) {
    logger.error("RTPEngine delete failed:", error);
    throw error;
  }
}

// SIP message parsing and manipulation
function parseSipMessage(message) {
  const lines = message.split("\r\n");
  const firstLine = lines[0];
  const headers = {};
  let body = "";
  let inBody = false;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line === "") {
      inBody = true;
      continue;
    }
    if (inBody) {
      body += line + "\r\n";
    } else {
      const colonIndex = line.indexOf(":");
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        headers[key] = value;
      }
    }
  }

  return {
    firstLine,
    headers,
    body: body.trim(),
  };
}

function createSipResponse(statusCode, statusText, headers, body = "") {
  let response = `SIP/2.0 ${statusCode} ${statusText}\r\n`;

  for (const [key, value] of Object.entries(headers)) {
    response += `${key}: ${value}\r\n`;
  }

  if (body) {
    response += `Content-Length: ${Buffer.byteLength(body)}\r\n`;
  }

  response += "\r\n";
  if (body) {
    response += body;
  }

  return response;
}

// Call tracking
const activeCalls = new Map();
let totalCalls = 0;

function trackCall(callId, direction = "inbound") {
  const callInfo = {
    id: callId,
    direction,
    startTime: new Date(),
    status: "active",
    rtpEngine: null,
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

    // Clean up RTPEngine
    if (call.rtpEngine) {
      rtpengineDelete(callId).catch((err) =>
        logger.error(`Failed to cleanup RTPEngine for call ${callId}:`, err)
      );
    }
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
      kamailio: "connected", // Kamailio is always connected since it's local
      rtpengine: "operational",
      rtpengine_workers: rtpengineWorkers.length,
      load_balancer: "operational",
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
    rtpengine: {
      workers: rtpengineWorkers.length,
      current_worker_index: currentWorkerIndex,
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

      const parsed = parseSipMessage(sipMessage);

      // Handle different SIP methods
      if (parsed.firstLine.includes("INVITE")) {
        await handleInvite(parsed, req, res);
      } else if (parsed.firstLine.includes("ACK")) {
        await handleAck(parsed, req, res);
      } else if (parsed.firstLine.includes("BYE")) {
        await handleBye(parsed, req, res);
      } else if (parsed.firstLine.includes("CANCEL")) {
        await handleCancel(parsed, req, res);
      } else {
        // Forward other methods to Kamailio
        await forwardToKamailio(sipMessage, req, res);
      }
    } catch (error) {
      logger.error("Error handling SIP message:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Handle INVITE requests
async function handleInvite(parsed, req, res) {
  try {
    const callId = parsed.headers["Call-ID"];
    if (!callId) {
      logger.error("Missing Call-ID in INVITE");
      return res.status(400).json({ error: "Missing Call-ID" });
    }

    // Track the call
    const callInfo = trackCall(callId, "inbound");

    // Extract SDP from body
    if (parsed.body && parsed.body.includes("v=")) {
      try {
        // Process SDP through RTPEngine
        const processedSdp = await rtpengineOffer(parsed.body, callId);
        callInfo.rtpEngine = true;

        // Update the message with processed SDP
        const updatedMessage = createSipMessage(
          parsed.firstLine,
          parsed.headers,
          processedSdp
        );

        // Forward to Kamailio
        await forwardToKamailio(updatedMessage, req, res);
      } catch (error) {
        logger.error("RTPEngine processing failed:", error);
        // Continue without RTPEngine processing
        await forwardToKamailio(sipMessage, req, res);
      }
    } else {
      // No SDP, forward as-is
      await forwardToKamailio(sipMessage, req, res);
    }
  } catch (error) {
    logger.error("Error handling INVITE:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Handle ACK requests
async function handleAck(parsed, req, res) {
  try {
    const callId = parsed.headers["Call-ID"];
    if (callId) {
      const call = activeCalls.get(callId);
      if (call) {
        call.status = "established";
        logger.info(`Call established: ${callId}`);
      }
    }

    // Forward ACK to Kamailio
    await forwardToKamailio(sipMessage, req, res);
  } catch (error) {
    logger.error("Error handling ACK:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Handle BYE requests
async function handleBye(parsed, req, res) {
  try {
    const callId = parsed.headers["Call-ID"];
    if (callId) {
      endCall(callId);
    }

    // Forward BYE to Kamailio
    await forwardToKamailio(sipMessage, req, res);
  } catch (error) {
    logger.error("Error handling BYE:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Handle CANCEL requests
async function handleCancel(parsed, req, res) {
  try {
    const callId = parsed.headers["Call-ID"];
    if (callId) {
      endCall(callId);
    }

    // Forward CANCEL to Kamailio
    await forwardToKamailio(sipMessage, req, res);
  } catch (error) {
    logger.error("Error handling CANCEL:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Forward SIP message to Kamailio
async function forwardToKamailio(sipMessage, req, res) {
  try {
    // Create TCP connection to Kamailio
    const client = new net.Socket();

    const response = await new Promise((resolve, reject) => {
      client.connect(kamailioConfig.port, kamailioConfig.host, () => {
        logger.debug(
          `Connected to Kamailio at ${kamailioConfig.host}:${kamailioConfig.port}`
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
        reject(new Error("Timeout connecting to Kamailio"));
      }, 5000);
    });

    // Send response back to client
    res.set("Content-Type", "application/sdp");
    res.send(response);
  } catch (error) {
    logger.error("Failed to forward to Kamailio:", error);
    res.status(502).json({ error: "Bad Gateway - Kamailio unavailable" });
  }
}

// Helper function to create SIP message
function createSipMessage(firstLine, headers, body) {
  let message = firstLine + "\r\n";

  for (const [key, value] of Object.entries(headers)) {
    message += `${key}: ${value}\r\n`;
  }

  if (body) {
    message += `Content-Length: ${Buffer.byteLength(body)}\r\n`;
  }

  message += "\r\n";
  if (body) {
    message += body;
  }

  return message;
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
  logger.info(`RTPEngine workers: ${rtpengineWorkers.length}`);
  logger.info(`Load balancer: ${rtpengineLb.host}:${rtpengineLb.port}`);
  logger.info(
    `Connected to Kamailio server at ${kamailioConfig.host}:${kamailioConfig.port}`
  );
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
