import React from 'react';
import { Link } from 'react-router-dom';

const HelpCenter: React.FC = () => {
  const [expanded, setExpanded] = React.useState<string | null>(null);

  const faqs = [
    {
      id: 'login',
      question: 'How do I log in to EduNexus?',
      answer: 'Enter your email address on the login page and select your role (Teacher, Student, Parent, Management, or Librarian). Then provide your password or use the magic link option.'
    },
    {
      id: 'password',
      question: 'I forgot my password. What do I do?',
      answer: 'Click "Forgot password?" on the login page. Enter your email address and we\'ll send you a password reset link. If you don\'t receive an email, check your spam folder.'
    },
    {
      id: 'signup',
      question: 'How do I create a new account?',
      answer: 'On the login page, click "Sign up" and fill in your details. Select your organization type (school or institute) and role. Follow the prompts to complete registration.'
    },
    {
      id: 'magic-link',
      question: 'What is the Magic Link login?',
      answer: 'Magic Link is a passwordless login option. Click "Email me a login link" and we\'ll send you a link to sign in without entering a password. The link expires after a short period.'
    },
    {
      id: 'sso',
      question: 'Can I use Google or Microsoft to log in?',
      answer: 'Yes! On the login page, you can click the Google or Microsoft button to sign in using your existing account. This is called Single Sign-On (SSO).'
    },
    {
      id: 'profile',
      question: 'How do I update my profile?',
      answer: 'After logging in, go to your Dashboard and click on your profile picture or name. You can update your personal information, profile photo, and other details.'
    },
    {
      id: 'password-change',
      question: 'How do I change my password?',
      answer: 'Go to Settings or Account page in your dashboard. Look for "Security" or "Change Password" and follow the prompts. You\'ll need to enter your current password first.'
    },
    {
      id: 'data',
      question: 'Is my data secure?',
      answer: 'Yes! We use industry-standard encryption and security practices to protect your data. Your password is hashed and never stored in plain text. Read our Privacy Policy for more details.'
    },
    {
      id: 'access-code',
      question: 'What is an access code?',
      answer: 'Students and parents can use an access code provided by their school/institute to join. Enter this code during signup to get instant access.'
    },
    {
      id: 'support',
      question: 'How do I contact support?',
      answer: 'You can reach our support team at support@edunexus.ai or use the help widget in the dashboard. We typically respond within 24 hours.'
    }
  ];

  return (
    <div className="min-h-screen bg-[rgb(var(--background-color))] text-[rgb(var(--text-color))] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link to="/login" className="text-[rgb(var(--primary-color))] hover:underline">
            ← Back to Login
          </Link>
        </div>

        <h1 className="text-4xl font-bold mb-4">Help Center</h1>
        <p className="text-[rgb(var(--text-secondary-color))] mb-12">
          Find answers to common questions about EduNexus AI. If you can't find what you're looking for, contact our support team.
        </p>

        {/* Quick Links */}
        <div className="mb-12 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-[rgba(var(--primary-color),0.1)] rounded-lg border border-[rgb(var(--primary-color))]">
            <h3 className="font-semibold text-[rgb(var(--primary-color))] mb-2">Getting Started</h3>
            <p className="text-sm">Learn how to set up your account and log in</p>
          </div>
          <div className="p-4 bg-[rgba(var(--primary-color),0.1)] rounded-lg border border-[rgb(var(--primary-color))]">
            <h3 className="font-semibold text-[rgb(var(--primary-color))] mb-2">Account Security</h3>
            <p className="text-sm">Tips for keeping your account safe and secure</p>
          </div>
          <div className="p-4 bg-[rgba(var(--primary-color),0.1)] rounded-lg border border-[rgb(var(--primary-color))]">
            <h3 className="font-semibold text-[rgb(var(--primary-color))] mb-2">Features</h3>
            <p className="text-sm">Explore all the features available in EduNexus</p>
          </div>
          <div className="p-4 bg-[rgba(var(--primary-color),0.1)] rounded-lg border border-[rgb(var(--primary-color))]">
            <h3 className="font-semibold text-[rgb(var(--primary-color))] mb-2">Troubleshooting</h3>
            <p className="text-sm">Solve common issues and problems</p>
          </div>
        </div>

        {/* FAQs */}
        <h2 className="text-3xl font-bold mb-8">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {faqs.map((faq) => (
            <div
              key={faq.id}
              className="border border-[rgb(var(--border-color))] rounded-lg overflow-hidden bg-[rgb(var(--foreground-color))]"
            >
              <button
                onClick={() => setExpanded(expanded === faq.id ? null : faq.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-[rgba(var(--primary-color),0.05)] transition-colors"
              >
                <h3 className="font-semibold text-left">{faq.question}</h3>
                <span className={`text-[rgb(var(--primary-color))] transition-transform ${expanded === faq.id ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
              {expanded === faq.id && (
                <div className="px-6 py-4 border-t border-[rgb(var(--border-color))] bg-[rgba(var(--primary-color),0.02)]">
                  <p className="text-[rgb(var(--text-secondary-color))]">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Support */}
        <div className="mt-12 p-6 bg-[rgba(var(--primary-color),0.1)] rounded-lg border border-[rgb(var(--primary-color))]">
          <h3 className="text-xl font-semibold mb-3">Didn't find your answer?</h3>
          <p className="mb-4">Our support team is here to help!</p>
          <div className="space-y-2">
            <p><strong>Email:</strong> support@edunexus.ai</p>
            <p><strong>Response Time:</strong> Usually within 24 hours</p>
            <p><strong>Available:</strong> Monday - Friday, 9 AM - 6 PM (UTC)</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;
