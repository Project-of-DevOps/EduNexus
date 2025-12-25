import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useData } from '../context/DataContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { useAuth } from '../hooks/useAuth';
import { getApiUrl } from '../utils/config';
import axios from 'axios';


export const ManagementSignupsContent: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // State to track selected role for each user: { [userId]: "HOD", ... }
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});

  // Determine Org ID and Type
  const currentInstituteId = (user as any)?.instituteId || (user as any)?.organization_id || null;
  const isInstitute = (user as any)?.type === 'institute';
  const availableRoles = isInstitute
    ? ["HOD", "Professor", "Associate Professor", "Class Teacher(Advisor)", "Subject Teacher"]
    : ["HOD", "Senior Teacher", "Class Teacher", "Subject Teacher"];

  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const apiUrl = getApiUrl();
      // Use Node API
      const url = currentInstituteId
        ? `${apiUrl}/api/management/requests?org_id=${currentInstituteId}`
        : null;

      if (!url) {
        // If no org ID, maybe user is not setup correctly or is super admin?
        // For now, just stop or handle gracefully.
        setLoading(false);
        return;
      }

      const res = await axios.get(url, { withCredentials: true });
      if (res.data) {
        setRequests(res.data);
      }
    } catch (e: any) {
      console.error(e);
      const msg = e.response?.data?.error || e.message || 'Failed to fetch requests';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const handleRoleChange = (userId: string, role: string) => {
    setSelectedRoles(prev => ({ ...prev, [userId]: role }));
  };

  const handleApprove = async (requestId: string, userId: string) => {
    const assignedRole = selectedRoles[userId];
    if (!assignedRole) {
      setError('Please assign a role before accepting.');
      return;
    }

    try {
      const apiUrl = getApiUrl();
      await axios.post(`${apiUrl}/api/management/requests/accept`, {
        request_id: requestId,
        assigned_role_title: assignedRole
      }, { withCredentials: true });
      setSuccessMsg('Request Approved');
      fetchRequests();
    } catch (e) {
      console.error(e);
      setError('Failed to approve request');
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      const apiUrl = getApiUrl();
      await axios.post(`${apiUrl}/api/management/requests/reject`, { request_id: requestId }, { withCredentials: true });
      setSuccessMsg('Request Rejected');
      fetchRequests();
    } catch (e) {
      console.error(e);
      setError('Failed to reject request');
    }
  };

  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(''), 3000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Requests</h2>
        <Button onClick={fetchRequests} disabled={loading}>{loading ? 'Loading...' : 'Refresh Queue'}</Button>
      </div>

      {successMsg && (
        <div className="p-4 bg-green-100 text-green-800 rounded border border-green-200">
          {successMsg}
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-100 text-red-800 rounded border border-red-200">
          {error}
        </div>
      )}

      <Card className="p-4">
        {requests.length === 0 && !loading && <p className="text-gray-500 font-bold italic">No pending requests.</p>}

        <div className="space-y-4">
          {requests.map(req => {
            return (
              <div key={req.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-[rgb(var(--subtle-background-color))] rounded border border-[rgb(var(--border-color))] gap-4">
                <div>
                  <div className="font-bold text-lg">{req.full_name}</div>
                  <div className="text-sm text-gray-500">{req.email}</div>
                  <div className="text-xs text-gray-400">Request ID: {req.id}</div>
                </div>
                <div className="flex flex-col md:flex-row gap-2 items-center w-full md:w-auto">
                  <select
                    className="p-2 border rounded bg-white dark:bg-gray-800"
                    value={selectedRoles[req.user_id] || ""}
                    onChange={(e) => handleRoleChange(req.user_id, e.target.value)}
                  >
                    <option value="" disabled>Select Role</option>
                    {availableRoles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                  <Button size="sm" onClick={() => handleApprove(req.id, req.user_id)}>Accept</Button>
                  <Button size="sm" variant="danger" onClick={() => handleReject(req.id)}>Reject</Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};


const ManagementSignups: React.FC = () => {
  // If navigated directly
  return (
    <Layout navItems={[]} activeItem="Requests" setActiveItem={() => { }} profileNavItemName="Profile">
      <ManagementSignupsContent />
    </Layout>
  );
};

export default ManagementSignups;
