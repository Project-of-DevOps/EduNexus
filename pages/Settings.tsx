import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Layout from '../components/Layout';
import { UserRole } from '../types';

const SettingsPage: React.FC = () => {
    const { user, changePassword, logout } = useAuth();
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    // Reuse existing layout logic (mocking nav items logic or relying on Layout to handle it if generic)
    // Since Layout requires navItems, we might need to construct a minimal set or reusing what dashboards use.
    // For now, let's create a minimal standalone layout usage or better, assume this is rendered inside the dashboard content area 
    // BUT the router probably routes to /settings distinct from /dashboard. 
    // To keep it simple and consistent, let's wrap it in the Layout with a "Back to Dashboard" button.

    // Better approach: User asked for "Settings" option in Dashboard. So this should likely be a view *within* the dashboard 
    // OR a separate page that uses the same Layout. 
    // Given the constraints, I will make this a standalone component that can be used or routed to.

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword !== confirmPassword) {
            setError("New passwords don't match");
            return;
        }

        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        setLoading(true);
        const result = await changePassword(oldPassword, newPassword);
        setLoading(false);

        if (result.success) {
            setSuccess('Password changed successfully. You will be logged out in 3 seconds.');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => {
                logout();
            }, 3000);
        } else {
            setError(result.error || 'Failed to change password');
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Settings</h1>
            <Card>
                <h2 className="text-xl font-bold mb-4">Change Password</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        id="old-password"
                        type="password"
                        label="Current Password"
                        value={oldPassword}
                        onChange={e => setOldPassword(e.target.value)}
                        required
                    />
                    <Input
                        id="new-password"
                        type="password"
                        label="New Password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        required
                    />
                    <Input
                        id="confirm-password"
                        type="password"
                        label="Confirm New Password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        required
                    />

                    {error && <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>}
                    {success && <div className="p-3 bg-green-100 text-green-700 rounded">{success}</div>}

                    <div className="flex justify-end">
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Updating...' : 'Update Password'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default SettingsPage;
