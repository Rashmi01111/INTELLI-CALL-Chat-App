// Simple test script to verify friend request endpoints
const testEndpoints = async () => {
  const baseUrl = 'http://localhost:3009';
  
  console.log('Testing friend request endpoints...');
  
  // Test 1: Cancel endpoint exists
  try {
    const response = await fetch(`${baseUrl}/api/friends/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: 'test123' })
    });
    
    const data = await response.json();
    console.log('✅ Cancel endpoint working:', response.status, data.message);
  } catch (error) {
    console.log('❌ Cancel endpoint error:', error.message);
  }
  
  // Test 2: Restore endpoint exists
  try {
    const response = await fetch(`${baseUrl}/api/friends/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: 'test123' })
    });
    
    const data = await response.json();
    console.log('✅ Restore endpoint working:', response.status, data.message);
  } catch (error) {
    console.log('❌ Restore endpoint error:', error.message);
  }
};

testEndpoints();
