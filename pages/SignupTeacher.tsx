
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { getApiUrl } from '../utils/config';

const SignupTeacher: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        org_code: '',
        institute_name: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const apiUrl = getApiUrl();
            await axios.post(`${apiUrl}/api/auth-strict/signup/teacher-request`, formData);
            setSuccess('Request sent successfully! Please wait for management approval.');
            setTimeout(() => navigate('/login'), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Signup request failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <Card className="max-w-md w-full p-8 space-y-6">
                <h2 className="text-3xl font-bold text-center">Teacher Signup</h2>
                <p className="text-center text-gray-500">Request access to your institute/school</p>

                {error && <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>}
                {success && <div className="p-3 bg-green-100 text-green-700 rounded">{success}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        name="institute_name"
                        label="Institute/School Name"
                        value={formData.institute_name}
                        onChange={handleChange}
                        required
                    />
                    <Input
                        name="org_code"
                        label="Management Code"
                        value={formData.org_code}
                        onChange={handleChange}
                        required
                        placeholder="e.g. SCH-1234"
                    />
                    <Input
                        name="username"
                        label="Username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                    />
                    <Input
                        name="password"
                        label="Password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Sending Request...' : 'Send Request'}
                    </Button>
                </form>
                <div className="text-center mt-4">
                    <a href="/#/login" className="text-sm text-blue-600 hover:underline">Back to Login</a>
                </div>
            </Card>
        </div>
    );
};

export default SignupTeacher;
