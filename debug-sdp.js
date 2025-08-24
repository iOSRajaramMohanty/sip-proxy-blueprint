#!/usr/bin/env node

console.log("🔍 Debugging SDP Filtering Functions");
console.log("====================================");

// Test SDP filtering functions
const { filterSdpForAsterisk, filterSdpForBrowser } = require("./app/proxy");

// Test Opus SDP
const opusSdp = [
  "v=0",
  "o=- 1234567890 1234567890 IN IP4 127.0.0.1",
  "s=-",
  "c=IN IP4 127.0.0.1",
  "t=0 0",
  "m=audio 10000 RTP/AVP 111",
  "a=rtpmap:111 opus/48000/2",
  "a=fmtp:111 minptime=10;useinbandfec=1",
  "a=ptime:20",
  "a=sendrecv",
].join("\r\n");

console.log("📤 Original Opus SDP:");
console.log(opusSdp);
console.log("");

// Test filtering for Asterisk
console.log("🔄 Filtering for Asterisk...");
const asteriskSdp = filterSdpForAsterisk(opusSdp);
console.log("Result:", asteriskSdp);
console.log("");

// Test filtering back for browser
console.log("🔄 Filtering for Browser...");
const browserSdp = filterSdpForBrowser(asteriskSdp);
console.log("Result:", browserSdp);
console.log("");

// Verify results
console.log("📊 Verification:");
console.log(
  "Asterisk SDP contains PCMU:",
  asteriskSdp.includes("PCMU") || asteriskSdp.includes("0")
);
console.log(
  "Browser SDP contains Opus:",
  browserSdp.includes("opus") || browserSdp.includes("111")
);
