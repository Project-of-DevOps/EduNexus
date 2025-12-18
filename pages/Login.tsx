import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import UnifiedLoginForm from '../components/Login/UnifiedLoginForm';

const LoginPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
      // If SSO success is happening, let the form handle the 3.5s delay and message
      if (window.location.hash.includes('sso_success')) return;

      if (user.role === 'Management') navigate('/dashboard/management');
      else if (user.role === 'Teacher') navigate('/dashboard/teacher');
      else if (user.role === 'Student') navigate('/dashboard');
      else if (user.role === 'Parent') navigate('/dashboard/parent');
      else if (user.role === 'Librarian') navigate('/dashboard/librarian');
      else navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="h-screen w-screen flex bg-white font-sans text-gray-900 overflow-hidden">
      {/* Left Column - Hero/Brand (40% width on Desktop, Hidden on Mobile) - FIXED */}
      <div className="hidden lg:flex lg:w-5/12 h-full relative bg-blue-900 border-r border-blue-800">
        {/* Background: gradient fallback plus optional hero image (serves even if the asset is missing) */}
        <div className="absolute inset-0 bg-cover bg-center opacity-90" style={{ backgroundImage: `linear-gradient(180deg, rgba(14,45,102,0.75), rgba(59,130,246,0.35)), url('/login-hero.svg')` }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-blue-900/95 via-blue-900/40 to-blue-900/10"></div>

        <div className="relative z-10 flex flex-col justify-end p-12 text-white pb-20 h-full">
          <div className="mb-auto mt-10">
            <div className="h-14 w-14 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 shadow-lg">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight mb-4 drop-shadow-sm">EduNexus AI</h1>
          <p className="text-xl text-blue-100 font-medium max-w-sm leading-relaxed">
            The intelligent platform empowering modern education through connection and innovation.
          </p>
        </div>
      </div>

      {/* Right Column - Login Form (60% width on Desktop, Full on Mobile) - SCROLLABLE */}
      <div className="w-full lg:w-7/12 h-full overflow-y-auto scrollbar-hide flex flex-col items-center bg-gray-50/50">
        <div className="w-full max-w-md space-y-8 py-12 px-4 sm:px-8 lg:px-12">
          <div className="text-center lg:text-left select-none">
            <h2 className="text-3xl font-bold text-gray-900">Sign in</h2>
            <p className="mt-2 text-sm text-gray-500">
              Welcome back! Please enter your details.
            </p>
          </div>

          <div className="mt-8">
            <UnifiedLoginForm />
          </div>

          <div className="mt-6 text-center text-xs text-gray-400 space-y-2 select-none">
            <div className="flex justify-center lg:justify-start space-x-4">
              <Link to="/privacy-policy" className="hover:text-gray-600 transition-colors hover:underline">Privacy Policy</Link>
              <span>&bull;</span>
              <Link to="/terms-of-service" className="hover:text-gray-600 transition-colors hover:underline">Terms of Service</Link>
              <span>&bull;</span>
              <Link to="/help-center" className="hover:text-gray-600 transition-colors hover:underline">Help Center</Link>
            </div>
            <p className="lg:text-left">&copy; {new Date().getFullYear()} EduNexus AI. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;