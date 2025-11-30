import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';
import { useData } from '../context/DataContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';

const StudentLogin: React.FC = () => {
    const navigate = useNavigate();
    const { login, signUp } = useAuth();
    const [isLogin, setIsLogin] = useState(true);

    // Login
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [uniqueId, setUniqueId] = useState('');
    const [signInOrgType, setSignInOrgType] = useState<'school' | 'institute'>('school');
    const [error, setError] = useState('');

    // Sign Up
    const [signName, setSignName] = useState('');
    const [signEmail, setSignEmail] = useState('');
    const [signPassword, setSignPassword] = useState('');
    const [signUniqueId, setSignUniqueId] = useState('');
    const [instituteName, setInstituteName] = useState('');
    const [signUpOrgType, setSignUpOrgType] = useState<'school' | 'institute'>('school');
    const [signAccessCode, setSignAccessCode] = useState('');
    const [signError, setSignError] = useState('');

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
        if (!signEmail.trim()) newErrors.signEmail = 'Email is required.';
        if (!signPassword.trim()) newErrors.signPassword = 'Password is required.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!validateLogin()) return;

        if (login(email, password, UserRole.Student, { orgType: signInOrgType })) {
            navigate('/dashboard');
        } else {
            setError('Invalid credentials.');
        }
    };

    const { submitOrgJoinRequest } = useData();

    const handleSignUp = (e: React.FormEvent) => {
        e.preventDefault();
        setSignError('');
        if (!validateSignUp()) return;
        // If an access code is provided, submit a join request and wait for
        // management approval instead of creating an account immediately.
        if (signAccessCode.trim()) {
            const result = submitOrgJoinRequest({ code: signAccessCode.trim(), name: signName, email: signEmail, role: UserRole.Student, orgType: signUpOrgType });
            if (result.status === 'pending') {
                setSignError('Access request submitted — waiting for management approval');
            } else {
                setSignError('Access code already processed. Please contact management.');
            }
            return;
        }

        if (signUp(signName, signEmail, signPassword, UserRole.Student, { uniqueId: signUniqueId, instituteName, orgType: signUpOrgType })) {
            navigate('/dashboard');
        } else {
            setSignError('Sign-up failed.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--background-color))] px-4 text-gray-900">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-extrabold text-[#1e3a8a]">EduNexus AI</h1>
                    <p className="mt-2 text-lg font-bold text-gray-900">Student Portal</p>
                </div>
                <Card>
                    {isLogin ? (
                        <form onSubmit={handleLogin} className="space-y-4">
                                                        <div>
                                                            <label className="block text-sm font-medium mb-1">Login Type</label>
                                                            <select
                                                                className="w-full bg-[rgb(var(--foreground-color))] border border-[rgb(var(--border-color))] rounded-md p-2 text-black"
                                                                value={signInOrgType}
                                                                onChange={e => setSignInOrgType(e.target.value as 'school' | 'institute')}
                                                            >
                                                                <option value="school">School</option>
                                                                <option value="institute">Institute</option>
                                                            </select>
                                                        </div>
                                                        <Input
                                id="uniqueId"
                                label="Unique ID"
                                value={uniqueId}
                                onChange={e => setUniqueId(e.target.value)}
                                error={errors.uniqueId}
                                className="text-black"
                            />
                                                        <div className="mt-2">
                                                            <label className="block text-sm font-medium mb-1">Account Type</label>
                                                            <select
                                                                className="w-full bg-[rgb(var(--foreground-color))] border border-[rgb(var(--border-color))] rounded-md p-2 text-black"
                                                                value={signUpOrgType}
                                                                onChange={e => setSignUpOrgType(e.target.value as 'school' | 'institute')}
                                                            >
                                                                <option value="school">School</option>
                                                                <option value="institute">Institute</option>
                                                            </select>
                                                        </div>
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
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                error={errors.password}
                                className="text-black"
                            />
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
                                label="Institute Name"
                                value={instituteName}
                                onChange={e => setInstituteName(e.target.value)}
                                className="text-black"
                            />
                            <Input
                                id="accessCode"
                                label="Access Code (optional)"
                                value={signAccessCode}
                                onChange={e => setSignAccessCode(e.target.value)}
                                placeholder="Enter a join code if you have one"
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
                                type="password"
                                value={signPassword}
                                onChange={e => setSignPassword(e.target.value)}
                                error={errors.signPassword}
                                className="text-black"
                            />
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

export default StudentLogin;
