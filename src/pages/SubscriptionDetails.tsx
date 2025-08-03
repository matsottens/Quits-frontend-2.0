import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

const SubscriptionDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    currency: 'USD',
    billing_cycle: 'monthly',
    next_billing_date: '',
    provider: '',
    category: '',
    notes: ''
  });

  // Fetch subscription details
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!id) return;
      
      // Debug: Check authentication state
      const token = localStorage.getItem('token');
      console.log('Subscription fetch - Auth state:', {
        hasToken: !!token,
        tokenLength: token?.length || 0,
        subscriptionId: id
      });
      
      try {
        setLoading(true);
        const response = await api.subscriptions.getById(id);
        
        if (response && response.subscription) {
          const sub = response.subscription;
          setSubscription(sub);
          setFormData({
            name: sub.name || '',
            price: sub.price?.toString() || '',
            currency: sub.currency || 'USD',
            billing_cycle: sub.billing_cycle || 'monthly',
            next_billing_date: sub.next_billing_date || '',
            provider: sub.provider || '',
            category: sub.category || '',
            notes: sub.notes || ''
          });
        } else {
          setError('Subscription not found');
        }
      } catch (err) {
        console.error('Error fetching subscription:', err);
        
        // Handle authentication errors specifically
        if (err instanceof Error) {
          if (err.message.includes('Authentication expired') || err.message.includes('log in again')) {
            // Redirect to login page
            navigate('/login');
            return;
          } else if (err.message.includes('not found')) {
            setError('Subscription not found');
          } else if (err.message.includes('Access denied')) {
            setError('You do not have permission to view this subscription');
          } else {
            setError(`Failed to load subscription: ${err.message}`);
          }
        } else {
          setError('Failed to load subscription details');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [id]);

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  // Calculate yearly cost
  const calculateYearlyCost = () => {
    if (!subscription) return 0;
    
    let amount = parseFloat(subscription.price);
    
    if (subscription.billing_cycle === 'monthly') {
      amount = amount * 12;
    } else if (subscription.billing_cycle === 'weekly') {
      amount = amount * 52;
    } else if (subscription.billing_cycle === 'daily') {
      amount = amount * 365;
    }
    
    return amount;
  };

  // Calculate monthly cost
  const getMonthlyPrice = () => {
    if (!subscription) return 0;
    let amount = parseFloat(subscription.price);
    const cycle = (subscription.billing_cycle || '').toLowerCase();
    const safe = (v: any) => (isNaN(parseFloat(v)) ? 0 : parseFloat(v));
    switch (cycle) {
      case 'weekly':
        amount = safe(amount) * 4.33; break;
      case 'daily':
        amount = safe(amount) * 30; break;
      case 'quarterly':
        amount = safe(amount) / 3; break;
      case 'biannually':
      case 'semiannually':
      case 'semi-annually':
        amount = safe(amount) / 6; break;
      case 'yearly':
      case 'annual':
      case 'annually':
        amount = safe(amount) / 12; break;
      default:
        const m = cycle.match(/(\d+)\s*month/);
        const y = cycle.match(/(\d+)\s*year/);
        if (m) {
          const n = parseInt(m[1],10); if(n>1) amount = safe(amount)/n;
        } else if(y){
          const n=parseInt(y[1],10); if(n>1) amount = safe(amount)/(n*12);
        }
    }
    return amount;
  };

  // Handle form changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!id) return;
    
    try {
      const updatedData = {
        ...formData,
        price: parseFloat(formData.price),
      };
      
      const response = await api.subscriptions.update(id, updatedData);
      
      if (response && response.subscription) {
        setSubscription(response.subscription);
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Error updating subscription:', err);
      alert('Failed to update subscription');
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!id) return;
    
    if (window.confirm('Are you sure you want to delete this subscription?')) {
      try {
        await api.subscriptions.delete(id);
        navigate('/dashboard');
      } catch (err) {
        console.error('Error deleting subscription:', err);
        alert('Failed to delete subscription');
      }
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg p-8 text-center">
            <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading subscription details...</p>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error || !subscription) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg p-8 text-center">
            <svg className="h-12 w-12 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="mt-4 text-gray-500">{error || 'Subscription not found'}</p>
            <div className="mt-6">
              <Link
                to="/dashboard"
                className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Link to="/dashboard" className="text-gray-500 hover:text-gray-700 mr-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Subscription Details</h1>
          </div>
          <div className="flex space-x-4">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  Save
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {isEditing ? (
            <div className="p-6">
              <form onSubmit={handleSave}>
                <div className="space-y-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Subscription Name
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="name"
                        id="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                        Price
                      </label>
                      <div className="mt-1">
                        <input
                          type="number"
                          name="price"
                          id="price"
                          step="0.01"
                          value={formData.price}
                          onChange={handleChange}
                          required
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
                        Currency
                      </label>
                      <div className="mt-1">
                        <select
                          id="currency"
                          name="currency"
                          value={formData.currency}
                          onChange={handleChange}
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        >
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                          <option value="CAD">CAD ($)</option>
                          <option value="AUD">AUD ($)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="billing_cycle" className="block text-sm font-medium text-gray-700">
                        Billing Cycle
                      </label>
                      <div className="mt-1">
                        <select
                          id="billing_cycle"
                          name="billing_cycle"
                          value={formData.billing_cycle}
                          onChange={handleChange}
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="next_billing_date" className="block text-sm font-medium text-gray-700">
                        Next Billing Date
                      </label>
                      <div className="mt-1">
                        <input
                          type="date"
                          name="next_billing_date"
                          id="next_billing_date"
                          value={formData.next_billing_date}
                          onChange={handleChange}
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="provider" className="block text-sm font-medium text-gray-700">
                        Provider/Merchant
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          name="provider"
                          id="provider"
                          value={formData.provider}
                          onChange={handleChange}
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                        Category
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          name="category"
                          id="category"
                          value={formData.category}
                          onChange={handleChange}
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                      Notes
                    </label>
                    <div className="mt-1">
                      <textarea
                        id="notes"
                        name="notes"
                        rows={3}
                        value={formData.notes}
                        onChange={handleChange}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            <div>
              <div className="px-4 py-5 sm:px-6 bg-gray-50">
                <h3 className="text-lg leading-6 font-medium text-gray-900">{subscription.name}</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  {subscription.is_manual ? 'Manually added' : 'Detected from emails'}
                </p>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                <dl className="sm:divide-y sm:divide-gray-200">
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Price</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {formatCurrency(subscription.price, subscription.currency)}&nbsp;
                      <span className="text-gray-500">({subscription.billing_cycle})</span>
                    </dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Yearly cost</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {formatCurrency(calculateYearlyCost(), subscription.currency)}
                    </dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Next billing date</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {subscription.next_billing_date ? formatDate(subscription.next_billing_date) : 'Not specified'}
                    </dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Provider</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {subscription.provider || 'Not specified'}
                    </dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Category</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {subscription.category || 'Not categorized'}
                    </dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Added on</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {formatDate(subscription.created_at)}
                    </dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Monthly cost (equiv.)</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {formatCurrency(getMonthlyPrice(), subscription.currency)}
                    </dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Start date</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {formatDate(subscription.created_at || subscription.start_date)}
                    </dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">End date</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {subscription.end_date ? formatDate(subscription.end_date) : 'Indefinite'}
                    </dd>
                  </div>
                  {subscription.notes && (
                    <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">Notes</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                        {subscription.notes}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SubscriptionDetails; 