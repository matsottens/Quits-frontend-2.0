import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SettingsProvider } from '../context/SettingsContext';
import AccountSettings from '../components/settings/AccountSettings';
import PersonalizationSettings from '../components/settings/PersonalizationSettings';
import NotificationsSettings from '../components/settings/NotificationsSettings';
import PrivacySecuritySettings from '../components/settings/PrivacySecuritySettings';
import IntegrationsSettings from '../components/settings/IntegrationsSettings';
import EmailAccountsSettings from '../components/settings/EmailAccountsSettings';
import DataExportSettings from '../components/settings/DataExportSettings';
import HelpFeedbackSettings from '../components/settings/HelpFeedbackSettings';

const sections = [
  { key: 'account', label: 'Account', component: AccountSettings },
  { key: 'personalization', label: 'Personalization', component: PersonalizationSettings },
  { key: 'notifications', label: 'Notifications', component: NotificationsSettings },
  { key: 'privacy', label: 'Privacy & Security', component: PrivacySecuritySettings },
  { key: 'integrations', label: 'Integrations', component: IntegrationsSettings },
  { key: 'email', label: 'Email Accounts', component: EmailAccountsSettings },
  { key: 'data', label: 'Data & Export', component: DataExportSettings },
  { key: 'help', label: 'Help & Feedback', component: HelpFeedbackSettings },
] as const;

const Settings = () => {
  const { section } = useParams();
  const navigate = useNavigate();

  const [active, setActive] = useState<string>(section as string || 'account');

  // Keep state in sync with URL changes
  useEffect(() => {
    if (section && sections.find(s => s.key === section)) {
      setActive(section);
    }
  }, [section]);

  const ActiveComponent = sections.find((s) => s.key === active)?.component || AccountSettings;

  return (
    <SettingsProvider>
    <div className="min-h-screen bg-gray-50 lg:ml-64 flex">
      {/* Internal settings sidebar */}
      <aside className="hidden lg:block w-56 border-r bg-white">
        <nav className="py-6 space-y-1">
          {sections.map((section) => (
            <button
              key={section.key}
              onClick={() => {
                navigate(`/settings/${section.key}`);
                setActive(section.key);
              }}
              className={`w-full text-left px-6 py-2 text-sm font-medium rounded-r-full transition-colors
                ${active === section.key ? 'bg-gray-100 text-[#26457A]' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {section.label}
            </button>
          ))}
        </nav>
      </aside>
      {/* Main settings content */}
      <main className="flex-1 p-6 overflow-y-auto">
        <ActiveComponent />
      </main>
    </div>
    </SettingsProvider>
  );
};

export default Settings; 