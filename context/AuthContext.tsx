
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { LoggedInUser, UserRole, Student, Teacher, Parent } from '../types';

import { useData } from './DataContext';
import { supabase } from '../services/supabaseClient';

interface AuthContextType {
  user: LoggedInUser | null;
  login: (email: string, password: string, role: UserRole, extra?: Record<string, any>) => Promise<{ success: boolean; error?: string; require2fa?: boolean }>;
  signUp: (name: string, email: string, password: string, role: UserRole, extra?: Record<string, any>) => Promise<boolean>;
  updateProfile: (patch: Partial<LoggedInUser>) => void;
  logout: () => void;
  signUpAsGuest: (role: UserRole) => void;
  changePassword: (oldPw: string, newPw: string) => Promise<{ success: boolean; error?: string }>;
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

  // Listen for Supabase Auth Changes (Google Login)
  React.useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // If we already have a user logged in with the same email, do nothing (assumed synced)
        // unless we want to re-verify role logic.

        const storedRole = sessionStorage.getItem('edunexus:sso_role') as UserRole | null;
        console.log('Supabase Signed In, verifying with backend. Role:', storedRole);

        const apiUrl = (import.meta as any).env?.VITE_API_URL || `http://${window.location.hostname}:4000`;
        try {
          // Prefer sending accessToken for server-side verification
          const accessToken = session.access_token || (session?.provider_token || null);
          const resp = await fetch(`${apiUrl}/api/auth/google-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken })
          });

          if (resp.ok) {
            const json = await resp.json();
            // If server returned a finalized single user, use it
            if (json.success && json.user) {
              const serverUser = json.user;
              addUser({ ...serverUser, password: undefined } as any);
              setUser(serverUser as LoggedInUser);

              // Immediately navigate to the appropriate dashboard for the user's role
              try {
                const role = (serverUser.role || '').toString();
                let path = '/#/dashboard';
                if (role === 'Management') path = '/#/dashboard/management';
                else if (role === 'Teacher' || role === 'Dean') path = '/#/dashboard/teacher';
                else if (role === 'Librarian') path = '/#/dashboard/librarian';
                else if (role === 'Parent') path = '/#/dashboard/parent';
                else if (role === 'Student') path = '/#/dashboard';

                // Use full origin so SPA reloads correctly on hash change
                window.location.href = window.location.origin + path;
                return;
              } catch (e) {
                // Fallback: set success flag for login page to handle
                try {
                  const currentHash = window.location.hash || '#/login';
                  const separator = currentHash.includes('?') ? '&' : '?';
                  window.location.hash = `${currentHash}${separator}sso_success=true`;
                  return;
                } catch (ignore) {}
              }
            }

            // If multiple roles found, instruct client to prompt user to choose
            else if (json.success && Array.isArray(json.users) && json.users.length > 1) {
              try {
                sessionStorage.setItem('edunexus:sso_users', JSON.stringify(json.users));
                const base = (window.location.hash || '#/login').split('?')[0];
                window.location.hash = `${base}?sso_choose_roles=1`;
                return;
              } catch (e) {
                console.warn('Failed to redirect to role chooser', e);
              }
            }
          } else {
            console.warn('Google login failed with backend', resp.status);
            if (resp.status === 404) {
              try { await supabase.auth.signOut(); } catch (e) { console.warn('signOut failed', e); }
              try {
                const baseHash = (window.location.hash || '#/login').split('?')[0];
                // Use a clear indicator that account is not present
                window.location.hash = `${baseHash}?sso_error=user_not_found`;
                return;
              } catch (e) { }
            }
          }
        } catch (e) {
          console.error('Failed to verify Google login', e);
        } finally {
          sessionStorage.removeItem('edunexus:sso_role');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [user, addUser]);

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


    // Use fallback error if server login failed and no local match
    return { success: false, error: 'Login failed or user not found' };
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
    const apiUrl = (import.meta as any).env?.VITE_API_URL || `http://${window.location.hostname}:4000`;
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
            // Sync with Supabase Auth (create user there too)
            try {
              await supabase.auth.signUp({ email, password });
            } catch (sbErr) {
              console.warn('Supabase Auth Sync Failed:', sbErr);
            }

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

  const changePassword = async (oldPw: string, newPw: string) => {
    if (!user) return { success: false, error: 'Not logged in' };

    // Check if we are in local-only mode (guest) - mock success
    if (user.id.startsWith('Student_') || user.id.startsWith('Teacher_') || user.id.startsWith('Management_')) {
      // Just mock success for guests
      return { success: true };
    }

    const apiUrl = (import.meta as any).env?.VITE_API_URL || `http://${window.location.hostname}:4000`;
    try {
      const res = await fetch(`${apiUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': document.cookie }, // Ensure cookies are sent if using them, but also usually fetch sends cookies by default with credentials: include
        credentials: 'include',
        body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw })
      });
      const json = await res.json();
      if (res.ok) {
        return { success: true };
      } else {
        return { success: false, error: json.error || 'Failed to change password' };
      }
    } catch (e) {
      return { success: false, error: 'Network error' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, signUpAsGuest, signUp, updateProfile, changePassword }}>
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
      logout: () => { },
      signUpAsGuest: () => { },
      signUp: async () => false,
      updateProfile: () => { },
      changePassword: async () => ({ success: false })
    } as AuthContextType;
  }
  return context;
};
