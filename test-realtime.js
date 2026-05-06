// Real-time test script for IntelliCall
// Run this in browser console to test real-time messaging without reload

console.log('🧪 Starting Real-Time Test...');

// Test 1: Check Socket Connection
function testSocketConnection() {
  return new Promise((resolve) => {
    const maxWait = 5000;
    const startTime = Date.now();
    
    const checkConnection = () => {
      if (window.socket && window.socket.connected) {
        console.log('✅ Socket connected successfully');
        resolve(true);
      } else if (Date.now() - startTime > maxWait) {
        console.log('❌ Socket connection timeout');
        resolve(false);
      } else {
        setTimeout(checkConnection, 100);
      }
    };
    
    checkConnection();
  });
}

// Test 2: Send Test Message
function sendTestMessage() {
  if (!window.socket || !window.socket.connected) {
    console.log('❌ Socket not connected');
    return false;
  }
  
  const testMessage = {
    id: 'test-' + Date.now(),
    user: window.currentUser?.name || 'Test User',
    text: '🧪 Real-time test message - ' + new Date().toLocaleTimeString(),
    timestamp: new Date().toISOString(),
    to: 'Global Chat'
  };
  
  console.log('📤 Sending test message:', testMessage);
  window.socket.emit('new message', testMessage);
  return true;
}

// Test 3: Listen for Messages
function setupMessageListener() {
  if (!window.socket) {
    console.log('❌ Socket not available');
    return;
  }
  
  let messageCount = 0;
  const startTime = Date.now();
  
  window.socket.on('message received', (message) => {
    if (message.text && message.text.includes('🧪 Real-time test')) {
      messageCount++;
      const elapsed = Date.now() - startTime;
      console.log(`📨 Test message ${messageCount} received in ${elapsed}ms:`, message);
      
      if (messageCount >= 2) {
        console.log('✅ Real-time test completed successfully!');
        console.log(`📊 Received ${messageCount} messages without page reload`);
      }
    }
  });
  
  window.socket.on('receive_message', (message) => {
    if (message.text && message.text.includes('🧪 Real-time test')) {
      messageCount++;
      const elapsed = Date.now() - startTime;
      console.log(`📨 Test message ${messageCount} received via receive_message in ${elapsed}ms:`, message);
    }
  });
}

// Run all tests
async function runRealTimeTest() {
  console.log('🚀 Testing Real-Time Messaging Without Reload...');
  
  // Wait for user data
  if (!window.currentUser) {
    console.log('⏳ Waiting for user data...');
    setTimeout(() => runRealTimeTest(), 1000);
    return;
  }
  
  const connected = await testSocketConnection();
  if (!connected) {
    console.log('❌ Real-time test failed: Socket not connected');
    return;
  }
  
  setupMessageListener();
  
  // Send test messages
  setTimeout(() => {
    console.log('📤 Sending first test message...');
    sendTestMessage();
  }, 1000);
  
  setTimeout(() => {
    console.log('📤 Sending second test message...');
    sendTestMessage();
  }, 2000);
  
  console.log('⏳ Waiting for real-time messages...');
}

// Auto-start test
setTimeout(runRealTimeTest, 2000);

// Manual test functions
window.testRealTime = {
  sendTestMessage,
  testSocketConnection,
  runRealTimeTest
};

console.log('🎯 Test functions available in window.testRealTime');
