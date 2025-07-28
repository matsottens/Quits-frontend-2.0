import { Link } from 'react-router-dom';

const HelpFeedbackSettings = () => (
  <div className="max-w-3xl space-y-6">
    <h2 className="text-xl font-semibold mb-4">Help & Feedback</h2>
    <ul className="list-disc pl-6 space-y-2 text-blue-600">
      <li><Link to="/help-center">Help Center</Link></li>
      <li><Link to="/contact-support">Contact Support</Link></li>
      <li><Link to="/submit-feedback">Submit Feedback</Link></li>
      <li><Link to="/report-bug">Report a Bug</Link></li>
      <li><Link to="/changelog">View Changelog</Link></li>
    </ul>
  </div>
);
export default HelpFeedbackSettings; 