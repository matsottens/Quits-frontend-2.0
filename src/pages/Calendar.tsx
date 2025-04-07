import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

interface Subscription {
  id: string;
  name: string;
  price: number;
  currency: string;
  billing_cycle: string;
  next_billing_date: string | null;
  provider: string;
}

interface CalendarDay {
  date: Date;
  subscriptions: Subscription[];
  isCurrentMonth: boolean;
  isToday: boolean;
}

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Generate calendar days when month changes or subscriptions are loaded
  useEffect(() => {
    generateCalendarDays();
  }, [currentDate, subscriptions]);

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Get first day of the month
    const firstDay = new Date(year, month, 1);
    // Get last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Get the day of the week (0-6) for the first day
    const firstDayIndex = firstDay.getDay();
    // Get the total number of days in the month
    const daysInMonth = lastDay.getDate();
    
    // Get days from previous month to display
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const prevMonthDays = [];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      prevMonthDays.push({
        date,
        subscriptions: getSubscriptionsForDate(date),
        isCurrentMonth: false,
        isToday: isSameDay(date, new Date())
      });
    }
    
    // Get days for current month
    const currentMonthDays = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      currentMonthDays.push({
        date,
        subscriptions: getSubscriptionsForDate(date),
        isCurrentMonth: true,
        isToday: isSameDay(date, new Date())
      });
    }
    
    // Get days for next month to fill the calendar grid
    const nextMonthDays = [];
    const totalDaysDisplayed = prevMonthDays.length + currentMonthDays.length;
    const daysToAdd = 42 - totalDaysDisplayed; // 6 rows of 7 days
    
    for (let i = 1; i <= daysToAdd; i++) {
      const date = new Date(year, month + 1, i);
      nextMonthDays.push({
        date,
        subscriptions: getSubscriptionsForDate(date),
        isCurrentMonth: false,
        isToday: isSameDay(date, new Date())
      });
    }
    
    setCalendarDays([...prevMonthDays, ...currentMonthDays, ...nextMonthDays]);
  };

  // Get subscriptions for a specific date
  const getSubscriptionsForDate = (date: Date) => {
    if (!subscriptions.length) return [];
    
    return subscriptions.filter(sub => {
      if (!sub.next_billing_date) return false;
      
      const billingDate = new Date(sub.next_billing_date);
      return isSameDay(billingDate, date);
    });
  };

  // Check if two dates represent the same day
  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  // Move to previous month
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  // Move to next month
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Move to current month
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get month name
  const getMonthName = () => {
    return currentDate.toLocaleString('default', { month: 'long' });
  };

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg p-8 text-center">
            <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading your subscription calendar...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center">
          <Link to="/dashboard" className="text-gray-500 hover:text-gray-700 mr-4">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Renewal Calendar</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error ? (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        ) : (
          <>
            {/* Calendar navigation */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900">
                  {getMonthName()} {currentDate.getFullYear()}
                </h2>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={goToToday}
                  className="px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Today
                </button>
                <button
                  onClick={prevMonth}
                  className="p-2 border border-gray-300 rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={nextMonth}
                  className="p-2 border border-gray-300 rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Calendar */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              {/* Days of the week */}
              <div className="grid grid-cols-7 gap-px bg-gray-200">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="bg-gray-50 py-2 text-center text-sm font-medium text-gray-500">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-px bg-gray-200">
                {calendarDays.map((day, index) => (
                  <div
                    key={index}
                    className={`bg-white min-h-[100px] p-2 ${
                      !day.isCurrentMonth ? 'text-gray-400' : ''
                    } ${day.isToday ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex justify-between">
                      <span className={`text-sm font-medium ${day.isToday ? 'text-blue-600' : ''}`}>
                        {day.date.getDate()}
                      </span>
                      {day.subscriptions.length > 0 && (
                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                          {day.subscriptions.length}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 space-y-1">
                      {day.subscriptions.map((sub) => (
                        <Link
                          key={sub.id}
                          to={`/subscription/${sub.id}`}
                          className="block p-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 truncate"
                        >
                          <div className="font-medium">{sub.name}</div>
                          <div>{formatCurrency(sub.price, sub.currency)}</div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Legend</h3>
              <div className="flex items-center space-x-6">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-50 border border-gray-200 mr-2"></div>
                  <span className="text-sm text-gray-600">Today</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-100 mr-2"></div>
                  <span className="text-sm text-gray-600">Subscription Renewal</span>
                </div>
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-5 h-5 bg-red-600 rounded-full text-white text-xs font-bold mr-2">
                    2
                  </div>
                  <span className="text-sm text-gray-600">Multiple Renewals</span>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Calendar; 