import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const Terms: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Terms of Service - Quits</title>
      </Helmet>
      
      <div className="max-w-3xl mx-auto bg-white p-8 shadow-md rounded-lg">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900">Terms of Service</h1>
          <Link to="/login" className="text-sm font-medium text-primary-600 hover:text-primary-500">
            &larr; Back to Login
          </Link>
        </div>
        
        <div className="prose prose-lg max-w-none text-gray-700">
          <p><strong>Last Updated: July 22, 2024</strong></p>

          <p>Welcome to Quits! These Terms of Service ("Terms") govern your use of the Quits application and services ("Service"). By using our Service, you agree to be bound by these Terms. If you do not agree to these Terms, do not use the Service.</p>

          <h2>1. Description of Service</h2>
          <p>Quits is a subscription management application that helps you track, manage, and cancel your recurring subscriptions. The Service works by scanning your email inbox (with your explicit permission) to automatically identify subscriptions and provide you with a consolidated dashboard.</p>

          <h2>2. User Accounts</h2>
          <p>To use Quits, you must authenticate using your Google account. You are responsible for all activities that occur under your account and for keeping your login credentials secure. You agree to notify us immediately of any unauthorized use of your account.</p>

          <h2>3. Privacy and Data</h2>
          <p>Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your personal data. By using our Service, you agree to the terms of our <Link to="/privacy" className="text-primary-600 hover:text-primary-500">Privacy Policy</Link>.</p>
          
          <p>You grant Quits a limited, non-exclusive, revocable license to access your email inbox for the sole purpose of identifying subscription-related emails. We do not store your emails. We only store extracted metadata related to potential subscriptions, such as sender, subject, and date.</p>

          <h2>4. User Conduct</h2>
          <p>You agree not to use the Service for any unlawful purpose or in any way that could harm, disable, or overburden the Service. You agree not to:</p>
          <ul>
            <li>Interfere with the security or functionality of the Service.</li>
            <li>Use any automated system to access the Service in a manner that sends more request messages to our servers than a human can reasonably produce in the same period.</li>
            <li>Attempt to gain unauthorized access to any part of the Service or its related systems.</li>
          </ul>

          <h2>5. Intellectual Property</h2>
          <p>All content and materials available on Quits, including but not limited to text, graphics, website name, code, images, and logos are the intellectual property of Quits and are protected by applicable copyright and trademark law.</p>

          <h2>6. Disclaimers and Limitation of Liability</h2>
          <p>The Service is provided on an "as is" and "as available" basis. We do not warrant that the service will be uninterrupted, error-free, or completely secure. The accuracy of subscription detection depends on the content of your emails and may not be 100% accurate.</p>
          <p>In no event shall Quits be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the Service.</p>

          <h2>7. Termination</h2>
          <p>We may terminate or suspend your access to our Service at any time, without prior notice or liability, for any reason, including if you breach these Terms. You can terminate your account at any time by deleting your account in the settings page.</p>
          
          <h2>8. Governing Law</h2>
          <p>These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Quits operates, without regard to its conflict of law provisions.</p>

          <h2>9. Changes to Terms</h2>
          <p>We reserve the right to modify these Terms at any time. We will notify you of any changes by posting the new Terms on this page. Your continued use of the Service after any such changes constitutes your acceptance of the new Terms.</p>

          <h2>10. Contact Us</h2>
          <p>If you have any questions about these Terms, please contact us at <a href="mailto:support@quits.cc" className="text-primary-600">support@quits.cc</a>.</p>
        </div>
      </div>
    </div>
  );
};

export default Terms; 