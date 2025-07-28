import { useState } from 'react';

const NotificationsSettings = () => {
  const [priceAlertsEnabled, setPriceAlertsEnabled] = useState(false);
  const [priceAlertDays, setPriceAlertDays] = useState(3);

  const [trialRemindersEnabled, setTrialRemindersEnabled] = useState(false);
  const [trialReminderDays, setTrialReminderDays] = useState(3);

  const [upcomingChargesEnabled, setUpcomingChargesEnabled] = useState(false);
  const [includeCalendarSync, setIncludeCalendarSync] = useState(false);

  const [invoiceDigest, setInvoiceDigest] = useState<'daily' | 'weekly' | 'none'>('weekly');

  const [customRule, setCustomRule] = useState('');

  return (
    <div className="max-w-3xl space-y-8">
      <h2 className="text-xl font-semibold">Notifications & Alerts</h2>

      {/* Price Increase Alerts */}
      <section className="space-y-4">
        <h3 className="font-semibold">Price Increase Alerts</h3>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            className="form-checkbox"
            checked={priceAlertsEnabled}
            onChange={() => setPriceAlertsEnabled(!priceAlertsEnabled)}
          />
          Enable notifications
        </label>
        {priceAlertsEnabled && (
          <div className="flex items-center gap-2">
            <span>Notify</span>
            <input
              type="number"
              min={1}
              className="w-20 border rounded px-2 py-1"
              value={priceAlertDays}
              onChange={(e) => setPriceAlertDays(Number(e.target.value))}
            />
            <span>days before change</span>
          </div>
        )}
      </section>

      {/* Trial Ending Reminders */}
      <section className="space-y-4">
        <h3 className="font-semibold">Trial Ending Reminders</h3>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            className="form-checkbox"
            checked={trialRemindersEnabled}
            onChange={() => setTrialRemindersEnabled(!trialRemindersEnabled)}
          />
          Enable reminders
        </label>
        {trialRemindersEnabled && (
          <div className="flex items-center gap-2">
            <span>Notify</span>
            <input
              type="number"
              min={1}
              className="w-20 border rounded px-2 py-1"
              value={trialReminderDays}
              onChange={(e) => setTrialReminderDays(Number(e.target.value))}
            />
            <span>days before trial ends</span>
          </div>
        )}
      </section>

      {/* Upcoming Charges */}
      <section className="space-y-4">
        <h3 className="font-semibold">Upcoming Charges</h3>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            className="form-checkbox"
            checked={upcomingChargesEnabled}
            onChange={() => setUpcomingChargesEnabled(!upcomingChargesEnabled)}
          />
          Enable weekly summary
        </label>
        {upcomingChargesEnabled && (
          <label className="flex items-center gap-3 ml-6">
            <input
              type="checkbox"
              className="form-checkbox"
              checked={includeCalendarSync}
              onChange={() => setIncludeCalendarSync(!includeCalendarSync)}
            />
            Include calendar sync
          </label>
        )}
      </section>

      {/* Invoice Summary Digest */}
      <section className="space-y-4">
        <h3 className="font-semibold">Invoice Summary Digest</h3>
        <div className="flex gap-4">
          {['daily', 'weekly', 'none'].map((opt) => (
            <label key={opt} className="flex items-center gap-2 capitalize">
              <input
                type="radio"
                name="invoiceDigest"
                className="form-radio"
                checked={invoiceDigest === opt}
                onChange={() => setInvoiceDigest(opt as 'daily' | 'weekly' | 'none')}
              />
              {opt}
            </label>
          ))}
        </div>
      </section>

      {/* Custom Rules */}
      <section className="space-y-4">
        <h3 className="font-semibold">Custom Rules</h3>
        <textarea
          className="w-full border rounded p-2"
          placeholder="e.g. Notify me if anything over $50 appears"
          value={customRule}
          onChange={(e) => setCustomRule(e.target.value)}
        />
      </section>
    </div>
  );
};

export default NotificationsSettings; 