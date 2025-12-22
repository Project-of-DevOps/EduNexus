import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import ThemeSwitcher from './ThemeSwitcher';
import { useData } from '../context/DataContext';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Button from './ui/Button';
import { UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  navItems: { name: string; icon: React.ReactElement }[];
  activeItem: string;
  setActiveItem: (item: string) => void;
  setShowMessages?: (show: boolean) => void;
  profileNavItemName?: string;
  onAvatarClick?: () => void;
}

const Icon = ({ path, className }: { path: string, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);

const Layout: React.FC<LayoutProps> = ({
  children,
  navItems,
  activeItem,
  setActiveItem,
  setShowMessages,
  profileNavItemName = 'Profile',
  onAvatarClick,
}) => {
  const { user, logout, updateProfile, login, signUp } = useAuth();
  const { messages, users, notifications, markNotificationRead, getNotificationsForEmail } = useData();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [showNotificationsOpen, setShowNotificationsOpen] = useState(false);
  const location = useLocation();
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');

  useEffect(() => {
    if (location.state && (location.state as any).dashboardError) {
      setShowRecoveryModal(true);
    }
  }, [location]);

  const handleRecoveryRetry = async () => {
    setRetryLoading(true);
    setRecoveryError('');
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/py/restore-dashboard-state`, { user_id: user?.id });
      if (res.data.success) {
        // Success - Close modal and proceed
        setShowRecoveryModal(false);
        // Optionally update context with restored state if needed, but for now we just allow access
      } else {
        setRecoveryError("Error get the exact dashboard, you'll be redirected to new dashboard");
        setTimeout(() => setShowRecoveryModal(false), 3000);
      }
    } catch (e) {
      setRecoveryError("Error get the exact dashboard, you'll be redirected to new dashboard");
      setTimeout(() => setShowRecoveryModal(false), 3000);
      console.error(e);
    } finally {
      setRetryLoading(false);
    }
  };

  // Switch Account State
  const [switchEmail, setSwitchEmail] = useState('');
  const [switchPassword, setSwitchPassword] = useState('');
  const [showSwitchPassword, setShowSwitchPassword] = useState(false);
  const [switchError, setSwitchError] = useState('');
  const [showSwitchWarning, setShowSwitchWarning] = useState(false);
  const switchWarningTimer = useRef<number | null>(null);
  // modal mode: false => Switch, true => Add
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpUniqueId, setSignUpUniqueId] = useState('');
  const [signUpRole, setSignUpRole] = useState<UserRole>(UserRole.Student);
  const [signUpOrgType, setSignUpOrgType] = useState<'school' | 'institute'>('school');
  // orgSpecificName is the organization name field for 'Add' flow (school/institute label flips depending on current user)
  const [orgSpecificName, setOrgSpecificName] = useState('');

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const isManagement = user?.role === UserRole.Management;
  const switchButtonText = isManagement
    ? ((user as any).type === 'school' ? 'Switch to Institute' : 'Switch to School')
    : 'Switch Account';

  const handleSwitchAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSwitchError('');

    // Only allow a switch when the exact credentials succeed — do not toggle
    // or change data unless the login(email,password,role,extra) returns true.
    let success = false;
    let targetRole: UserRole | null = null;

    const foundUsers = users.filter(u => u.email.toLowerCase() === switchEmail.toLowerCase());

    const tryLogin = async (role: UserRole, extra?: Record<string, any>) => {
      const ok = await login(switchEmail, switchPassword, role, extra);
      if (ok) {
        success = true;
        targetRole = role;
      }
      return ok;
    };

    if (foundUsers.length > 0) {
      for (const u of foundUsers) {
        if (u.role === UserRole.Management) {
          if ((u as any).type && await tryLogin(UserRole.Management, { type: (u as any).type })) break;
          if (await tryLogin(UserRole.Management, { type: 'school' })) break;
          if (await tryLogin(UserRole.Management, { type: 'institute' })) break;
        } else {
          if (await tryLogin(u.role)) break;
        }
      }
    } else {
      const roles = Object.values(UserRole);
      for (const role of roles) {
        if (role === UserRole.Management) {
          if (await tryLogin(UserRole.Management, { type: 'school' })) break;
          if (await tryLogin(UserRole.Management, { type: 'institute' })) break;
        } else if (await tryLogin(role)) break;
      }
    }

    if (success) {
      setIsSwitchModalOpen(false);
      setSwitchEmail('');
      setSwitchPassword('');
      setShowSwitchPassword(false);

      // Navigate based on role
      switch (targetRole) {
        case UserRole.Student:
          navigate('/dashboard/student');
          break;
        case UserRole.Teacher:
        case UserRole.Dean:
          navigate('/dashboard/teacher');
          break;
        case UserRole.Parent:
          navigate('/dashboard/parent');
          break;
        case UserRole.Management:
          navigate('/dashboard/management');
          break;
        default:
          navigate('/');
      }
    } else {
      setSwitchError('Invalid credentials');
      setShowSwitchWarning(true);
      if (switchWarningTimer.current) window.clearTimeout(switchWarningTimer.current);
      switchWarningTimer.current = window.setTimeout(() => setShowSwitchWarning(false), 4000);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSwitchError('');

    if (!signUpEmail || !signUpPassword) {
      setSwitchError('All fields are required');
      return;
    }
    // Determine extras for management / organization assignment
    const extra: any = {};
    // If the currently signed-in user is management, adding creates the
    // counterpart organization view (school <-> institute). The Add modal
    // only collects org name, email and password, so create a Management
    // account for the other org type and attach instituteName.
    if (user && (user as any).role === UserRole.Management) {
      const opposite = ((user as any).type === 'school') ? 'institute' : 'school';
      extra.type = opposite;
      extra.instituteName = orgSpecificName || '';
    } else if (signUpRole === UserRole.Management) {
      // non-management signing up a management user
      extra.type = signUpOrgType;
      extra.instituteName = orgSpecificName || '';
    } else {
      extra.instituteName = orgSpecificName || '';
      if (signUpUniqueId) extra.uniqueId = signUpUniqueId;
    }

    // If an admin is adding, we create a Management account for the opposite
    // org type (this modal is for adding the counterpart view), otherwise use
    // the selected role.
    const roleToCreate = (user && (user as any).role === UserRole.Management) ? UserRole.Management : signUpRole;

    // Display name: when an admin adds an org view, use the org name as the
    // user-friendly name; otherwise prefer the supplied full name.
    const displayName = (user && (user as any).role === UserRole.Management)
      ? (orgSpecificName || signUpEmail.split('@')[0] || 'New User')
      : (signUpName || 'New User');

    // Use the signUp function from AuthContext
    const success = await signUp(displayName, signUpEmail, signUpPassword, roleToCreate, extra);

    if (success) {
      setIsSwitchModalOpen(false);
      // Reset form
      setSignUpName('');
      setSignUpEmail('');
      setSignUpPassword('');
      setSignUpRole(UserRole.Student);
      setSignUpUniqueId('');
      setOrgSpecificName('');
      setIsSignUpMode(false);

      // Navigate to dashboard
      // If an admin added an account we create management account and
      // navigate to management dashboard. Otherwise use the chosen role.
      switch (roleToCreate) {
        case UserRole.Student: navigate('/dashboard/student'); break;
        case UserRole.Teacher: navigate('/dashboard/teacher'); break;
        case UserRole.Parent: navigate('/dashboard/parent'); break;
        case UserRole.Management: navigate('/dashboard/management'); break;
        default: navigate('/');
      }
    } else {
      setSwitchError('Sign up failed. Email might already exist.');
      setShowSwitchWarning(true);
      if (switchWarningTimer.current) window.clearTimeout(switchWarningTimer.current);
      switchWarningTimer.current = window.setTimeout(() => setShowSwitchWarning(false), 4000);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    // Check current password (assuming it's stored in user object for this demo app)
    if ((user as any).password && (user as any).password !== currentPassword) {
      setPasswordError('Incorrect current password.');
      return;
    }

    updateProfile({ password: newPassword } as any);
    setPasswordSuccess('Password updated successfully.');
    setTimeout(() => {
      setIsChangePasswordModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess('');
    }, 1500);
  };

  useEffect(() => {
    return () => {
      if (switchWarningTimer.current) window.clearTimeout(switchWarningTimer.current);
    };
  }, []);

  const handleAvatarClick = () => {
    if (onAvatarClick) {
      onAvatarClick();
      return;
    }
    if (profileNavItemName) {
      setActiveItem(profileNavItemName);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleName = user?.role.charAt(0).toUpperCase() + user?.role.slice(1);

  const unreadMessagesCount = messages.filter(m => !m.readBy.includes(user?.id ?? '')).length;
  const myNotifications = user?.email ? getNotificationsForEmail(user.email) : [];
  const unreadNotificationsCount = myNotifications.filter(n => !n.read).length;

  return (
    <div className="flex h-screen bg-[rgb(var(--background-color))] text-[rgb(var(--text-color))]">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-[rgb(var(--foreground-color))] shadow-xl transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:flex md:flex-shrink-0`}>
        <div className="flex flex-col h-full">
          <div className="h-20 flex items-center justify-center bg-[rgba(var(--primary-color),0.05)]">
            <h1 className="text-2xl font-extrabold text-[rgb(var(--highlight-color))]">EduNexus AI</h1>
          </div>
          <nav className="flex-1 px-2 py-4 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.name}
                onClick={() => {
                  setActiveItem(item.name);
                  if (setShowMessages) setShowMessages(false);
                }}
                className={`flex items-center w-full px-4 py-2 text-left rounded-lg transition-colors duration-200 ${activeItem === item.name
                  ? 'bg-[rgb(var(--primary-color))] text-[rgb(var(--primary-text-color))]'
                  : 'hover:bg-[rgba(var(--primary-color),0.1)]'
                  }`}
              >
                {item.icon}
                <span className="ml-3">{item.name}</span>
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-[rgb(var(--border-color))] space-y-2">
            <button onClick={() => setIsSwitchModalOpen(true)} className="flex items-center w-full px-4 py-2 text-left rounded-lg transition-colors duration-200 hover:bg-[rgba(var(--primary-color),0.1)] text-[rgb(var(--text-color))] font-bold">
              <Icon path="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              <span className="ml-3">{switchButtonText}</span>
            </button>
            <button onClick={() => setIsChangePasswordModalOpen(true)} className="flex items-center w-full px-4 py-2 text-left rounded-lg transition-colors duration-200 hover:bg-[rgba(var(--primary-color),0.1)] text-[rgb(var(--text-color))] font-bold">
              <Icon path="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              <span className="ml-3">Change Password</span>
            </button>
            <button onClick={handleLogout} className="flex items-center w-full px-4 py-2 text-left rounded-lg transition-colors duration-200 bg-red-600 hover:bg-red-700 text-white font-bold">
              <Icon path="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              <span className="ml-3">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black opacity-50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between h-20 px-6 bg-[rgb(var(--foreground-color))] border-b border-[rgb(var(--border-color))]">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden text-[rgb(var(--text-secondary-color))] focus:outline-none">
            <Icon path="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </button>
          <div className="flex items-center">
            {/* Header Content can go here */}
          </div>
          <div className="flex items-center gap-4">
            <ThemeSwitcher />

            {setShowMessages && (
              <button onClick={() => setShowMessages(true)} className="relative text-[rgb(var(--text-secondary-color))] hover:text-[rgb(var(--text-color))]">
                <Icon path="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[rgb(var(--danger-color))] text-xs font-bold text-[rgb(var(--primary-text-color))]">
                    {unreadMessagesCount}
                  </span>
                )}
              </button>
            )}
            <div className="text-right flex flex-col items-end">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{user?.name}</p>
                {/* org badge */}
                {user && (
                  (() => {
                    const org = (user as any).type || (user as any).orgType || null;
                    if (!org) return null;
                    const label = org === 'institute' ? 'Institute' : 'School';
                    const bgClass = org === 'institute' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800';
                    return (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${bgClass}`} aria-hidden>
                        {label}
                      </span>
                    );
                  })()
                )}
              </div>
              <p className="text-sm text-[rgb(var(--text-color))] font-bold">{roleName}</p>
            </div>
            <button type="button" onClick={handleAvatarClick} className="relative inline-block cursor-pointer focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary-color))] rounded-full" aria-label="Open profile">
              {user?.avatarUrl ? (
                <img className="w-10 h-10 rounded-full object-cover" src={user.avatarUrl} alt="User Avatar" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[rgb(var(--subtle-background-color))] flex items-center justify-center text-sm font-semibold text-[rgb(var(--text-color))]">
                  {user?.name?.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase() || 'U'}
                </div>
              )}
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[rgb(var(--background-color))] p-6">
          {children}
        </main>
      </div>
      {/* Switch/Sign-up warnings toast */}
      {showSwitchWarning && switchError && (
        <div className="fixed top-4 right-4 z-50">
          <div className="flex items-start gap-3 p-3 rounded shadow-lg bg-red-50 border border-red-200 max-w-sm">
            <div className="flex-shrink-0 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-700" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.454 9.69c.75 1.333-.213 3.01-1.742 3.01H4.545c-1.529 0-2.492-1.677-1.742-3.01l5.454-9.69zM9 7a1 1 0 112 0v3a1 1 0 11-2 0V7zm1 8.25a1.25 1.25 0 100-2.5 1.25 1.25 0 000 2.5z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-red-800">{switchError}</p>
              <div className="mt-1 text-xs text-red-600">Please check your email and password and try again.</div>
            </div>
            <button aria-label="dismiss" onClick={() => setShowSwitchWarning(false)} className="ml-3 self-start text-red-500 hover:text-red-700">×</button>
          </div>
        </div>
      )}

      <Modal isOpen={isSwitchModalOpen} onClose={() => setIsSwitchModalOpen(false)}>
        <div className="flex border-b mb-4">
          <button
            className={`flex-1 py-2 text-center font-semibold ${!isSignUpMode ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
            onClick={() => setIsSignUpMode(false)}
          >
            Switch
          </button>
          <button
            className={`flex-1 py-2 text-center font-semibold ${isSignUpMode ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
            onClick={() => setIsSignUpMode(true)}
          >
            Add
          </button>
        </div>

        {!isSignUpMode ? (
          <form onSubmit={handleSwitchAccount} className="space-y-4">
            <Input
              id="switchEmail"
              label="Email"
              type="email"
              value={switchEmail}
              onChange={e => setSwitchEmail(e.target.value)}
              className="text-blue-900 font-medium"
            />
            <Input
              id="switchPassword"
              label="Password"
              type={showSwitchPassword ? "text" : "password"}
              value={switchPassword}
              onChange={e => setSwitchPassword(e.target.value)}
              className="text-blue-900 font-medium"
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowSwitchPassword(!showSwitchPassword)}
                  className="text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {showSwitchPassword ? (
                    <Icon path="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  ) : (
                    <Icon path="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  )}
                </button>
              }
            />
            {switchError && <p className="text-sm text-red-500">{switchError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setIsSwitchModalOpen(false)}>Cancel</Button>
              <Button type="submit">Switch</Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-4">
            {/* Add mode: collect organization-specific name, Email and Password */}
            {user && (user as any).role === UserRole.Management ? (
              <Input
                id="orgName"
                label={(user as any).type === 'school' ? 'Institute Name' : 'School Name'}
                value={orgSpecificName}
                onChange={e => setOrgSpecificName(e.target.value)}
                className="text-blue-900 font-medium"
                placeholder={(user as any).type === 'school' ? 'e.g. My Institute' : 'e.g. My School'}
              />
            ) : (
              <p className="text-sm text-gray-500">Only Management users can add new organization views.</p>
            )}

            {user && (user as any).role === UserRole.Management && (
              <>
                <Input
                  id="signupEmail"
                  label="Email"
                  type="email"
                  value={signUpEmail}
                  onChange={e => setSignUpEmail(e.target.value)}
                  className="text-blue-900 font-medium"
                />
                <Input
                  id="signupPassword"
                  label="Password"
                  type="password"
                  value={signUpPassword}
                  onChange={e => setSignUpPassword(e.target.value)}
                  className="text-blue-900 font-medium"
                />
                {switchError && <p className="text-sm text-red-500">{switchError}</p>}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={() => setIsSwitchModalOpen(false)}>Cancel</Button>
                  <Button type="submit">Add</Button>
                </div>
              </>
            )}
          </form>
        )}
      </Modal>

      <Modal isOpen={isChangePasswordModalOpen} onClose={() => setIsChangePasswordModalOpen(false)}>
        <h2 className="text-xl font-bold mb-4">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            id="currentPassword"
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            className="text-blue-900 font-medium"
          />
          <Input
            id="newPassword"
            label="New Password"
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="text-blue-900 font-medium"
          />
          <Input
            id="confirmPassword"
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="text-blue-900 font-medium"
          />
          {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
          {passwordSuccess && <p className="text-sm text-green-500">{passwordSuccess}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsChangePasswordModalOpen(false)}>Cancel</Button>
            <Button type="submit">Update Password</Button>
          </div>
        </form>
      </Modal>

      {/* Dashboard Recovery Modal */}
      <Modal isOpen={showRecoveryModal} onClose={() => { /* Force user to choose */ }}>
        <div className="text-center space-y-4">
          <h3 className="text-xl font-bold text-red-600">Error get the exact dashboard</h3>
          <p className="text-gray-600">
            {recoveryError || "We couldn't restore your dashboard exactly as you left it."}
          </p>
          {!recoveryError && (
            <p className="text-sm font-bold text-green-600 bg-green-50 p-2 rounded">
              NOTE: No data will be lost
            </p>
          )}

          <div className="flex justify-center gap-4 mt-6">
            <Button
              variant="secondary"
              onClick={() => setShowRecoveryModal(false)}
              disabled={retryLoading}
            >
              Okay
            </Button>
            <Button
              onClick={handleRecoveryRetry}
              disabled={retryLoading}
            >
              {retryLoading ? 'Retrying...' : 'Retry'}
            </Button>
          </div>
          {recoveryError && <p className="text-xs text-red-500 mt-2">Redirecting...</p>}
        </div>
      </Modal>
    </div >
  );
};

export default Layout;
