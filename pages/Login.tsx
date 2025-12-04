import React from 'react';
import { Link } from 'react-router-dom';
import UnifiedLoginForm from '../components/Login/UnifiedLoginForm';

const LoginPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[url('https://images.unsplash.com/photo-1497294815431-9365093b7331?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80')] bg-cover bg-center relative select-none" onContextMenu={(e) => {
      // Prevent right-click menu on login page (except inputs)
      const target = e.target as HTMLElement;
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        e.preventDefault();
      }
    }}>
      {/* Overlay for better text contrast */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 to-indigo-900/80 backdrop-blur-sm pointer-events-none"></div>

      <div className="w-full max-w-md space-y-8 relative z-10 px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center select-none">
          <div className="mx-auto h-16 w-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-2xl mb-6 border border-white/20 pointer-events-none">
            <svg className="h-10 w-10 text-white pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight drop-shadow-md pointer-events-none">
            Sign in to EduNexus
          </h1>
          <p className="mt-2 text-base text-blue-100 font-medium pointer-events-none">
            The intelligent platform for modern education
          </p>
        </div>

        <UnifiedLoginForm />

        <div className="mt-8 text-center text-xs text-blue-200/80 space-y-4 select-none">
          <div className="flex justify-center space-x-6">
            <Link to="/privacy-policy" className="hover:text-white transition-colors hover:underline select-auto">Privacy Policy</Link>
            <span>&bull;</span>
            <Link to="/terms-of-service" className="hover:text-white transition-colors hover:underline select-auto">Terms of Service</Link>
            <span>&bull;</span>
            <Link to="/help-center" className="hover:text-white transition-colors hover:underline select-auto">Help Center</Link>
          </div>
          <p className="opacity-75">&copy; {new Date().getFullYear()} EduNexus AI. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;