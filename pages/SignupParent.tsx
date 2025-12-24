
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { getApiUrl } from '../utils/config';

const SignupParent: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        parent_email: '',
        student_email: ''
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
            await axios.post(`${apiUrl}/api/auth-strict/signup/parent`, formData);
            setSuccess('Parent account created and linked! Redirecting...');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Signup failed. Ensure student email is correct.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <Card className="max-w-md w-full p-8 space-y-6">
                <h2 className="text-3xl font-bold text-center">Parent Signup</h2>
                <p className="text-center text-gray-500">Link to your child's account</p>

                {error && <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>}
                {success && <div className="p-3 bg-green-100 text-green-700 rounded">{success}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        name="parent_email"
                        label="Parent Email-ID"
                        type="email"
                        value={formData.parent_email}
                        onChange={handleChange}
                        required
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
                    <div className="border-t pt-4 mt-4">
                        <label className="block text-sm font-medium mb-1">Student Connection</label>
                        <Input
                            name="student_email"
                            label="Student Email-ID"
                            type="email"
                            value={formData.student_email}
                            onChange={handleChange}
                            required
                            placeholder="Email used by student to signup"
                        />
                        <p className="text-xs text-gray-500 mt-1">We will verify this email exists in our system.</p>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Creating Account...' : 'Sign Up & Link'}
                    </Button>
                </form>
                <div className="text-center mt-4">
                    <a href="/#/login" className="text-sm text-blue-600 hover:underline">Back to Login</a>
                </div>
            </Card>
        </div>
    );
};

export default SignupParent;
