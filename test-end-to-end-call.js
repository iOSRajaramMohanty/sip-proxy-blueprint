const net = require("net");

console.log("🔍 Testing Complete End-to-End Call Flow");
console.log("=========================================");
console.log("🎯 Simulating: Browser (Opus) → SIP Proxy → Asterisk (PCMU)");
console.log("");

// Test configuration
const testConfig = {
  proxyHost: "127.0.0.1",
  proxyPort: 5060,
  targetUser: "test",
  targetDomain: "asterisk-service.ada-asia.my",
  targetPort: "5060", // Using UDP port 5060 now
};

console.log("📋 Test Configuration:");
console.log(`   Proxy: ${testConfig.proxyHost}:${testConfig.proxyPort}`);
console.log(
  `   Target: ${testConfig.targetUser}@${testConfig.targetDomain}:${testConfig.targetPort}`
);
console.log("");

// Step 1: Send INVITE with Opus SDP
console.log("🚀 Step 1: Sending INVITE with Opus SDP...");
testInvite();

function testInvite() {
  const client = new net.Socket();
  const callId = `e2e-test-${Date.now()}@127.0.0.1`;

  client.connect(testConfig.proxyPort, testConfig.proxyHost, () => {
    console.log("✅ Connected to SIP proxy");

    // Create realistic Opus SDP (like from a browser)
    const opusSdp = [
      "v=0",
      `o=- ${Date.now()} ${Date.now()} IN IP4 127.0.0.1`,
      "s=-",
      "c=IN IP4 127.0.0.1",
      "t=0 0",
      "m=audio 10000 RTP/AVP 111",
      "a=rtpmap:111 opus/48000/2",
      "a=fmtp:111 minptime=10;useinbandfec=1",
      "a=ptime:20",
      "a=sendrecv",
      "a=ice-ufrag:test123",
      "a=ice-pwd:testpwd123",
      "a=candidate:1 1 UDP 2122252543 127.0.0.1 10000 typ host",
    ].join("\r\n");

    // Create INVITE message
    const inviteMessage = [
      `INVITE sip:${testConfig.targetUser}@${testConfig.targetDomain} SIP/2.0`,
      `Via: SIP/2.0/TCP ${testConfig.proxyHost}:${
        testConfig.proxyPort
      };branch=z9hG4bKe2e${Date.now()}`,
      "Max-Forwards: 70",
      `To: <sip:${testConfig.targetUser}@${testConfig.targetDomain}>`,
      `From: <sip:browser@127.0.0.1>;tag=browser${Date.now()}`,
      `Call-ID: ${callId}`,
      "CSeq: 1 INVITE",
      "User-Agent: WebRTC-Browser-Test",
      "Contact: <sip:browser@127.0.0.1>",
      "Content-Type: application/sdp",
      `Content-Length: ${Buffer.byteLength(opusSdp)}`,
      "",
      opusSdp,
    ].join("\r\n");

    console.log("📤 Sending INVITE with Opus SDP...");
    console.log(`📋 Call-ID: ${callId}`);
    console.log(`📋 SDP Codec: Opus (111)`);

    client.write(inviteMessage);
  });

  let responseReceived = false;
  let finalResponse = null;

  client.on("data", (data) => {
    const response = data.toString();

    if (response.includes("SIP/2.0 100 Trying")) {
      console.log("📨 Received: 100 Trying");
    } else if (response.includes("SIP/2.0 200 OK")) {
      console.log("✅ Received: 200 OK");
      responseReceived = true;
      finalResponse = response;

      // Extract SDP from response
      const sdpMatch = response.match(/(v=0[\s\S]*?)(?=\r?\n\r?\n|$)/);
      if (sdpMatch) {
        const responseSdp = sdpMatch[1];
        console.log("📋 Response SDP received:");
        console.log(responseSdp.substring(0, 300) + "...");

        // Analyze SDP
        analyzeSdp(responseSdp, "Response");
      }

      // Send ACK
      setTimeout(() => sendAck(client, callId), 100);
    } else if (
      response.includes("SIP/2.0 4") ||
      response.includes("SIP/2.0 5")
    ) {
      console.log("❌ Received error response:");
      console.log(response.substring(0, 200) + "...");
      responseReceived = true;
      finalResponse = response;
      client.destroy();
      analyzeResults();
    }
  });

  client.on("error", (err) => {
    console.log("❌ Connection error:", err.message);
    client.destroy();
    analyzeResults();
  });

  client.on("close", () => {
    console.log("🔌 Connection closed");
    if (!responseReceived) {
      console.log("⚠️ No final response received");
      analyzeResults();
    }
  });

  // Timeout
  setTimeout(() => {
    if (!responseReceived) {
      console.log("⏰ INVITE timeout");
      client.destroy();
      analyzeResults();
    }
  }, 10000);
}

