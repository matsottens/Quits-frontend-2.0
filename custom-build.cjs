#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

console.log('Starting custom build process...');
console.log('Node version:', process.version);
console.log('Working directory:', process.cwd());

try {
  // Install dependencies
  console.log('Installing dependencies...');
  execSync('npm install --verbose --legacy-peer-deps', { stdio: 'inherit' });
  
  // Install vite explicitly
  console.log('Installing vite explicitly...');
  execSync('npm install --verbose --no-save vite@6.2.0 @vitejs/plugin-react@4.2.1', { stdio: 'inherit' });
  
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  const vitePath = path.join(nodeModulesPath, 'vite');
  
  if (!fs.existsSync(vitePath)) {
    console.error('Vite package not found after installation!');
    console.log('Contents of node_modules:', fs.readdirSync(nodeModulesPath));
    throw new Error('Vite installation failed');
  }
  
  console.log('Vite package found at:', vitePath);
  
  // Try the direct file path approach first
  console.log('Finding Vite binary location...');
  let viteBinaryPath = '';
  
  // Look for the vite.js file in various possible locations
  const possiblePaths = [
    path.join(vitePath, 'bin', 'vite.js'),
    path.join(nodeModulesPath, '.bin', 'vite'),
    path.join(vitePath, 'dist', 'cli.js'),
    path.join(vitePath, 'cli.js')
  ];
  
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      viteBinaryPath = possiblePath;
      console.log('Found Vite binary at:', viteBinaryPath);
      break;
    }
  }
  
  if (!viteBinaryPath) {
    console.log('Vite binary not found in expected locations');
    console.log('Listing vite package contents:', fs.readdirSync(vitePath));
    
    // Try to find by scanning directories
    const findViteFiles = (dir, depth = 0) => {
      if (depth > 3) return []; // Limit recursion
      
      let results = [];
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          results = results.concat(findViteFiles(fullPath, depth + 1));
        } else if (file === 'vite.js' || file === 'cli.js') {
          results.push(fullPath);
        }
      }
      
      return results;
    };
    
    const foundFiles = findViteFiles(vitePath);
    console.log('Found potential Vite binaries:', foundFiles);
    
    if (foundFiles.length > 0) {
      viteBinaryPath = foundFiles[0];
      console.log('Using found binary:', viteBinaryPath);
    }
  }
  
  // Run the build
  console.log('Running build...');
  if (viteBinaryPath) {
    // Execute using the direct path to the binary
    console.log(`Executing: node ${viteBinaryPath} build`);
    const result = spawnSync('node', [viteBinaryPath, 'build'], { 
      stdio: 'inherit',
      env: { ...process.env, NODE_OPTIONS: '--no-warnings' }
    });
    
    if (result.status !== 0) {
      throw new Error(`Build failed with exit code ${result.status}`);
    }
  } else {
    // Try npx as a last resort
    console.log('Trying build with npx vite...');
    execSync('npx -y vite@6.2.0 build', { stdio: 'inherit' });
  }
  
  console.log('Build completed successfully!');
  
  // Verify the build output exists
  const distPath = path.join(process.cwd(), 'dist');
  if (fs.existsSync(distPath)) {
    console.log('Build output directory exists:', distPath);
    console.log('Contents:', fs.readdirSync(distPath));
  } else {
    console.error('Build output directory not found!');
    throw new Error('Build output not generated');
  }
  
} catch (error) {
  console.error('Build process failed:', error.message);
  
  // Create a minimal fallback build
  try {
    console.log('Creating fallback build...');
    const distPath = path.join(process.cwd(), 'dist');
    if (!fs.existsSync(distPath)) {
      fs.mkdirSync(distPath, { recursive: true });
    }
    
    // Create a simple index.html
    fs.writeFileSync(path.join(distPath, 'index.html'), `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Build Error</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
          .error { background-color: #ffdddd; padding: 1rem; border-radius: 4px; }
        </style>
      </head>
      <body>
        <h1>Build Process Error</h1>
        <p>The normal build process failed. Please check the build logs for details.</p>
        <div class="error">
          <h2>Error Message</h2>
          <pre>${error.message}</pre>
        </div>
      </body>
      </html>
    `);
    
    console.log('Fallback build created successfully');
  } catch (fallbackError) {
    console.error('Fallback build also failed:', fallbackError.message);
  }
  
  process.exit(1);
} 