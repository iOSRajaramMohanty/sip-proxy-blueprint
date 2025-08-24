// Test SDP filtering functions standalone
console.log('🔍 Testing SDP Filtering Functions (Standalone)');
console.log('====================================');

// SDP filtering functions (copied from proxy.js)
function filterSdpForAsterisk(sdp) {
  // Simple regex-based SDP filtering for Asterisk (PCMU/PCMA only)
  let filteredSdp = sdp;

  // Remove Opus codec references (111)
  filteredSdp = filteredSdp.replace(/a=rtpmap:111.*\r?\n/g, "");
  filteredSdp = filteredSdp.replace(/a=fmtp:111.*\r?\n/g, "");

  // Replace media line to use PCMU (0) instead of Opus (111)
  filteredSdp = filteredSdp.replace(
    /m=audio \d+ RTP\/AVP [0-9\s]+/,
    "m=audio 10000 RTP/AVP 0\r\n"
  );

  // Add PCMU attributes with proper newlines
  filteredSdp += "a=rtpmap:0 PCMU/8000\r\n";

  return filteredSdp;
}

function filterSdpForBrowser(sdp) {
  // Simple regex-based SDP filtering for browser (Opus only)
  let filteredSdp = sdp;

  // Remove PCMU/PCMA codec references (0, 8)
  filteredSdp = filteredSdp.replace(/a=rtpmap:0.*\r?\n/g, "");
  filteredSdp = filteredSdp.replace(/a=rtpmap:8.*\r?\n/g, "");
  filteredSdp = filteredSdp.replace(/a=fmtp:0.*\r?\n/g, "");
  filteredSdp = filteredSdp.replace(/a=fmtp:8.*\r?\n/g, "");

  // Replace media line to use Opus (111) instead of PCMU/PCMA
  filteredSdp = filteredSdp.replace(
    /m=audio \d+ RTP\/AVP [0-9\s]+/,
    "m=audio 10000 RTP/AVP 111\r\n"
  );

  // Add Opus attributes with proper newlines
  filteredSdp += "a=rtpmap:111 opus/48000/2\r\n";
  filteredSdp += "a=fmtp:111 minptime=10;useinbandfec=1\r\n";

  return filteredSdp;
}

// Test data
const opusSdp = `v=0\r
o=- 1234567890 1234567890 IN IP4 127.0.0.1\r
s=-\r
c=IN IP4 127.0.0.1\r
t=0 0\r
m=audio 10000 RTP/AVP 111\r
a=rtpmap:111 opus/48000/2\r
a=fmtp:111 minptime=10;useinbandfec=1\r
a=ptime:20\r
a=sendrecv\r
`;

const pcmuSdp = `v=0\r
o=- 1234567890 1234567890 IN IP4 127.0.0.1\r
s=-\r
c=IN IP4 127.0.0.1\r
t=0 0\r
m=audio 10000 RTP/AVP 0\r
a=rtpmap:0 PCMU/8000\r
a=ptime:20\r
a=sendrecv\r
`;

console.log('📤 Original Opus SDP:');
console.log(opusSdp.replace(/\r/g, ''));
console.log('🔄 Filtering for Asterisk...');
const asteriskFiltered = filterSdpForAsterisk(opusSdp);
console.log('Result:');
console.log(asteriskFiltered.replace(/\r/g, ''));

console.log('\n📤 Original PCMU SDP:');
console.log(pcmuSdp.replace(/\r/g, ''));
console.log('🔄 Filtering for Browser...');
const browserFiltered = filterSdpForBrowser(pcmuSdp);
console.log('Result:');
console.log(browserFiltered.replace(/\r/g, ''));

console.log('\n📊 Verification:');
console.log('Asterisk SDP contains PCMU:', asteriskFiltered.includes('PCMU'));
console.log('Asterisk SDP contains m=audio...0:', asteriskFiltered.includes('m=audio 10000 RTP/AVP 0'));
console.log('Browser SDP contains Opus:', browserFiltered.includes('opus'));
console.log('Browser SDP contains m=audio...111:', browserFiltered.includes('m=audio 10000 RTP/AVP 111'));

console.log('\n✅ SDP Filtering validation completed!');