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
  // Using local state for requests
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const currentInstituteId = (user as any)?.instituteId || null;

  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      // Use Node Service (Port 4000)
      const apiUrl = getApiUrl();
      // Ideally pass instituteId if available to filter on server
      const url = currentInstituteId
        ? `${apiUrl}/api/py/management/pending-teachers?institute_id=${currentInstituteId}`
        : `${apiUrl}/api/py/management/pending-teachers`;

      const res = await axios.get(url, { withCredentials: true });
      if (res.data) {
        setRequests(res.data);
      }
    } catch (e: any) {
      console.error(e);
      const msg = e.response?.data?.detail || e.message || 'Failed to fetch requests';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const handleApprove = async (userId: string) => {
    try {
      const apiUrl = getApiUrl();
      await axios.post(`${apiUrl}/api/py/management/approve-teacher`, { user_id: userId }, { withCredentials: true });
      setSuccessMsg('Request Approved');
      fetchRequests();
    } catch (e) {
      console.error(e);
      setError('Failed to approve request');
    }
  };

  const handleReject = async (userId: string) => {
    try {
      const apiUrl = getApiUrl();
      await axios.post(`${apiUrl}/api/py/management/reject-teacher`, { user_id: userId }, { withCredentials: true });
      setSuccessMsg('Request Rejected');
      fetchRequests();
    } catch (e) {
      console.error(e);
      setError('Failed to reject request');
    }
  };

  // Clear success message after 3s
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

        <div className="space-y-2">
          {requests.map(req => {
            // Extract data from joined user object if available
            // Structure from backend: { ..., users: { name, email, extra: { title, ... } } }
            const name = req.users?.name || 'Unknown';
            const email = req.users?.email || 'No Email';
            // Title is crucial as requested
            const title = req.users?.extra?.title || req.title || 'Teacher';
            const dept = req.department || req.users?.extra?.department || 'N/A';

            return (
              <div key={req.user_id} className="flex justify-between items-center p-3 bg-[rgb(var(--subtle-background-color))] rounded border border-[rgb(var(--border-color))]">
                <div>
                  <div className="font-bold text-lg">{title} <span className="text-sm font-normal text-gray-500">({dept})</span></div>
                  <div className="font-semibold">{name}</div>
                  <div className="text-xs text-gray-400">{email}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleApprove(req.user_id)}>Accept</Button>
                  <Button size="sm" variant="danger" onClick={() => handleReject(req.user_id)}>Reject</Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Old sections removed as requested */}
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
