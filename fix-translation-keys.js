import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Fixing Translation API Keys...');
console.log('='.repeat(50));

// Read current .env file
const envPath = path.join(__dirname, '.env');
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
  console.log('✅ .env file found');
} else {
  console.log('❌ .env file not found');
  process.exit(1);
}

// Fix API keys
const lines = envContent.split('\n');
const fixedLines = [];
let hasGeminiKey = false;
let hasOpenAIKey = false;

for (let line of lines) {
  // Fix Gemini API key
  if (line.startsWith('GEMINI_API_KEY=')) {
    const currentKey = line.split('=')[1];
    if (currentKey && currentKey.length > 50 && !currentKey.includes('your-actual')) {
      console.log('✅ Gemini API key is properly set');
      hasGeminiKey = true;
      fixedLines.push(line);
    } else {
      console.log('⚠️  Setting up Gemini API key placeholder');
      fixedLines.push('GEMINI_API_KEY=AIzaSyCxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
    }
  }
  // Fix OpenAI API key
  else if (line.startsWith('OPENAI_API_KEY=')) {
    const currentKey = line.split('=')[1];
    if (currentKey && currentKey.length > 50 && !currentKey.includes('your-actual')) {
      console.log('✅ OpenAI API key is properly set');
      hasOpenAIKey = true;
      fixedLines.push(line);
    } else {
      console.log('⚠️  Setting up OpenAI API key placeholder');
      fixedLines.push('OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
    }
  }
  else {
    fixedLines.push(line);
  }
}

// Write back the fixed content
fs.writeFileSync(envPath, fixedLines.join('\n'));

console.log('');
console.log('📋 Translation API Status:');
console.log(`   Gemini API: ${hasGeminiKey ? '✅ Configured' : '❌ Needs setup'}`);
console.log(`   OpenAI API: ${hasOpenAIKey ? '✅ Configured' : '❌ Needs setup'}`);
console.log('');

if (!hasGeminiKey || !hasOpenAIKey) {
  console.log('🔑 To get working API keys:');
  console.log('');
  console.log('1. Google Gemini API:');
  console.log('   - Go to: https://makersuite.google.com/app/apikey');
  console.log('   - Create new API key');
  console.log('   - Update GEMINI_API_KEY in .env file');
  console.log('');
  console.log('2. OpenAI API:');
  console.log('   - Go to: https://platform.openai.com/api-keys');
  console.log('   - Create new API key');
  console.log('   - Update OPENAI_API_KEY in .env file');
  console.log('');
  console.log('3. Restart server after updating keys');
} else {
  console.log('✅ Both API keys are configured!');
  console.log('🚀 Translation should work now');
}

console.log('');
console.log('🔍 Quick test command:');
console.log('curl http://localhost:5000/api/ai/translate/health');
console.log('');
console.log('✨ Key fixing complete!');
