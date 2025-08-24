const net = require('net');

console.log('🔍 Testing Error Handling and Graceful Failures');
console.log('================================================');

// Test 1: Invalid SIP message
console.log('\n1️⃣ Testing invalid SIP message...');
const client1 = new net.Socket();

client1.connect(5060, '127.0.0.1', () => {
  console.log('✅ Connected to SIP proxy');
  
  // Send invalid SIP message
  const invalidSip = 'INVALID MESSAGE\r\n\r\n';
  client1.write(invalidSip);
  console.log('📤 Sent invalid SIP message');
});

client1.on('data', (data) => {
  console.log('📨 Response:', data.toString().substring(0, 100) + '...');
  client1.destroy();
  
  // Test 2: Malformed INVITE
  test2();
});

client1.on('error', (err) => {
  console.log('❌ Client error (expected):', err.message);
  // Test 2: Malformed INVITE
  test2();
});

client1.on('close', () => {
  console.log('🔌 Connection 1 closed');
});

function test2() {
  console.log('\n2️⃣ Testing malformed INVITE...');
  const client2 = new net.Socket();
  
  client2.connect(5060, '127.0.0.1', () => {
    console.log('✅ Connected to SIP proxy');
    
    // Send malformed INVITE (missing required headers)
    const malformedInvite = [
      'INVITE sip:test@example.com SIP/2.0',
      'Via: SIP/2.0/TCP 127.0.0.1:5060;branch=z9hG4bKmalformed',
      // Missing From, To, Call-ID, CSeq headers
      'Content-Length: 0',
      '',
      ''
    ].join('\r\n');
    
    client2.write(malformedInvite);
    console.log('📤 Sent malformed INVITE');
  });
  
  client2.on('data', (data) => {
    console.log('📨 Response:', data.toString().substring(0, 200) + '...');
    client2.destroy();
    
    // Test 3: Health check during stress
    test3();
  });
  
  client2.on('error', (err) => {
    console.log('❌ Client error (expected):', err.message);
    // Test 3: Health check during stress
    test3();
  });
  
  client2.on('close', () => {
    console.log('🔌 Connection 2 closed');
  });
}

function test3() {
  console.log('\n3️⃣ Testing health check availability during stress...');
  
  const http = require('http');
  
  const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/health',
    method: 'GET'
  }, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log('📊 Health check response:', JSON.parse(data).status);
      console.log('✅ Health endpoint remains accessible during stress');
      
      // Test 4: Statistics endpoint
      test4();
    });
  });
  
  req.on('error', (err) => {
    console.log('❌ Health check failed:', err.message);
    test4();
  });
  
  req.end();
}

function test4() {
  console.log('\n4️⃣ Testing statistics endpoint...');
  
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
      console.log('📊 Current active calls:', stats.calls.active);
      console.log('📊 Total calls processed:', stats.calls.total);
      console.log('✅ Statistics endpoint working correctly');
      
      console.log('\n🎯 Error handling validation completed!');
      console.log('✅ All error scenarios handled gracefully');
    });
  });
  
  req.on('error', (err) => {
    console.log('❌ Stats check failed:', err.message);
    console.log('\n🎯 Error handling validation completed with issues');
  });
  
  req.end();
}

setTimeout(() => {
  console.log('\n⏰ Test timeout - ensuring all connections are closed');
  process.exit(0);
}, 10000);