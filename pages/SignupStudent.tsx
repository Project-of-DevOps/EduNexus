import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { getApiUrl } from '../utils/config';

const SignupStudent: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        password: '',
        email: '',
        org_code: '',
        class_id: ''
    });
    const [classes, setClasses] = useState<any[]>([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchingClasses, setFetchingClasses] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Auto-fetch classes when code length looks sufficient (e.g. > 5 chars)
    const handleCodeBlur = async () => {
        if (formData.org_code.length < 3) return;
        setFetchingClasses(true);
        setError('');
        try {
            const apiUrl = getApiUrl();
            const res = await axios.get(`${apiUrl}/api/auth-strict/public/classes?org_code=${formData.org_code}`);
            setClasses(res.data);
            if (res.data.length === 0) setError('No classes found for this code.');
        } catch (err: any) {
            setClasses([]);
            setError(err.response?.data?.error || 'Invalid Code');
        } finally {
            setFetchingClasses(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const apiUrl = getApiUrl();

            // Pre-check email existence
            try {
                const checkRes = await axios.post(`${apiUrl}/api/py/check-email`, { email: formData.email });
                if (checkRes.data && checkRes.data.exists) {
                    setError('Email already exists');
                    setLoading(false);
                    return;
                }
            } catch (checkErr) {
                // Ignore check error and proceed to let actual signup handle it if backend fails
                console.warn('Email check failed silent', checkErr);
            }

            const payload = {
                username: formData.email,
                name: formData.name,
                password: formData.password,
                org_code: formData.org_code,
                class_id: formData.class_id
            };

            await axios.post(`${apiUrl}/api/auth-strict/signup/student`, payload);
            setSuccess('Signup successful! Redirecting to login...');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err: any) {
            const msg = err.response?.data?.detail || err.response?.data?.error || 'Signup failed';
            if (msg.includes('already been used') || msg.includes('already exist')) {
                setError('Email -ID alredy exist');
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <Card className="max-w-md w-full p-8 space-y-6">
                <h2 className="text-3xl font-bold text-center">Student Signup</h2>
                <p className="text-center text-gray-500">Join your class</p>

                {error && <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>}
                {success && <div className="p-3 bg-green-100 text-green-700 rounded">{success}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <Input
                            name="org_code"
                            label="Institute/School Code"
                            value={formData.org_code}
                            onChange={handleChange}
                            onBlur={handleCodeBlur}
                            required
                            placeholder="Enter Code (e.g. SCH-1234)"
                        />
                        {fetchingClasses && <div className="absolute right-2 top-8 text-xs text-gray-400">Checking...</div>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Select Class</label>
                        <select
                            name="class_id"
                            className="w-full p-2 border rounded bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                            value={formData.class_id}
                            onChange={handleChange}
                            required
                            disabled={classes.length === 0}
                        >
                            <option value="">-- {classes.length > 0 ? 'Select Class' : 'Enter valid code first'} --</option>
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <Input
                        name="name"
                        label="Full Name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                    />
                    <Input
                        name="email"
                        label="Email Address"
                        type="email"
                        value={formData.email}
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
                    <Button type="submit" className="w-full" disabled={loading || classes.length === 0}>
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </Button>
                </form>
                <div className="text-center mt-4">
                    <a href="/#/login" className="text-sm text-blue-600 hover:underline">Back to Login</a>
                </div>
            </Card>
        </div>
    );
};

export default SignupStudent;
