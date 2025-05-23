import { useState, useEffect } from 'react';
import { subscription } from '../services/apiService';

interface Subscription {
  id: string;
  name: string;
  price: number;
  billingCycle: string;
  // Add other fields as needed
}

export default function SubscriptionList() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        const response = await subscription.getAll();
        setSubscriptions(response.data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch subscriptions');
        console.error('Error fetching subscriptions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptions();
  }, []);

  if (loading) {
    return <div className="text-center p-4">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Your Subscriptions</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {subscriptions.map((sub) => (
          <div 
            key={sub.id} 
            className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <h2 className="text-xl font-semibold">{sub.name}</h2>
            <p className="text-gray-600">
              ${sub.price} / {sub.billingCycle}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
} 