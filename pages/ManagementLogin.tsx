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
    const [loginType, setLoginType] = useState<'school' | 'institute' | null>(null);

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

    // Validation Errors
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateLogin = () => {
        const newErrors: Record<string, string> = {};
        if (!uniqueId.trim()) newErrors.uniqueId = 'Unique ID is required.';
        if (!email.trim()) newErrors.email = 'Email is required.';
        if (!password.trim()) newErrors.password = 'Password is required.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateSignUp = () => {
        const newErrors: Record<string, string> = {};
        if (!signName.trim()) newErrors.signName = 'Full Name is required.';
        if (!signUniqueId.trim()) newErrors.signUniqueId = 'Unique ID is required.';
        if (!instituteName.trim()) newErrors.instituteName = `${loginType === 'school' ? 'School' : 'Institute'} Name is required.`;
        if (!signEmail.trim()) newErrors.signEmail = 'Email is required.';
        if (!signPassword.trim()) newErrors.signPassword = 'Password is required.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!validateLogin()) return;

        // Using UserRole.Management for this flow
        if (login(email, password, UserRole.Management, { type: loginType })) {
            navigate('/dashboard/management');
        } else {
            setError('Invalid credentials.');
        }
    };

    const handleSignUp = (e: React.FormEvent) => {
        e.preventDefault();
        setSignError('');
        if (!validateSignUp()) return;

        const extras = { instituteName, type: loginType };

        if (signUp(signName, signEmail, signPassword, UserRole.Management, extras)) {
            navigate('/dashboard/management');
        } else {
            setSignError('Sign-up failed.');
        }
    };

    if (!loginType) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--background-color))] px-4 text-gray-900">
                <div className="max-w-md w-full space-y-8">
                    <div className="text-center">
                        <h1 className="text-4xl font-extrabold text-[#1e3a8a]">EduNexus AI</h1>
                        <p className="mt-2 text-lg font-bold text-gray-900">Management Portal</p>
                    </div>
                    <Card>
                        <h2 className="text-xl font-bold text-center mb-6">Select Login Type</h2>
                        <div className="space-y-4">
                            <Button className="w-full" onClick={() => setLoginType('school')}>School Login</Button>
                            <Button className="w-full" onClick={() => setLoginType('institute')}>Institute Login</Button>
                        </div>
                        <div className="text-center mt-6">
                            <button onClick={() => navigate('/login')} className="text-sm text-blue-600 hover:underline">Back to Role Selection</button>
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--background-color))] px-4 text-gray-900">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-extrabold text-[#1e3a8a]">EduNexus AI</h1>
                    <p className="mt-2 text-lg font-bold text-gray-900">Management Portal ({loginType === 'school' ? 'School' : 'Institute'})</p>
                </div>

                <Card>
                    <div className="mb-4">
                        <button onClick={() => setLoginType(null)} className="text-sm text-gray-500 hover:text-gray-900">← Back to Selection</button>
                    </div>
                    {isLogin ? (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <Input
                                id="uniqueId"
                                label="Unique ID"
                                value={uniqueId}
                                onChange={e => setUniqueId(e.target.value)}
                                error={errors.uniqueId}
                                className="text-black"
                            />
                            <Input
                                id="email"
                                label="Email"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                error={errors.email}
                                className="text-black"
                            />
                            <Input
                                id="password"
                                label="Password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                error={errors.password}
                                className="text-black"
                            />

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
                        </form>
                    ) : (
                        <form onSubmit={handleSignUp} className="space-y-4">
                            <Input
                                id="signName"
                                label="Full Name"
                                value={signName}
                                onChange={e => setSignName(e.target.value)}
                                error={errors.signName}
                                className="text-black"
                            />
                            <Input
                                id="signUniqueId"
                                label="Unique ID"
                                value={signUniqueId}
                                onChange={e => setSignUniqueId(e.target.value)}
                                error={errors.signUniqueId}
                                className="text-black"
                            />
                            <Input
                                id="institute"
                                label={loginType === 'school' ? 'School Name' : 'Institute Name'}
                                value={instituteName}
                                onChange={e => setInstituteName(e.target.value)}
                                error={errors.instituteName}
                                className="text-black"
                            />
                            <Input
                                id="signEmail"
                                label="Email"
                                type="email"
                                value={signEmail}
                                onChange={e => setSignEmail(e.target.value)}
                                error={errors.signEmail}
                                className="text-black"
                            />
                            <Input
                                id="signPassword"
                                label="Password"
                                type={showSignPassword ? "text" : "password"}
                                value={signPassword}
                                onChange={e => setSignPassword(e.target.value)}
                                error={errors.signPassword}
                                className="text-black"
                            />

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
                            <div className="text-center mt-2">
                                <button type="button" onClick={() => navigate('/login')} className="text-sm text-blue-600 hover:underline">Back to Role Selection</button>
                            </div>
                        </form>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default ManagementLogin;
