import { useState, useEffect } from 'react';

export const useLogo = () => {
  // Always prefix with Vite base URL so the asset resolves both in dev ("/")
  // and in production builds where the base can be different (e.g. "/" vs. "/static/").
  const withBase = (file: string) => `${import.meta.env.BASE_URL}${file.replace(/^\//, '')}`;

  const [logoUrl, setLogoUrl] = useState<string>(withBase('logo.svg'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    const testImage = new Image();
    
    const handleLoad = () => {
      setIsLoading(false);
      setHasError(false);
    };
    
    const handleError = () => {
      if (logoUrl.endsWith('logo.svg')) {
        // Try fallback
        setLogoUrl(withBase('quits-logo.svg'));
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
    const fallback = withBase('quits-logo.svg');
    target.src = fallback;
    setLogoUrl(fallback);
  };

  return {
    logoUrl,
    isLoading,
    hasError,
    handleImageError
  };
}; 