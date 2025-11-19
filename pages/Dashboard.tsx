
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';
import TeacherDashboard from '../components/teacher/TeacherDashboard';
import StudentDashboard from '../components/student/StudentDashboard';
import ParentDashboard from '../components/parent/ParentDashboard';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return <div>Loading user data...</div>;
  }

  switch (user.role) {
    case UserRole.Teacher:
    case UserRole.Dean:
      return <TeacherDashboard />;
    case UserRole.Student:
      return <StudentDashboard />;
    case UserRole.Parent:
      return <ParentDashboard />;
    default:
      return <div>Unknown user role.</div>;
  }
};

export default Dashboard;
