#!/usr/bin/env node

/**
 * Health Check Cron Job for SIP Proxy Services
 * Runs every 5 minutes to monitor service health
 * Deploy on Render.com as a cron job
 */

const http = require("http");
const https = require("https");

// Configuration
const HEALTH_CHECK_URLS = process.env.HEALTH_CHECK_URLS?.split(",") || [
  "https://sip-proxy-app.onrender.com/health",
  "https://webrtc-bridge.onrender.com/health",
  "https://drachtio-server.onrender.com/health",
  "https://rtpengine-lb.onrender.com/health",
];

const TIMEOUT = 10000; // 10 seconds
const LOG_LEVEL = process.env.LOG_LEVEL || "info";

// Logging function
function log(message, level = "info") {
  const timestamp = new Date().toISOString();
  const icon =
    level === "success"
      ? "✅"
      : level === "error"
      ? "❌"
      : level === "warning"
      ? "⚠️"
      : "🔍";

  if (level === "error" || LOG_LEVEL === "debug" || LOG_LEVEL === "info") {
    console.log(`[${timestamp}] ${icon} ${message}`);
  }
}

// Health check function
async function checkHealth(url) {
  return new Promise((resolve) => {
    const isHttps = url.startsWith("https://");
    const client = isHttps ? https : http;

    const timeout = setTimeout(() => {
      log(`Timeout checking ${url}`, "error");
      resolve({ url, status: "timeout", error: "Request timeout" });
    }, TIMEOUT);

    const req = client.get(url, (res) => {
      clearTimeout(timeout);
      let data = "";

      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          log(`Health check passed: ${url} (${res.statusCode})`, "success");
          resolve({ url, status: "healthy", statusCode: res.statusCode });
        } else {
          log(`Health check failed: ${url} (${res.statusCode})`, "error");
          resolve({
            url,
            status: "unhealthy",
            statusCode: res.statusCode,
            data,
          });
        }
      });
    });

    req.on("error", (error) => {
      clearTimeout(timeout);
      log(`Health check error: ${url} - ${error.message}`, "error");
      resolve({ url, status: "error", error: error.message });
    });

    req.setTimeout(TIMEOUT, () => {
      clearTimeout(timeout);
      req.destroy();
      log(`Health check timeout: ${url}`, "error");
      resolve({ url, status: "timeout", error: "Request timeout" });
    });
  });
}

// Main health check function
async function runHealthChecks() {
  log("🚀 Starting SIP Proxy Health Check Cron Job", "info");
  log(`📋 Checking ${HEALTH_CHECK_URLS.length} services`, "info");

  const startTime = Date.now();
  const results = [];

  // Check all services concurrently
  const healthChecks = HEALTH_CHECK_URLS.map((url) => checkHealth(url.trim()));
  const healthResults = await Promise.all(healthChecks);

  // Process results
  let healthyCount = 0;
  let unhealthyCount = 0;
  let errorCount = 0;

  healthResults.forEach((result) => {
    results.push(result);

    switch (result.status) {
      case "healthy":
        healthyCount++;
        break;
      case "unhealthy":
        unhealthyCount++;
        break;
      case "error":
      case "timeout":
        errorCount++;
        break;
    }
  });

  const endTime = Date.now();
  const duration = endTime - startTime;

  // Summary
  log("📊 Health Check Summary:", "info");
  log(`✅ Healthy: ${healthyCount}`, "success");
  log(`⚠️  Unhealthy: ${unhealthyCount}`, "warning");
  log(`❌ Errors: ${errorCount}`, "error");
  log(`⏱️  Duration: ${duration}ms`, "info");

  // Detailed results
  if (LOG_LEVEL === "debug") {
    log("🔍 Detailed Results:", "info");
    results.forEach((result) => {
      log(
        `${result.url}: ${result.status} (${result.statusCode || "N/A"})`,
        result.status === "healthy" ? "success" : "error"
      );
    });
  }

  // Exit with appropriate code
  if (errorCount > 0 || unhealthyCount > 0) {
    log("❌ Health checks failed - some services are unhealthy", "error");
    process.exit(1);
  } else {
    log("✅ All health checks passed - services are healthy", "success");
    process.exit(0);
  }
}

// Error handling
process.on("uncaughtException", (error) => {
  log(`💥 Uncaught Exception: ${error.message}`, "error");
  log(`Stack: ${error.stack}`, "error");
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  log(`💥 Unhandled Rejection at: ${promise}, reason: ${reason}`, "error");
  process.exit(1);
});

// Run health checks
if (require.main === module) {
  runHealthChecks().catch((error) => {
    log(`💥 Health check execution failed: ${error.message}`, "error");
    process.exit(1);
  });
}

module.exports = { runHealthChecks, checkHealth };
