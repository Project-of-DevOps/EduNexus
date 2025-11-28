import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';

const ManagementLogin: React.FC = () => {
    const navigate = useNavigate();
    const { login, signUp } = useAuth();
    const [isLogin, setIsLogin] = useState(true);

    // Login State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [uniqueId, setUniqueId] = useState('');
    const [error, setError] = useState('');

    // Sign Up State
    const [signName, setSignName] = useState('');
    const [signEmail, setSignEmail] = useState('');
    const [signPassword, setSignPassword] = useState('');
    const [signUniqueId, setSignUniqueId] = useState('');
    const [instituteName, setInstituteName] = useState('');
    const [signError, setSignError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showSignPassword, setShowSignPassword] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!uniqueId.trim()) {
            setError('Unique ID is required.');
            return;
        }
        // Using UserRole.Management for this flow
        if (login(email, password, UserRole.Management)) {
            navigate('/dashboard/management');
        } else {
            setError('Invalid credentials.');
        }
    };

    const handleSignUp = (e: React.FormEvent) => {
        e.preventDefault();
        setSignError('');
        if (!signName || !signEmail || !signPassword || !signUniqueId || !instituteName) {
            setSignError('All fields are required.');
            return;
        }

        const extras = { instituteName };

        if (signUp(signName, signEmail, signPassword, UserRole.Management, extras)) {
            navigate('/dashboard/management');
        } else {
            setSignError('Sign-up failed.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--background-color))] px-4">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-extrabold text-[#1e3a8a]">EduNexus AI</h1>
                    <p className="mt-2 text-lg font-bold text-gray-900">Management Portal</p>
                </div>

                <Card>
                    {isLogin ? (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <Input id="uniqueId" label="Unique ID" value={uniqueId} onChange={e => setUniqueId(e.target.value)} required />
                            <Input id="email" label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                            <Input id="password" label="Password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required />

                            <div className="flex justify-end">
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-xs text-[rgb(var(--primary-color))]">
                                    {showPassword ? 'Hide' : 'Show'} Password
                                </button>
                            </div>

                            {error && <p className="text-sm text-red-500">{error}</p>}

                            <Button type="submit" className="w-full">Sign In</Button>

                            <div className="text-center mt-4">
                                <p className="text-sm">Don't have an account? <button type="button" onClick={() => setIsLogin(false)} className="text-[rgb(var(--primary-color))] font-bold">Sign Up</button></p>
                            </div>
                            <div className="text-center mt-2">
                                <button type="button" onClick={() => navigate('/login')} className="text-sm text-blue-600 hover:underline">Back to Role Selection</button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleSignUp} className="space-y-4">
                            <Input id="signName" label="Full Name" value={signName} onChange={e => setSignName(e.target.value)} required />
                            <Input id="signUniqueId" label="Unique ID" value={signUniqueId} onChange={e => setSignUniqueId(e.target.value)} required />
                            <Input id="institute" label="Institute Name" value={instituteName} onChange={e => setInstituteName(e.target.value)} required />
                            <Input id="signEmail" label="Email" type="email" value={signEmail} onChange={e => setSignEmail(e.target.value)} required />
                            <Input id="signPassword" label="Password" type={showSignPassword ? "text" : "password"} value={signPassword} onChange={e => setSignPassword(e.target.value)} required />

                            <div className="flex justify-end">
                                <button type="button" onClick={() => setShowSignPassword(!showSignPassword)} className="text-xs text-[rgb(var(--primary-color))]">
                                    {showSignPassword ? 'Hide' : 'Show'} Password
                                </button>
                            </div>

                            {signError && <p className="text-sm text-red-500">{signError}</p>}

                            <Button type="submit" className="w-full">Create Account</Button>

                            <div className="text-center mt-4">
                                <p className="text-sm">Already have an account? <button type="button" onClick={() => setIsLogin(true)} className="text-[rgb(var(--primary-color))] font-bold">Sign In</button></p>
                            </div>
                        </form>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default ManagementLogin;
