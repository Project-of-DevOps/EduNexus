
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { LoggedInUser, UserRole, Student, Teacher, Parent } from '../types';

import { useData } from './DataContext';
import { supabase } from '../services/supabaseClient';
import { getApiUrl } from '../utils/config';

interface AuthContextType {
  user: LoggedInUser | null;
  login: (email: string, password: string, role: UserRole, extra?: Record<string, any>) => Promise<{ success: boolean; error?: string; require2fa?: boolean; dashboard_error?: boolean }>;
  signUp: (name: string, email: string, password: string, role: UserRole, extra?: Record<string, any>) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (patch: Partial<LoggedInUser>) => void;
  logout: () => void;
  signUpAsGuest: (role: UserRole) => void;
  changePassword: (oldPw: string, newPw: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [rememberMe, setRememberMe] = useState(false);
  const [devError, setDevError] = useState(false);

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

  // Verify User Existence (Data Wipe Check)
  React.useEffect(() => {
    const verifyUser = async () => {
      if (user && !user.id.startsWith('Student_') && !user.id.startsWith('Teacher_') && !user.id.startsWith('Management_')) {
        // Only check real backend users, not guest/mock users
        const { data, error } = await supabase.from('users').select('id').eq('id', user.id).single();
        if (error || !data) {
          console.error("User missing in DB (Data Wipe Detected)");
          setUser(null);
          setDevError(true);
          localStorage.removeItem('edunexus:auth_user');
          sessionStorage.removeItem('edunexus:auth_user');
        }
      }
    };
    verifyUser();
  }, []); // Run once on mount (or when user restores)

  if (devError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-50 text-red-900 p-10">
        <div className="max-w-2xl text-center space-y-6">
          <h1 className="text-4xl font-bold">Data Maintenance</h1>
          <p className="text-2xl font-semibold p-6 bg-white rounded-xl shadow-lg border-2 border-red-200">
            Developer side Error, consider creating new Account all the data is been deleted
          </p>
          <button
            onClick={() => { setDevError(false); window.location.href = '/'; }}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Understood, Create New Account
          </button>
        </div>
      </div>
    );
  }

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

        const apiUrl = getApiUrl();
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
                } catch (ignore) { }
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
          // Handle Persistence based on pre-login preference
          const rememberPref = localStorage.getItem('edunexus:remember_me_pref');
          if (rememberPref === 'true') {
            setRememberMe(true);
            localStorage.removeItem('edunexus:remember_me_pref'); // Clear pref
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [user, addUser]);

  const login = async (email: string, password: string, role: UserRole, extra: Record<string, any> | undefined = undefined): Promise<{ success: boolean; error?: string; require2fa?: boolean; dashboard_error?: boolean }> => {
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
        // ... (existing pending logic)
      }
    }

    // Server-Side Login with Strict Validation
    try {
      const apiUrl = getApiUrl();

      const payload: any = {
        email,
        password,
        role,
        extra: extra || {}
      };

      const res = await fetch(`${apiUrl}/api/py/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.user) {
          const loggedInUser = { ...json.user, password: undefined };
          setUser(loggedInUser);

          // Restore Dashboard State if available
          if (json.dashboard_state) {
            // Dispatch an event or set context data?
            // Ideally we should have a method in DataContext to bulk set state, 
            // or we rely on the component mount to read from a shared store.
            // For now, we'll store it in sessionStorage for the Dashboard to pick up.
            sessionStorage.setItem('edunexus:dashboard_state_restore', JSON.stringify(json.dashboard_state));
          }

          return { success: true, dashboard_error: json.dashboard_error };
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        const errorMsg = errJson.detail || errJson.error || errJson.message || 'Login failed';
        return { success: false, error: errorMsg };
      }

    } catch (e: any) {
      console.error("Login Error:", e);
      return { success: false, error: e.message || 'Network Error' };
    }

    // Fallback? No, strict login requires server.
    return { success: false, error: 'Login failed' };



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

  const signUp = async (name: string, email: string, password: string, role: UserRole, extra: Record<string, any> = {}): Promise<{ success: boolean; error?: string; user?: any; pendingApproval?: boolean; message?: string; note?: string }> => {
    try {
      // STRICT FLOW: Use new Node.js endpoints for specific roles
      let endpoint = '/api/py/signup'; // Default / fallback
      let payload: any = {
        email,
        password,
        name,
        role,
        extra: extra || {}
      };

      if (role === UserRole.Teacher) {
        endpoint = '/api/auth-strict/signup/teacher-request';
        // Map fields for Teacher Request
        payload = {
          username: email,
          password: password,
          org_code: extra.uniqueId || extra.code,
          institute_name: extra.instituteName || extra.schoolName || ''
        };
      } else if (role === UserRole.Student) {
        endpoint = '/api/auth-strict/signup/student';
        // Map fields for Student
        payload = {
          username: email,
          password: password,
          org_code: extra.uniqueId || extra.code,
          class_id: extra.classId
        };
      } else if (role === UserRole.Parent) {
        endpoint = '/api/auth-strict/signup/parent';
        // Map fields for Parent
        payload = {
          username: email,
          password: password,
          parent_email: email,
          student_email: extra.studentEmail
        };
      } else if (role === UserRole.Management) {
        endpoint = '/api/auth-strict/signup/management';
        payload = {
          username: email,
          password: password,
          institute_name: extra.instituteName,
          title: extra.title
        };
      }

      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          // If the backend returns a user object, use it. 
          if (json.user) {
            const newUser = { ...json.user, password_hash: undefined };
            // Auto-login only if not pending approval
            if (!json.pendingApproval) {
              setUser(newUser);
            }
            return { success: true, user: newUser, pendingApproval: json.pendingApproval, message: json.message };
          }
          return { success: true };
        } else {
          return { success: false, error: json.error || json.detail || 'Signup failed' };
        }
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.detail || 'Signup failed');
      }
    } catch (error: any) {
      console.error('Signup error:', error);

      // OFFLINE / DEV FALLBACK
      // If network error (fetch failed), queue it locally so user can "dev login"
      if (role === UserRole.Management) {
        const newId = `${role}_${Date.now()}`;
        const pendingSignup = { name, email, password, role, extra, date: new Date().toISOString() };
        const currentPending = JSON.parse(localStorage.getItem('pendingManagementSignups') || '[]');
        currentPending.push(pendingSignup);
        localStorage.setItem('pendingManagementSignups', JSON.stringify(currentPending));

        // Auto-login locally
        setUser({ id: `local_${Date.now()}`, name, email, role, extra } as any);
        return { success: true, note: 'Saved offline (Dev Mode)' };
      }

      return { success: false, error: error.message || 'Network error' };
    }
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

    const apiUrl = getApiUrl();
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
      signUp: async () => ({ success: false, error: 'Auth provider not initialized' }),
      updateProfile: () => { },
      changePassword: async () => ({ success: false })
    } as AuthContextType;
  }
  return context;
};
