import { useNavigate, useParams, Link } from 'react-router-dom';
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

  const ActiveComponent = sections.find((s) => s.key === section)?.component || AccountSettings;

  return (
    <SettingsProvider>
    <div className="min-h-screen bg-gray-50 lg:ml-64 flex flex-col lg:flex-row">
      {/* Mobile header */}
      <div className="lg:hidden bg-[#26457A] text-white shadow-sm">
        <div className="px-4 py-3 flex items-center">
          {section ? (
            <Link
              to="/settings"
              className="mr-3 p-1 rounded-md hover:bg-white/10"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
          ) : (
            <Link
              to="/dashboard"
              className="mr-3 p-1 rounded-md hover:bg-white/10"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
          )}
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>
      </div>

      {/* Desktop settings sidebar */}
      <aside className="hidden lg:block w-56 border-r bg-white">
        <nav className="py-6 space-y-1">
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={() => navigate(`/settings/${s.key}`)}
              className={`w-full text-left px-6 py-2 text-sm font-medium rounded-r-full transition-colors
                ${section === s.key ? 'bg-gray-100 text-[#26457A]' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
        {/* Mobile list or component */}
        {!section ? (
          <div className="lg:hidden space-y-3">
            {sections.map((s) => (
              <Link
                key={s.key}
                to={`/settings/${s.key}`}
                className="block bg-white border rounded-lg shadow-sm px-4 py-3 text-gray-700 hover:bg-gray-50"
              >
                {s.label}
              </Link>
            ))}
          </div>
        ) : null}

        {/* Show the active component when a section is selected OR always on desktop */}
        {(section || window.innerWidth >= 1024) && <ActiveComponent />}
      </main>
    </div>
    </SettingsProvider>
  );
};

export default Settings; 