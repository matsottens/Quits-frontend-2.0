import { useState, useEffect } from 'react';

export const useLogo = () => {
  const [logoUrl, setLogoUrl] = useState<string>('/logo.svg');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    const testImage = new Image();
    
    const handleLoad = () => {
      setIsLoading(false);
      setHasError(false);
    };
    
    const handleError = () => {
      if (logoUrl === '/logo.svg') {
        // Try fallback
        setLogoUrl('/quits-logo.svg');
      } else {
        // Both failed
        setIsLoading(false);
        setHasError(true);
      }
    };

    testImage.onload = handleLoad;
    testImage.onerror = handleError;
    testImage.src = logoUrl;

    return () => {
      testImage.onload = null;
      testImage.onerror = null;
    };
  }, [logoUrl]);

  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = event.target as HTMLImageElement;
    
    if (target.src.includes('quits-logo.svg')) {
      setHasError(true);
      setIsLoading(false);
      return;
    }
    
    // Try fallback
    target.src = '/quits-logo.svg';
    setLogoUrl('/quits-logo.svg');
  };

  return {
    logoUrl,
    isLoading,
    hasError,
    handleImageError
  };
}; 