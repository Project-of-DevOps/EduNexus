import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--background-color))] px-4 text-gray-900">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-[#1e3a8a]">
            EduNexus AI
          </h1>
          <p className="mt-2 text-sm text-[rgb(var(--text-secondary-color))]">
            Select your role to continue
          </p>
        </div>

        <Card>
          <div className="space-y-4">
            <Button
              className="w-full py-4 text-lg"
              variant="outline"
              onClick={() => navigate('/login/management')}
            >
              Management
            </Button>
            <Button
              className="w-full py-4 text-lg"
              variant="outline"
              onClick={() => navigate('/login/teacher')}
            >
              Teacher
            </Button>
            <Button
              className="w-full py-4 text-lg"
              variant="outline"
              onClick={() => navigate('/login/student')}
            >
              Student
            </Button>
            <Button
              className="w-full py-4 text-lg"
              variant="outline"
              onClick={() => navigate('/login/parent')}
            >
              Parent
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;