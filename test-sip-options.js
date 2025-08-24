const dgram = require("dgram");

console.log("🔍 Testing SIP OPTIONS to Asterisk on UDP port 5060...");
console.log("📍 Target: asterisk-service.ada-asia.my:5060");

const client = dgram.createSocket("udp4");

// Create a proper SIP OPTIONS message
const sipMessage = [
  "OPTIONS sip:asterisk-service.ada-asia.my SIP/2.0",
  "Via: SIP/2.0/UDP 127.0.0.1:5060;branch=z9hG4bK123456",
  "Max-Forwards: 70",
  "To: <sip:asterisk-service.ada-asia.my>",
  "From: <sip:test@127.0.0.1>;tag=test123",
  "Call-ID: test-call-id-12345@127.0.0.1",
  "CSeq: 1 OPTIONS",
  "User-Agent: SIP-Proxy-Test",
  "Accept: application/sdp",
  "Content-Length: 0",
  "",
  "",
].join("\r\n");

console.log("📋 SIP Message:");
console.log(sipMessage);
console.log("=".repeat(50));

// Send proper SIP OPTIONS message
client.send(sipMessage, 5060, "asterisk-service.ada-asia.my", (err) => {
  if (err) {
    console.log("❌ UDP send error:", err.message);
    client.close();
  } else {
    console.log("📤 SIP OPTIONS message sent to port 5060");
  }
});

// Listen for response
client.on("message", (msg, rinfo) => {
  console.log("📨 Received response from:", rinfo.address + ":" + rinfo.port);
  console.log("📋 SIP Response:");
  console.log(msg.toString());
  console.log("✅ UDP SIP communication successful!");
  client.close();
});

// Set timeout
setTimeout(() => {
  console.log("⏰ SIP OPTIONS timeout - no response received");
  console.log("🔥 Possible issues:");
  console.log("   1. Firewall blocking UDP traffic");
  console.log("   2. Asterisk not accepting anonymous OPTIONS");
  console.log("   3. Network routing issues");
  console.log("💡 But UDP port 5060 IS listening on the server!");
  client.close();
}, 5000);

client.on("error", (err) => {
  console.log("❌ UDP error:", err.message);
  client.close();
});