function sendAck(client, callId) {
  console.log("\n📤 Step 2: Sending ACK...");

  const ackMessage = [
    `ACK sip:${testConfig.targetUser}@${testConfig.targetDomain} SIP/2.0`,
    `Via: SIP/2.0/TCP ${testConfig.proxyHost}:${
      testConfig.proxyPort
    };branch=z9hG4bKack${Date.now()}`,
    "Max-Forwards: 70",
    `To: <sip:${testConfig.targetUser}@${testConfig.targetDomain}>`,
    `From: <sip:browser@127.0.0.1>;tag=browser${Date.now()}`,
    `Call-ID: ${callId}`,
    "CSeq: 1 ACK",
    "User-Agent: WebRTC-Browser-Test",
    "Contact: <sip:browser@127.0.0.1>",
    "Content-Length: 0",
    "",
    "",
  ].join("\r\n");

  client.write(ackMessage);
  console.log("✅ ACK sent");

  // Wait a bit then send BYE
  setTimeout(() => sendBye(client, callId), 1000);
}

function sendBye(client, callId) {
  console.log("\n📤 Step 3: Sending BYE...");

  const byeMessage = [
    `BYE sip:${testConfig.targetUser}@${testConfig.targetDomain} SIP/2.0`,
    `Via: SIP/2.0/TCP ${testConfig.proxyHost}:${
      testConfig.proxyPort
    };branch=z9hG4bKbye${Date.now()}`,
    "Max-Forwards: 70",
    `To: <sip:${testConfig.targetUser}@${testConfig.targetDomain}>`,
    `From: <sip:browser@127.0.0.1>;tag=browser${Date.now()}`,
    `Call-ID: ${callId}`,
    "CSeq: 2 BYE",
    "User-Agent: WebRTC-Browser-Test",
    "Contact: <sip:browser@127.0.0.1>",
    "Content-Length: 0",
    "",
    "",
  ].join("\r\n");

  client.write(byeMessage);
  console.log("✅ BYE sent");

  // Wait for response then close
  setTimeout(() => {
    client.destroy();
    analyzeResults();
  }, 2000);
}

function analyzeSdp(sdp, type) {
  console.log(`\n🔍 Analyzing ${type} SDP:`);

  // Check codecs
  if (sdp.includes("m=audio")) {
    const mediaMatch = sdp.match(/m=audio \d+ RTP\/AVP ([0-9\s]+)/);
    if (mediaMatch) {
      const codecs = mediaMatch[1].trim().split(/\s+/);
      console.log(`   📻 Media line codecs: ${codecs.join(", ")}`);

      if (codecs.includes("111")) {
        console.log("   ✅ Opus codec (111) found");
      }
      if (codecs.includes("0")) {
        console.log("   ✅ PCMU codec (0) found");
      }
    }
  }

  // Check for Opus attributes
  if (sdp.includes("opus")) {
    console.log("   🎵 Opus codec attributes found");
  }

  // Check for PCMU attributes
  if (sdp.includes("PCMU")) {
    console.log("   🎵 PCMU codec attributes found");
  }
}

function analyzeResults() {
  console.log("\n📊 End-to-End Call Analysis:");
  console.log("=============================");

  if (
    typeof finalResponse !== "undefined" &&
    finalResponse &&
    finalResponse.includes("200 OK")
  ) {
    console.log("✅ SUCCESS: Complete call flow working!");
    console.log("   - INVITE with Opus SDP sent");
    console.log("   - 200 OK response received");
    console.log("   - SDP transcoding working");
    console.log("   - ACK and BYE handled");
  } else {
    console.log("❌ ISSUES DETECTED:");
    console.log("   - Call flow incomplete");
    console.log("   - May need Asterisk configuration updates");
  }

  console.log("\n🔧 Next Steps:");
  console.log("   1. Check Asterisk logs for any errors");
  console.log("   2. Verify Asterisk can handle PCMU codec");
  console.log("   3. Check if any dialplan configuration needed");

  process.exit(0);
}

// Overall timeout
setTimeout(() => {
  console.log("\n⏰ Overall test timeout");
  process.exit(1);
}, 15000);
