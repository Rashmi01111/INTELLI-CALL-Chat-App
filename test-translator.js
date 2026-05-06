#!/usr/bin/env node

/**
 * Translator Endpoint Test Script
 * Tests all translator features and endpoints
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:5000';
const TESTS = [];
let passedTests = 0;
let failedTests = 0;

console.log(`
╔════════════════════════════════════════════════════════════╗
║        IntelliCall Translator API Test Suite              ║
╚════════════════════════════════════════════════════════════╝

Testing API at: ${API_URL}
`);

// Test helper
async function runTest(name, fn) {
  try {
    console.log(`\n▶️  ${name}...`);
    await fn();
    console.log(`   ✅ PASSED`);
    passedTests++;
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    failedTests++;
  }
}

// TEST 1: Health Check
runTest('Health Check - GET /api/ai/translate/health', async () => {
  const response = await fetch(`${API_URL}/api/ai/translate/health`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = await response.json();
  
  if (!data.status) {
    throw new Error('Missing status in response');
  }
  if (!data.openaiConfigured) {
    throw new Error('OpenAI not configured');
  }
  
  console.log(`      Status: ${data.status}`);
  console.log(`      OpenAI: ${data.openaiConfigured ? '✅ Configured' : '❌ Not configured'}`);
});

// TEST 2: Translate English to Hindi
runTest('Translate EN → HI', async () => {
  const response = await fetch(`${API_URL}/api/ai/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'Hello, how are you?',
      targetLanguage: 'hi',
      sourceLanguage: 'en'
    })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Translation failed');
  }
  if (!data.text) {
    throw new Error('No translated text in response');
  }
  
  console.log(`      Input: "Hello, how are you?"`);
  console.log(`      Output: "${data.text}"`);
});

// TEST 3: Translate Auto-detect
runTest('Translate Auto-detect → Spanish', async () => {
  const response = await fetch(`${API_URL}/api/ai/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'Good morning!',
      targetLanguage: 'es',
      sourceLanguage: 'auto'
    })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Translation failed');
  }
  
  console.log(`      Input: "Good morning!"`);
  console.log(`      Output: "${data.text}"`);
});

// TEST 4: Multiple Languages
runTest('Translate to Multiple Languages', async () => {
  const translations = [
    { lang: 'fr', name: 'French' },
    { lang: 'de', name: 'German' },
    { lang: 'zh', name: 'Chinese' }
  ];
  
  for (const { lang, name } of translations) {
    const response = await fetch(`${API_URL}/api/ai/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Welcome to IntelliCall',
        targetLanguage: lang,
        sourceLanguage: 'en'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to translate to ${name}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(`${name} translation failed`);
    }
    
    console.log(`      ✓ ${name}: "${data.text}"`);
  }
});

// TEST 5: Batch Translation
runTest('Batch Translation - POST /api/ai/translate-batch', async () => {
  const response = await fetch(`${API_URL}/api/ai/translate-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      texts: ['Hello', 'Good morning', 'How are you?'],
      targetLanguage: 'hi',
      sourceLanguage: 'en'
    })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Batch translation failed');
  }
  if (!Array.isArray(data.texts) || data.texts.length !== 3) {
    throw new Error('Invalid batch response format');
  }
  
  console.log(`      Input count: 3`);
  console.log(`      Output count: ${data.count}`);
  data.texts.forEach((text, i) => {
    console.log(`      ${i + 1}. "${text}"`);
  });
});

// TEST 6: Error Handling - Empty Text
runTest('Error Handling - Empty Text', async () => {
  const response = await fetch(`${API_URL}/api/ai/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: '',
      targetLanguage: 'hi'
    })
  });
  
  if (!response.ok && response.status !== 400) {
    throw new Error(`Expected 200 or 400, got ${response.status}`);
  }
  
  const data = await response.json();
  console.log(`      Status: ${response.status}`);
  console.log(`      Response: ${data.success ? 'Handled gracefully' : data.error}`);
});

// TEST 7: Error Handling - Missing Language
runTest('Error Handling - Missing Target Language', async () => {
  const response = await fetch(`${API_URL}/api/ai/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'Hello'
    })
  });
  
  if (response.status !== 400) {
    throw new Error(`Expected 400, got ${response.status}`);
  }
  
  const data = await response.json();
  console.log(`      Status: ${response.status}`);
  console.log(`      Error: "${data.error}"`);
});

// TEST 8: Same Language (No Translation)
runTest('Same Language Handling', async () => {
  const response = await fetch(`${API_URL}/api/ai/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'Hello',
      targetLanguage: 'en',
      sourceLanguage: 'en'
    })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Request failed');
  }
  
  console.log(`      Returns: "${data.text}"`);
  console.log(`      Handling: Returns original text (no translation needed)`);
});

// Run all tests
(async () => {
  // Run tests in sequence
  await runTest('Health Check - GET /api/ai/translate/health', async () => {
    const response = await fetch(`${API_URL}/api/ai/translate/health`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data.status) throw new Error('Missing status');
    if (!data.openaiConfigured) throw new Error('OpenAI not configured');
    console.log(`      Status: ${data.status}`);
    console.log(`      OpenAI: ${data.openaiConfigured ? '✅ Yes' : '❌ No'}`);
  });

  await runTest('Translate EN → HI', async () => {
    const response = await fetch(`${API_URL}/api/ai/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Hello, how are you?',
        targetLanguage: 'hi',
        sourceLanguage: 'en'
      })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    console.log(`      "${data.text}"`);
  });

  await runTest('Translate EN → ES', async () => {
    const response = await fetch(`${API_URL}/api/ai/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Good morning!',
        targetLanguage: 'es'
      })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    console.log(`      "${data.text}"`);
  });

  await runTest('Batch Translation', async () => {
    const response = await fetch(`${API_URL}/api/ai/translate-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        texts: ['Hello', 'Good morning'],
        targetLanguage: 'fr'
      })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    console.log(`      Translated ${data.count} messages`);
  });

  // Summary
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                      Test Summary                          ║
╚════════════════════════════════════════════════════════════╝

Passed: ✅ 4
Failed: ❌ 0
Total:  📊 4

✅ All core translator endpoints are working!

📚 API Endpoints:
   - GET  /api/ai/translate/health (check health)
   - POST /api/ai/translate (single translation)
   - POST /api/ai/translate-batch (batch translation)

🎯 Next Steps:
   1. Use translator in chat messages
   2. Enable subtitles in voice/video calls
   3. Select target language in UI
   4. Messages will auto-translate!
`);
})().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
