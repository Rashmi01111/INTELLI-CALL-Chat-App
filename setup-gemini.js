import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Setting up Google Gemini API for Translation...');
console.log('='.repeat(50));

// Read current .env file
const envPath = path.join(__dirname, '.env');
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
  console.log('✅ .env file found');
} else {
  console.log('❌ .env file not found. Please create one from .env.template');
  process.exit(1);
}

// Check if Gemini API key is set
const lines = envContent.split('\n');
let geminiKeySet = false;
let updatedLines = [];

for (let line of lines) {
  if (line.startsWith('GEMINI_API_KEY=')) {
    const currentKey = line.split('=')[1];
    if (!currentKey || currentKey.includes('your-actual-gemini-api-key-here') || currentKey.includes('AIzaSyC-your-actual-gemini-api-key-here')) {
      console.log('⚠️  Gemini API key needs to be updated');
      console.log('📝 Please get your API key from: https://makersuite.google.com/app/apikey');
      console.log('🔑 Then update the GEMINI_API_KEY line in your .env file');
      console.log('');
      console.log('Example format:');
      console.log('GEMINI_API_KEY=AIzaSyCxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
      console.log('');
      console.log('For now, keeping the placeholder...');
      updatedLines.push(line);
    } else {
      console.log('✅ Gemini API key is set');
      geminiKeySet = true;
      updatedLines.push(line);
    }
  } else {
    updatedLines.push(line);
  }
}

// Write back the content (even if unchanged)
fs.writeFileSync(envPath, updatedLines.join('\n'));

console.log('');
console.log('🌐 Translation Service Configuration:');
console.log('- Primary Service: Google Gemini');
console.log('- Fallback Service: OpenAI (if available)');
console.log('- Endpoint: /api/ai/translate');
console.log('');

if (geminiKeySet) {
  console.log('✅ Gemini API key is configured!');
  console.log('🚀 Translation features ready:');
  console.log('   • Input message translation');
  console.log('   • Message translator feature');
  console.log('   • Video call subtitles');
  console.log('   • Voice call subtitles');
  console.log('');
  console.log('📋 Features using Gemini:');
  console.log('   • Real-time speech translation');
  console.log('   • Batch message translation');
  console.log('   • Auto-translation for incoming messages');
  console.log('   • Manual message translation');
  console.log('   • Call subtitle translation');
} else {
  console.log('⚠️  Gemini API key needs to be configured');
  console.log('📋 Steps to complete setup:');
  console.log('1. Get API key from https://makersuite.google.com/app/apikey');
  console.log('2. Update GEMINI_API_KEY in .env file');
  console.log('3. Restart the server');
  console.log('4. Test translation features');
}

console.log('');
console.log('🔍 Testing translation service health...');
console.log('Run this command after starting the server:');
console.log('curl http://localhost:5000/api/ai/translate/health');
console.log('');
console.log('✨ Setup complete!');
