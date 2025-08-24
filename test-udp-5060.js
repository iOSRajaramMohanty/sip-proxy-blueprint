const dgram = require("dgram");

console.log("🔍 Testing UDP connection to Asterisk on port 5060...");
console.log("📍 Target: asterisk-service.ada-asia.my:5060");

const client = dgram.createSocket("udp4");

// Test UDP connection to port 5060
client.send(
  "OPTIONS sip:test@asterisk-service.ada-asia.my SIP/2.0\r\n",
  5060,
  "asterisk-service.ada-asia.my",
  (err) => {
    if (err) {
      console.log("❌ UDP send error:", err.message);
    } else {
      console.log("📤 UDP OPTIONS message sent to port 5060");
    }
  }
);

// Listen for response
client.on("message", (msg, rinfo) => {
  console.log("📨 Received response from:", rinfo.address + ":" + rinfo.port);
  console.log("📋 Response:", msg.toString().substring(0, 200) + "...");
  client.close();
});

// Set timeout
setTimeout(() => {
  console.log("⏰ UDP test timeout - no response received");
  console.log(
    "💡 This suggests Asterisk may not be listening on UDP port 5060"
  );
  client.close();
}, 5000);

client.on("error", (err) => {
  console.log("❌ UDP error:", err.message);
  client.close();
});
