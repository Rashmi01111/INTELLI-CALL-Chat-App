#!/usr/bin/env node

/**
 * Translator Configuration & Testing Script
 * Run this to verify your OpenAI API key and translator setup
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const __dirname = path.dirname(new URL(import.meta.url).pathname);

console.log(`
╔════════════════════════════════════════════════════════════╗
║     IntelliCall Translator Configuration Checker          ║
╚════════════════════════════════════════════════════════════╝
`);

// 1. Check .env file
console.log('📋 [Step 1] Checking .env configuration...');
const envPath = path.join(process.cwd(), '.env');
const envExamplePath = path.join(process.cwd(), '.env.example');

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    console.log('⚠️  .env file not found');
    console.log('   Creating .env from .env.example...');
    try {
      fs.copyFileSync(envExamplePath, envPath);
      console.log('✅ .env created (please add your API keys)');
    } catch (e) {
      console.error('❌ Failed to create .env:', e);
      process.exit(1);
    }
  } else {
    console.error('❌ .env and .env.example not found');
    process.exit(1);
  }
} else {
  console.log('✅ .env file found');
}

// 2. Check OpenAI API Key
console.log('\n🔑 [Step 2] Checking OpenAI API Key...');
const openaiKey = process.env.OPENAI_API_KEY;

if (!openaiKey) {
  console.error('❌ OPENAI_API_KEY is not set in .env');
  console.log(`
   To fix:
   1. Get your API key from: https://platform.openai.com/account/api-keys
   2. Add to .env: OPENAI_API_KEY=sk_test_your_key_here
   3. Restart the server
  `);
} else if (openaiKey.startsWith('sk_')) {
  const masked = openaiKey.slice(0, 10) + '...' + openaiKey.slice(-4);
  console.log(`✅ OpenAI API key found: ${masked}`);
} else {
  console.error('❌ OpenAI API key format invalid (should start with "sk_")');
}

// 3. Check OpenAI Model
console.log('\n🤖 [Step 3] Checking OpenAI Model...');
const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
console.log(`✅ Using model: ${model}`);
console.log(`   (Change in .env: OPENAI_MODEL=gpt-3.5-turbo or gpt-4)`);

// 4. Check Node environment
console.log('\n🛠️  [Step 4] Checking environment...');
console.log(`   Node version: ${process.version}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`   Port: ${process.env.PORT || 5000}`);

// 5. Check dependencies
console.log('\n📦 [Step 5] Checking required packages...');
const packageJsonPath = path.join(process.cwd(), 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const deps = packageJson.dependencies || {};
  
  const required = ['openai', 'express', 'mongoose'];
  const missing = required.filter(dep => !deps[dep]);
  
  if (missing.length === 0) {
    console.log(`✅ All required packages present`);
    console.log(`   - openai: ${deps['openai'] || 'unknown'}`);
    console.log(`   - express: ${deps['express'] || 'unknown'}`);
    console.log(`   - mongoose: ${deps['mongoose'] || 'unknown'}`);
  } else {
    console.error(`❌ Missing packages: ${missing.join(', ')}`);
    console.log('   Run: npm install');
  }
} else {
  console.error('❌ package.json not found');
}

// 6. Check translator files
console.log('\n📁 [Step 6] Checking translator files...');
const filesToCheck = [
  'server/services/translatorService.js',
  'server/routes/aiRoutes.js',
  'src/hooks/useCallTranslator.ts',
  'src/hooks/useStreamTranslator.ts',
  'src/utils/translationUtils.ts'
];

const missingFiles = [];
for (const file of filesToCheck) {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - MISSING`);
    missingFiles.push(file);
  }
}

// 7. Summary and recommendations
console.log(`
╔════════════════════════════════════════════════════════════╗
║                    Configuration Summary                   ║
╚════════════════════════════════════════════════════════════╝
`);

const hasApiKey = !!openaiKey && openaiKey.startsWith('sk_');
const allFilesPresent = missingFiles.length === 0;

if (hasApiKey && allFilesPresent) {
  console.log('✅ All systems ready!');
  console.log(`
Next steps:
1. Start the server: npm run dev
2. Test the translator endpoint:
   curl http://localhost:5000/api/ai/translate/health
3. Use translator in chat and calls
  `);
} else {
  console.log('⚠️  Some configuration needed:');
  
  if (!hasApiKey) {
    console.log(`
1. Add OpenAI API key:
   - Get from: https://platform.openai.com/account/api-keys
   - Add to .env: OPENAI_API_KEY=sk_test_...
   - Restart server after updating .env
    `);
  }
  
  if (missingFiles.length > 0) {
    console.log(`
2. Missing files detected. Run:
   npm install
   npm run dev
    `);
  }
}

console.log(`
📚 Documentation: TRANSLATOR_SETUP.md
🔗 API Docs: /api/ai/translate (POST)
💬 Translator uses: ${model}
`);

process.exit(hasApiKey && allFilesPresent ? 0 : 1);
