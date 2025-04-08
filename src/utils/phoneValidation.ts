export const validatePhoneNumber = (phoneNumber: string): { isValid: boolean; error?: string } => {
  // Remove all non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  // Check if the number is empty
  if (!digitsOnly) {
    return { isValid: false, error: 'Phone number is required' };
  }
  
  // Check if the number is too short (less than 10 digits)
  if (digitsOnly.length < 10) {
    return { isValid: false, error: 'Phone number must be at least 10 digits' };
  }
  
  // Check if the number is too long (more than 15 digits)
  if (digitsOnly.length > 15) {
    return { isValid: false, error: 'Phone number must not exceed 15 digits' };
  }
  
  return { isValid: true };
};

export const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove all non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX for US numbers
  if (digitsOnly.length === 10) {
    return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
  }
  
  // For international numbers, just add + prefix
  return `+${digitsOnly}`;
}; 