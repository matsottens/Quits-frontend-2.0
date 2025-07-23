import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react--router-dom';
import { useLogo } from '../hooks/useLogo';

const PrivacyPolicy: React.FC = () => {
  const { logoUrl, handleImageError } = useLogo();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Privacy Policy - Quits</title>
      </Helmet>
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-center mb-8">
          <Link to="/">
            <img
              src={logoUrl}
              alt="Quits"
              className="h-12 w-auto"
              onError={handleImageError}
            />
          </Link>
        </div>
        <div className="bg-white shadow sm:rounded-lg p-8">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-6">Privacy Policy</h1>

          <div className="prose prose-indigo max-w-none text-gray-600">
            <p>Last updated: {new Date().toLocaleDateString()}</p>

            <p>This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.</p>

            <p>We use your data to provide and improve the Service. By using the Service, you agree to the collection and use of information in accordance with this policy.</p>

            <h2>1. Information Collection and Use</h2>
            <p>We collect several different types of information for various purposes to provide and improve our Service to you.</p>
            
            <h3>Types of Data Collected</h3>
            <ul>
              <li><strong>Personal Data:</strong> While using our Service, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you ("Personal Data"). Personally identifiable information may include, but is not limited to: Email address, First name and last name, Cookies and Usage Data.</li>
              <li><strong>Google User Data:</strong> To provide our core service, we require access to your Google account to scan your emails. We only request read-only access to your Gmail messages ('gmail.readonly'). We do not store your emails. We process email content in-memory to identify subscriptions and only store metadata related to potential subscriptions (like sender, subject, and date) for analysis.</li>
              <li><strong>Usage Data:</strong> We may also collect information on how the Service is accessed and used ("Usage Data"). This Usage Data may include information such as your computer's Internet Protocol address (e.g. IP address), browser type, browser version, the pages of our Service that you visit, the time and date of your visit, the time spent on those pages, unique device identifiers and other diagnostic data.</li>
            </ul>

            <h2>2. Use of Data</h2>
            <p>Quits uses the collected data for various purposes:</p>
            <ul>
              <li>To provide and maintain our Service</li>
              <li>To notify you about changes to our Service</li>
              <li>To allow you to participate in interactive features of our Service when you choose to do so</li>
              <li>To provide customer support</li>
              <li>To gather analysis or valuable information so that we can improve our Service</li>
              <li>To monitor the usage of our Service</li>
              <li>To detect, prevent and address technical issues</li>
            </ul>
            
            <p>Our use and transfer of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy#additional_requirements_for_specific_api_scopes" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements.</p>

            <h2>3. Data Storage and Security</h2>
            <p>We store information about identified subscriptions in our database, associated with your user account. This includes details like subscription name, price, and billing cycle.</p>
            <p>The security of your data is important to us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.</p>

            <h2>4. Service Providers</h2>
            <p>We may employ third-party companies and individuals to facilitate our Service ("Service Providers"), to provide the Service on our behalf, to perform Service-related services or to assist us in analyzing how our Service is used. These third parties have access to your Personal Data only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose.</p>

            <h2>5. Your Data Rights</h2>
            <p>You have the right to access, update, or delete the information we have on you. You can manage your subscriptions directly from your dashboard. If you wish to delete your account and all associated data, please contact us.</p>
            
            <h2>6. Changes to This Privacy Policy</h2>
            <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.</p>
            <p>You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.</p>

            <h2>Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us.</p>
          </div>
        </div>
        <div className="text-center mt-6">
          <Link to="/login" className="text-sm font-medium text-primary-600 hover:text-primary-500">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy; 