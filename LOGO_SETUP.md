# Logo Setup and Loading System

## Overview
This document explains the robust logo loading system implemented to ensure logos always display correctly across all environments.

## Files
- `public/logo.svg` - Primary logo file
- `public/quits-logo.svg` - Fallback logo file (identical to primary)
- `src/hooks/useLogo.ts` - Custom hook for robust logo loading
- `src/utils/logoUtils.ts` - Utility functions for logo handling

## How It Works

### 1. Dual Logo Files
We maintain two identical logo files:
- `logo.svg` - Primary logo (used by Sidebar component)
- `quits-logo.svg` - Fallback logo (used by other components)

### 2. Custom Hook (`useLogo`)
The `useLogo` hook provides:
- Automatic fallback from `/logo.svg` to `/quits-logo.svg`
- Loading state management
- Error handling
- Pre-loading verification

### 3. Error Handling
All logo components use the `onError` handler to automatically fallback to the alternative logo file if the primary fails.

## Usage

### In Components
```tsx
import { useLogo } from '../hooks/useLogo';

const MyComponent = () => {
  const { logoUrl, handleImageError } = useLogo();
  
  return (
    <img 
      src={logoUrl} 
      alt="Quits" 
      onError={handleImageError}
    />
  );
};
```

### Direct Usage
```tsx
import { getLogoUrl, handleLogoError } from '../utils/logoUtils';

<img 
  src={getLogoUrl()} 
  alt="Quits" 
  onError={handleLogoError}
/>
```

## Configuration Files

### Vite Config (`vite.config.ts`)
- `publicDir: 'public'` - Ensures public files are served
- `assetsInclude` - Includes SVG files in build
- `fs.allow` - Allows file system access for development

### Vercel Config (`vercel.json`)
- Explicit routes for logo files
- Proper static asset handling
- SPA fallback configuration

### Redirects (`_redirects`)
- Ensures logo files are served with 200 status
- Handles SPA routing

## Testing

### Build Test
Run the build script to verify everything works:
```bash
./build-and-test.sh
```

### Manual Test
Open `test-logo-loading.html` in a browser to test logo loading in different scenarios.

## Troubleshooting

### Logo Not Loading
1. Check if both logo files exist in `public/`
2. Verify build output includes logo files in `dist/`
3. Check browser network tab for 404 errors
4. Ensure Vercel/Netlify configuration is correct

### Development Issues
1. Restart Vite dev server
2. Clear browser cache
3. Check file permissions
4. Verify file paths are correct

## Deployment Notes
- Both logo files are included in the build
- Static asset serving is configured for production
- Fallback system ensures logos always load
- No cache-busting needed due to robust fallback system 