import { useState } from 'react';
import api from '../services/api';

interface AddSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (subscription: any) => void;
}

const AddSubscriptionModal = ({ isOpen, onClose, onSuccess }: AddSubscriptionModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    currency: 'USD',
    billing_cycle: 'monthly',
    next_billing_date: '',
    provider: '',
    category: '',
    notes: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Validate required fields
      if (!formData.name || !formData.price || !formData.billing_cycle) {
        setError('Name, price, and billing cycle are required');
        return;
      }
      
      // Build payload with camelCase keys for widest backend compatibility
      const payload = {
        name: formData.name,
        price: parseFloat(formData.price),
        currency: formData.currency,
        billingCycle: formData.billing_cycle, // camelCase for legacy API
        nextBillingDate: formData.next_billing_date || undefined,
        provider: formData.provider || undefined,
        category: formData.category || undefined,
        notes: formData.notes || undefined,
      };
      
      const response = await api.subscriptions.create(payload);
      
      if (response && response.subscription) {
        onSuccess(response.subscription);
        onClose();
      } else {
        setError('Failed to add subscription');
      }
    } catch (err) {
      console.error('Failed to add subscription:', err);
      setError('Failed to add subscription. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          aria-hidden="true"
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                  Add Subscription
                </h3>
                
                {error && (
                  <div className="mt-2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <span className="block sm:inline">{error}</span>
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                  {/* Name */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Subscription Name*
                    </label>
                    <input
                      type="text"
                      name="name"
                      id="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Netflix, Spotify, etc."
                    />
                  </div>
                  
                  {/* Price and Currency */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                        Price*
                      </label>
                      <input
                        type="number"
                        name="price"
                        id="price"
                        required
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="9.99"
                      />
                    </div>
                    <div>
                      <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
                        Currency
                      </label>
                      <select
                        name="currency"
                        id="currency"
                        value={formData.currency}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="CAD">CAD ($)</option>
                        <option value="AUD">AUD ($)</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Billing Cycle and Next Billing Date */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="billing_cycle" className="block text-sm font-medium text-gray-700">
                        Billing Cycle*
                      </label>
                      <select
                        name="billing_cycle"
                        id="billing_cycle"
                        required
                        value={formData.billing_cycle}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                        <option value="weekly">Weekly</option>
                        <option value="daily">Daily</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="biannually">Biannually</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="next_billing_date" className="block text-sm font-medium text-gray-700">
                        Next Billing Date
                      </label>
                      <input
                        type="date"
                        name="next_billing_date"
                        id="next_billing_date"
                        value={formData.next_billing_date}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>
                  
                  {/* Provider and Category */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="provider" className="block text-sm font-medium text-gray-700">
                        Provider
                      </label>
                      <input
                        type="text"
                        name="provider"
                        id="provider"
                        value={formData.provider}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Company name"
                      />
                    </div>
                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                        Category
                      </label>
                      <select
                        name="category"
                        id="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="">Select a category</option>
                        <option value="entertainment">Entertainment</option>
                        <option value="productivity">Productivity</option>
                        <option value="utilities">Utilities</option>
                        <option value="fitness">Fitness & Health</option>
                        <option value="education">Education</option>
                        <option value="food">Food & Delivery</option>
                        <option value="software">Software</option>
                        <option value="gaming">Gaming</option>
                        <option value="music">Music</option>
                        <option value="news">News</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Notes */}
                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      id="notes"
                      rows={3}
                      value={formData.notes}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Any additional notes about this subscription"
                    ></textarea>
                  </div>
                  
                  <div className="pt-2 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-blue-300"
                    >
                      {isLoading ? 'Saving...' : 'Save Subscription'}
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddSubscriptionModal; 