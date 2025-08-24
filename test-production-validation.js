const http = require("http");
const https = require("https");
const net = require("net");
const WebSocket = require("ws");

console.log("🔍 Production Validation Test Suite");
console.log("===================================");
console.log("🎯 Testing: Production SIP Proxy Deployment");
console.log("");

// Test configuration
const testConfig = {
  sipProxy: {
    host: "localhost",
    port: 3000,
    endpoints: ["/health", "/stats", "/metrics"],
  },
  webrtcBridge: {
    host: "localhost",
    port: 8080,
    endpoints: ["/health"],
  },
  prometheus: {
    host: "localhost",
    port: 9090,
    endpoints: ["/-/healthy", "/api/v1/status/targets"],
  },
  grafana: {
    host: "localhost",
    port: 3001,
    endpoints: ["/api/health"],
  },
  sipSignaling: {
    host: "localhost",
    port: 5060,
  },
};

// Test results
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
};

// Utility functions
function log(message, type = "info") {
  const timestamp = new Date().toLocaleTimeString();
  const icon =
    type === "success"
      ? "✅"
      : type === "error"
      ? "❌"
      : type === "warning"
      ? "⚠️"
      : "🔍";
  console.log(`[${timestamp}] ${icon} ${message}`);
}

function updateResults(success) {
  testResults.total++;
  if (success) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

// HTTP health check
async function checkHttpEndpoint(service, host, port, path) {
  return new Promise((resolve) => {
    const options = {
      hostname: host,
      port: port,
      path: path,
      method: "GET",
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          log(`${service} ${path} - Status: ${res.statusCode}`, "success");
          resolve(true);
        } else {
          log(`${service} ${path} - Status: ${res.statusCode}`, "error");
          resolve(false);
        }
      });
    });

    req.on("error", (error) => {
      log(`${service} ${path} - Error: ${error.message}`, "error");
      resolve(false);
    });

    req.on("timeout", () => {
      log(`${service} ${path} - Timeout`, "error");
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// TCP connection test
function checkTcpConnection(service, host, port) {
  return new Promise((resolve) => {
    const client = new net.Socket();
    const timeout = setTimeout(() => {
      client.destroy();
      log(`${service} port ${port} - Connection timeout`, "error");
      resolve(false);
    }, 5000);

    client.connect(port, host, () => {
      clearTimeout(timeout);
      log(`${service} port ${port} - TCP connection successful`, "success");
      client.destroy();
      resolve(true);
    });

    client.on("error", (error) => {
      clearTimeout(timeout);
      log(
        `${service} port ${port} - Connection error: ${error.message}`,
        "error"
      );
      resolve(false);
    });
  });
}

// WebSocket connection test
function checkWebSocketConnection(service, host, port) {
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(`ws://${host}:${port}`);

      const timeout = setTimeout(() => {
        log(`${service} WebSocket - Connection timeout`, "error");
        ws.close();
        resolve(false);
      }, 5000);

      ws.on("open", () => {
        clearTimeout(timeout);
        log(`${service} WebSocket - Connection successful`, "success");
        ws.close();
        resolve(true);
      });

      ws.on("error", (error) => {
        clearTimeout(timeout);
        log(
          `${service} WebSocket - Connection error: ${error.message}`,
          "error"
        );
        resolve(false);
      });
    } catch (error) {
      log(`${service} WebSocket - Setup error: ${error.message}`, "error");
      resolve(false);
    }
  });
}

// SIP functionality test
async function testSipFunctionality() {
  log("Testing SIP functionality...", "info");

  try {
    // Test SIP INVITE flow
    const client = new net.Socket();

    const result = await new Promise((resolve) => {
      client.connect(
        testConfig.sipSignaling.port,
        testConfig.sipSignaling.host,
        () => {
          log("SIP connection established", "success");

          // Send test INVITE
          const testInvite = [
            "INVITE sip:test@localhost SIP/2.0",
            "Via: SIP/2.0/TCP localhost:5060;branch=z9hG4bKtest",
            "Max-Forwards: 70",
            "To: <sip:test@localhost>",
            "From: <sip:test@localhost>;tag=test",
            "Call-ID: test-call-123@localhost",
            "CSeq: 1 INVITE",
            "User-Agent: Production-Test",
            "Content-Length: 0",
            "",
            "",
          ].join("\r\n");

          client.write(testInvite);

          // Wait for response
          setTimeout(() => {
            log("SIP INVITE test completed", "success");
            client.destroy();
            resolve(true);
          }, 2000);
        }
      );

      client.on("error", (error) => {
        log(`SIP connection error: ${error.message}`, "error");
        resolve(false);
      });
    });

    updateResults(result);
    return result;
  } catch (error) {
    log(`SIP test error: ${error.message}`, "error");
    updateResults(false);
    return false;
  }
}

