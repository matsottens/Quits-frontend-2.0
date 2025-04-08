import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import api from '../services/api';
import { validatePhoneNumber, formatPhoneNumber } from '../utils/phoneValidation';

const AddPhoneNumber = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [formattedNumber, setFormattedNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Format phone number as user types
  useEffect(() => {
    if (phoneNumber) {
      setFormattedNumber(formatPhoneNumber(phoneNumber));
    }
  }, [phoneNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validate phone number
    const validation = validatePhoneNumber(phoneNumber);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid phone number');
      setIsLoading(false);
      return;
    }

    try {
      // Update user profile with phone number
      await api.auth.updatePhoneNumber(formattedNumber);
      
      // Proceed to scanning page
      navigate('/scanning');
    } catch (err: any) {
      setError(err.message || 'Failed to save phone number');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/scanning');
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <Header />
      <div className="flex flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="bg-white py-8 px-4 shadow-lg rounded-lg sm:px-10">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
              <h2 className="text-center text-3xl font-extrabold text-gray-900">
                Add Your Phone Number
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                This helps us verify your identity and send notifications when your subscriptions are nearly due
              </p>
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-400 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <div className="mt-1">
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 555-5555"
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#26457A] focus:border-[#26457A] sm:text-sm"
                  />
                </div>
                {formattedNumber && (
                  <p className="mt-1 text-sm text-gray-500">
                    Formatted: {formattedNumber}
                  </p>
                )}
              </div>

              <div className="flex flex-col space-y-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#26457A] hover:bg-[#1c345c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#26457A] transition-colors duration-200"
                >
                  {isLoading ? 'Saving...' : 'Continue'}
                </button>
                <button
                  type="button"
                  onClick={handleSkip}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#26457A] transition-colors duration-200"
                >
                  Skip for now
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddPhoneNumber; 