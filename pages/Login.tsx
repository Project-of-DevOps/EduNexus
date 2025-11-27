import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserRole, Dean } from '../types';
import { ROLES } from '../constants';
// NOTE: We no longer rely on large mock datasets for auth. A small login dummy list
// lives in `data/loginDummyUsers` and AuthContext handles the rest for local development.
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import Select from '../components/ui/Select';

const LoginPage: React.FC = () => {
  const [activeRole, setActiveRole] = useState<UserRole>(UserRole.Student);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [instituteName, setInstituteName] = useState('');
  const [error, setError] = useState('');
  
  // State for teacher hierarchy
  const [selectedInstituteId, setSelectedInstituteId] = useState('');
  const [teacherSubRole, setTeacherSubRole] = useState<'hod' | 'professor' | ''>('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedHodId, setSelectedHodId] = useState('');

  const navigate = useNavigate();
  const { login, signUp } = useAuth();

  // Reset hierarchy on role change
  useEffect(() => {
    setEmail('');
    setPassword('');
    setError('');
    setSelectedInstituteId('');
    setTeacherSubRole('');
    setSelectedDepartmentId('');
    setSelectedHodId('');
  }, [activeRole]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    // institute name is collected for auditing/tenant selection later.
    if (login(email, password, activeRole)) {
      navigate('/dashboard');
    } else {
      setError('Invalid credentials. Please try again.');
    }
  };

  const [showSignUp, setShowSignUp] = useState(false);
  const [signName, setSignName] = useState('');
  const [signEmail, setSignEmail] = useState('');
  const [signPassword, setSignPassword] = useState('');
  const [teacherTitle, setTeacherTitle] = useState('subject-teacher');
  const [newSubject, setNewSubject] = useState('');
  const [signSubjects, setSignSubjects] = useState<string[]>([]);
  const [signClassId, setSignClassId] = useState('');
  const [signError, setSignError] = useState('');

  const handleSignUpClick = () => {
    // Open the inline sign-up form instead of auto-creating a guest user.
    setShowSignUp(true);
  };

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSignError('');
    if (!signName || !signEmail || !signPassword) {
      setSignError('Please fill name, email and password.');
      return;
    }

    // Teacher-specific checks
    if (activeRole === UserRole.Teacher) {
      if (teacherTitle === 'class-teacher' && !signClassId) {
        setSignError('Class ID is required for Class Teacher.');
        return;
      }
    }

      // Build extras for teacher role
      const extras: Record<string, any> = {};
      if (instituteName) extras.instituteName = instituteName;
      if (activeRole === UserRole.Teacher) {
        extras.title = teacherTitle;
        extras.subjects = signSubjects;
        if (teacherTitle === 'class-teacher' && signClassId) extras.classId = signClassId;
      }

      const ok = signUp(signName, signEmail, signPassword, activeRole, extras);
    if (ok) {
      navigate('/dashboard');
    } else {
      setSignError('Sign-up failed (email may already exist).');
    }
  };

  const handleInstituteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedInstituteId(e.target.value);
    setTeacherSubRole('');
    setSelectedDepartmentId('');
    setSelectedHodId('');
  };

  const handleSubRoleClick = (subRole: 'hod' | 'professor') => {
    setTeacherSubRole(subRole);
    setSelectedDepartmentId('');
    setSelectedHodId('');
  };

  // Memoized data for dropdowns
  const departmentsForInstitute = useMemo(() => [], [selectedInstituteId]);
  const hodsForInstitute = useMemo(() => [], [selectedInstituteId]);

  const isLoginFormVisible =
    activeRole === UserRole.Student ||
    activeRole === UserRole.Parent ||
    (activeRole === UserRole.Teacher && teacherSubRole === 'hod' && !!selectedDepartmentId) ||
    (activeRole === UserRole.Teacher && teacherSubRole === 'professor' && !!selectedHodId);
    
  const teacherFlow = (
    <div className="space-y-4 mb-6">
      <Select
        id="institute"
        label="Select Institute"
        value={selectedInstituteId}
        onChange={handleInstituteChange}
      >
        <option value="">-- No institutes configured --</option>
        {/* Institutes are configured by the backend/admin UI. Left empty intentionally until services are available. */}
      </Select>

      {selectedInstituteId && (
        <div>
          <label className="block mb-2 text-sm font-medium text-[rgb(var(--text-color))]">Select Role</label>
          <div className="flex space-x-2">
            <Button type="button" onClick={() => handleSubRoleClick('hod')} variant={teacherSubRole === 'hod' ? 'primary' : 'secondary'} className="flex-1">HOD</Button>
            <Button type="button" onClick={() => handleSubRoleClick('professor')} variant={teacherSubRole === 'professor' ? 'primary' : 'secondary'} className="flex-1">Professor</Button>
          </div>
        </div>
      )}

      {teacherSubRole === 'hod' && (
        <Select
          id="department"
          label="Select Department"
          value={selectedDepartmentId}
          onChange={(e) => setSelectedDepartmentId(e.target.value)}
        >
          <option value="">-- Choose a Department --</option>
          {departmentsForInstitute.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
        </Select>
      )}

      {teacherSubRole === 'professor' && (
        <Select
          id="hod"
          label="Select Your HOD"
          value={selectedHodId}
          onChange={(e) => setSelectedHodId(e.target.value)}
        >
          <option value="">-- No HODs configured --</option>
          {/* Institutes, departments and HOD lists are configured via admin in a backed environment.
            They are intentionally empty now so your app uses real data later. */}
        </Select>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--background-color))] px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-4xl font-extrabold text-[rgb(var(--text-color))]">
            EduNexus AI
          </h1>
          <p className="mt-2 text-center text-sm text-[rgb(var(--text-secondary-color))]">
            Sign in to your account
          </p>
        </div>

        <Card>
          <div className="flex justify-around mb-6 border-b border-[rgb(var(--border-color))]">
            {ROLES.map((role) => (
              <button
                key={role.id}
                onClick={() => setActiveRole(role.id)}
                className={`flex-1 py-3 text-sm font-medium transition-colors duration-200 ${
                  activeRole === role.id
                    ? 'text-[rgb(var(--primary-color))] border-b-2 border-[rgb(var(--primary-color))]'
                    : 'text-[rgb(var(--text-secondary-color))] hover:text-[rgb(var(--text-color))]'
                }`}
              >
                {role.name}
              </button>
            ))}
          </div>

          {!showSignUp ? (
            <>
              {activeRole === UserRole.Teacher && teacherFlow}
              
              {isLoginFormVisible && (
                <form className="space-y-6" onSubmit={handleLogin}>
              { (activeRole === UserRole.Teacher || activeRole === UserRole.Student || activeRole === UserRole.Parent) && (
                <Input
                  id="institute"
                  label="Institute Name"
                  type="text"
                  value={instituteName}
                  onChange={(e) => setInstituteName(e.target.value)}
                />
              )}
              <Input
                id="email"
                label="Email address"
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                id="password"
                label="Password"
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              
              {error && <p className="text-sm text-red-500">{error}</p>}
              
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <a href="#" className="font-medium text-[rgb(var(--primary-color))] hover:text-[rgb(var(--primary-color-dark))]">
                    Forgot your password?
                  </a>
                </div>
              </div>

              <div>
                <Button type="submit" className="w-full">
                  Sign in as {ROLES.find(r => r.id === activeRole)?.name}
                </Button>
                </div>
              </form>
              )}
            </>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Create a new {ROLES.find(r => r.id === activeRole)?.name} account</h3>
                <Button type="button" variant="secondary" onClick={() => setShowSignUp(false)}>Sign-in</Button>
              </div>
              <form className="space-y-4" onSubmit={handleSignUpSubmit}>
                <Input id="signup-name" label="Full name" value={signName} onChange={e => setSignName(e.target.value)} required />
                {(activeRole === UserRole.Teacher || activeRole === UserRole.Student || activeRole === UserRole.Parent) && (
                  <Input id="signup-institute" label="Institute Name" value={instituteName} onChange={e => setInstituteName(e.target.value)} />
                )}
                <Input id="signup-email" label="Email" type="email" value={signEmail} onChange={e => setSignEmail(e.target.value)} required />
                <Input id="signup-password" label="Password" type="password" value={signPassword} onChange={e => setSignPassword(e.target.value)} required />
                {activeRole === UserRole.Teacher && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium">Teacher Title</label>
                    <select className="w-full bg-[rgb(var(--foreground-color))] border border-[rgb(var(--border-color))] rounded-md p-2" value={teacherTitle} onChange={e => setTeacherTitle(e.target.value)}>
                      {['subject-teacher','class-teacher','hod','vice-principal','principal','director','chairman'].map(t => (
                        <option key={t} value={t}>{t.replace(/-/g,' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                      ))}
                    </select>

                    <div>
                      <label className="block text-sm font-medium">Subjects (add multiple)</label>
                      <div className="flex gap-2 mt-2">
                        <Input id="new-subject" label="New subject" value={newSubject} onChange={e => setNewSubject(e.target.value)} />
                        <Button type="button" onClick={() => {
                          if (newSubject.trim()) { setSignSubjects(prev => [...prev, newSubject.trim()]); setNewSubject(''); }
                        }}>Add</Button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {signSubjects.map(s => (
                          <div key={s} className="px-2 py-1 bg-[rgb(var(--subtle-background-color))] rounded-full flex items-center gap-2">
                            <span className="text-sm">{s}</span>
                            <button type="button" onClick={() => setSignSubjects(prev => prev.filter(x => x !== s))} className="text-xs font-bold text-red-500">×</button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {teacherTitle === 'class-teacher' && (
                      <Input id="signup-class" label="Class ID (for class teacher)" value={signClassId} onChange={e => setSignClassId(e.target.value)} />
                    )}
                  </div>
                )}
                {signError && <p className="text-sm text-red-500">{signError}</p>}
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="secondary" onClick={() => setShowSignUp(false)}>Cancel</Button>
                  <Button type="submit">Create account</Button>
                </div>
              </form>
            </div>
          )}

          <div className="text-center mt-6">
            <p className="text-sm text-[rgb(var(--text-secondary-color))]">
              Don't have an account?{' '}
              <button 
                onClick={handleSignUpClick} 
                className="font-medium text-[rgb(var(--primary-color))] hover:text-[rgb(var(--primary-color-dark))] focus:outline-none bg-transparent border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                // Sign-up is allowed for all roles (including Teacher). Role-specific
                // details can be collected in the sign-up form instead of blocking.
              >
                Sign up
              </button>
            </p>
          </div>
        </Card>
        {/* Sign-up form is now rendered inside the main Card so sign-in/sign-up do not show together */}
      </div>
    </div>
  );
};

export default LoginPage;