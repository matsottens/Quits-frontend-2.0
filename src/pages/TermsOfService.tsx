import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useLogo } from '../hooks/useLogo';

const TermsOfService: React.FC = () => {
  const { logoUrl, handleImageError } = useLogo();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Terms of Service - Quits</title>
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
          <h1 className="text-3xl font-extrabold text-gray-900 mb-6">Terms of Service</h1>
          
          <div className="prose prose-indigo max-w-none text-gray-600">
            <p>Last updated: {new Date().toLocaleDateString()}</p>

            <p>Please read these Terms of Service ("Terms", "Terms of Service") carefully before using the Quits application (the "Service") operated by us.</p>

            <p>Your access to and use of the Service is conditioned on your acceptance of and compliance with these Terms. These Terms apply to all visitors, users, and others who access or use the Service.</p>

            <p>By accessing or using the Service you agree to be bound by these Terms. If you disagree with any part of the terms then you may not access the Service.</p>

            <h2>1. Accounts</h2>
            <p>When you create an account with us, you must provide us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.</p>
            <p>You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password, whether your password is with our Service or a third-party service.</p>
            <p>You agree not to disclose your password to any third party. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.</p>

            <h2>2. Service Provision</h2>
            <p>Our Service provides users with an analysis of their email inboxes to identify recurring subscriptions. This is done by connecting to your Google account using OAuth2 and scanning your emails for patterns related to subscriptions.</p>
            <p>The accuracy of the subscription detection is not guaranteed. The Service is provided on an "AS IS" and "AS AVAILABLE" basis. The Service is provided without warranties of any kind, whether express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, non-infringement or course of performance.</p>

            <h2>3. Intellectual Property</h2>
            <p>The Service and its original content, features and functionality are and will remain the exclusive property of Quits and its licensors. The Service is protected by copyright, trademark, and other laws of both the United States and foreign countries.</p>

            <h2>4. Links To Other Web Sites</h2>
            <p>Our Service may contain links to third-party web sites or services that are not owned or controlled by Quits.</p>
            <p>Quits has no control over, and assumes no responsibility for, the content, privacy policies, or practices of any third party web sites or services. You further acknowledge and agree that Quits shall not be responsible or liable, directly or indirectly, for any damage or loss caused or alleged to be caused by or in connection with use of or reliance on any such content, goods or services available on or through any such web sites or services.</p>

            <h2>5. Termination</h2>
            <p>We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>
            <p>Upon termination, your right to use the Service will immediately cease. If you wish to terminate your account, you may simply discontinue using the Service.</p>

            <h2>6. Limitation Of Liability</h2>
            <p>In no event shall Quits, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service; (iii) any content obtained from the Service; and (iv) unauthorized access, use or alteration of your transmissions or content, whether based on warranty, contract, tort (including negligence) or any other legal theory, whether or not we have been informed of the possibility of such damage, and even if a remedy set forth herein is found to have failed of its essential purpose.</p>

            <h2>7. Governing Law</h2>
            <p>These Terms shall be governed and construed in accordance with the laws of the jurisdiction in which the company is based, without regard to its conflict of law provisions.</p>

            <h2>8. Changes</h2>
            <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.</p>

            <h2>Contact Us</h2>
            <p>If you have any questions about these Terms, please contact us.</p>
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

export default TermsOfService; 