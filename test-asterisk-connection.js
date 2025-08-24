#!/usr/bin/env node

const net = require("net");
const dgram = require("dgram");

const ASTERISK_HOST = "asterisk-service.ada-asia.my";
const ASTERISK_PORT = 8090;

console.log("🔍 Testing connection to remote Asterisk server...");
console.log(`📍 Target: ${ASTERISK_HOST}:${ASTERISK_PORT}`);
console.log("");

// Test TCP connection
function testTcpConnection() {
  return new Promise((resolve) => {
    const client = new net.Socket();
    const timeout = setTimeout(() => {
      client.destroy();
      resolve({ success: false, error: "Connection timeout" });
    }, 5000);

    client.connect(ASTERISK_PORT, ASTERISK_HOST, () => {
      clearTimeout(timeout);
      console.log(
        `✅ TCP connection successful to ${ASTERISK_HOST}:${ASTERISK_PORT}`
      );
      client.destroy();
      resolve({ success: true });
    });

    client.on("error", (err) => {
      clearTimeout(timeout);
      console.log(`❌ TCP connection failed: ${err.message}`);
      resolve({ success: false, error: err.message });
    });
  });
}

// Test UDP connection (for SIP)
function testUdpConnection() {
  return new Promise((resolve) => {
    const client = dgram.createSocket("udp4");
    const message = Buffer.from(
      "OPTIONS sip:test@asterisk-service.ada-asia.my SIP/2.0\r\nVia: SIP/2.0/UDP 127.0.0.1:5060\r\nFrom: <sip:test@127.0.0.1>\r\nTo: <sip:test@asterisk-service.ada-asia.my>\r\nCall-ID: test-123\r\nCSeq: 1 OPTIONS\r\n\r\n"
    );

    const timeout = setTimeout(() => {
      client.close();
      resolve({ success: false, error: "UDP test timeout" });
    }, 5000);

    client.on("message", (msg, rinfo) => {
      clearTimeout(timeout);
      console.log(
        `✅ UDP message received from ${rinfo.address}:${rinfo.port}`
      );
      console.log(`📨 Response: ${msg.toString().substring(0, 100)}...`);
      client.close();
      resolve({ success: true });
    });

    client.on("error", (err) => {
      clearTimeout(timeout);
      console.log(`❌ UDP error: ${err.message}`);
      resolve({ success: false, error: err.message });
    });

    client.send(message, ASTERISK_PORT, ASTERISK_HOST, (err) => {
      if (err) {
        clearTimeout(timeout);
        console.log(`❌ UDP send failed: ${err.message}`);
        resolve({ success: false, error: err.message });
      } else {
        console.log(
          `📤 UDP OPTIONS message sent to ${ASTERISK_HOST}:${ASTERISK_PORT}`
        );
      }
    });
  });
}

// Test HTTP connection (if Asterisk has HTTP interface)
async function testHttpConnection() {
  try {
    const http = require("http");
    const https = require("https");

    // Try HTTP first
    const httpResult = await new Promise((resolve) => {
      const req = http.request(
        {
          hostname: ASTERISK_HOST,
          port: 80,
          path: "/",
          method: "GET",
          timeout: 5000,
        },
        (res) => {
          console.log(`✅ HTTP connection successful (${res.statusCode})`);
          resolve({ success: true, protocol: "HTTP" });
        }
      );

      req.on("error", (err) => {
        resolve({ success: false, error: err.message, protocol: "HTTP" });
      });

      req.on("timeout", () => {
        req.destroy();
        resolve({ success: false, error: "Timeout", protocol: "HTTP" });
      });

      req.end();
    });

    if (httpResult.success) return httpResult;

    // Try HTTPS
    const httpsResult = await new Promise((resolve) => {
      const req = https.request(
        {
          hostname: ASTERISK_HOST,
          port: 443,
          path: "/",
          method: "GET",
          timeout: 5000,
        },
        (res) => {
          console.log(`✅ HTTPS connection successful (${res.statusCode})`);
          resolve({ success: true, protocol: "HTTPS" });
        }
      );

      req.on("error", (err) => {
        resolve({ success: false, error: err.message, protocol: "HTTPS" });
      });

      req.on("timeout", () => {
        req.destroy();
        resolve({ success: false, error: "Timeout", protocol: "HTTPS" });
      });

      req.end();
    });

    return httpsResult;
  } catch (err) {
    return { success: false, error: err.message, protocol: "HTTP/HTTPS" };
  }
}

// Main test function
async function runTests() {
  console.log("🚀 Starting connection tests...\n");

  // Test TCP
  console.log("1️⃣ Testing TCP connection...");
  const tcpResult = await testTcpConnection();

  // Test UDP
  console.log("\n2️⃣ Testing UDP connection...");
  const udpResult = await testUdpConnection();

  // Test HTTP/HTTPS
  console.log("\n3️⃣ Testing HTTP/HTTPS connection...");
  const httpResult = await testHttpConnection();

  // Summary
  console.log("\n📊 Test Results Summary:");
  console.log("========================");
  console.log(`TCP Connection: ${tcpResult.success ? "✅ PASS" : "❌ FAIL"}`);
  if (!tcpResult.success) console.log(`  Error: ${tcpResult.error}`);

  console.log(`UDP Connection: ${udpResult.success ? "✅ PASS" : "❌ PASS"}`);
  if (!udpResult.success) console.log(`  Error: ${udpResult.error}`);

  console.log(`HTTP/HTTPS: ${httpResult.success ? "✅ PASS" : "❌ FAIL"}`);
  if (!httpResult.success) console.log(`  Error: ${httpResult.error}`);

  // Recommendations
  console.log("\n💡 Recommendations:");
  if (tcpResult.success) {
    console.log("✅ TCP connectivity confirmed - SIP signaling should work");
  } else {
    console.log(
      "❌ TCP connectivity failed - check firewall/network configuration"
    );
  }

  if (udpResult.success) {
    console.log("✅ UDP connectivity confirmed - SIP media should work");
  } else {
    console.log(
      "⚠️  UDP connectivity failed - this may affect SIP functionality"
    );
  }

  if (tcpResult.success && udpResult.success) {
    console.log("\n🎉 Ready for SIP proxy testing!");
    console.log("   Run: docker-compose -f docker-compose.local.yml up");
  } else {
    console.log(
      "\n🔧 Please resolve connectivity issues before testing SIP proxy"
    );
  }
}

// Run tests
runTests().catch(console.error);
