import React from 'react';
import { Link } from 'react-router-dom';

const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen bg-[rgb(var(--background-color))] text-[rgb(var(--text-color))] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link to="/login" className="text-[rgb(var(--primary-color))] hover:underline">
            ← Back to Login
          </Link>
        </div>

        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-sm text-[rgb(var(--text-secondary-color))] mb-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Agreement to Terms</h2>
            <p className="mb-4">
              By accessing and using the EduNexus AI platform, you accept and agree to be bound by the 
              terms and provision of this agreement. If you do not agree to abide by the above, 
              please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Use License</h2>
            <p className="mb-4">
              Permission is granted to temporarily download one copy of the materials (information or software) 
              on EduNexus AI for personal, non-commercial transitory viewing only. This is the grant of a license, 
              not a transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Modifying or copying the materials</li>
              <li>Using the materials for any commercial purpose or for any public display</li>
              <li>Attempting to decompile or reverse engineer any software</li>
              <li>Removing any copyright or other proprietary notations from the materials</li>
              <li>Transferring the materials to another person or "mirroring" the materials on any server</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Disclaimer</h2>
            <p>
              The materials on EduNexus AI are provided on an 'as is' basis. EduNexus AI makes no warranties, 
              expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, 
              implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement 
              of intellectual property or other violation of rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Limitations</h2>
            <p>
              In no event shall EduNexus AI or its suppliers be liable for any damages (including, without limitation, 
              damages for loss of data or profit, or due to business interruption) arising out of the use or inability 
              to use the materials on EduNexus AI, even if we or our authorized representative has been notified orally 
              or in writing of the possibility of such damage.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Accuracy of Materials</h2>
            <p>
              The materials appearing on EduNexus AI could include technical, typographical, or photographic errors. 
              EduNexus AI does not warrant that any of the materials on our website are accurate, complete, or current. 
              EduNexus AI may make changes to the materials contained on its website at any time without notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Links</h2>
            <p>
              EduNexus AI has not reviewed all of the sites linked to its website and is not responsible for the contents 
              of any such linked site. The inclusion of any link does not imply endorsement by EduNexus AI of the site. 
              Use of any such linked website is at the user's own risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Modifications</h2>
            <p>
              EduNexus AI may revise these terms of service for its website at any time without notice. 
              By using this website, you are agreeing to be bound by the then current version of these terms of service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Governing Law</h2>
            <p>
              These terms and conditions are governed by and construed in accordance with the laws of the jurisdiction 
              in which EduNexus AI is located, and you irrevocably submit to the exclusive jurisdiction of the courts 
              in that location.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. User Responsibilities</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>You are responsible for maintaining the confidentiality of your account credentials</li>
              <li>You agree not to use the service for any unlawful purposes</li>
              <li>You agree not to harass, abuse, or threaten other users</li>
              <li>You are responsible for all activities that occur under your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Contact</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at: 
              <strong>support@edunexus.ai</strong>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
