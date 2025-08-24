#!/usr/bin/env node

const http = require("http");

console.log("🧪 Testing Local SIP Proxy (No Docker Required)");
console.log("================================================");
console.log("");

// Test configuration
const PROXY_HOST = "127.0.0.1";
const PROXY_PORT = 3000;
const ASTERISK_HOST = "asterisk-service.ada-asia.my";
const ASTERISK_PORT = 8090;

// Test functions
async function testHealthEndpoint() {
  return new Promise((resolve) => {
    const options = {
      hostname: PROXY_HOST,
      port: PROXY_PORT,
      path: "/health",
      method: "GET",
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const health = JSON.parse(data);
          console.log("✅ Health Check Response:");
          console.log(`   Status: ${health.status}`);
          console.log(`   Drachtio: ${health.services.drachtio}`);
          console.log(`   RTPEngine: ${health.services.rtpengine}`);
          resolve({ success: true, data: health });
        } catch (e) {
          console.log("❌ Failed to parse health response");
          resolve({ success: false, error: "Parse error" });
        }
      });
    });

    req.on("error", (err) => {
      console.log(`❌ Health check failed: ${err.message}`);
      resolve({ success: false, error: err.message });
    });

    req.on("timeout", () => {
      req.destroy();
      console.log("❌ Health check timeout");
      resolve({ success: false, error: "Timeout" });
    });

    req.end();
  });
}

async function testStatsEndpoint() {
  return new Promise((resolve) => {
    const options = {
      hostname: PROXY_HOST,
      port: PROXY_PORT,
      path: "/stats",
      method: "GET",
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const stats = JSON.parse(data);
          console.log("✅ Stats Response:");
          console.log(`   Active Calls: ${stats.calls.active}`);
          console.log(`   Total Calls: ${stats.calls.total}`);
          console.log(`   RTPEngine Workers: ${stats.rtpengine.workers}`);
          resolve({ success: true, data: stats });
        } catch (e) {
          console.log("❌ Failed to parse stats response");
          resolve({ success: false, error: "Parse error" });
        }
      });
    });

    req.on("error", (err) => {
      console.log(`❌ Stats check failed: ${err.message}`);
      resolve({ success: false, error: err.message });
    });

    req.on("timeout", () => {
      req.destroy();
      console.log("❌ Stats check timeout");
      resolve({ success: false, error: "Timeout" });
    });

    req.end();
  });
}

async function testAsteriskConnectivity() {
  return new Promise((resolve) => {
    const net = require("net");
    const client = new net.Socket();

    const timeout = setTimeout(() => {
      client.destroy();
      resolve({ success: false, error: "Connection timeout" });
    }, 5000);

    client.connect(ASTERISK_PORT, ASTERISK_HOST, () => {
      clearTimeout(timeout);
      console.log(
        `✅ Asterisk connectivity confirmed: ${ASTERISK_HOST}:${ASTERISK_PORT}`
      );
      client.destroy();
      resolve({ success: true });
    });

    client.on("error", (err) => {
      clearTimeout(timeout);
      console.log(`❌ Asterisk connectivity failed: ${err.message}`);
      resolve({ success: false, error: err.message });
    });
  });
}

async function runLocalTests() {
  console.log("🚀 Starting Local Tests...\n");

  // Test 1: Health endpoint
  console.log("1️⃣ Testing Health Endpoint...");
  const healthResult = await testHealthEndpoint();

  // Test 2: Stats endpoint
  console.log("\n2️⃣ Testing Stats Endpoint...");
  const statsResult = await testStatsEndpoint();

  // Test 3: Asterisk connectivity
  console.log("\n3️⃣ Testing Asterisk Connectivity...");
  const asteriskResult = await testAsteriskConnectivity();

  // Summary
  console.log("\n📊 Test Results Summary:");
  console.log("========================");
  console.log(
    `Health Endpoint: ${healthResult.success ? "✅ PASS" : "❌ FAIL"}`
  );
  if (!healthResult.success) console.log(`  Error: ${healthResult.error}`);

  console.log(`Stats Endpoint: ${statsResult.success ? "✅ PASS" : "❌ FAIL"}`);
  if (!statsResult.success) console.log(`  Error: ${statsResult.error}`);

  console.log(
    `Asterisk Connectivity: ${asteriskResult.success ? "✅ PASS" : "❌ FAIL"}`
  );
  if (!asteriskResult.success) console.log(`  Error: ${asteriskResult.error}`);

  // Recommendations
  console.log("\n💡 Recommendations:");

  if (healthResult.success && statsResult.success) {
    console.log("✅ SIP Proxy is running and responding to HTTP requests");
    console.log("✅ Ready for SIP testing with remote Asterisk");
  } else {
    console.log("❌ SIP Proxy is not responding - check if it's running");
    console.log("   Run: npm run dev");
  }

  if (asteriskResult.success) {
    console.log("✅ Remote Asterisk is reachable");
    console.log("✅ Network connectivity confirmed");
  } else {
    console.log("❌ Cannot reach remote Asterisk");
    console.log("   Check network/firewall configuration");
  }

  if (healthResult.success && asteriskResult.success) {
    console.log("\n🎉 Ready for SIP proxy testing!");
    console.log("   Next: Test SIP INVITE flow");
  } else {
    console.log("\n🔧 Please resolve issues before SIP testing");
  }
}

// Run tests
runLocalTests().catch(console.error);
