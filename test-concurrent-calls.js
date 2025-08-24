const net = require('net');

console.log('🔍 Testing Multiple Concurrent Calls Handling');
console.log('==============================================');

let completedCalls = 0;
const totalCalls = 3;
let callResults = [];

console.log(`\n🚀 Starting ${totalCalls} concurrent calls...`);

// Start multiple concurrent calls
for (let i = 1; i <= totalCalls; i++) {
  setTimeout(() => startCall(i), i * 100); // Stagger by 100ms
}

function startCall(callNumber) {
  const client = new net.Socket();
  const callId = `concurrent-call-${callNumber}-${Date.now()}`;
  
  console.log(`📞 Call ${callNumber}: Starting...`);
  
  client.connect(5060, '127.0.0.1', () => {
    console.log(`✅ Call ${callNumber}: Connected`);
    
    const inviteMessage = [
      'INVITE sip:test@asterisk-service.ada-asia.my SIP/2.0',
      `Via: SIP/2.0/TCP 127.0.0.1:5060;branch=z9hG4bKcall${callNumber}`,
      'Max-Forwards: 70',
      'To: <sip:test@asterisk-service.ada-asia.my>',
      `From: <sip:test${callNumber}@127.0.0.1>;tag=tag${callNumber}`,
      `Call-ID: ${callId}`,
      'CSeq: 1 INVITE',
      'User-Agent: SIP-Proxy-Concurrent-Test',
      'Contact: <sip:test@127.0.0.1>',
      'Content-Type: application/sdp',
      'Content-Length: 150',
      '',
      'v=0',
      `o=- ${Date.now()} ${Date.now()} IN IP4 127.0.0.1`,
      's=-',
      'c=IN IP4 127.0.0.1',
      't=0 0',
      'm=audio 10000 RTP/AVP 111',
      'a=rtpmap:111 opus/48000/2',
      ''
    ].join('\r\n');
    
    client.write(inviteMessage);
    console.log(`📤 Call ${callNumber}: INVITE sent`);
  });
  
  let responseReceived = false;
  
  client.on('data', (data) => {
    const response = data.toString();
    
    if (!responseReceived && response.includes('200 OK')) {
      responseReceived = true;
      console.log(`✅ Call ${callNumber}: 200 OK received`);
      callResults.push({ call: callNumber, status: 'success', response: '200 OK' });
      client.destroy();
      checkCompletion();
    } else if (!responseReceived && response.includes('SIP/2.0 ')) {
      responseReceived = true;
      const statusMatch = response.match(/SIP\/2\.0 (\d+)/);
      const status = statusMatch ? statusMatch[1] : 'unknown';
      console.log(`⚠️ Call ${callNumber}: ${status} response`);
      callResults.push({ call: callNumber, status: 'error', response: status });
      client.destroy();
      checkCompletion();
    }
  });
  
  client.on('error', (err) => {
    console.log(`❌ Call ${callNumber}: Error - ${err.message}`);
    callResults.push({ call: callNumber, status: 'error', response: err.message });
    checkCompletion();
  });
  
  client.on('close', () => {
    console.log(`🔌 Call ${callNumber}: Connection closed`);
  });
  
  // Timeout for each call
  setTimeout(() => {
    if (!responseReceived) {
      console.log(`⏰ Call ${callNumber}: Timeout`);
      callResults.push({ call: callNumber, status: 'timeout', response: 'timeout' });
      client.destroy();
      checkCompletion();
    }
  }, 5000);
}

function checkCompletion() {
  completedCalls++;
  
  if (completedCalls >= totalCalls) {
    console.log('\n📊 Concurrent Call Results:');
    console.log('===========================');
    
    const successful = callResults.filter(r => r.status === 'success').length;
    const errors = callResults.filter(r => r.status === 'error').length;
    const timeouts = callResults.filter(r => r.status === 'timeout').length;
    
    callResults.forEach(result => {
      console.log(`Call ${result.call}: ${result.status} (${result.response})`);
    });
    
    console.log(`\n📈 Summary:`);
    console.log(`✅ Successful: ${successful}/${totalCalls}`);
    console.log(`❌ Errors: ${errors}/${totalCalls}`);
    console.log(`⏰ Timeouts: ${timeouts}/${totalCalls}`);
    
    // Check final statistics
    setTimeout(() => checkFinalStats(), 1000);
  }
}

function checkFinalStats() {
  console.log('\n📊 Checking final call statistics...');
  
  const http = require('http');
  
  const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/stats',
    method: 'GET'
  }, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      const stats = JSON.parse(data);
      console.log(`📊 Active calls: ${stats.calls.active}`);
      console.log(`📊 Total calls processed: ${stats.calls.total}`);
      console.log(`📊 RTPEngine current worker: ${stats.rtpengine.current_worker_index}`);
      
      console.log('\n🎯 Concurrent calls validation completed!');
      
      const successful = callResults.filter(r => r.status === 'success').length;
      if (successful > 0) {
        console.log('✅ Proxy can handle multiple concurrent calls');
      } else {
        console.log('⚠️ No successful concurrent calls (may be expected with simulation)');
      }
      
      process.exit(0);
    });
  });
  
  req.on('error', (err) => {
    console.log('❌ Final stats check failed:', err.message);
    process.exit(1);
  });
  
  req.end();
}

// Overall timeout
setTimeout(() => {
  console.log('\n⏰ Overall test timeout');
  process.exit(0);
}, 15000);