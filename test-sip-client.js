#!/usr/bin/env node

const net = require("net");

class SimpleSipClient {
  constructor(proxyHost = "127.0.0.1", proxyPort = 5060) {
    this.proxyHost = proxyHost;
    this.proxyPort = proxyPort;
    this.callId = `test-${Date.now()}`;
    this.cseq = 1;
    this.client = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.client = new net.Socket();

      this.client.connect(this.proxyPort, this.proxyHost, () => {
        console.log(
          `✅ Connected to SIP proxy at ${this.proxyHost}:${this.proxyPort}`
        );
        resolve();
      });

      this.client.on("data", (data) => {
        const response = data.toString();
        console.log(`📨 Received from proxy: ${response.substring(0, 200)}...`);

        if (response.includes("SIP/2.0 200 OK")) {
          console.log("✅ INVITE successful!");
        } else if (
          response.includes("SIP/2.0 4") ||
          response.includes("SIP/2.0 5")
        ) {
          console.log("❌ INVITE failed");
        }
      });

      this.client.on("error", (err) => {
        console.log(`❌ Connection error: ${err.message}`);
        reject(err);
      });

      this.client.on("close", () => {
        console.log("🔌 Connection closed");
      });
    });
  }

  sendInvite(targetUri = "sip:test@asterisk-service.ada-asia.my") {
    const sdp = this.generateOpusSdp();

    const invite = [
      `INVITE ${targetUri} SIP/2.0`,
      `Via: SIP/2.0/TCP ${this.proxyHost}:${
        this.proxyPort
      };branch=z9hG4bK${Date.now()}`,
      `From: <sip:test@${this.proxyHost}>;tag=${Date.now()}`,
      `To: <${targetUri}>`,
      `Call-ID: ${this.callId}`,
      `CSeq: ${this.cseq++} INVITE`,
      `Contact: <sip:test@${this.proxyHost}:${this.proxyPort}>`,
      `Content-Type: application/sdp`,
      `Content-Length: ${sdp.length}`,
      "",
      sdp,
    ].join("\r\n");

    console.log(`📤 Sending INVITE to ${targetUri}`);
    console.log(`📋 SDP (Opus): ${sdp.substring(0, 100)}...`);

    this.client.write(invite + "\r\n\r\n");
  }

  sendBye() {
    const bye = [
      `BYE sip:test@asterisk-service.ada-asia.my SIP/2.0`,
      `Via: SIP/2.0/TCP ${this.proxyHost}:${
        this.proxyPort
      };branch=z9hG4bK${Date.now()}`,
      `From: <sip:test@${this.proxyHost}>;tag=${Date.now()}`,
      `To: <sip:test@asterisk-service.ada-asia.my>`,
      `Call-ID: ${this.callId}`,
      `CSeq: ${this.cseq++} BYE`,
      `Contact: <sip:test@${this.proxyHost}:${this.proxyPort}>`,
      `Content-Length: 0`,
      "",
      "",
    ].join("\r\n");

    console.log("📤 Sending BYE");
    this.client.write(bye + "\r\n\r\n");
  }

  generateOpusSdp() {
    return [
      "v=0",
      `o=- ${Date.now()} ${Date.now()} IN IP4 ${this.proxyHost}`,
      "s=-",
      `c=IN IP4 ${this.proxyHost}`,
      "t=0 0",
      "m=audio 10000 RTP/AVP 111",
      "a=rtpmap:111 opus/48000/2",
      "a=fmtp:111 minptime=10;useinbandfec=1",
      "a=ptime:20",
      "a=sendrecv",
    ].join("\r\n");
  }

  disconnect() {
    if (this.client) {
      this.client.destroy();
    }
  }
}

// Test function
async function testSipProxy() {
  const client = new SimpleSipClient();

  try {
    console.log("🚀 Testing SIP Proxy with Remote Asterisk");
    console.log("==========================================");
    console.log(`📍 Proxy: 127.0.0.1:5060`);
    console.log(`🎯 Target: asterisk-service.ada-asia.my:8090`);
    console.log("");

    // Connect to proxy
    await client.connect();

    // Wait a moment for connection to stabilize
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Send INVITE
    client.sendInvite();

    // Wait for response
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Send BYE to clean up
    client.sendBye();

    // Wait a moment before disconnecting
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  } finally {
    client.disconnect();
    console.log("🏁 Test completed");
  }
}

// Run test if called directly
if (require.main === module) {
  testSipProxy();
}

module.exports = SimpleSipClient;
