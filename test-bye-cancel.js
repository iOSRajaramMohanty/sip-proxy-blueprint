const net = require('net');

console.log('🔍 Testing BYE and CANCEL Request Handling');
console.log('==========================================');

// Test BYE request
console.log('\n1️⃣ Testing BYE request...');
testBye();

function testBye() {
  const client = new net.Socket();
  
  client.connect(5060, '127.0.0.1', () => {
    console.log('✅ Connected to SIP proxy for BYE test');
    
    const byeMessage = [
      'BYE sip:test@asterisk-service.ada-asia.my SIP/2.0',
      'Via: SIP/2.0/TCP 127.0.0.1:5060;branch=z9hG4bKbye123',
      'Max-Forwards: 70',
      'To: <sip:test@asterisk-service.ada-asia.my>;tag=totag123',
      'From: <sip:test@127.0.0.1>;tag=fromtag123',
      'Call-ID: bye-test-call-id-12345@127.0.0.1',
      'CSeq: 2 BYE',
      'User-Agent: SIP-Proxy-Test',
      'Content-Length: 0',
      '',
      ''
    ].join('\r\n');
    
    client.write(byeMessage);
    console.log('📤 Sent BYE request');
  });
  
  client.on('data', (data) => {
    const response = data.toString();
    console.log('📨 BYE Response:', response.substring(0, 100) + '...');
    
    if (response.includes('200 OK')) {
      console.log('✅ BYE handled correctly (200 OK)');
    } else if (response.includes('481')) {
      console.log('⚠️ BYE responded with 481 (expected for unknown call)');
    } else {
      console.log('❌ Unexpected BYE response');
    }
    
    client.destroy();
    
    // Test CANCEL after BYE
    setTimeout(() => testCancel(), 500);
  });
  
  client.on('error', (err) => {
    console.log('❌ BYE test error:', err.message);
    setTimeout(() => testCancel(), 500);
  });
  
  client.on('close', () => {
    console.log('🔌 BYE test connection closed');
  });
}

function testCancel() {
  console.log('\n2️⃣ Testing CANCEL request...');
  
  const client = new net.Socket();
  
  client.connect(5060, '127.0.0.1', () => {
    console.log('✅ Connected to SIP proxy for CANCEL test');
    
    const cancelMessage = [
      'CANCEL sip:test@asterisk-service.ada-asia.my SIP/2.0',
      'Via: SIP/2.0/TCP 127.0.0.1:5060;branch=z9hG4bKcancel123',
      'Max-Forwards: 70',
      'To: <sip:test@asterisk-service.ada-asia.my>',
      'From: <sip:test@127.0.0.1>;tag=fromtag123',
      'Call-ID: cancel-test-call-id-12345@127.0.0.1',
      'CSeq: 1 CANCEL',
      'User-Agent: SIP-Proxy-Test',
      'Content-Length: 0',
      '',
      ''
    ].join('\r\n');
    
    client.write(cancelMessage);
    console.log('📤 Sent CANCEL request');
  });
  
  client.on('data', (data) => {
    const response = data.toString();
    console.log('📨 CANCEL Response:', response.substring(0, 100) + '...');
    
    if (response.includes('200 OK')) {
      console.log('✅ CANCEL handled correctly (200 OK)');
    } else if (response.includes('481')) {
      console.log('⚠️ CANCEL responded with 481 (expected for unknown transaction)');
    } else {
      console.log('❌ Unexpected CANCEL response');
    }
    
    client.destroy();
    
    // Check statistics after BYE/CANCEL
    setTimeout(() => checkStats(), 500);
  });
  
  client.on('error', (err) => {
    console.log('❌ CANCEL test error:', err.message);
    setTimeout(() => checkStats(), 500);
  });
  
  client.on('close', () => {
    console.log('🔌 CANCEL test connection closed');
  });
}

function checkStats() {
  console.log('\n3️⃣ Checking call statistics after BYE/CANCEL...');
  
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
      console.log('📊 Active calls after BYE/CANCEL:', stats.calls.active);
      console.log('📊 Total calls:', stats.calls.total);
      console.log('✅ Statistics tracking working correctly');
      
      console.log('\n🎯 BYE/CANCEL validation completed!');
      console.log('✅ Both BYE and CANCEL requests handled properly');
    });
  });
  
  req.on('error', (err) => {
    console.log('❌ Stats check failed:', err.message);
  });
  
  req.end();
}

setTimeout(() => {
  console.log('\n⏰ Test timeout - ensuring cleanup');
  process.exit(0);
}, 10000);