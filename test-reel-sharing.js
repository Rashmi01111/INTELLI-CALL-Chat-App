// Reel Sharing Test Script
// Run this in browser console to test reel sharing functionality

console.log('🧪 Starting Reel Sharing Test...');

// Test reel sharing function
function testReelSharing() {
  // Check if we have a user and socket connection
  if (!window.currentUser) {
    console.log('❌ No user found. Please login first.');
    return;
  }
  
  if (!window.socket || !window.socket.connected) {
    console.log('❌ Socket not connected. Please check connection.');
    return;
  }
  
  // Find a test reel (you need to have at least one reel)
  const testReel = {
    _id: 'test-reel-' + Date.now(),
    caption: 'Test Reel for Sharing',
    mediaUrl: 'https://picsum.photos/seed/test/400/300.jpg',
    mediaType: 'image',
    createdBy: window.currentUser._id,
    createdByName: window.currentUser.name
  };
  
  console.log('📸 Testing reel sharing with:', testReel);
  
  // Test 1: Share to Global Chat
  console.log('🌍 Testing share to global chat...');
  
  // Test 2: Share to Friend (if friends available)
  if (window.friends && window.friends.length > 0) {
    const testFriend = window.friends[0];
    console.log('👥 Testing share to friend:', testFriend.name);
    
    // Simulate sharing to friend
    if (window.selectedUser) {
      window.shareReelToChat(testReel);
    } else {
      console.log('⚠️ No friend selected. Please select a friend first.');
    }
  } else {
    console.log('⚠️ No friends available for testing.');
  }
  
  // Test 3: Share to Group (if groups available)
  if (window.groups && window.groups.length > 0) {
    const testGroup = window.groups[0];
    console.log('👥 Testing share to group:', testGroup.name);
    
    // Simulate sharing to group
    if (window.selectedGroup) {
      window.shareReelToChat(testReel);
    } else {
      console.log('⚠️ No group selected. Please select a group first.');
    }
  } else {
    console.log('⚠️ No groups available for testing.');
  }
  
  console.log('✅ Reel sharing test initiated!');
}

// Monitor reel sharing events
function monitorReelSharing() {
  if (!window.socket) {
    console.log('❌ Socket not available');
    return;
  }
  
  // Listen for reel sharing confirmation
  window.socket.on('reel_shared_confirmation', (data) => {
    console.log('🎉 Reel sharing confirmed:', data);
  });
  
  // Listen for reel sharing errors
  window.socket.on('share_error', (data) => {
    console.error('❌ Reel sharing error:', data);
  });
  
  // Listen for incoming shared reels
  window.socket.on('message received', (message) => {
    if (message.text && message.text.includes('📸 Reel:')) {
      console.log('📨 Received shared reel:', message);
    }
  });
  
  window.socket.on('receive_message', (message) => {
    if (message.text && message.text.includes('📸 Reel:')) {
      console.log('📨 Received shared reel (receive_message):', message);
    }
  });
  
  console.log('👂 Started monitoring reel sharing events...');
}

// Manual test functions
window.testReelSharing = {
  testReelSharing,
  monitorReelSharing
};

// Auto-start monitoring
monitorReelSharing();

console.log('🎯 Reel sharing test functions available in window.testReelSharing');
console.log('💡 Run window.testReelSharing.testReelSharing() to test');
