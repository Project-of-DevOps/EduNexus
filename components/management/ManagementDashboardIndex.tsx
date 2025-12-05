import React, { useState } from 'react';
import Layout from '../Layout';
import DashboardOverview from './DashboardOverview';

const ManagementDashboardIndex: React.FC = () => {
  const [activeItem, setActiveItem] = useState<string>('Overview');
  const navItems = [
    { name: 'Overview', icon: <span /> },
    { name: 'Users', icon: <span /> },
    { name: 'Classes', icon: <span /> },
    { name: 'Departments', icon: <span /> },
  ];

  return (
    <Layout navItems={navItems} activeItem={activeItem} setActiveItem={setActiveItem}>
      <div className="p-6">
        <h1 className="text-3xl font-bold">Management Dashboard</h1>
        <DashboardOverview stats={{ totalUsers: 0, totalTeachers: 0, totalStudents: 0, totalParents: 0, totalDepartments: 0, totalClasses: 0, pendingApprovals: 0, activeSessionsCount: 0 }} />
      </div>
    </Layout>
  );
};

export default ManagementDashboardIndex;
