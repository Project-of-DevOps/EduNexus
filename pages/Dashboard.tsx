import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return <div>Loading user data...</div>;
  }

  switch (user.role) {
    case UserRole.Teacher:
    case UserRole.Dean:
      return <Navigate to="/dashboard/teacher" replace />;
    case UserRole.Student:
      return <Navigate to="/dashboard/student" replace />;
    case UserRole.Parent:
      return <Navigate to="/dashboard/parent" replace />;
    case UserRole.Management:
      return <Navigate to="/dashboard/management" replace />;
    case UserRole.Librarian:
      return <Navigate to="/dashboard/librarian" replace />;
    default:
      return <div>Unknown user role: {(user as any).role}</div>;
  }
};

export default Dashboard;
