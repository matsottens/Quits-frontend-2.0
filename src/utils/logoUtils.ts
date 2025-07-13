export const getLogoUrl = (): string => {
  // Try to use the primary logo first
  return '/logo.svg';
};

export const getLogoFallbackUrl = (): string => {
  // Fallback to the alternative logo name
  return '/quits-logo.svg';
};

export const handleLogoError = (event: React.SyntheticEvent<HTMLImageElement, Event>): void => {
  const target = event.target as HTMLImageElement;
  const currentSrc = target.src;
  
  // If we're already trying the fallback, don't loop
  if (currentSrc.includes('quits-logo.svg')) {
    console.warn('Logo failed to load:', currentSrc);
    return;
  }
  
  // Try the fallback
  target.src = getLogoFallbackUrl();
}; 