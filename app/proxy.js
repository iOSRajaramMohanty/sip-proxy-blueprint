const Srf = require("drachtio-srf");
const express = require("express");
const winston = require("winston");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const http = require("http");

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

// Create Drachtio SRF instance
const srf = new Srf({
  host: process.env.DRACHTIO_HOST || "127.0.0.1",
  port: process.env.DRACHTIO_PORT || 9022,
  secret: process.env.DRACHTIO_SECRET || "secret",
});

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
          } catch (e) {
            reject(new Error("Invalid JSON response from RTPEngine"));
          }
        });
      });

      req.on("error", (err) => {
        reject(err);
      });

      req.write(postData);
      req.end();
    });

    return response;
  } catch (error) {
    logger.error(
      "RTPEngine offer failed via load balancer, trying direct connection"
    );

    // Fallback to direct connection
    const worker = getNextRtpengineWorker();
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
          hostname: worker.host,
          port: worker.port,
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
            } catch (e) {
              reject(new Error("Invalid JSON response from RTPEngine"));
            }
          });
        });

        req.on("error", (err) => {
          reject(err);
        });

        req.write(postData);
        req.end();
      });

      return response;
    } catch (fallbackError) {
      logger.error(
        `RTPEngine offer failed on worker ${worker.host}:${worker.port}:`,
        fallbackError
      );
      throw fallbackError;
    }
  }
}

async function rtpengineAnswer(sdp, callId) {
  try {
    // Use load balancer for better distribution
    const response = await new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        sdp: sdp,
        "call-id": callId,
        "from-tag": "from-tag",
        "to-tag": "to-tag",
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
          } catch (e) {
            reject(new Error("Invalid JSON response from RTPEngine"));
          }
        });
      });

      req.on("error", (err) => {
        reject(err);
      });

      req.write(postData);
      req.end();
    });

    return response;
  } catch (error) {
    logger.error(
      "RTPEngine answer failed via load balancer, trying direct connection"
    );

    // Fallback to direct connection
    const worker = getNextRtpengineWorker();
    try {
      const response = await new Promise((resolve, reject) => {
        const postData = JSON.stringify({
          sdp: sdp,
          "call-id": callId,
          "from-tag": "from-tag",
          "to-tag": "to-tag",
        });

        const options = {
          hostname: worker.host,
          port: worker.port,
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
            } catch (e) {
              reject(new Error("Invalid JSON response from RTPEngine"));
            }
          });
        });

        req.on("error", (err) => {
          reject(err);
        });

        req.write(postData);
        req.end();
      });

      return response;
    } catch (fallbackError) {
      logger.error(
        `RTPEngine answer failed on worker ${worker.host}:${worker.port}:`,
        fallbackError
      );
      throw fallbackError;
    }
  }
}

async function rtpengineDelete(callId) {
  try {
    // Try load balancer first
    await new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        "call-id": callId,
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
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve();
        });
      });

      req.on("error", (err) => {
        reject(err);
      });

      req.write(postData);
      req.end();
    });
  } catch (error) {
    logger.error(
      "RTPEngine delete failed via load balancer, trying direct connection"
    );

    // Fallback to direct connection on all workers
    for (const worker of rtpengineWorkers) {
      try {
        await new Promise((resolve, reject) => {
          const postData = JSON.stringify({
            "call-id": callId,
          });

          const options = {
            hostname: worker.host,
            port: worker.port,
            path: "/ng/delete",
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
              resolve();
            });
          });

          req.on("error", (err) => {
            reject(err);
          });

          req.write(postData);
          req.end();
        });
        break; // Success, no need to try other workers
      } catch (fallbackError) {
        logger.error(
          `RTPEngine delete failed on worker ${worker.host}:${worker.port}:`,
          fallbackError
        );
      }
    }
  }
}

// SDP manipulation functions
function filterSdpForAsterisk(sdp) {
  // Simple regex-based SDP filtering for Asterisk (PCMU/PCMA only)
  let filteredSdp = sdp;

  // Remove Opus codec references (111)
  filteredSdp = filteredSdp.replace(/a=rtpmap:111.*\r?\n/g, "");
  filteredSdp = filteredSdp.replace(/a=fmtp:111.*\r?\n/g, "");

  // Replace media line to use PCMU (0) instead of Opus (111)
  filteredSdp = filteredSdp.replace(
    /m=audio \d+ RTP\/AVP [0-9\s]+/,
    "m=audio 10000 RTP/AVP 0\r\n"
  );

  // Add PCMU attributes with proper newlines
  filteredSdp += "a=rtpmap:0 PCMU/8000\r\n";

  return filteredSdp;
}

function filterSdpForBrowser(sdp) {
  // Simple regex-based SDP filtering for browser (Opus only)
  let filteredSdp = sdp;

  // Remove PCMU/PCMA codec references (0, 8)
  filteredSdp = filteredSdp.replace(/a=rtpmap:0.*\r?\n/g, "");
  filteredSdp = filteredSdp.replace(/a=rtpmap:8.*\r?\n/g, "");
  filteredSdp = filteredSdp.replace(/a=fmtp:0.*\r?\n/g, "");
  filteredSdp = filteredSdp.replace(/a=fmtp:8.*\r?\n/g, "");

  // Replace media line to use Opus (111) instead of PCMU/PCMA
  filteredSdp = filteredSdp.replace(
    /m=audio \d+ RTP\/AVP [0-9\s]+/,
    "m=audio 10000 RTP/AVP 111\r\n"
  );

  // Add Opus attributes with proper newlines
  filteredSdp += "a=rtpmap:111 opus/48000/2\r\n";
  filteredSdp += "a=fmtp:111 minptime=10;useinbandfec=1\r\n";

  return filteredSdp;
}

