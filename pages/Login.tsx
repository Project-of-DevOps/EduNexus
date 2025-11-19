import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserRole, Dean } from '../types';
import { ROLES } from '../constants';
import { mockInstitutes, mockDepartments, mockUsers } from '../data/mock';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import Select from '../components/ui/Select';

const LoginPage: React.FC = () => {
  const [activeRole, setActiveRole] = useState<UserRole>(UserRole.Student);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  // State for teacher hierarchy
  const [selectedInstituteId, setSelectedInstituteId] = useState('');
  const [teacherSubRole, setTeacherSubRole] = useState<'hod' | 'professor' | ''>('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedHodId, setSelectedHodId] = useState('');

  const navigate = useNavigate();
  const { login, signUpAsGuest } = useAuth();

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
    if (login(email, activeRole)) {
      navigate('/dashboard');
    } else {
      setError('Invalid credentials. Please try again.');
    }
  };

  const handleSignUp = () => {
    signUpAsGuest(activeRole);
    navigate('/dashboard');
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
  const departmentsForInstitute = useMemo(() => {
    return selectedInstituteId ? mockDepartments.filter(d => d.instituteId === selectedInstituteId) : [];
  }, [selectedInstituteId]);

  const hodsForInstitute = useMemo(() => {
    return selectedInstituteId ? mockUsers.filter(u => u.role === UserRole.Dean && (u as Dean).instituteId === selectedInstituteId) as Dean[] : [];
  }, [selectedInstituteId]);

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
        <option value="">-- Choose an Institute --</option>
        {mockInstitutes.map(inst => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
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
          <option value="">-- Choose your HOD --</option>
          {hodsForInstitute.map(hod => <option key={hod.id} value={hod.id}>{hod.name} ({hod.department})</option>)}
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

          {activeRole === UserRole.Teacher && teacherFlow}
          
          {isLoginFormVisible && (
            <form className="space-y-6" onSubmit={handleLogin}>
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

          <div className="text-center mt-6">
            <p className="text-sm text-[rgb(var(--text-secondary-color))]">
              Don't have an account?{' '}
              <button 
                onClick={handleSignUp} 
                className="font-medium text-[rgb(var(--primary-color))] hover:text-[rgb(var(--primary-color-dark))] focus:outline-none bg-transparent border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={activeRole === UserRole.Teacher && !isLoginFormVisible}
              >
                Sign up
              </button>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;