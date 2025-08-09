import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLogo } from '../hooks/useLogo';
import AddSubscriptionModal from '../components/AddSubscriptionModal';
import MobileMetricCarousel from '../components/MobileMetricCarousel';
// import BottomActionBar from '../components/BottomActionBar';

interface Subscription {
  id: string;
  name: string;
  price: number;
  currency: string;
  billing_cycle: string;
  billingCycle?: string;
  next_billing_date: string | null;
  nextBillingDate?: string | null;
  provider: string;
  category: string;
  is_manual: boolean;
  analysis_status?: string;
  is_pending?: boolean;
  confidence_score?: number;
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
  const [polling, setPolling] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showCostMenu, setShowCostMenu] = useState(false);

  const justScanned = location.state && location.state.justScanned;

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

  // Fetch subscriptions (with polling if justScanned)
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    let isMounted = true;
    const fetchSubscriptions = async () => {
      try {
        setLoading(true);
        const response = await api.subscriptions.getAll();
        if (!isMounted) return;
        if (response && response.subscriptions) {
          // Only surface items that are explicitly completed by Gemini (or manual entries).
          const completedSubs = response.subscriptions.filter((sub: Subscription) => {
            const notCompletedStatus = sub.analysis_status && sub.analysis_status !== 'completed';
            const stillPending = !!sub.is_pending;
            return !notCompletedStatus && !stillPending;
          });

          setSubscriptions(completedSubs);

          // Stop polling once we actually have completed subscriptions
          if (polling && completedSubs.length > 0) {
            setPolling(false);
          }
        } else {
          setSubscriptions([]);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Error fetching subscriptions:', err);
        setError('Failed to load your subscriptions');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSubscriptions();

    // If justScanned and no subscriptions, poll for up to 10 seconds
    if (justScanned && subscriptions.length === 0 && !polling && pollCount < 10) {
      setPolling(true);
      pollInterval = setInterval(() => {
        setPollCount((c) => c + 1);
        fetchSubscriptions();
      }, 1000);
    }

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justScanned, pollCount]);

  // Calculate total monthly cost
  const calculateMonthlyTotal = () => {
    return subscriptions.reduce((total, sub) => total + getMonthlyPrice(sub), 0);
  };

  // Helper to convert any subscription to its monthly-equivalent price
  const getMonthlyPrice = (sub: Subscription) => {
    let amount = sub.price;
    const cycle = (sub.billing_cycle || '').toLowerCase();
    const safeNumber = (val: any) => {
      const num = parseFloat(val);
      return isNaN(num) ? 0 : num;
    };

    switch (cycle) {
      case 'monthly':
        break;
      case 'weekly':
        amount = safeNumber(amount) * 4.33;
        break;
      case 'daily':
        amount = safeNumber(amount) * 30;
        break;
      case 'quarterly':
        amount = safeNumber(amount) / 3;
        break;
      case 'biannually':
      case 'semiannually':
      case 'semi-annually':
        amount = safeNumber(amount) / 6;
        break;
      case 'yearly':
      case 'annual':
      case 'annually':
        amount = safeNumber(amount) / 12;
        break;
      default: {
        const monthMatch = cycle.match(/(\d+)\s*month/);
        const yearMatch  = cycle.match(/(\d+)\s*year/);
        if (monthMatch) {
          const n = parseInt(monthMatch[1], 10);
          if (n > 1) {
            const candidate = safeNumber(amount) / n;
            amount = candidate < 1 && safeNumber(amount) < n * 5 ? safeNumber(amount) : candidate;
          }
        } else if (yearMatch) {
          const n = parseInt(yearMatch[1], 10);
          if (n > 1) {
            const divisor = n * 12;
            const candidate = safeNumber(amount) / divisor;
            amount = candidate < 1 && safeNumber(amount) < divisor * 5 ? safeNumber(amount) : candidate;
          }
        }
      }
    }
    return amount;
  };

  // State to control which cost to display
  const [costView, setCostView] = useState<'monthly' | 'total'>('monthly');

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

  const sortLabel = (key: string) => (
    key === 'name' ? 'Name' :
    key === 'price-low' ? 'Price (Low to High)' :
    key === 'price-high' ? 'Price (High to Low)' :
    key === 'date' ? 'Next Billing Date' : key
  );

  // Format currency safely. If an invalid or missing currency code is supplied, fall back to USD to
  // avoid runtime "RangeError: invalid currency code" which would otherwise crash the dashboard.
  const formatCurrency = (amount: number, currency?: string) => {
    // Accept only 3-letter currency codes; anything else defaults to USD
    const safeCurrency = currency && /^[A-Za-z]{3}$/.test(currency)
      ? currency.toUpperCase()
      : 'USD';

    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: safeCurrency,
      }).format(amount);
    } catch (_err) {
      // As an extra safeguard, fall back to USD if Intl.NumberFormat still rejects the code
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
    }
  };

  const { logoUrl, handleImageError } = useLogo();

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
    // The lg:ml-64 ensures the main content is not overlapped by the fixed sidebar on large screens
    <div className="min-h-screen bg-gray-50 lg:ml-64">
      {/* Add Subscription Modal */}
      <AddSubscriptionModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        onSuccess={handleSubscriptionAdded} 
      />

      {/* Header */}
      <header className="bg-white shadow relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          {/* Invisible placeholder to keep spacing when sidebar is collapsed on mobile */}
          <div className="w-6" />

          {/* Centered logo */}
          <img
            src={logoUrl}
            alt="Quits"
            className="h-8 w-auto absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2"
            onError={handleImageError}
          />

          <div className="flex items-center space-x-4 ml-auto">
            <Link to="/settings" className="text-gray-500 hover:text-galaxy">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
            <button
              onClick={() => logout()}
              className="text-gray-500 hover:text-galaxy"
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
          <div className="bg-[#E8EFFA] border-l-4 border-galaxy text-galaxy p-4 mb-6 rounded" role="alert">
            <div className="flex items-center">
              <div className="py-1">
                <svg className="h-6 w-6 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="heading-3">Scan Complete!</p>
                <p className="small-label">
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

        {/* Summary Cards (desktop grid) */}
        <div className="hidden md:grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          {/* Total Subscriptions */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-galaxy rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="small-label text-gray-600 truncate">Total Subscriptions</dt>
                    <dd>
                      <div className="data-strong">{subscriptions.length}</div>
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
                <div className="flex-shrink-0 bg-gain rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="small-label text-gray-600 truncate">
                      {costView === 'monthly' ? 'Monthly Cost' : 'Total Cost'}
                    </dt>
                    <dd>
                      <div className="data-strong">
                        {formatCurrency(costView === 'monthly' ? calculateMonthlyTotal() : subscriptions.reduce((t,s)=>t+s.price,0))}
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
                    <dt className="small-label text-gray-600 truncate">
                      Upcoming Renewals (7 days)
                    </dt>
                    <dd>
                      <div className="data-strong">
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

        {/* Mobile Metric Carousel */}
        <div className="md:hidden mb-6">
          <MobileMetricCarousel
            cards={[
              {
                title: 'Total Subscriptions',
                value: subscriptions.length,
                sublabel: 'Active',
                trend: { direction: 'up', pct: 0 },
                icon: (
                  <svg className="h-6 w-6 text-galaxy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                ),
              },
              {
                title: costView === 'monthly' ? 'Monthly Cost' : 'Total Cost',
                value: formatCurrency(costView === 'monthly' ? calculateMonthlyTotal() : subscriptions.reduce((t,s)=>t+s.price,0)),
                sublabel: costView === 'monthly' ? 'per month' : 'all subscriptions',
                icon: (
                  <svg className="h-6 w-6 text-gain" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
              {
                title: 'Upcoming Renewals (7d)',
                value: subscriptions.filter(sub => { if (!sub.next_billing_date) return false; const next = new Date(sub.next_billing_date); const today = new Date(); const inOneWeek = new Date(); inOneWeek.setDate(today.getDate() + 7); return next >= today && next <= inOneWeek; }).length,
                sublabel: 'next 7 days',
                icon: (
                  <svg className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
            ]}
          />
        </div>

        {/* Action buttons (desktop only) */}
        <div className="hidden md:flex mb-8 flex-row space-x-4">
          <button
            onClick={handleScan}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-galaxy hover:bg-[#17306f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-galaxy"
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
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-galaxy bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-galaxy"
          >
            <div className="flex items-center">
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Manually
            </div>
          </button>
        </div>

        {/* Mobile Filter & Sort (two compact icon dropdowns) */}
        <div className="mb-4 md:hidden flex items-center space-x-3">
          {/* Filter dropdown trigger */}
          <div className="relative">
            <button
              onClick={() => { setShowFilterMenu((v) => !v); setShowSortMenu(false); setShowCostMenu(false); }}
              className="p-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50"
              aria-haspopup="true"
              aria-expanded={showFilterMenu}
              aria-label="Filter"
            >
              {/* Funnel icon */}
              <svg className="h-5 w-5 text-gray-600" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v2H3V5zm3 6h12v2H6v-2zm3 6h6v2H9v-2z"/></svg>
            </button>
            {showFilterMenu && (
              <div className="absolute left-0 mt-2 bg-white border rounded-lg shadow-md z-20 overflow-hidden w-40">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'monthly', label: 'Monthly' },
                  { key: 'weekly', label: 'Weekly' },
                  { key: 'yearly', label: 'Yearly' },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => { setFilter(opt.key); setShowFilterMenu(false); }}
                    className={`w-full text-left px-3 py-2 small-label ${
                      filter === opt.key ? 'bg-[#E8EFFA] text-galaxy' : 'hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort dropdown trigger */}
          <div className="relative">
            <button
              onClick={() => { setShowSortMenu((v) => !v); setShowFilterMenu(false); setShowCostMenu(false); }}
              className="p-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50"
              aria-haspopup="true"
              aria-expanded={showSortMenu}
              aria-label="Sort"
            >
              {/* Sort icon */}
              <svg className="h-5 w-5 text-gray-600" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v2H7zM7 11h8v2H7zM7 15h6v2H7z"/></svg>
            </button>
            {showSortMenu && (
              <div className="absolute left-0 mt-2 bg-white border rounded-lg shadow-md z-20 overflow-hidden w-56">
                {[
                  { key: 'name', label: 'Name' },
                  { key: 'price-low', label: 'Price (Low to High)' },
                  { key: 'price-high', label: 'Price (High to Low)' },
                  { key: 'date', label: 'Next Billing Date' },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => { setSort(opt.key); setShowSortMenu(false); }}
                    className={`w-full text-left px-3 py-2 small-label ${
                      sort === opt.key ? 'bg-[#E8EFFA] text-galaxy' : 'hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cost view dropdown trigger */}
          <div className="relative">
            <button
              onClick={() => { setShowCostMenu((v) => !v); setShowFilterMenu(false); setShowSortMenu(false); }}
              className="p-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50"
              aria-haspopup="true"
              aria-expanded={showCostMenu}
              aria-label="Display prices as"
            >
              {/* Currency icon */}
              <svg className="h-5 w-5 text-gray-600" viewBox="0 0 24 24" fill="currentColor"><path d="M12 6c-2.21 0-4 1.343-4 3h2c0-.552.895-1 2-1s2 .448 2 1-.895 1-2 1c-2.21 0-4 1.343-4 3s1.79 3 4 3v1h2v-1c2.21 0 4-1.343 4-3h-2c0 .552-.895 1-2 1s-2-.448-2-1 .895-1 2-1c2.21 0 4-1.343 4-3s-1.79-3-4-3V5h-2v1z"/></svg>
            </button>
            {showCostMenu && (
              <div className="absolute left-0 mt-2 bg-white border rounded-lg shadow-md z-20 overflow-hidden w-56">
                <button
                  onClick={() => { setCostView('monthly'); setShowCostMenu(false); }}
                  className={`w-full text-left px-3 py-2 small-label ${costView === 'monthly' ? 'bg-[#E8EFFA] text-galaxy' : 'hover:bg-gray-50'}`}
                >
                  Monthly Equivalent
                </button>
                <button
                  onClick={() => { setCostView('total'); setShowCostMenu(false); }}
                  className={`w-full text-left px-3 py-2 small-label ${costView === 'total' ? 'bg-[#E8EFFA] text-galaxy' : 'hover:bg-gray-50'}`}
                >
                  Full Billing Amount
                </button>
              </div>
            )}
          </div>

          {(showFilterMenu || showSortMenu || showCostMenu) && (
            <div className="fixed inset-0 z-10" onClick={() => { setShowFilterMenu(false); setShowSortMenu(false); setShowCostMenu(false); }} />
          )}
        </div>

        {/* Filters & Sort Controls (desktop) */}
        <div className="mb-6 flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
          {/* Compact icon filter */}
          <div className="hidden md:flex md:w-1/2 items-center space-x-3">
            <span className="small-label text-gray-700">Filter:</span>
            <button
              onClick={() => setFilter('all')}
              className={`p-2 rounded-md border ${filter==='all'?'border-galaxy bg-[#E8EFFA]':'border-gray-200 bg-white'} hover:bg-gray-50`}
              title="All"
            >
              <svg className={`h-5 w-5 ${filter==='all'?'text-galaxy':'text-gray-500'}`} viewBox="0 0 20 20" fill="currentColor"><path d="M3 5h14v2H3V5zm3 4h8v2H6V9zm-3 4h14v2H3v-2z"/></svg>
            </button>
            <button
              onClick={() => setFilter('monthly')}
              className={`p-2 rounded-md border ${filter==='monthly'?'border-galaxy bg-[#E8EFFA]':'border-gray-200 bg-white'} hover:bg-gray-50`}
              title="Monthly"
            >
              <svg className={`h-5 w-5 ${filter==='monthly'?'text-galaxy':'text-gray-500'}`} viewBox="0 0 24 24" fill="currentColor"><path d="M7 2a1 1 0 011 1v1h8V3a1 1 0 112 0v1h1a2 2 0 012 2v3H4V6a2 2 0 012-2h1V3a1 1 0 011-1z"/><path d="M4 10h16v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8z"/></svg>
            </button>
            <button
              onClick={() => setFilter('weekly')}
              className={`p-2 rounded-md border ${filter==='weekly'?'border-galaxy bg-[#E8EFFA]':'border-gray-200 bg-white'} hover:bg-gray-50`}
              title="Weekly"
            >
              <svg className={`h-5 w-5 ${filter==='weekly'?'text-galaxy':'text-gray-500'}`} viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h16v2H4zM4 11h16v2H4zM4 17h10v2H4z"/></svg>
            </button>
            <button
              onClick={() => setFilter('yearly')}
              className={`p-2 rounded-md border ${filter==='yearly'?'border-galaxy bg-[#E8EFFA]':'border-gray-200 bg-white'} hover:bg-gray-50`}
              title="Yearly"
            >
              <svg className={`h-5 w-5 ${filter==='yearly'?'text-galaxy':'text-gray-500'}`} viewBox="0 0 24 24" fill="currentColor"><path d="M5 3h14v2H5z"/><path d="M7 7h10v2H7zM9 11h6v2H9zM11 15h2v2h-2z"/></svg>
            </button>
          </div>
          
          {/* Compact icon sort */}
          <div className="hidden md:flex md:w-1/2 items-center space-x-3 justify-end">
            <span className="small-label text-gray-700">Sort:</span>
            <button onClick={() => setSort('name')} className={`p-2 rounded-md border ${sort==='name'?'border-galaxy bg-[#E8EFFA]':'border-gray-200 bg-white'} hover:bg-gray-50`} title="Name">
              <svg className={`h-5 w-5 ${sort==='name'?'text-galaxy':'text-gray-500'}`} viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v2H7zM7 11h8v2H7zM7 15h6v2H7z"/></svg>
            </button>
            <button onClick={() => setSort('price-low')} className={`p-2 rounded-md border ${sort==='price-low'?'border-galaxy bg-[#E8EFFA]':'border-gray-200 bg-white'} hover:bg-gray-50`} title="Price Low-High">
              <svg className={`h-5 w-5 ${sort==='price-low'?'text-galaxy':'text-gray-500'}`} viewBox="0 0 24 24" fill="currentColor"><path d="M6 16l4 4 4-4H6zM6 4h8v2H6z"/></svg>
            </button>
            <button onClick={() => setSort('price-high')} className={`p-2 rounded-md border ${sort==='price-high'?'border-galaxy bg-[#E8EFFA]':'border-gray-200 bg-white'} hover:bg-gray-50`} title="Price High-Low">
              <svg className={`h-5 w-5 ${sort==='price-high'?'text-galaxy':'text-gray-500'}`} viewBox="0 0 24 24" fill="currentColor"><path d="M6 8l4-4 4 4H6zM6 18h8v-2H6z"/></svg>
            </button>
            <button onClick={() => setSort('date')} className={`p-2 rounded-md border ${sort==='date'?'border-galaxy bg-[#E8EFFA]':'border-gray-200 bg-white'} hover:bg-gray-50`} title="Next Billing Date">
              <svg className={`h-5 w-5 ${sort==='date'?'text-galaxy':'text-gray-500'}`} viewBox="0 0 24 24" fill="currentColor"><path d="M7 3v2H5a2 2 0 00-2 2v3h18V7a2 2 0 00-2-2h-2V3h-2v2H9V3H7z"/><path d="M3 10h18v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8z"/></svg>
            </button>
          </div>

          {/* Cost View Toggle (desktop only) */}
          <div className="hidden md:block md:w-1/2">
            <label htmlFor="costView" className="block small-label text-gray-700 mb-1">
              Display prices as
            </label>
            <select
              id="costView"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={costView}
              onChange={(e) => setCostView(e.target.value as 'monthly' | 'total')}
            >
              <option value="monthly">Monthly Equivalent</option>
              <option value="total">Full Billing Amount</option>
            </select>
          </div>
        </div>

        {/* Subscriptions List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {(loading || (justScanned && subscriptions.length === 0 && pollCount < 10)) ? (
            <div className="py-20 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-4 text-gray-500">{justScanned ? 'Updating your subscriptions...' : 'Loading your subscriptions...'}</p>
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
                          <p className="text-sm font-medium text-gray-900 truncate">{subscription.name}</p>
                          {subscription.is_manual && (
                            <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                              Manual
                            </span>
                          )}
                          {subscription.is_pending && (
                            <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Analyzing...
                            </span>
                          )}
                          {/* Confidence score removed for cleaner UI */}
                        </div>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className="px-2 inline-flex text-sm leading-5 font-semibold rounded-full bg-green-100 text-green-800 font-mono">
                            {formatCurrency(costView === 'monthly' ? getMonthlyPrice(subscription) : subscription.price, subscription.currency)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center small-label text-gray-500">
                            {subscription.provider && (
                              <>
                                <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                {subscription.provider}
                              </>
                            )}
                          </p>
                          <p className="mt-2 flex items-center small-label text-gray-500 sm:mt-0 sm:ml-6">
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
                                Renews on <time dateTime={(subscription.next_billing_date || subscription.nextBillingDate) || ''}>
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
      {/* Mobile bottom actions removed per design */}
    </div>
  );
};

export default Dashboard; 