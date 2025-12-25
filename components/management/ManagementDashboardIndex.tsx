import React, { useState } from 'react';
import Layout from '../Layout';
import DashboardOverview from './DashboardOverview';

const ManagementDashboardIndex: React.FC = () => {
  const [activeItem, setActiveItem] = useState<string>('Overview');
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  // Fetch pending requests specifically when "Requests" tab is active
  // Real implementation would move this to a useEffect or react-query
  // For now we just placeholder the UI structure

  const navItems = [
    { name: 'Overview', icon: <span /> },
    { name: 'Requests', icon: <span /> },
    { name: 'Users', icon: <span /> },
    { name: 'Classes', icon: <span /> },
    { name: 'Departments', icon: <span /> },
  ];

  return (
    <Layout navItems={navItems} activeItem={activeItem} setActiveItem={setActiveItem}>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Management Dashboard</h1>

        {activeItem === 'Overview' && (
          <DashboardOverview stats={{ totalUsers: 0, totalTeachers: 0, totalStudents: 0, totalParents: 0, totalDepartments: 0, totalClasses: 0, pendingApprovals: pendingRequests.length, activeSessionsCount: 0 }} />
        )}

        {activeItem === 'Requests' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Pending Requests</h2>
            <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700">
              <p className="font-bold">Alert System</p>
              <p>New teacher applications requiring approval will appear here.</p>
            </div>
            {/* Future: <ManagementSignupsManager signups={pendingRequests} /> */}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ManagementDashboardIndex;
