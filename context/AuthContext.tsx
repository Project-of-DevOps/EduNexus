
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { LoggedInUser, UserRole, Student, Teacher, Parent } from '../types';
import { findDummyUser } from '../data/loginDummyUsers';
import { useData } from './DataContext';

interface AuthContextType {
  user: LoggedInUser | null;
  login: (email: string, password: string, role: UserRole) => boolean;
  signUp: (name: string, email: string, password: string, role: UserRole, extra?: Record<string, any>) => boolean;
  updateProfile: (patch: Partial<LoggedInUser>) => void;
  logout: () => void;
  signUpAsGuest: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<LoggedInUser | null>(null);

  const { users, addUser, updateUser } = useData();

  const login = (email: string, password: string, role: UserRole) => {
    // First check any users stored in DataContext (created via sign up)
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.role === role) as (LoggedInUser & { password?: string }) | undefined;
    if (existing) {
      if ((existing as any).password && (existing as any).password !== password) return false;
      setUser(existing);
      return true;
    }
    // For now we validate against the small dummy login list so devs can build the
    // application without a backend. Passwords are stored in-memory only.
    const found = findDummyUser(email, role);
    if (!found) return false;
    // If the dummy record contains a password — check it.
    if (found.password && found.password !== password) return false;

    // Build a minimal LoggedInUser from the dummy record
    const base: Partial<LoggedInUser> = {
      id: found.id || `user_${Date.now()}`,
      name: found.name || 'Guest User',
      email: found.email || '',
      role: found.role as UserRole,
    };

    // Map role specific fields
    if (found.role === UserRole.Student) {
      setUser({ ...(base as any), parentId: (found as any).parentId || '', classId: (found as any).classId || '' } as Student);
    } else if (found.role === UserRole.Teacher) {
      // include title/subjects when available on dummy entries
      setUser({ ...(base as any), department: (found as any).department || '', instituteId: (found as any).instituteId || '', reportingToId: (found as any).reportingToId || '', title: (found as any).title, subjects: (found as any).subjects } as Teacher);
    } else if (found.role === UserRole.Parent) {
      setUser({ ...(base as any), childIds: (found as any).childIds || [] } as Parent);
    } else {
      // default fallback
      setUser(base as LoggedInUser);
    }

    return true;
  };

  const signUpAsGuest = (role: UserRole) => {
    // Create a minimal 'new' user for the chosen role — this avoids reaching
    // into the large mock dataset and ensures the app behaves like a real signup
    // flow that would create a user in a backend.
    const newId = `${role}_${Date.now()}`;
    if (role === UserRole.Student) {
      setUser({ id: newId, name: 'New Student', email: `${newId}@edunexus.local`, role, parentId: '', classId: '' });
    } else if (role === UserRole.Teacher) {
      setUser({ id: newId, name: 'New Teacher', email: `${newId}@edunexus.local`, role, department: '', instituteId: '', reportingToId: '' });
    } else if (role === UserRole.Parent) {
      setUser({ id: newId, name: 'New Parent', email: `${newId}@edunexus.local`, role, childIds: [] });
    } else {
      setUser({ id: newId, name: 'New User', email: `${newId}@edunexus.local`, role } as LoggedInUser);
    }
  };

  const signUp = (name: string, email: string, password: string, role: UserRole, extra: Record<string, any> = {}) => {
    // Prevent duplicate emails
    const exists = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (exists) return false;

    const newId = `${role}_${Date.now()}`;
    const base: any = { id: newId, name, email, role, password, ...extra };

    // role specific defaults
    if (role === UserRole.Student) {
      base.parentId = extra.parentId || '';
      base.classId = extra.classId || '';
    } else if (role === UserRole.Teacher) {
      base.department = extra.department || '';
      base.instituteId = extra.instituteId || '';
      base.reportingToId = extra.reportingToId || '';
    } else if (role === UserRole.Parent) {
      base.childIds = extra.childIds || [];
    }

    addUser(base);
    setUser(base as LoggedInUser);
    return true;
  };

  const logout = () => {
    setUser(null);
  };
  
  const updateProfile = (patch: Partial<LoggedInUser>) => {
    if (!user) return;
    // update in DataContext store
    updateUser(user.id, patch);
    // update local auth user state
    setUser(prev => prev ? ({ ...prev, ...patch } as LoggedInUser) : prev);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, signUpAsGuest, signUp, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
