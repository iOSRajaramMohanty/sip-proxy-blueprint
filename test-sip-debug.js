#!/usr/bin/env node

/**
 * SIP Debug Test - Simple test to identify header parsing issues
 */

const net = require("net");

class SIPDebugTester {
  constructor() {
    this.socket = null;
  }

  async testSIPHeaders() {
    return new Promise((resolve, reject) => {
      console.log("🔍 Testing SIP header parsing...");

      this.socket = net.createConnection(5062, "localhost", () => {
        console.log("✅ Connected to Drachtio SIP Server");

        // Send a very simple INVITE with minimal headers
        const simpleInvite = `INVITE sip:test@127.0.0.1 SIP/2.0
Via: SIP/2.0/TCP 127.0.0.1:5062;branch=z9hG4bKdebug
From: "Test User" <sip:test@127.0.0.1>;tag=debug123
To: "Test User" <sip:test@127.0.0.1>
Call-ID: debug-${Date.now()}
CSeq: 1 INVITE
Contact: <sip:test@127.0.0.1:5062>
Max-Forwards: 70
Content-Length: 0

`;

        console.log("📤 Sending simple INVITE with quoted display names:");
        console.log(simpleInvite);

        this.socket.write(simpleInvite);
      });

      this.socket.on("error", (err) => {
        console.error("❌ Connection error:", err.message);
        reject(err);
      });

      this.socket.on("data", (data) => {
        const response = data.toString();
        console.log("📥 Received response:");
        console.log(response);

        // Close connection after response
        this.socket.end();
        resolve();
      });

      this.socket.on("close", () => {
        console.log("🔌 Connection closed");
      });

      // Timeout
      setTimeout(() => {
        console.log("⏰ Timeout");
        this.socket.end();
        resolve();
      }, 5000);
    });
  }
}

// Run the debug test
async function main() {
  const tester = new SIPDebugTester();
  await tester.testSIPHeaders();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = SIPDebugTester;
