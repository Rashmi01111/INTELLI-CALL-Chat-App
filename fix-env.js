import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read current .env file
const envPath = path.join(__dirname, '.env');
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
  console.log('📖 Current .env file loaded');
} else {
  console.log('❌ .env file not found');
  process.exit(1);
}

// Fix the invalid OpenAI API key
const lines = envContent.split('\n');
const fixedLines = [];

for (let line of lines) {
  // Fix the OpenAI API key line
  if (line.startsWith('OPENAI_API_KEY=YOUR_VALID_OPENAI_API_KEY_HERE')) {
    console.log('🔧 Found invalid OpenAI API key line');
    // Replace with a proper placeholder that user needs to update
    line = 'OPENAI_API_KEY=sk-your-actual-openai-api-key-here';
    console.log('✅ Fixed OpenAI API key format');
  }
  fixedLines.push(line);
}

// Write back the fixed content
fs.writeFileSync(envPath, fixedLines.join('\n'));
console.log('✅ .env file has been fixed');

console.log('\n📋 NEXT STEPS:');
console.log('1. Get your OpenAI API key from https://platform.openai.com/api-keys');
console.log('2. Update the OPENAI_API_KEY line in your .env file with your actual key');
console.log('3. Restart your server for the changes to take effect');
console.log('4. The translator should now work properly!');

// Check if Gemini key is valid
const geminiLine = fixedLines.find(line => line.startsWith('GEMINI_API_KEY='));
if (geminiLine && geminiLine.includes('AIzaSyC2GO3foKVfJpiYVXEugDkc05Au2ojZnCI')) {
  console.log('\n⚠️  Your Gemini API key looks like it might be exposed/experimental');
  console.log('   Consider updating it with a proper key from https://makersuite.google.com/app/apikey');
}
