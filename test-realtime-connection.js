/**
 * Test real-time Socket.IO connection
 */

import { io } from 'socket.io-client';

console.log('🔌 Testing Socket.IO Connection...');

// Connect to the server
const socket = io('http://localhost:3009', {
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ Connected to Socket.IO server!');
  console.log(`   Socket ID: ${socket.id}`);
  console.log(`   Connected: ${socket.connected}`);
  
  // Test joining a room
  socket.emit('join-room', 'test-room');
  console.log('📢 Joined test room');
  
  // Test sending a message
  socket.emit('chat-message', {
    id: Date.now().toString(),
    user: 'Test User',
    text: 'Hello from test!',
    timestamp: new Date().toISOString(),
    roomId: 'test-room'
  });
  console.log('💬 Sent test message');
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from Socket.IO server');
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
});

socket.on('message-received', (data) => {
  console.log('📨 Received message:', data);
});

socket.on('user-typing', (data) => {
  console.log('⌨️ User typing:', data);
});

// Close connection after 5 seconds
setTimeout(() => {
  if (socket.connected) {
    socket.disconnect();
    console.log('🔌 Test completed - connection closed');
  }
}, 5000);
