#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Log for debugging
console.log('Current directory:', process.cwd());
console.log('Node version:', process.version);

// Ensure we have the required dependencies
try {
  console.log('Installing dependencies...');
  execSync('npm install --no-optional', { stdio: 'inherit' });
  console.log('Installing vite and plugin-react...');
  execSync('npm install vite@6.2.0 @vitejs/plugin-react@4.2.1', { stdio: 'inherit' });
  
  // Check if vite is installed properly
  try {
    const vitePath = require.resolve('vite');
    console.log('Vite found at:', vitePath);
  } catch (e) {
    console.error('Vite not found in node_modules. Installing globally...');
    execSync('npm install -g vite@6.2.0', { stdio: 'inherit' });
  }
  
  // Run the build directly with node API if possible, or fallback to CLI
  console.log('Running vite build...');
  try {
    // First try direct execution via npx
    execSync('npx -y vite build', { stdio: 'inherit' });
  } catch (error) {
    console.error('Error using npx vite build:', error.message);
    
    // Fallback to direct shell command
    console.log('Trying direct Vite execution...');
    try {
      execSync('./node_modules/.bin/vite build', { stdio: 'inherit' });
    } catch (shellError) {
      console.error('Error with direct vite execution:', shellError.message);
      
      // Last resort - create a simple build
      console.log('Falling back to manual build process...');
      if (!fs.existsSync('dist')) {
        fs.mkdirSync('dist', { recursive: true });
      }
      fs.copyFileSync('index.html', 'dist/index.html');
      throw new Error('Could not build using Vite. Check logs for details.');
    }
  }
  
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build process failed:', error.message);
  process.exit(1);
}
