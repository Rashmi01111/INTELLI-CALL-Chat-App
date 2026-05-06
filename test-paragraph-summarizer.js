/**
 * Test paragraph-based message summarizer API endpoint
 */

import http from 'http';

const testMessages = [
  {
    senderName: 'Alice',
    message: 'Hey everyone! How was your weekend?',
    createdAt: new Date('2024-01-15T10:00:00')
  },
  {
    senderName: 'Bob',
    message: 'It was great! I went hiking on Saturday and watched movies on Sunday.',
    createdAt: new Date('2024-01-15T10:05:00')
  },
  {
    senderName: 'Charlie',
    message: 'Sounds fun! I was working on a new project. Did you finish that report?',
    createdAt: new Date('2024-01-15T10:10:00')
  },
  {
    senderName: 'Alice',
    message: 'Yes! I submitted it on Friday. The client loved the design proposals.',
    createdAt: new Date('2024-01-15T10:15:00')
  },
  {
    senderName: 'Bob',
    message: 'Congratulations! We should celebrate this week. Maybe dinner on Thursday?',
    createdAt: new Date('2024-01-15T10:20:00')
  },
  {
    senderName: 'Charlie',
    message: 'Perfect! I can book that restaurant we talked about last month.',
    createdAt: new Date('2024-01-15T10:25:00')
  },
  {
    senderName: 'Alice',
    message: 'Excellent! I\'ll be there. Should we meet at 7pm?',
    createdAt: new Date('2024-01-15T10:30:00')
  }
];

const testData = {
  messages: testMessages,
  chatId: 'test-chat-123',
  userId: 'test-user-456'
};

const postData = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 3013,
  path: '/api/ai/paragraph-summarize',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🧪 Testing Paragraph Summarizer API Endpoint...');
console.log('Request:', postData);

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
    try {
      const parsed = JSON.parse(data);
      console.log('✅ Paragraph Summary Result:');
      console.log('📄 Summary:', parsed.summary);
      console.log('📊 Message Count:', parsed.messageCount);
      console.log('📝 Type:', parsed.type);
    } catch (e) {
      console.log('❌ Invalid JSON response');
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Request error: ${e.message}`);
});

req.write(postData);
req.end();
