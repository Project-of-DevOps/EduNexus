import React from 'react';
import { UserRole } from '../types';
import UnifiedLoginForm from '../components/Login/UnifiedLoginForm';

const StudentLogin: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--background-color))] px-4 text-gray-900">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-[#1e3a8a]">EduNexus AI</h1>
          <p className="mt-2 text-lg font-bold text-gray-900">Student Portal</p>
        </div>

        <UnifiedLoginForm defaultRole={UserRole.Student} />
      </div>
    </div>
  );
};

export default StudentLogin;
