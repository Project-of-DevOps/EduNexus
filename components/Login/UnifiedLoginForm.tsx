import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../context/DataContext';
import { UserRole, TeachingAssignment } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import OTPModal from '../auth/OTPModal';
import { supabase } from '../../services/supabaseClient';
import { getPythonApiUrl } from '../../utils/config';

const roles = [
    { id: UserRole.Management, label: 'Management' },
    { id: UserRole.Librarian, label: 'Librarian' },
    { id: UserRole.Teacher, label: 'Teacher' },
    { id: UserRole.Student, label: 'Student' },
    { id: UserRole.Parent, label: 'Parent' },
];

const managementRoles = ['Chairman', 'Director', 'Principal', 'Vice Principal', 'Dean'];
const teachingRoles = [
    'Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer',
    'Senior Teacher', 'Subject Teacher', 'HOD',
    'Class Teacher', 'Class Teacher (Advisor)'
];
const classTeacherRoles = ['Class Teacher', 'Class Teacher (Advisor)'];



type Prefill = { email?: string; uniqueId?: string; orgType?: 'school' | 'institute' };

const UnifiedLoginForm: React.FC<{ defaultRole?: UserRole; prefill?: Prefill }> = ({ defaultRole, prefill }) => {
    const navigate = useNavigate();
    const location = useLocation(); // React to URL changes
    const { login, signUp, signUpAsGuest } = useAuth();
    const { submitOrgJoinRequest, verifyTeacherCode, consumeTeacherCode, addUser } = useData();

    const [activeRole, setActiveRole] = useState<UserRole | ''>(defaultRole || '');
    // Initialize from URL param 'mode' if present, default to true (Login)
    const [isLogin, setIsLogin] = useState(() => {
        const params = new URLSearchParams(window.location.hash.split('?')[1] || window.location.search);
        return params.get('mode') !== 'signup';
    });
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    // Sync URL with isLogin state
    useEffect(() => {
        const hash = window.location.hash || '';
        const [path, qs] = hash.split('?');
        const params = new URLSearchParams(qs || window.location.search);

        if (isLogin) params.set('mode', 'login');
        else params.set('mode', 'signup');

        // Update URL without reloading
        const newHash = `${path}?${params.toString()}`;
        if (window.location.hash !== newHash) {
            window.location.hash = newHash;
        }
    }, [isLogin]);

    // Force Reset Theme to Default (Ocean Depth) for Login Page
    useEffect(() => {
        const root = document.documentElement;
        // Default Ocean Depth colors
        const defaultTheme = {
            primary: '#3B82F6',
            background: '#172554',
            surface: '#1E3A8A',
            textMain: '#EFF6FF',
            textSecondary: '#BFDBFE',
            accentTint: '#1E40AF',
            highlight: '#22D3EE',
            subtle: '#172554',
            border: '#1E40AF'
        };

        const hexToRgb = (hex: string): string => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `${r} ${g} ${b}`;
        };

        root.style.setProperty('--primary-color', hexToRgb(defaultTheme.primary));
        root.style.setProperty('--background-color', hexToRgb(defaultTheme.background));
        const surfaceRgb = hexToRgb(defaultTheme.surface);
        root.style.setProperty('--surface-color', surfaceRgb);
        root.style.setProperty('--foreground-color', surfaceRgb);
        root.style.setProperty('--text-color', hexToRgb(defaultTheme.textMain));
        root.style.setProperty('--text-secondary-color', hexToRgb(defaultTheme.textSecondary));
        root.style.setProperty('--accent-tint-color', hexToRgb(defaultTheme.accentTint));
        root.style.setProperty('--subtle-background-color', hexToRgb(defaultTheme.subtle));
        root.style.setProperty('--input-bg', hexToRgb(defaultTheme.subtle));
        root.style.setProperty('--border-color', hexToRgb(defaultTheme.border));
        root.style.setProperty('--highlight-color', hexToRgb(defaultTheme.highlight));

    }, []);

    // Form State
    const [email, setEmail] = useState(prefill?.email || '');
    const [password, setPassword] = useState('');
    const [uniqueId, setUniqueId] = useState(prefill?.uniqueId || ''); // For Management/Student/Teacher/Parent
    const [orgType, setOrgType] = useState<'school' | 'institute' | null>(prefill?.orgType || null); // For Management/Student/Teacher/Parent
    const [name, setName] = useState(''); // For Signup
    const [instituteName, setInstituteName] = useState(''); // For Signup
    const [accessCode, setAccessCode] = useState(''); // For Student/Parent Signup
    const [rememberMe, setRememberMe] = useState(false);

    // Email First Logic
    const [emailSubmitted, setEmailSubmitted] = useState(false);

    // Teacher Specific State
    const [teacherTitle, setTeacherTitle] = useState('');
    const [managementTitle, setManagementTitle] = useState('');

    const [currentSubject, setCurrentSubject] = useState('');
    const [currentClass, setCurrentClass] = useState('');
    const [studentEmail, setStudentEmail] = useState('');
    const [rollNumber, setRollNumber] = useState('');
    const [teachingAssignments, setTeachingAssignments] = useState<TeachingAssignment[]>([]);
    const [classInChargeId, setClassInChargeId] = useState('');

    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [showOTPModal, setShowOTPModal] = useState(false);
    const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [showGoogleLinkModal, setShowGoogleLinkModal] = useState(false);
    const [popupError, setPopupError] = useState<string | null>(null);
    const [ssoMissing, setSsoMissing] = useState(false);
    const [ssoUsers, setSsoUsers] = useState<Array<{ id: string; role: string; name?: string; email?: string }>>([]);

    const [approvalStatus, setApprovalStatus] = useState<'pending' | 'rejected' | null>(null);

    // Inline Validation State
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Check for SSO errors or success. Support both querystring and hash-style routes.
        const getQueryParams = () => {
            if (window.location.search && window.location.search.length > 1) return new URLSearchParams(window.location.search);
            const hash = window.location.hash || '';
            const idx = hash.indexOf('?');
            if (idx >= 0) {
                const qs = hash.slice(idx + 1);
                return new URLSearchParams(qs);
            }
            return new URLSearchParams('');
        };

        const params = getQueryParams();

        // Handle Role Mismatch / User Not Found
        const ssoError = params.get('sso_error');
        if (ssoError === 'user_not_found') {
            setSsoMissing(true);
            setTimeout(() => {
                setSsoMissing(false);
                // Clear param
                try {
                    const hash = window.location.hash || '';
                    const base = hash.split('?')[0];
                    window.location.hash = base;
                } catch (e) { }
            }, 3500);
        } else if (ssoError === 'role_mismatch') {
            setError('SSO Error: Role mismatch');
        } else if (ssoError) {
            setError(`SSO Error: ${ssoError}`);
        }
        {/* SSO missing (user not found) red card */ }
        {
            ssoMissing && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white border-l-4 border-red-600 rounded-lg p-6 shadow-2xl max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center">
                            <svg className="h-6 w-6 text-red-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span className="text-lg font-bold text-red-700">Consider Sing-up</span>
                        </div>
                    </div>
                </div>
            )
        }

        // Handle Success
        const ssoSuccess = params.get('sso_success');
        if (ssoSuccess) {
            setSuccessMessage('Sign-in successful');
            // Show Green Background Message for 3.5s (handled effectively by UI rendering of successMessage for now, but user asked for "green message... and then disappear")
            // The successMessage state is rendered below. We will auto-redirect after 3.5s.
            setTimeout(() => {
                setSuccessMessage('');
                navigateDashboard();  // Logic to redirect
                // Clear param
                try {
                    const hash = window.location.hash || '';
                    const base = hash.split('?')[0];
                    window.location.hash = base;
                } catch (e) { }
            }, 3500);
        }

        // Role chooser handling
        const ssoChoose = params.get('sso_choose_roles');
        if (ssoChoose) {
            try {
                const raw = sessionStorage.getItem('edunexus:sso_users');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    setSsoUsers(parsed || []);
                }
            } catch (e) { setSsoUsers([]); }
            // keep the chooser visible until user acts; the UI will clear the storage
        }

        // Legacy handling
        const ssoMissingFlag = params.get('sso_missing');
        if (ssoMissingFlag) {
            setSsoMissing(true);
            setTimeout(() => setSsoMissing(false), 3500);
            try {
                const hash = window.location.hash || '';
                const base = hash.split('?')[0];
                window.location.hash = base;
            } catch (e) { }
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [location]); // Depend on location to re-run when hash changes

    // Apply prefill/defaultRole only once on mount (do not override user edits)
    useEffect(() => {
        if (defaultRole) setActiveRole(defaultRole);
        if (prefill) {
            if (prefill.email) setEmail(prefill.email);
            if (prefill.uniqueId) setUniqueId(prefill.uniqueId);
            if (prefill.orgType) setOrgType(prefill.orgType);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const isManagementRole = (role: string) => managementRoles.includes(role);
    const isTeachingRole = (role: string) => teachingRoles.includes(role);
    const isClassTeacher = (role: string) => classTeacherRoles.includes(role);

    const validateEmail = (val: string) => {
        if (!val.trim()) return 'Email is required.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Please enter a valid email address.';
        return '';
    };

    const validatePassword = (val: string) => {
        if (!val.trim()) return 'Password is required.';
        if (!isLogin && val.length < 6) return 'Password must be at least 6 characters.';
        return '';
    };

    const handleEmailBlur = () => {
        setEmailError(validateEmail(email));
    };

    const handlePasswordBlur = () => {
        setPasswordError(validatePassword(password));
    };

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const err = validateEmail(email);
        if (err) {
            setEmailError(err);
            return;
        }
        setEmailError('');

        // Check email for both Login and Signup
        setLoading(true);
        try {
            const pythonUrl = getPythonApiUrl();
            const res = await fetch(`${pythonUrl}/api/py/check-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const json = await res.json().catch(() => ({}));

            if (isLogin) {
                if (res.ok && !json.exists) {
                    setLoading(false);
                    setPopupError('User not registered , Consider registering before sign-in');
                    setTimeout(() => setPopupError(null), 4000);
                    return;
                }
            } else {
                // Signup: Check if ALREADY exists
                if (res.ok && json.exists) {
                    setLoading(false);
                    setEmailError('Email-ID already exist');
                    setTimeout(() => setEmailError(''), 2500);
                    return;
                }
            }
        } catch (e) {
            console.warn('Email check failed', e);
            if (isLogin) {
                setLoading(false);
                setPopupError(`Unable to verify email: ${e}`);
                setTimeout(() => setPopupError(null), 4000);
                return;
            }
        }

        setLoading(false);

        setEmailSubmitted(true);
    };

    // Real-time error clearing for Code/Name
    const handleInstituteNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInstituteName(e.target.value);
        if (error.includes("Mismatch") || error.includes("Wrong Input")) setError('');
    };

    const handleUniqueIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUniqueId(e.target.value);
        if (error === "Invalid Code") setError('');
    };

    const handleResetFlow = () => {
        setEmailSubmitted(false);
        setPassword('');
        setError('');
        setSuccessMessage('');
        setShowForgotPassword(false);
    };

    const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) {
            setError('Please enter your email address.');
            return;
        }
        setLoading(true);
        setError('');
        setSuccessMessage('');

        try {
            // Mock API call for password reset
            await new Promise(resolve => setTimeout(resolve, 1500));
            setSuccessMessage(`Password reset link sent to ${email}`);
            setTimeout(() => {
                setShowForgotPassword(false);
                setSuccessMessage('');
            }, 3000);
        } catch (err) {
            setError('Failed to send reset link. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const validate = () => {
        const eErr = validateEmail(email);
        if (eErr) return eErr;
        const pErr = validatePassword(password);
        if (pErr) return pErr;

        // Unique ID required for Login (except Librarian/Management) and Signup (except Librarian/Management/StudentWithCode/ParentWithCode)
        const needsUniqueId = activeRole !== UserRole.Librarian && activeRole !== UserRole.Management;
        if (needsUniqueId && !uniqueId.trim() && isLogin) {
            return 'Unique ID is required.';
        }
        if (needsUniqueId && !uniqueId.trim() && !isLogin && !accessCode.trim()) {
            return 'Unique ID is required.';
        }

        if (!isLogin && !name.trim()) return 'Full Name is required.';

        if (!isLogin && (activeRole === UserRole.Parent || activeRole === UserRole.Student) && !rollNumber.trim()) {
            return 'Roll Number is required.';
        }

        // Teacher Validation
        if (!isLogin && activeRole === UserRole.Teacher) {
            if (!teacherTitle) return 'Role is required.';
            if (isTeachingRole(teacherTitle)) {

                if (teachingAssignments.length === 0) return 'At least one teaching assignment is required.';
            }
            if (isClassTeacher(teacherTitle) && !classInChargeId) {
                return 'Class ID is required.';
            }
        }

        return null;
    };

    const handleAddAssignment = () => {
        if (currentSubject.trim() && currentClass.trim()) {
            setTeachingAssignments([...teachingAssignments, { subject: currentSubject.trim(), classId: currentClass.trim() }]);
            setCurrentSubject('');
            setCurrentClass('');
        }
    };

    const removeAssignment = (index: number) => {
        const newAssignments = [...teachingAssignments];
        newAssignments.splice(index, 1);
        setTeachingAssignments(newAssignments);
    };

    const handleVerifyOTP = async (otp: string) => {
        try {
            if (!activeRole) throw new Error('Role mismatch');
            const extras: any = {};
            if (activeRole !== UserRole.Librarian) {
                extras.uniqueId = uniqueId;
                extras.orgType = orgType;
            }
            extras.twoFactorToken = otp; // Pass OTP as token

            const result = await login(email, password, activeRole as UserRole, extras);
            if (result.success) {
                setShowOTPModal(false);
                if (rememberMe) {
                    localStorage.setItem('edunexus:remember_me', 'true');
                } else {
                    localStorage.removeItem('edunexus:remember_me');
                }
                navigateDashboard({ dashboardError: result.dashboard_error });
            } else {
                throw new Error(result.error || 'Invalid OTP');
            }
        } catch (err: any) {
            throw new Error(err.message || 'Verification failed');
        }
    };

    const navigateDashboard = (state?: any) => {
        const target = activeRole === UserRole.Management ? '/dashboard/management' :
            activeRole === UserRole.Librarian ? '/dashboard/librarian' :
                activeRole === UserRole.Teacher ? '/dashboard/teacher' :
                    activeRole === UserRole.Parent ? '/dashboard/parent' : '/dashboard';
        navigate(target, { state });
    };

    const handleSsoRoleSelect = async (chosen: { id: string; role: string; email?: string }) => {
        setLoading(true);
        setError('');
        try {
            // Get Supabase session token to verify on server
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData?.session?.access_token || (sessionData as any)?.access_token || null;

            const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';
            const body: any = { role: chosen.role };
            if (token) body.accessToken = token;
            else if (chosen.email) body.email = chosen.email;

            const resp = await fetch(`${apiUrl}/api/auth/google-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (resp.ok) {
                const json = await resp.json();
                if (json.success && json.user) {
                    // Persist to DataContext and navigate
                    addUser({ ...json.user, password: undefined } as any);
                    // Clear chooser storage
                    sessionStorage.removeItem('edunexus:sso_users');
                    // Redirect to dashboard for selected role
                    if (json.user.role) {
                        const targetRole = json.user.role as string;
                        // Set activeRole so navigateDashboard uses it
                        try { setActiveRole(targetRole as any); } catch (e) { }
                    }
                    navigateDashboard();
                    return;
                }
            } else {
                const err = await resp.json().catch(() => ({}));
                setError(err.error || 'Failed to finalize SSO login');
            }
        } catch (e: any) {
            setError(e?.message || 'Network error during SSO role selection');
        } finally {
            setLoading(false);
        }
    };

    const handleMagicLink = async () => {
        if (!email.trim()) {
            setError('Please enter your email address first.');
            return;
        }
        setLoading(true);
        setError('');
        setSuccessMessage('');
        setEmailError('');

        try {
            // Check if user exists first
            const apiUrl = (import.meta as any).env?.VITE_API_URL || `http://${window.location.hostname}:4000`;
            const checkRes = await fetch(`${apiUrl}/api/auth/check-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (checkRes.ok) {
                const json = await checkRes.json();
                if (!json.exists) {
                    setLoading(false);
                    setEmailError('Email id not registered');
                    return;
                }
            }

            // Using Supabase Magic Link
            // Use origin to ensure we stay on the reachable site. Supabase will append hash/query params.
            const redirectTo = window.location.origin;
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: redirectTo
                }
            });

            if (error) {
                setError(error.message || 'Failed to send magic link.');
            } else {
                setSuccessMessage('Magic link sent! Check your email.');
            }
        } catch (e) {
            console.error('Magic link error:', e);
            setError('Unexpected error sending magic link.');
        } finally {
            setLoading(false);
        }
    };

    // Resend OTP helper used by OTPModal
    const resendOtp = async () => {
        if (!email.trim()) throw new Error('Email missing');
        const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';
        try {
            const extras: any = {};
            if (activeRole !== UserRole.Librarian) {
                extras.uniqueId = uniqueId;
                extras.orgType = orgType;
            }
            const res = await fetch(`${apiUrl}/api/resend-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, role: activeRole || 'Management', extras })
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.error || 'Failed to resend OTP');
            return;
        } catch (err: any) {
            throw new Error(err?.message || 'Network error while resending OTP');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!activeRole) {
            setError('Please select a role.');
            return;
        }

        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);
        try {
            if (isLogin) {
                const extras: any = {};
                if (activeRole !== UserRole.Librarian && activeRole !== UserRole.Management) {
                    extras.uniqueId = uniqueId;
                }
                // ALWAYS send orgType if available (for Management AND Teachers/Students)
                if (activeRole !== UserRole.Librarian) {
                    extras.orgType = orgType;
                }
                extras.rememberMe = rememberMe;

                const result = await login(email, password, activeRole as UserRole, extras);

                if (result.require2fa) {
                    setShowOTPModal(true);
                    setLoading(false);
                    return;
                }

                if (result.success) {
                    if (rememberMe) {
                        localStorage.setItem('edunexus:remember_me', 'true');
                    } else {
                        localStorage.removeItem('edunexus:remember_me');
                    }
                    navigateDashboard({ dashboardError: result.dashboard_error });
                    localStorage.removeItem('edunexus:remember_me');
                } else {
                    if (result.error && result.error.includes("Waiting for Management Approval")) {
                        setApprovalStatus('pending');
                    } else if (result.error && result.error.includes("Request was Rejected")) {
                        setApprovalStatus('rejected');
                    } else {
                        setError(result.error || 'Invalid credentials.');
                    }
                }
            } else {
                // Sign Up Logic

                // Access Code Logic (Student/Parent)
                if ((activeRole === UserRole.Student || activeRole === UserRole.Parent) && accessCode.trim()) {
                    const result = submitOrgJoinRequest({ code: accessCode.trim(), name, email, role: activeRole as UserRole, orgType });
                    if (result.status === 'pending') {
                        // Use a success state instead of error
                        setSuccessMessage('Access request submitted! Waiting for management approval.');
                    } else {
                        setError('Access code already processed. Please contact management.');
                    }
                    setLoading(false);
                    return;
                }

                // Teacher Verification Logic
                // If it matches a pending invite (local), use that. Otherwise, assume it is an Institute Code and let backend validate.
                const pendingTeacher = activeRole === UserRole.Teacher ? verifyTeacherCode(uniqueId) : null;

                if (activeRole === UserRole.Teacher && !pendingTeacher) {
                    // It might be an Institute Code. Do not block.
                    // But we should ensure uniqueId is provided (already validated by validate())
                }

                const extras: any = { uniqueId, orgType };

                if (activeRole === UserRole.Teacher) {
                    extras.title = teacherTitle;
                    extras.teachingAssignments = teachingAssignments;
                    extras.teacherType = orgType === 'institute' ? 'college' : 'school'; // Map back if needed or keep consistent
                    if (classInChargeId) extras.classId = classInChargeId;
                } else if (activeRole === UserRole.Management) {
                    extras.title = managementTitle;
                    extras.instituteName = instituteName;
                } else if (activeRole === UserRole.Parent || activeRole === UserRole.Student) {
                    extras.rollNumber = rollNumber;
                }

                const result = await signUp(name, email, password, activeRole as UserRole, extras);
                if (result.success) {
                    if (activeRole === UserRole.Teacher && pendingTeacher) consumeTeacherCode(uniqueId);
                    // Instead of navigating immediately, ask to link Google
                    setShowGoogleLinkModal(true);
                } else {
                    setError(result.error || 'Sign-up failed. Please try again.');
                }
            }
        } catch (err) {
            setError('An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto select-none" style={{
            '--text-color': '0 0 0',
            '--text-secondary-color': '107 114 128',
            '--background-color': '255 255 255',
            '--subtle-background-color': '255 255 255', // Force white options
            '--input-bg': '255 255 255',
            '--border-color': '209 213 219' // Gray-300
        } as React.CSSProperties} onCopy={(e) => {
            // Only allow copying from input fields
            const selection = window.getSelection();
            const target = e.target as HTMLElement;
            if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
                e.preventDefault();
            }
        }} onContextMenu={(e) => {
            // Disable right-click on non-input elements
            const target = e.target as HTMLElement;
            if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
                e.preventDefault();
            }
        }}>
            {isOffline && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4" role="alert">
                    <p className="font-bold">Offline Mode</p>
                    <p>You are currently offline. Some features may be unavailable.</p>
                </div>
            )}

            {ssoMissing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
                    <div className="pointer-events-auto">
                        <Card className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 shadow-xl">
                            <div className="text-center">
                                <p className="text-sm font-semibold">Consider Sing-up</p>
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {approvalStatus === 'pending' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm">
                    <div className="bg-white border-l-4 border-yellow-500 rounded-lg p-8 shadow-2xl max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200">
                        <div className="text-center space-y-4">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Waiting for Management Approval</h3>
                            <p className="text-sm text-gray-500">Your account is currently under review by the management. Please try again later.</p>
                            <Button onClick={() => setApprovalStatus(null)}>Close</Button>
                        </div>
                    </div>
                </div>
            )}

            {approvalStatus === 'rejected' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm">
                    <div className="bg-white border-l-4 border-red-600 rounded-lg p-8 shadow-2xl max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200">
                        <div className="text-center space-y-4">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Request was Rejected</h3>
                            <p className="text-sm text-gray-500">Your registration request was rejected by the management.</p>
                            <Button onClick={() => setApprovalStatus(null)}>Close</Button>
                        </div>
                    </div>
                </div>
            )}

            {ssoUsers && ssoUsers.length > 0 && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="mx-4 w-full max-w-lg pointer-events-auto">
                        <Card className="p-6 bg-white shadow-2xl border border-gray-200">
                            <div className="text-center mb-4">
                                <h3 className="text-lg font-semibold">Choose account role</h3>
                                <p className="text-sm text-gray-600">We found multiple roles associated with your email. Choose which role to continue as.</p>
                            </div>
                            <div className="space-y-3">
                                {ssoUsers.map((u) => (
                                    <div key={u.id} className="flex items-center justify-between border rounded p-3">
                                        <div>
                                            <div className="font-medium text-gray-900">{u.role}</div>
                                            <div className="text-sm text-gray-600">{u.name || u.email}</div>
                                        </div>
                                        <div>
                                            <button onClick={() => handleSsoRoleSelect(u)} className="px-4 py-2 bg-blue-600 text-white rounded">Continue</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 text-center">
                                <button onClick={async () => {
                                    // Cancel chooser: clear storage and sign out from Supabase to reset state
                                    sessionStorage.removeItem('edunexus:sso_users');
                                    setSsoUsers([]);
                                    try { await supabase.auth.signOut(); } catch (e) { }
                                    const base = (window.location.hash || '#/login').split('?')[0];
                                    window.location.hash = base;
                                }} className="text-sm text-gray-600">Cancel</button>
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* Removed Card wrapper for cleaner integration */}
            <div className="w-full">
                {/* Header Section */}
                <div className="mb-6">
                    <div className="flex justify-start space-x-6 mb-8 border-b border-gray-200">
                        <button
                            type="button"
                            onClick={() => { setIsLogin(true); setError(''); setEmailError(''); setEmailSubmitted(false); setPassword(''); setSuccessMessage(''); }}
                            className={`pb-3 text-base font-medium transition-all relative ${isLogin ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-900 border-b-2 border-transparent'}`}
                        >
                            Sign In
                        </button>
                        <button
                            type="button"
                            onClick={() => { setIsLogin(false); setError(''); setEmailError(''); setEmailSubmitted(false); setPassword(''); setSuccessMessage(''); }}
                            className={`pb-3 text-base font-medium transition-all relative ${!isLogin ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-900 border-b-2 border-transparent'}`}
                        >
                            Sign Up
                        </button>
                    </div>

                    {/* Scrollable Container for Consistent Height - SCROLL HIDDEN */}
                    <div className="pr-1 scrollbar-hide">
                        {!emailSubmitted && !showForgotPassword ? (
                            /* Step 1: Email Entry */
                            <form onSubmit={handleEmailSubmit} className="space-y-4">
                                <Input
                                    id="email"
                                    label="Email Address"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onBlur={handleEmailBlur}
                                    placeholder="you@example.com"
                                    required
                                    autoComplete="username"
                                    className="text-black"
                                    error={emailError}
                                />
                                <Button
                                    type="submit"
                                    className="w-full py-3 text-lg font-semibold shadow-md transition-transform active:scale-[0.98] bg-blue-600 hover:bg-blue-700 text-white border-transparent"
                                >
                                    Continue
                                </Button>

                                <div className="mt-6">
                                    {isLogin && (
                                        <>
                                            <div className="relative">
                                                <div className="absolute inset-0 flex items-center">
                                                    <div className="w-full border-t border-gray-300"></div>
                                                </div>
                                                <div className="relative flex justify-center text-sm">
                                                    <span className="px-2 bg-white text-gray-500">Or continue with</span>
                                                </div>
                                            </div>
                                            {/* Additional Fields for Login (Teacher/Management) */}
                                            {isLogin && activeRole === UserRole.Teacher && (
                                                <>
                                                    <Input
                                                        id="uniqueId"
                                                        label={orgType === 'institute' ? 'Institute Code' : 'School Code / Access Code'}
                                                        type="text"
                                                        value={uniqueId}
                                                        onChange={handleUniqueIdChange}
                                                        placeholder={orgType === 'institute' ? 'Enter Institute Code' : 'Enter School Code'}
                                                        required
                                                        error={error === 'Invalid Code' ? error : ''}
                                                    />
                                                    <Input
                                                        id="instituteName"
                                                        label={orgType === 'institute' ? 'Institute Name' : 'School Name'}
                                                        type="text"
                                                        value={instituteName}
                                                        onChange={handleInstituteNameChange}
                                                        placeholder={orgType === 'institute' ? 'Enter Institute Name' : 'Enter School Name'}
                                                        required
                                                        error={error.includes('Mismatch') ? error : ''}
                                                    />
                                                </>
                                            )}
                                        </>
                                    )}

                                    <div className="mt-6 space-y-3">
                                        {/* Google OAuth Button */}
                                        {/* Google OAuth Button: Only show for Login flow (step 1) */}
                                        {isLogin && (
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    // Use hash-based redirect so SPA (HashRouter) will load correctly
                                                    sessionStorage.setItem('edunexus:sso_role', activeRole);
                                                    if (rememberMe) {
                                                        localStorage.setItem('edunexus:remember_me_pref', 'true');
                                                    } else {
                                                        localStorage.removeItem('edunexus:remember_me_pref');
                                                    }

                                                    const redirectTo = `${window.location.origin}/#/login`;
                                                    const { error } = await supabase.auth.signInWithOAuth({
                                                        provider: 'google',
                                                        options: {
                                                            redirectTo,
                                                            queryParams: {
                                                                access_type: 'offline',
                                                                prompt: 'login'
                                                            }
                                                        }
                                                    });
                                                    if (error) {
                                                        console.error('Google Auth Error:', error.message);
                                                        setError(`Google sign ${isLogin ? 'in' : 'up'} failed: ${error.message}`);
                                                    }
                                                }}
                                                className="w-full inline-flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                            >
                                                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                                    <path
                                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                                        fill="#4285F4"
                                                    />
                                                    <path
                                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                                        fill="#34A853"
                                                    />
                                                    <path
                                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                                        fill="#FBBC05"
                                                    />
                                                    <path
                                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                                        fill="#EA4335"
                                                    />
                                                </svg>
                                                <span>Sign in with Google</span>
                                            </button>
                                        )}


                                    </div>
                                </div>

                                <div className="text-center mt-4">
                                    <p className="text-sm text-gray-600">
                                        {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                                        <button
                                            type="button"
                                            onClick={() => setIsLogin(!isLogin)}
                                            className="font-medium text-blue-600 hover:text-blue-500"
                                        >
                                            {isLogin ? 'Sign up' : 'Sign In'}
                                        </button>
                                    </p>
                                </div>
                            </form>

                        ) : showForgotPassword ? (
                            /* Forgot Password Flow */
                            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                                <div className="text-center mb-6">
                                    <h3 className="text-lg font-medium text-gray-900">Reset Password</h3>
                                    <p className="text-sm text-gray-500">Enter your email to receive a reset link</p>
                                </div>

                                <Input
                                    id="reset-email"
                                    label="Email Address"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="text-black"
                                />

                                {error && (
                                    <div className="bg-red-50 text-red-600 p-3 rounded text-sm text-center">
                                        ⚠️ {error}
                                    </div>
                                )}
                                {successMessage && (
                                    <div className="bg-green-50 text-green-600 p-3 rounded text-sm text-center">
                                        ✅ {successMessage}
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={loading}
                                >
                                    {loading ? 'Sending...' : 'Send Reset Link'}
                                </Button>

                                <button
                                    type="button"
                                    onClick={() => setShowForgotPassword(false)}
                                    className="w-full py-2 px-3 text-sm border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 font-medium"
                                >
                                    ← Back to Login
                                </button>
                            </form>
                        ) : (
                            /* Step 2: Role & Password */
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center">
                                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-3">
                                            {email.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="text-sm font-medium text-gray-900">{email}</span>
                                    </div>
                                    <button type="button" onClick={handleResetFlow} className="text-sm text-blue-600 hover:text-blue-500 font-medium">
                                        ← Change Email
                                    </button>
                                </div>

                                {/* Role Selector Dropdown */}
                                <div>
                                    <label htmlFor="role-select" className="block text-sm font-medium text-gray-700 mb-1">
                                        I am a...
                                    </label>
                                    <select
                                        id="role-select"
                                        value={activeRole}
                                        onChange={(e) => setActiveRole(e.target.value as UserRole)}
                                        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md text-black"
                                    >
                                        <option value="" disabled>Select your role</option>
                                        {roles.map((role) => (
                                            <option key={role.id} value={role.id}>
                                                {role.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Org Type Selector (All except Librarian) */}
                                {activeRole !== UserRole.Librarian && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Organization Type</label>
                                        <div className="flex space-x-4">
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    name="orgType"
                                                    value="school"
                                                    checked={orgType === 'school'}
                                                    onChange={() => setOrgType('school')}
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                                />
                                                <span className="ml-2 text-sm text-gray-700">School</span>
                                            </label>
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    name="orgType"
                                                    value="institute"
                                                    checked={orgType === 'institute'}
                                                    onChange={() => setOrgType('institute')}
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                                />
                                                <span className="ml-2 text-sm text-gray-700">Institute</span>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {!isLogin && activeRole === UserRole.Management && orgType && (
                                    <Input
                                        id="instituteName"
                                        label={orgType === 'institute' ? "Institute Name" : "School Name"}
                                        value={instituteName}
                                        onChange={(e) => setInstituteName(e.target.value)}
                                        placeholder={orgType === 'institute' ? "Enter Institute Name" : "Enter School Name"}
                                        required
                                        className="text-black"
                                    />
                                )}

                                {!isLogin && (
                                    (activeRole === UserRole.Librarian || orgType) && (
                                        <Input
                                            id="name"
                                            label="Full Name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="John Doe"
                                            required
                                            className="text-black"
                                        />
                                    )
                                )}

                                {/* Unique ID (All except Librarian) */}
                                {/* Organization Code (Signup Only) */}
                                {!isLogin && activeRole !== UserRole.Librarian && activeRole !== UserRole.Management && (
                                    <Input
                                        id="uniqueId"
                                        label="Organization Code / Management Code"
                                        value={uniqueId}
                                        onChange={(e) => setUniqueId(e.target.value)}
                                        placeholder="Enter Organization Code"
                                        required={!accessCode}
                                        className="text-black"
                                    />
                                )}

                                {/* Teacher Specific Fields (Signup Only) */}
                                {!isLogin && activeRole === UserRole.Teacher && (
                                    <>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">Role</label>
                                            <select
                                                className="w-full bg-white border border-gray-300 rounded-md p-2 text-black focus:ring-blue-500 focus:border-blue-500"
                                                value={teacherTitle}
                                                onChange={e => setTeacherTitle(e.target.value)}
                                            >
                                                <option value="">-- Select Role --</option>
                                                {orgType === 'school' ? (
                                                    ['HOD', 'Senior Teacher', 'Class Teacher', 'Subject Teacher'].map(r => <option key={r} value={r}>{r}</option>)
                                                ) : (
                                                    ['HOD', 'Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'Class Teacher (Advisor)', 'Subject Teacher'].map(r => <option key={r} value={r}>{r}</option>)
                                                )}
                                            </select>
                                        </div>



                                        {isTeachingRole(teacherTitle) && (
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-700">Teaching Assignments</label>
                                                <p className="text-xs text-gray-500">Pair each subject with the class you teach it to.</p>
                                                <div className="flex gap-2">
                                                    <Input
                                                        id="subject"
                                                        label=""
                                                        placeholder="Subject"
                                                        value={currentSubject}
                                                        onChange={e => setCurrentSubject(e.target.value)}
                                                        className="flex-1 text-black"
                                                    />
                                                    <Input
                                                        id="class"
                                                        label=""
                                                        placeholder="Class"
                                                        value={currentClass}
                                                        onChange={e => setCurrentClass(e.target.value)}
                                                        className="flex-1 text-black"
                                                    />
                                                    <Button type="button" onClick={handleAddAssignment} className="py-2">Add</Button>
                                                </div>
                                                <div className="space-y-2 mt-2">
                                                    {teachingAssignments.map((assign, index) => (
                                                        <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm border border-gray-200">
                                                            <span className="text-gray-700"><strong>{assign.subject}</strong> to <strong>{assign.classId}</strong></span>
                                                            <button type="button" onClick={() => removeAssignment(index)} className="text-red-500 hover:text-red-700">×</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {isClassTeacher(teacherTitle) && (
                                            <Input
                                                id="classInCharge"
                                                label="Class In-Charge (e.g. 5A)"
                                                value={classInChargeId}
                                                onChange={e => setClassInChargeId(e.target.value)}
                                                placeholder="Enter the class you manage"
                                                className="text-black"
                                            />
                                        )}
                                    </>
                                )}

                                {!isLogin && activeRole === UserRole.Management && (
                                    <>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">Role</label>
                                            <select
                                                className="w-full bg-white border border-gray-300 rounded-md p-2 text-black focus:ring-blue-500 focus:border-blue-500"
                                                value={managementTitle}
                                                onChange={e => setManagementTitle(e.target.value)}
                                            >
                                                <option value="">-- Select Role --</option>
                                                {orgType === 'school' ? (
                                                    ['Chairman', 'Director', 'Principal', 'Vice Principal', 'Manager', 'Administrator'].map(r => <option key={r} value={r}>{r}</option>)
                                                ) : (
                                                    ['Chairman', 'Director', 'Dean', 'Registrar', 'Manager', 'Administrator'].map(r => <option key={r} value={r}>{r}</option>)
                                                )}
                                            </select>
                                        </div>

                                    </>
                                )}

                                {!isLogin && (activeRole === UserRole.Student || activeRole === UserRole.Parent) && (
                                    <Input
                                        id="accessCode"
                                        label="Access Code (Optional)"
                                        value={accessCode}
                                        onChange={(e) => setAccessCode(e.target.value)}
                                        placeholder="Enter join code"
                                        className="text-black"
                                    />
                                )}

                                {!isLogin && activeRole === UserRole.Student && (
                                    <Input
                                        id="rollNumber"
                                        label="Roll Number"
                                        value={rollNumber}
                                        onChange={(e) => setRollNumber(e.target.value)}
                                        placeholder="Enter your Class Roll Number"
                                        required
                                        className="text-black"
                                    />
                                )}

                                {!isLogin && activeRole === UserRole.Parent && (
                                    <Input
                                        id="studentRollNumber"
                                        label="Student Roll Number"
                                        value={rollNumber}
                                        onChange={(e) => setRollNumber(e.target.value)}
                                        placeholder="Enter your child's Roll Number"
                                        required
                                        className="text-black"
                                    />
                                )}

                                {/* Google Reset Option on Error */}
                                {error && error.toLowerCase().includes('password') && (
                                    <div className="mt-2 text-center">
                                        <p className="text-xs text-red-600 mb-2">Forgot your password?</p>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                sessionStorage.setItem('edunexus:sso_role', activeRole);
                                                const redirectTo = `${window.location.origin}/#/login?sso_success=true&provider=google`;
                                                await supabase.auth.signInWithOAuth({
                                                    provider: 'google',
                                                    options: { redirectTo, queryParams: { access_type: 'offline', prompt: 'login' } }
                                                });
                                            }}
                                            className="text-xs text-indigo-600 hover:text-indigo-500 underline"
                                        >
                                            Verify with Google to Reset
                                        </button>
                                    </div>
                                )}

                                <div className="relative">
                                    <Input
                                        id="password"
                                        label="Password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onBlur={handlePasswordBlur}
                                        placeholder="••••••••"
                                        required
                                        autoComplete={isLogin ? "current-password" : "new-password"}
                                        className="text-black"
                                        error={passwordError}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-[34px] text-sm text-gray-500 hover:text-gray-700 focus:outline-none"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? 'Hide' : 'Show'}
                                    </button>
                                </div>

                                {!isLogin && password && (
                                    <div className="mt-1">
                                        <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-300 ${password.length < 6 ? 'bg-red-500 w-1/3' :
                                                    password.length < 10 ? 'bg-yellow-500 w-2/3' :
                                                        'bg-green-500 w-full'
                                                    }`}
                                            />
                                        </div>
                                        <p className="text-xs text-right mt-1 text-gray-500">
                                            {password.length < 6 ? 'Weak' : password.length < 10 ? 'Medium' : 'Strong'}
                                        </p>
                                    </div>
                                )}

                                {isLogin && (
                                    <div className="space-y-3">
                                        <div className="flex items-center">
                                            <input
                                                id="remember-me"
                                                name="remember-me"
                                                type="checkbox"
                                                checked={rememberMe}
                                                onChange={(e) => setRememberMe(e.target.checked)}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                                                Remember me
                                            </label>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <button
                                                type="button"
                                                onClick={handleResetFlow}
                                                className="text-sm font-medium text-blue-600 hover:text-blue-500"
                                                title="Go back and change email"
                                            >
                                                ← Change Email
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setShowForgotPassword(true)}
                                                className="text-sm font-medium text-blue-600 hover:text-blue-500"
                                            >
                                                Forgot password?
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {error && (
                                    <div className="bg-red-50 text-red-600 p-3 rounded text-sm text-center" role="alert" aria-live="assertive">
                                        ⚠️ {error}
                                    </div>
                                )}

                                {successMessage && (
                                    <div className="bg-green-50 text-green-600 p-3 rounded text-sm text-center" role="status" aria-live="polite">
                                        ✅ {successMessage}
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full py-3 text-lg font-semibold shadow-md transition-transform active:scale-[0.98] bg-blue-600 hover:bg-blue-700 text-white border-transparent"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center">
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Processing...
                                        </span>
                                    ) : (
                                        isLogin ? 'Sign In' : 'Create Account'
                                    )}
                                </Button>

                                {isLogin && (
                                    <button
                                        type="button"
                                        onClick={handleMagicLink}
                                        className="w-full py-2 text-sm font-medium text-blue-600 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors border border-transparent hover:border-blue-100"
                                    >
                                        ✨ Email me a login link
                                    </button>
                                )}
                            </form>
                        )}
                    </div>

                    <div className="mt-4 text-center text-xs text-gray-400">
                        <p>🔒 Secure Session | 2FA Supported</p>
                        <div className="mt-2 flex items-center justify-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${isOffline ? 'bg-red-500' : 'bg-green-500'}`}></span>
                            <span>{isOffline ? 'Offline Mode' : 'Systems Operational'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <OTPModal
                isOpen={showOTPModal}
                onClose={() => setShowOTPModal(false)}
                onVerify={handleVerifyOTP}
                email={email}
                onResend={async () => {
                    try {
                        setSuccessMessage('');
                        await resendOtp();
                        setSuccessMessage('A new code was sent to your email.');
                    } catch (e: any) {
                        setError(e?.message || 'Failed to resend code');
                        throw e;
                    }
                }}
            />
            {
                showGoogleLinkModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full mx-4">
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-gray-900 mb-2">🎉 Signup Successful!</h3>
                                <p className="text-sm text-gray-500 mb-6">
                                    Would you like to link your <strong>Google Account</strong> to login easier next time?
                                </p>
                            </div>
                            <div className="flex flex-col space-y-3">
                                <button
                                    onClick={async () => {
                                        /* Trigger Google Auth to Link */
                                        const redirectTo = `${window.location.origin}/dashboard`;
                                        await supabase.auth.signInWithOAuth({
                                            provider: 'google',
                                            options: { redirectTo, queryParams: { access_type: 'offline', prompt: 'consent' } }
                                        });
                                    }}
                                    className="w-full inline-flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                                >
                                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .533 5.333.533 12S5.867 24 12.48 24c3.44 0 6.013-1.133 8.053-3.24 2.08-2.16 2.72-5.333 2.72-8.213 0-.8-.08-1.56-.213-2.293h-10.56z" /></svg>
                                    Yes, Connect Google
                                </button>
                                <button
                                    onClick={() => navigateDashboard()}
                                    className="w-full inline-flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    No thanks, Go to Dashboard
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {
                popupError && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white border-l-4 border-red-500 rounded-lg p-6 shadow-2xl transform transition-all scale-100 max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200">
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div className="ml-4">
                                    <h3 className="text-lg font-bold text-gray-900">
                                        {popupError && (popupError.includes('not registered') || popupError.includes('not found')) ? 'Account Not Found' : 'Connection Error'}
                                    </h3>
                                    <div className="mt-1">
                                        <p className="text-sm text-gray-500">{popupError}</p>
                                    </div>
                                </div>
                                <div className="ml-auto pl-3">
                                    <button
                                        onClick={() => setPopupError(null)}
                                        className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
                                    >
                                        <span className="sr-only">Close</span>
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default UnifiedLoginForm;
