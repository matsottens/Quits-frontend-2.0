import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const Privacy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Privacy Policy - Quits</title>
      </Helmet>
      
      <div className="max-w-3xl mx-auto bg-white p-8 shadow-md rounded-lg">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900">Privacy Policy</h1>
          <Link to="/login" className="text-sm font-medium text-primary-600 hover:text-primary-500">
            &larr; Back to Login
          </Link>
        </div>
        
        <div className="prose prose-lg max-w-none text-gray-700">
          <p><strong>Last Updated: July 22, 2024</strong></p>

          <p>Quits ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application and services ("Service").</p>

          <h2>1. Information We Collect</h2>
          <p>We may collect the following types of information:</p>
          <ul>
            <li><strong>Personal Information:</strong> When you register for our Service, you provide us with your Google account information, including your name, email address, and profile picture.</li>
            <li><strong>Email Metadata:</strong> To provide our core functionality, we access your email inbox with your permission. We do not store your emails. We only process them in real-time to extract metadata related to potential subscriptions. This metadata includes sender's email address, subject line, date, and parts of the email body relevant to identifying a subscription.</li>
            <li><strong>Subscription Information:</strong> We store the subscription details we extract or that you provide manually, such as service name, price, billing cycle, and next billing date.</li>
            <li><strong>Usage Data:</strong> We may collect information about how you interact with our Service, such as feature usage and crash reports, to help us improve our product.</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, operate, and maintain our Service.</li>
            <li>Create and manage your account.</li>
            <li>Identify and display your subscriptions on your personal dashboard.</li>
            <li>Communicate with you about your account or our services.</li>
            <li>Improve and personalize our Service.</li>
            <li>Ensure the security of our systems and prevent fraud.</li>
          </ul>

          <h2>3. How We Share Your Information</h2>
          <p>We do not sell or rent your personal information to third parties. We may share your information in the following limited circumstances:</p>
          <ul>
            <li><strong>With Service Providers:</strong> We use third-party services to operate our application, such as Google for authentication and cloud hosting providers. These service providers only have access to the information necessary to perform their functions and are obligated to protect your data.</li>
            <li><strong>For Legal Reasons:</strong> We may disclose your information if required by law or in response to valid requests by public authorities.</li>
            <li><strong>To Protect Our Rights:</strong> We may disclose information to protect our rights, property, or safety, or that of our users or the public.</li>
          </ul>
          
          <h2>4. Data Security</h2>
          <p>We use industry-standard security measures to protect your information. This includes using encryption for data in transit (TLS) and at rest. Access to your data is strictly limited to authorized personnel and services required to operate Quits.</p>

          <h2>5. Your Data Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access, update, or delete your personal information through your account settings.</li>
            <li>Revoke our access to your Google account at any time through your Google Account settings. Doing so will prevent the Service from functioning.</li>
            <li>Delete your entire account and all associated data from within the Quits application settings.</li>
          </ul>

          <h2>6. Third-Party Services</h2>
          <p>Our Service relies on Google's API for authentication and Gmail access. Your use of these services is subject to Google's own <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary-600">Privacy Policy</a>.</p>
          
          <h2>7. Changes to This Privacy Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date. We encourage you to review this policy periodically.</p>

          <h2>8. Contact Us</h2>
          <p>If you have any questions or concerns about this Privacy Policy, please contact us at <a href="mailto:privacy@quits.cc" className="text-primary-600">privacy@quits.cc</a>.</p>
        </div>
      </div>
    </div>
  );
};

export default Privacy; 