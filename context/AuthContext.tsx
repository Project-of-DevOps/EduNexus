
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { LoggedInUser, UserRole, Student, Teacher, Parent } from '../types';
import { findDummyUser } from '../data/loginDummyUsers';
import { useData } from './DataContext';

interface AuthContextType {
  user: LoggedInUser | null;
  login: (email: string, password: string, role: UserRole, extra?: Record<string, any>) => boolean;
  signUp: (name: string, email: string, password: string, role: UserRole, extra?: Record<string, any>) => boolean;
  updateProfile: (patch: Partial<LoggedInUser>) => void;
  logout: () => void;
  signUpAsGuest: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<LoggedInUser | null>(null);

  const { users, addUser, updateUser } = useData();

  const login = (email: string, password: string, role: UserRole, extra: Record<string, any> | undefined = undefined) => {
    // First check any users stored in DataContext (created via sign up)
    // Match existing users; when role is Management allow distinguishing by 'type' (school/institute)
    const emailLower = email.toLowerCase();
    const existing = users.find(u => {
      if (u.email.toLowerCase() !== emailLower) return false;
      if (u.role !== role) return false;

      // Support organization type scoping (orgType) for non-management roles
      if (extra && extra.orgType) {
        if ((u as any).orgType !== extra.orgType) return false;
      }

      // Management users historically use `type` field for school/institute
      if (role === UserRole.Management && extra && extra.type) {
        return (u as any).type === extra.type;
      }

      return true;
    }) as (LoggedInUser & { password?: string }) | undefined;
    if (existing) {
      // Prevent login if the account isn't activated yet
      if ((existing as any).activated === false) return false;
      if ((existing as any).password && (existing as any).password !== password) return false;
      setUser(existing);
      return true;
    }

    // For now we validate against the small dummy login list so devs can build the
    // application without a backend. Passwords are stored in-memory only.
    // If no existing created user matches, fall back to the dummy dataset
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
      setUser({ ...(base as any), parentId: (found as any).parentId || '', classId: (found as any).classId || '', instituteId: (found as any).instituteId || '' } as Student);
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
      setUser({ id: newId, name: 'New Student', email: `${newId}@edunexus.local`, role, parentId: '', classId: '', instituteId: '' });
    } else if (role === UserRole.Teacher) {
      setUser({ id: newId, name: 'New Teacher', email: `${newId}@edunexus.local`, role, department: '', instituteId: '', reportingToId: '' });
    } else if (role === UserRole.Parent) {
      setUser({ id: newId, name: 'New Parent', email: `${newId}@edunexus.local`, role, childIds: [] });
    } else if (role === UserRole.Management) {
      setUser({ id: newId, name: 'New Manager', email: `${newId}@edunexus.local`, role, instituteId: '', type: 'institute' });
    } else {
      setUser({ id: newId, name: 'New User', email: `${newId}@edunexus.local`, role } as LoggedInUser);
    }
  };

  const signUp = (name: string, email: string, password: string, role: UserRole, extra: Record<string, any> = {}) => {
    // Prevent duplicate emails _for the same role and same org type_ (management users may share email across types)
    const emailLower = email.toLowerCase();
    const exists = users.find(u => {
      if (u.email.toLowerCase() !== emailLower) return false;
      if (u.role !== role) return false;

      // If caller provided an orgType (school/institute) then only treat as a conflict
      // when an existing user has the same orgType. This allows the same email to be
      // used for the same role across different organization types (school vs institute)
      if (extra && extra.orgType) {
        if ((u as any).orgType && (u as any).orgType === extra.orgType) return true;
        // if existing user has no orgType then treat as conflict (conservative)
        if (!(u as any).orgType) return true;
        return false;
      }

      // allow duplicate management emails if the org type is different
      if (role === UserRole.Management) {
        if (!extra.type && !(u as any).type) return true; // same role and no type provided => conflict
        if (extra.type && (u as any).type === extra.type) return true; // conflict when same type
        return false; // different type => allow
      }

      return true;
    });
    if (exists) return false;

    const newId = `${role}_${Date.now()}`;
    const base: any = { id: newId, name, email, role, password, ...extra };

    // store consistent orgType on created users when provided
    if (extra && extra.orgType) base.orgType = extra.orgType;

    // role specific defaults
    if (role === UserRole.Student) {
      base.parentId = extra.parentId || '';
      base.classId = extra.classId || '';
      base.instituteId = extra.instituteName || extra.instituteId || '';
    } else if (role === UserRole.Teacher) {
      base.department = extra.department || '';
      base.instituteId = extra.instituteName || extra.instituteId || '';
      base.reportingToId = extra.reportingToId || '';
    } else if (role === UserRole.Management) {
      base.instituteId = extra.instituteName || extra.instituteId || '';
      base.type = extra.type || 'institute';
    } else if (role === UserRole.Parent) {
      base.childIds = extra.childIds || [];
      base.instituteId = extra.instituteName || extra.instituteId || '';
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
