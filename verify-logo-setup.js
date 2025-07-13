import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Verifying Logo Setup...\n');

// Check if logo files exist
const publicDir = path.join(__dirname, 'public');
const logoFiles = ['logo.svg', 'quits-logo.svg'];

console.log('📁 Checking logo files in public directory:');
logoFiles.forEach(file => {
  const filePath = path.join(publicDir, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`✅ ${file} - ${stats.size} bytes`);
  } else {
    console.log(`❌ ${file} - MISSING`);
  }
});

// Check if dist directory exists and has logo files
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  console.log('\n📦 Checking logo files in dist directory:');
  logoFiles.forEach(file => {
    const filePath = path.join(distDir, file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`✅ ${file} - ${stats.size} bytes`);
    } else {
      console.log(`❌ ${file} - MISSING`);
    }
  });
} else {
  console.log('\n📦 Dist directory not found - run build first');
}

// Check if hook files exist
const srcDir = path.join(__dirname, 'src');
const hookFiles = [
  'hooks/useLogo.ts',
  'utils/logoUtils.ts'
];

console.log('\n🔧 Checking hook and utility files:');
hookFiles.forEach(file => {
  const filePath = path.join(srcDir, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`✅ ${file} - ${stats.size} bytes`);
  } else {
    console.log(`❌ ${file} - MISSING`);
  }
});

// Check configuration files
const configFiles = [
  'vite.config.ts',
  'vercel.json',
  '_redirects'
];

console.log('\n⚙️ Checking configuration files:');
configFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`✅ ${file} - ${stats.size} bytes`);
  } else {
    console.log(`❌ ${file} - MISSING`);
  }
});

console.log('\n🎉 Logo setup verification complete!');
console.log('\nTo test the setup:');
console.log('1. Run: npm run dev');
console.log('2. Open: http://localhost:5173');
console.log('3. Check the sidebar and header for logos');
console.log('4. Open: http://localhost:5173/test-logo-loading.html for detailed testing'); 