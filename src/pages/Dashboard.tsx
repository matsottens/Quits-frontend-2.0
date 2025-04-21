import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import AddSubscriptionModal from '../components/AddSubscriptionModal';

interface Subscription {
  id: string;
  name: string;
  price: number;
  currency: string;
  billing_cycle: string;
  next_billing_date: string | null;
  provider: string;
  category: string;
  is_manual: boolean;
}

const Dashboard = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewScanAlert, setShowNewScanAlert] = useState(false);
  const [subscriptionsFound, setSubscriptionsFound] = useState(0);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('name');
  const [showAddModal, setShowAddModal] = useState(false);

  // Check if coming from a new scan
  useEffect(() => {
    if (location.state && location.state.newScan) {
      setShowNewScanAlert(true);
      setSubscriptionsFound(location.state.subscriptionsFound || 0);
      
      // Clear location state after reading it
      window.history.replaceState({}, document.title);
      
      // Auto-hide alert after 10 seconds
      const timer = setTimeout(() => {
        setShowNewScanAlert(false);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  // Check URL for add parameter
  useEffect(() => {
    const shouldShowAddModal = searchParams.get('add') === 'true';
    if (shouldShowAddModal) {
      setShowAddModal(true);
      // Remove the parameter from the URL
      searchParams.delete('add');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  // Fetch subscriptions
  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        setLoading(true);
        const response = await api.subscriptions.getAll();
        
        if (response && response.subscriptions) {
          setSubscriptions(response.subscriptions);
        } else {
          setSubscriptions([]);
        }
      } catch (err) {
        console.error('Error fetching subscriptions:', err);
        setError('Failed to load your subscriptions');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptions();
  }, []);

  // Calculate total monthly cost
  const calculateMonthlyTotal = () => {
    return subscriptions.reduce((total, sub) => {
      let amount = sub.price;
      
      // Convert to monthly value based on billing cycle
      if (sub.billing_cycle === 'yearly') {
        amount = amount / 12;
      } else if (sub.billing_cycle === 'weekly') {
        amount = amount * 4.33; // Average weeks in a month
      } else if (sub.billing_cycle === 'daily') {
        amount = amount * 30; // Approximate days in a month
      }
      
      return total + amount;
    }, 0);
  };

  // Filter subscriptions
  const filteredSubscriptions = () => {
    let filtered = [...subscriptions];
    
    if (filter !== 'all') {
      filtered = filtered.filter(sub => sub.billing_cycle === filter);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      if (sort === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sort === 'price-low') {
        return a.price - b.price;
      } else if (sort === 'price-high') {
        return b.price - a.price;
      } else if (sort === 'date') {
        if (!a.next_billing_date) return 1;
        if (!b.next_billing_date) return -1;
        return new Date(a.next_billing_date).getTime() - new Date(b.next_billing_date).getTime();
      }
      return 0;
    });
    
    return filtered;
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  // Handle scan button
  const handleScan = () => {
    navigate('/scanning');
  };

  // Handle add subscription
  const handleAddSubscription = () => {
    setShowAddModal(true);
  };

  // Handle subscription added
  const handleSubscriptionAdded = (newSubscription: Subscription) => {
    setSubscriptions([newSubscription, ...subscriptions]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Add Subscription Modal */}
      <AddSubscriptionModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        onSuccess={handleSubscriptionAdded} 
      />

      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Quits</h1>
          <div className="flex items-center space-x-4">
            <Link to="/settings" className="text-gray-500 hover:text-gray-700">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
            <button
              onClick={() => logout()}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* New scan alert */}
        {showNewScanAlert && (
          <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-6 rounded" role="alert">
            <div className="flex items-center">
              <div className="py-1">
                <svg className="h-6 w-6 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-bold">Scan Complete!</p>
                <p className="text-sm">
                  {subscriptionsFound > 0
                    ? `We found ${subscriptionsFound} subscription${subscriptionsFound > 1 ? 's' : ''} in your emails.`
                    : 'No new subscriptions were found in your emails.'}
                </p>
              </div>
              <button
                onClick={() => setShowNewScanAlert(false)}
                className="ml-auto"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          {/* Total Subscriptions */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Subscriptions
                    </dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">
                        {subscriptions.length}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Cost */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Monthly Cost
                    </dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">
                        {formatCurrency(calculateMonthlyTotal())}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Renewals */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Upcoming Renewals (7 days)
                    </dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">
                        {subscriptions.filter(sub => {
                          if (!sub.next_billing_date) return false;
                          const nextBilling = new Date(sub.next_billing_date);
                          const today = new Date();
                          const inOneWeek = new Date();
                          inOneWeek.setDate(today.getDate() + 7);
                          return nextBilling >= today && nextBilling <= inOneWeek;
                        }).length}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mb-8 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <button
            onClick={handleScan}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <div className="flex items-center">
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Scan for Subscriptions
            </div>
          </button>
          
          <button
            onClick={handleAddSubscription}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <div className="flex items-center">
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Manually
            </div>
          </button>
        </div>

        {/* Filters & Sort Controls */}
        <div className="mb-6 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="sm:w-1/2">
            <label htmlFor="filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by
            </label>
            <select
              id="filter"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All Subscriptions</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          
          <div className="sm:w-1/2">
            <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-1">
              Sort by
            </label>
            <select
              id="sort"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="name">Name</option>
              <option value="price-low">Price (Low to High)</option>
              <option value="price-high">Price (High to Low)</option>
              <option value="date">Next Billing Date</option>
            </select>
          </div>
        </div>

        {/* Subscriptions List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {loading ? (
            <div className="py-20 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-4 text-gray-500">Loading your subscriptions...</p>
            </div>
          ) : error ? (
            <div className="py-20 text-center">
              <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="mt-4 text-gray-500">{error}</p>
              <button
                onClick={handleScan}
                className="mt-4 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          ) : filteredSubscriptions().length === 0 ? (
            <div className="py-20 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="mt-4 text-gray-500">
                {subscriptions.length === 0
                  ? "You don't have any subscriptions yet."
                  : "No subscriptions match your filter."}
              </p>
              <div className="mt-4">
                {subscriptions.length === 0 ? (
                  <button
                    onClick={handleScan}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Scan for Subscriptions
                  </button>
                ) : (
                  <button
                    onClick={() => setFilter('all')}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-blue-600 bg-blue-100 hover:bg-blue-200"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {filteredSubscriptions().map((subscription) => (
                <li key={subscription.id}>
                  <Link to={`/subscription/${subscription.id}`} className="block hover:bg-gray-50">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-blue-600 truncate">{subscription.name}</p>
                          {subscription.is_manual && (
                            <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                              Manual
                            </span>
                          )}
                        </div>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className="px-2 inline-flex text-sm leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {formatCurrency(subscription.price, subscription.currency)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            {subscription.provider && (
                              <>
                                <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                {subscription.provider}
                              </>
                            )}
                          </p>
                          <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                            <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {(subscription.billing_cycle || subscription.billingCycle || 'monthly').charAt(0).toUpperCase() + 
                             (subscription.billing_cycle || subscription.billingCycle || 'monthly').slice(1)}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          {subscription.next_billing_date || subscription.nextBillingDate ? (
                            <>
                              <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <p>
                                Renews on <time dateTime={subscription.next_billing_date || subscription.nextBillingDate}>
                                  {new Date(subscription.next_billing_date || subscription.nextBillingDate || '').toLocaleDateString()}
                                </time>
                              </p>
                            </>
                          ) : (
                            <p>No renewal date</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard; 