#!/usr/bin/env node

// This script verifies that Vite is installed correctly
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Verifying Vite installation...');

try {
  // Check node_modules directory
  console.log('Checking node_modules directory...');
  if (!fs.existsSync('node_modules')) {
    console.log('node_modules not found. Installing dependencies...');
    execSync('npm install --verbose', { stdio: 'inherit' });
  }

  // Check if vite exists in node_modules
  const vitePath = path.join(process.cwd(), 'node_modules', 'vite');
  const viteBin = path.join(vitePath, 'bin', 'vite.js');
  
  console.log('Checking for Vite in node_modules...');
  if (!fs.existsSync(vitePath)) {
    console.log('Vite not found in node_modules. Installing Vite specifically...');
    execSync('npm install --verbose vite@6.2.0', { stdio: 'inherit' });
  }
  
  console.log('Checking for Vite binary...');
  if (fs.existsSync(viteBin)) {
    console.log('Vite binary found at:', viteBin);
  } else {
    console.log('Vite binary not found at expected location:', viteBin);
    console.log('Contents of vite directory:', fs.readdirSync(vitePath));
    
    // Look for bin directory
    const binDir = path.join(vitePath, 'bin');
    if (fs.existsSync(binDir)) {
      console.log('Contents of bin directory:', fs.readdirSync(binDir));
    } else {
      console.log('bin directory not found in vite package');
    }
  }
  
  // Check node_modules/.bin directory
  const binDir = path.join(process.cwd(), 'node_modules', '.bin');
  if (fs.existsSync(binDir)) {
    console.log('Contents of node_modules/.bin directory:', fs.readdirSync(binDir));
  } else {
    console.log('node_modules/.bin directory not found');
  }
  
  // Verify vite is available in PATH
  try {
    console.log('Trying to execute vite from PATH...');
    execSync('which vite', { stdio: 'inherit' });
  } catch (error) {
    console.log('Vite not found in PATH');
  }
  
  console.log('Verification complete!');
} catch (error) {
  console.error('Error during verification:', error.message);
}
