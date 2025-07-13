#!/bin/bash

echo "🚀 Starting Quits Frontend Build Process..."

# Check if logo files exist
echo "📋 Checking logo files..."
if [ ! -f "public/logo.svg" ]; then
    echo "❌ logo.svg not found in public directory"
    exit 1
fi

if [ ! -f "public/quits-logo.svg" ]; then
    echo "❌ quits-logo.svg not found in public directory"
    exit 1
fi

echo "✅ Logo files found"

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the project
echo "🔨 Building project..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Check if logo files are in the dist directory
    echo "🔍 Verifying logo files in build output..."
    if [ -f "dist/logo.svg" ]; then
        echo "✅ logo.svg found in dist"
    else
        echo "❌ logo.svg missing from dist"
    fi
    
    if [ -f "dist/quits-logo.svg" ]; then
        echo "✅ quits-logo.svg found in dist"
    else
        echo "❌ quits-logo.svg missing from dist"
    fi
    
    echo "🎉 Build process completed successfully!"
else
    echo "❌ Build failed!"
    exit 1
fi 