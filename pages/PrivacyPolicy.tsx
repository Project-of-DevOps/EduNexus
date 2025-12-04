import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-[rgb(var(--background-color))] text-[rgb(var(--text-color))] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link to="/login" className="text-[rgb(var(--primary-color))] hover:underline">
            ← Back to Login
          </Link>
        </div>

        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-sm text-[rgb(var(--text-secondary-color))] mb-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="mb-4">
              EduNexus AI ("Company," "We," "Our," or "Us") is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information 
              when you visit our website and use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            <div className="space-y-3">
              <h3 className="text-xl font-semibold">Personal Information You Provide</h3>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Name, email address, and password</li>
                <li>Organization name and type (school/institute)</li>
                <li>User role and department information</li>
                <li>Academic records and performance data</li>
                <li>Any other information you voluntarily provide</li>
              </ul>

              <h3 className="text-xl font-semibold mt-4">Automatically Collected Information</h3>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>IP address and device identifiers</li>
                <li>Cookies and browser information</li>
                <li>Pages visited and time spent on the platform</li>
                <li>Login and logout timestamps</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>To provide and improve our services</li>
              <li>To authenticate and authorize access</li>
              <li>To send important notifications and updates</li>
              <li>To analyze platform usage and trends</li>
              <li>To comply with legal obligations</li>
              <li>To prevent fraud and abuse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
            <p>
              We implement industry-standard security measures including encryption, secure authentication, 
              and regular security audits to protect your data. However, no transmission over the internet is 
              100% secure. We cannot guarantee absolute security of your information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data Retention</h2>
            <p>
              We retain your personal information for as long as necessary to provide our services and comply 
              with legal obligations. You may request deletion of your account and associated data at any time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Third-Party Services</h2>
            <p>
              We may use third-party services such as email providers, analytics tools, and cloud storage. 
              These services have their own privacy policies, and we encourage you to review them.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Your Rights</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Right to access your personal data</li>
              <li>Right to correct inaccurate information</li>
              <li>Right to request deletion of your data</li>
              <li>Right to opt-out of marketing communications</li>
              <li>Right to data portability</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or our privacy practices, 
              please contact us at: <strong>privacy@edunexus.ai</strong>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Policy Updates</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by 
              updating the "Last updated" date at the top of this document.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