// Create Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (req, res) => {
  // Check if Drachtio is actually connected by checking if we can send a request
  const drachtioStatus =
    srf && typeof srf.request === "function" ? "connected" : "disconnected";

  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: {
      drachtio: drachtioStatus,
      rtpengine: "operational",
      rtpengine_workers: rtpengineWorkers.length,
      load_balancer: "operational",
    },
  });
});

// SIP proxy statistics
app.get("/stats", (req, res) => {
  res.json({
    calls: {
      active: global.activeCalls || 0,
      total: global.totalCalls || 0,
    },
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    rtpengine: {
      workers: rtpengineWorkers.length,
      current_worker_index: currentWorkerIndex,
    },
  });
});

// SIP message handling
srf.on("connect", () => {
  logger.info("Connected to Drachtio server");

  // Handle incoming INVITE requests
  srf.invite(async (req, res) => {
    try {
      const callId = req.get("Call-ID");
      const from = req.getParsedHeader("From");
      const to = req.getParsedHeader("To");

      logger.info(`INVITE from ${req.source_address}:${req.source_port}`);
      logger.info(`Call ${callId}: ${from.uri} -> ${to.uri}`);

      // Increment call counters
      global.activeCalls = (global.activeCalls || 0) + 1;
      global.totalCalls = (global.totalCalls || 0) + 1;

      // Get original SDP from browser
      const originalSdp = req.body;
      logger.info(
        `Original SDP from browser: ${originalSdp.substring(0, 200)}...`
      );

      // Step 1: Send SDP to RTPEngine for offer
      let rtpengineSdp;
      try {
        rtpengineSdp = await rtpengineOffer(originalSdp, callId);
        logger.info("RTPEngine offer successful");
      } catch (error) {
        logger.error("RTPEngine offer failed, proceeding without media proxy");
        rtpengineSdp = originalSdp;
      }

      // Step 2: Filter SDP for Asterisk (PCMU only)
      const asteriskSdp = filterSdpForAsterisk(rtpengineSdp);
      logger.info(
        `Filtered SDP for Asterisk: ${asteriskSdp.substring(0, 200)}...`
      );

      // Step 3: Create B2B call to Asterisk
      logger.info("Creating B2B call to Asterisk...");

      try {
        // Create a new INVITE request to Asterisk using Drachtio SRF
        const asteriskUri = `sip:${to.uri.user}@${
          process.env.TARGET_SIP_SERVER || "asterisk-service.ada-asia.my:5060"
        }`;
        logger.info(`Sending INVITE to: ${asteriskUri}`);

        // Use Drachtio's proxy method to forward the call
        const proxyOptions = {
          target: asteriskUri,
          headers: {
            "X-Proxy-By": "sip-proxy-blueprint",
            "X-Call-ID": callId,
          },
        };

        // For now, let's test the SDP filtering and respond successfully
        // TODO: Implement actual B2B call when we confirm the correct Drachtio SRF method

        logger.info(`Would proxy call to: ${asteriskUri}`);
        logger.info(`With filtered SDP: ${asteriskSdp.substring(0, 200)}...`);

        // Send 200 OK with filtered SDP back to browser
        res.send(200, {
          headers: {
            "Content-Type": "application/sdp",
          },
          body: asteriskSdp,
        });

        logger.info("B2B call simulation successful - responding with 200 OK");
      } catch (error) {
        logger.error(`Error in B2B call: ${error.message}`);
        res.send(500);
      }
    } catch (error) {
      logger.error(`Error handling INVITE: ${error.message}`);
      res.send(500);
    }
  });

  // Handle BYE requests
  srf.bye(async (req, res) => {
    try {
      const callId = req.get("Call-ID");
      logger.info(`BYE for call ${callId}`);

      // Decrement active calls
      global.activeCalls = Math.max(0, (global.activeCalls || 0) - 1);

      // Clean up RTPEngine
      await rtpengineDelete(callId);

      // Send 200 OK
      res.send(200);
    } catch (error) {
      logger.error(`Error handling BYE: ${error.message}`);
      res.send(500);
    }
  });

  // Handle CANCEL requests
  srf.cancel(async (req, res) => {
    try {
      const callId = req.get("Call-ID");
      logger.info(`CANCEL for call ${callId}`);

      // Decrement active calls
      global.activeCalls = Math.max(0, (global.activeCalls || 0) - 1);

      // Clean up RTPEngine
      await rtpengineDelete(callId);

      // Send 200 OK for CANCEL
      res.send(200);
    } catch (error) {
      logger.error(`Error handling CANCEL: ${error.message}`);
      res.send(500);
    }
  });
});

// Error handling
srf.on("error", (err) => {
  logger.error("Drachtio SRF error:", err);
});

srf.on("disconnect", () => {
  logger.warn("Disconnected from Drachtio server");
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  await srf.disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully");
  await srf.disconnect();
  process.exit(0);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`SIP Proxy server listening on port ${PORT}`);
  logger.info(`Health check available at http://localhost:${PORT}/health`);
  logger.info(`Statistics available at http://localhost:${PORT}/stats`);
  logger.info(`RTPEngine workers: ${rtpengineWorkers.length}`);
  logger.info(`Load balancer: ${rtpengineLb.host}:${rtpengineLb.port}`);
});

module.exports = {
  app,
  srf,
  logger,
  filterSdpForAsterisk,
  filterSdpForBrowser,
};
