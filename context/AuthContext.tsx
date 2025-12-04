
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { LoggedInUser, UserRole, Student, Teacher, Parent } from '../types';
import { findDummyUser } from '../data/loginDummyUsers';
import { useData } from './DataContext';

interface AuthContextType {
  user: LoggedInUser | null;
  login: (email: string, password: string, role: UserRole, extra?: Record<string, any>) => Promise<{ success: boolean; error?: string; require2fa?: boolean }>;
  signUp: (name: string, email: string, password: string, role: UserRole, extra?: Record<string, any>) => Promise<boolean>;
  updateProfile: (patch: Partial<LoggedInUser>) => void;
  logout: () => void;
  signUpAsGuest: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [rememberMe, setRememberMe] = useState(false);

  const [user, setUser] = useState<LoggedInUser | null>(() => {
    try {
      // Check localStorage first (Remember Me)
      const local = localStorage.getItem('edunexus:auth_user');
      if (local) {
        return JSON.parse(local);
      }
      // Then check sessionStorage (Session only)
      const session = sessionStorage.getItem('edunexus:auth_user');
      if (session) {
        return JSON.parse(session);
      }
      return null;
    } catch (e) {
      console.warn('Failed to parse auth user', e);
      return null;
    }
  });

  const { users, addUser, updateUser, addPendingManagementSignup, pendingManagementSignups } = useData();

  // Persist user on change
  React.useEffect(() => {
    if (user) {
      if (rememberMe || localStorage.getItem('edunexus:auth_user')) {
        // If rememberMe is true OR we already have it in local (restored from local), keep it in local
        localStorage.setItem('edunexus:auth_user', JSON.stringify(user));
        sessionStorage.removeItem('edunexus:auth_user');
      } else {
        // Otherwise use session
        sessionStorage.setItem('edunexus:auth_user', JSON.stringify(user));
        localStorage.removeItem('edunexus:auth_user');
      }
    } else {
      localStorage.removeItem('edunexus:auth_user');
      sessionStorage.removeItem('edunexus:auth_user');
    }
  }, [user, rememberMe]);

  const login = async (email: string, password: string, role: UserRole, extra: Record<string, any> | undefined = undefined): Promise<{ success: boolean; error?: string; require2fa?: boolean }> => {
    // First check any users stored in DataContext (created via sign up)
    // Match existing users; when role is Management allow distinguishing by 'type' (school/institute)

    // Handle Remember Me preference
    if (extra && extra.rememberMe !== undefined) {
      setRememberMe(extra.rememberMe);
    }

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

    // Local login (if user exists locally and no 2FA required by server logic yet)
    if (existing) {
      // Prevent login if the account isn't activated yet
      if ((existing as any).activated === false) return { success: false, error: 'Account not activated' };
      if ((existing as any).password && (existing as any).password !== password) return { success: false, error: 'Wrong password' };
      setUser(existing);
      return { success: true };
    }

    // If no existing created user matches, check any pending management signup
    // that we queued locally while offline — allow the user to sign in using
    // their queued credentials so they aren't blocked by a down backend.
    if (role === UserRole.Management) {
      const pendingMatch = (pendingManagementSignups || []).find(p => p.email.toLowerCase() === emailLower && p.password === password);
      if (pendingMatch) {
        const pendingLocal = { id: `pending_${Date.now()}`, name: pendingMatch.name || 'Pending User', email: pendingMatch.email, role: UserRole.Management, password: pendingMatch.password, pendingSync: true } as any as LoggedInUser & { password?: string };
        addUser(pendingLocal as any);
        setUser(pendingLocal as LoggedInUser);
        return { success: true };
      }
    }

    // Server Login (Management or if local not found)
    const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';
    try {
      const resp = await fetch(`${apiUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          role,
          extra,
          twoFactorToken: extra?.twoFactorToken // Pass 2FA token if present
        })
      });

      // Handle Remember Me preference
      if (extra && extra.rememberMe !== undefined) {
        setRememberMe(extra.rememberMe);
      }

      const json = await resp.json();

      if (resp.ok) {
        if (json.require2fa) {
          return { success: false, require2fa: true };
        }

        if (json && json.success && json.user) {
          const serverUser = json.user;
          // persist a local copy (without password) so the app can use it
          addUser({ ...serverUser, password: undefined } as any);
          setUser(serverUser as LoggedInUser);
          return { success: true };
        }
      } else {
        return { success: false, error: json.error || 'Login failed' };
      }
    } catch (e) {
      console.warn('login API call failed', e);
      // Fallback logic for offline management users...
      if (role === UserRole.Management) {
        const pendingMatch = (pendingManagementSignups || []).find(p => p.email.toLowerCase() === emailLower && p.password === password);
        if (pendingMatch) {
          const pendingLocal = { id: `pending_${Date.now()}`, name: pendingMatch.name || 'Pending User', email: pendingMatch.email, role: UserRole.Management, password: pendingMatch.password, pendingSync: true } as any as LoggedInUser & { password?: string };
          addUser(pendingLocal as any);
          setUser(pendingLocal as LoggedInUser);
          return { success: true };
        }
      }
    }

    // For now we validate against the small dummy login list so devs can build the
    // application without a backend. Passwords are stored in-memory only.
    // If no existing created user matches, fall back to the dummy dataset
    const found = findDummyUser(email, role);
    if (!found) return { success: false, error: 'Unregistered email' };
    // If the dummy record contains a password — check it.
    if (found.password && found.password !== password) return { success: false, error: 'Wrong password' };

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

    return { success: true };
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

  const signUp = async (name: string, email: string, password: string, role: UserRole, extra: Record<string, any> = {}) => {
    // Enforce Gmail-only addresses for signups
    const emailLowerCheck = (email || '').toLowerCase();
    if (!/@gmail\.com$/.test(emailLowerCheck)) return false;
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

    // Persist users to the server when available (triggers welcome email)
    const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';
    if (apiUrl) {
      try {
        const resp = await fetch(`${apiUrl}/api/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, role, extra })
        });
        if (resp.ok) {
          const json = await resp.json();
          if (json && json.success && json.user) {
            // add a local copy and activate session
            const u = { ...json.user };
            addUser({ ...u, password: undefined } as any);
            setUser(u as LoggedInUser);
            return true;
          }
        }
      } catch (e) {
        // logging — API unreachable
        console.warn('signup API failed', e);
      }

      // if we reach here it means API didn't return success
      // For Management, queue for later sync
      if (role === UserRole.Management) {
        try {
          addPendingManagementSignup({ name, email, password, extra });
          const pendingLocal = { ...base, pendingSync: true };
          addUser(pendingLocal as any);
          setUser(pendingLocal as LoggedInUser);
          return true;
        } catch (err) {
          // fall back to local-only storage if queueing fails
        }
      }
    }

    // normalize email to lowercase when storing to avoid case mismatch on login
    const withNormalizedEmail = { ...base, email: (base.email || '').toLowerCase() };
    addUser(withNormalizedEmail as any);
    setUser(withNormalizedEmail as LoggedInUser);
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('edunexus:auth_user');
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
    console.warn('useAuth called outside AuthProvider - returning default context');
    // Return a default context instead of throwing error to prevent crashes
    return {
      user: null,
      login: async () => ({ success: false, error: 'Auth provider not initialized' }),
      logout: () => {},
      signUpAsGuest: () => {},
      signUp: async () => false,
      updateProfile: () => {}
    } as AuthContextType;
  }
  return context;
};
