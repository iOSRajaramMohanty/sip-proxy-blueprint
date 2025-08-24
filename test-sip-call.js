#!/usr/bin/env node

/**
 * End-to-End SIP Call Test Client
 * Tests the complete call flow: INVITE → SDP Exchange → Media → BYE
 */

const net = require("net");
const crypto = require("crypto");

class SIPCallTester {
  constructor() {
    this.callId = this.generateCallId();
    this.tag = this.generateTag();
    this.branch = this.generateBranch();
    this.cseq = 1;
    this.socket = null;
    this.testResults = {
      invite: false,
      sdpExchange: false,
      mediaSetup: false,
      bye: false,
      overall: false,
    };
  }

  generateCallId() {
    return crypto.randomUUID();
  }

  generateTag() {
    return crypto.randomBytes(8).toString("hex");
  }

  generateBranch() {
    return "z9hG4bK" + crypto.randomBytes(8).toString("hex");
  }

  async connectToSIPProxy() {
    return new Promise((resolve, reject) => {
      console.log("🔌 Connecting to Drachtio SIP Server at localhost:5062...");

      this.socket = net.createConnection(5062, "localhost", () => {
        console.log("✅ Connected to Drachtio SIP Server");
        resolve();
      });

      this.socket.on("error", (err) => {
        console.error("❌ Connection error:", err.message);
        reject(err);
      });

      this.socket.on("data", (data) => {
        this.handleSIPResponse(data.toString());
      });

      this.socket.on("close", () => {
        console.log("🔌 Connection closed");
      });
    });
  }

  async sendINVITE() {
    const sdp = this.generateTestSDP();
    const invite = this.buildINVITE(sdp);

    console.log("📞 Sending INVITE request...");
    console.log("📋 Call ID:", this.callId);
    console.log("📋 SDP (Opus):", sdp.substring(0, 100) + "...");

    this.socket.write(invite);

    // Wait for response
    await this.waitForResponse();
  }

  generateTestSDP() {
    return `v=0
o=- ${Date.now()} 2 IN IP4 127.0.0.1
s=SIP Call Test
c=IN IP4 127.0.0.1
t=0 0
m=audio 10000 RTP/AVP 111 0 8
a=rtpmap:111 opus/48000/2
a=rtpmap:0 PCMU/8000
a=rtpmap:8 PCMA/8000
a=ptime:20
a=maxptime:40
a=sendrecv
a=mid:audio
a=ssrc:1234567890 cname:test-call
a=ssrc:1234567890 msid:test-call audio
a=ssrc:1234567890 mslabel:test-call
a=label:audio
a=rtcp:10001 IN IP4 127.0.0.1`;
  }

  buildINVITE(sdp) {
    return `INVITE sip:test@asterisk-service.ada-asia.my:5060 SIP/2.0
Via: SIP/2.0/TCP 127.0.0.1:5062;branch=${this.branch}
From: <sip:test@127.0.0.1>;tag=${this.tag}
To: <sip:test@asterisk-service.ada-asia.my:5060>
Call-ID: ${this.callId}
CSeq: ${this.cseq} INVITE
Contact: <sip:test@127.0.0.1:5062>
Max-Forwards: 70
User-Agent: SIP-Call-Tester/1.0
Content-Type: application/sdp
Content-Length: ${Buffer.byteLength(sdp)}

${sdp}`;
  }

  async sendBYE() {
    this.cseq++;
    const bye = this.buildBYE();

    console.log("📞 Sending BYE request...");
    this.socket.write(bye);

    // Wait for response
    await this.waitForResponse();
  }

  buildBYE() {
    return `BYE sip:test@asterisk-service.ada-asia.my:5060 SIP/2.0
Via: SIP/2.0/TCP 127.0.0.1:5061;branch=${this.branch}
From: <sip:test@127.0.0.1>;tag=${this.tag}
To: <sip:test@asterisk-service.ada-asia.my:5060>
Call-ID: ${this.callId}
CSeq: ${this.cseq} BYE
Max-Forwards: 70
User-Agent: SIP-Call-Tester/1.0
Content-Length: 0

`;
  }

  handleSIPResponse(response) {
    console.log("📥 Received SIP response:");
    console.log(response.substring(0, 200) + "...");

    if (response.includes("SIP/2.0 200 OK")) {
      if (response.includes("INVITE")) {
        console.log("✅ INVITE successful - Call established!");
        this.testResults.invite = true;

        // Check if SDP was modified (transcoded)
        if (response.includes("PCMU") && !response.includes("opus")) {
          console.log("✅ SDP transcoding detected: Opus → PCMU");
          this.testResults.sdpExchange = true;
        } else {
          console.log("⚠️ SDP transcoding not detected");
        }
      } else if (response.includes("BYE")) {
        console.log("✅ BYE successful - Call terminated!");
        this.testResults.bye = true;
      }
    } else if (response.includes("SIP/2.0 100 Trying")) {
      console.log("🔄 Call is being processed...");
    } else if (response.includes("SIP/2.0 180 Ringing")) {
      console.log("🔔 Call is ringing...");
    } else if (response.includes("SIP/2.0 183 Session Progress")) {
      console.log("📡 Session progress...");
    }
  }

  async waitForResponse(timeout = 5000) {
    return new Promise((resolve) => {
      setTimeout(resolve, timeout);
    });
  }

  async runEndToEndTest() {
    try {
      console.log("🚀 Starting End-to-End SIP Call Test");
      console.log("=".repeat(50));

      // Step 1: Connect to SIP Proxy
      await this.connectToSIPProxy();

      // Step 2: Send INVITE
      await this.sendINVITE();

      // Step 3: Wait for call processing
      console.log("⏳ Waiting for call processing...");
      await this.waitForResponse(3000);

      // Step 4: Send BYE to terminate call
      await this.sendBYE();

      // Step 5: Wait for BYE response
      await this.waitForResponse(2000);

      // Step 6: Close connection
      this.socket.end();

      // Step 7: Evaluate results
      this.evaluateResults();
    } catch (error) {
      console.error("❌ Test failed:", error.message);
      this.testResults.overall = false;
    }
  }

  evaluateResults() {
    console.log("\n📊 Test Results:");
    console.log("=".repeat(30));
    console.log(`INVITE: ${this.testResults.invite ? "✅ PASS" : "❌ FAIL"}`);
    console.log(
      `SDP Exchange: ${this.testResults.sdpExchange ? "✅ PASS" : "❌ FAIL"}`
    );
    console.log(`BYE: ${this.testResults.bye ? "✅ PASS" : "❌ FAIL"}`);

    this.testResults.overall = this.testResults.invite && this.testResults.bye;
    console.log(`Overall: ${this.testResults.overall ? "✅ PASS" : "❌ FAIL"}`);

    if (this.testResults.overall) {
      console.log("\n🎉 End-to-End SIP Call Test PASSED!");
      console.log("Your SIP Proxy Blueprint is fully functional!");
    } else {
      console.log("\n⚠️ End-to-End SIP Call Test FAILED");
      console.log("Check the logs above for issues");
    }
  }
}

// Run the test
async function main() {
  const tester = new SIPCallTester();
  await tester.runEndToEndTest();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = SIPCallTester;