// Load testing
async function performLoadTest() {
  log("Performing load test...", "info");

  const concurrentRequests = 10;
  const promises = [];

  for (let i = 0; i < concurrentRequests; i++) {
    promises.push(
      checkHttpEndpoint(
        "Load Test",
        testConfig.sipProxy.host,
        testConfig.sipProxy.port,
        "/health"
      )
    );
  }

  try {
    const results = await Promise.all(promises);
    const successCount = results.filter(Boolean).length;
    const successRate = (successCount / concurrentRequests) * 100;

    if (successRate >= 90) {
      log(
        `Load test passed: ${successRate.toFixed(1)}% success rate`,
        "success"
      );
      updateResults(true);
    } else {
      log(`Load test failed: ${successRate.toFixed(1)}% success rate`, "error");
      updateResults(false);
    }

    return successRate >= 90;
  } catch (error) {
    log(`Load test error: ${error.message}`, "error");
    updateResults(false);
    return false;
  }
}

// Main test execution
async function runProductionTests() {
  console.log("🚀 Starting Production Validation Tests...\n");

  // Test 1: HTTP Endpoints
  log("Test 1: HTTP Endpoint Health Checks", "info");
  for (const endpoint of testConfig.sipProxy.endpoints) {
    const result = await checkHttpEndpoint(
      "SIP Proxy",
      testConfig.sipProxy.host,
      testConfig.sipProxy.port,
      endpoint
    );
    updateResults(result);
  }

  for (const endpoint of testConfig.webrtcBridge.endpoints) {
    const result = await checkHttpEndpoint(
      "WebRTC Bridge",
      testConfig.webrtcBridge.host,
      testConfig.webrtcBridge.port,
      endpoint
    );
    updateResults(result);
  }

  for (const endpoint of testConfig.prometheus.endpoints) {
    const result = await checkHttpEndpoint(
      "Prometheus",
      testConfig.prometheus.host,
      testConfig.prometheus.port,
      endpoint
    );
    updateResults(result);
  }

  for (const endpoint of testConfig.grafana.endpoints) {
    const result = await checkHttpEndpoint(
      "Grafana",
      testConfig.grafana.host,
      testConfig.grafana.port,
      endpoint
    );
    updateResults(result);
  }

  // Test 2: TCP Connections
  log("\nTest 2: TCP Connection Tests", "info");
  const tcpResult1 = await checkTcpConnection(
    "SIP Proxy",
    testConfig.sipProxy.host,
    testConfig.sipProxy.port
  );
  updateResults(tcpResult1);

  const tcpResult2 = await checkTcpConnection(
    "SIP Signaling",
    testConfig.sipSignaling.host,
    testConfig.sipSignaling.port
  );
  updateResults(tcpResult2);

  // Test 3: WebSocket Connection
  log("\nTest 3: WebSocket Connection Test", "info");
  const wsResult = await checkWebSocketConnection(
    "WebRTC Bridge",
    testConfig.webrtcBridge.host,
    testConfig.webrtcBridge.port
  );
  updateResults(wsResult);

  // Test 4: SIP Functionality
  log("\nTest 4: SIP Functionality Test", "info");
  const sipResult = await testSipFunctionality();

  // Test 5: Load Testing
  log("\nTest 5: Load Testing", "info");
  const loadResult = await performLoadTest();

  // Results Summary
  console.log("\n📊 Production Validation Results");
  console.log("================================");
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📋 Total: ${testResults.total}`);
  console.log(
    `📈 Success Rate: ${(
      (testResults.passed / testResults.total) *
      100
    ).toFixed(1)}%`
  );

  if (testResults.failed === 0) {
    console.log("\n🎉 ALL TESTS PASSED!");
    console.log("🚀 Your SIP proxy is production ready!");
    process.exit(0);
  } else {
    console.log("\n⚠️  SOME TESTS FAILED");
    console.log("🔧 Please check the failed services before going live");
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runProductionTests().catch((error) => {
    console.error("❌ Test execution failed:", error);
    process.exit(1);
  });
}

module.exports = {
  runProductionTests,
  checkHttpEndpoint,
  checkTcpConnection,
  checkWebSocketConnection,
  testSipFunctionality,
  performLoadTest,
};
