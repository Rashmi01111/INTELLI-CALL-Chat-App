const io = require('socket.io-client');

console.log('🔌 Testing socket connection to port 3011...');

const socket = io('http://localhost:3011', {
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ Connected to server with ID:', socket.id);
  
  // Test setup event
  socket.emit('setup', {
    _id: 'test-user-123',
    name: 'Test User',
    email: 'test@example.com',
    pic: 'https://example.com/avatar.jpg'
  });
  
  // Send test message after 2 seconds
  setTimeout(() => {
    console.log('📤 Sending test message...');
    socket.emit('new message', {
      id: 'test-msg-' + Date.now(),
      sender: { _id: 'test-user-123', name: 'Test User' },
      to: 'Global Chat',
      text: 'Test message from socket test',
      timestamp: new Date().toISOString()
    });
  }, 2000);
});

socket.on('connected', () => {
  console.log('✅ Setup confirmed by server');
});

socket.on('message received', (data) => {
  console.log('📨 Received message:', data);
});

socket.on('receive_message', (data) => {
  console.log('📨 Received message (receive_message):', data);
});

socket.on('online_users', (users) => {
  console.log('👥 Online users:', users);
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from server');
});

socket.on('connect_error', (err) => {
  console.error('❌ Connection error:', err.message);
});

// Auto disconnect after 10 seconds
setTimeout(() => {
  console.log('🔌 Test completed, disconnecting...');
  socket.disconnect();
}, 10000);
