
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { LoggedInUser, UserRole, Student, Teacher, Parent } from '../types';
import { mockUsers } from '../data/mock';

interface AuthContextType {
  user: LoggedInUser | null;
  login: (email: string, role: UserRole) => boolean;
  logout: () => void;
  signUpAsGuest: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<LoggedInUser | null>(null);

  const login = (email: string, role: UserRole) => {
    // In a real app, this would be an API call. We use mock data here.
    // Parent login uses the child's email.
    const userToFind = mockUsers.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && (u.role === role || (role === UserRole.Parent && u.role === UserRole.Student))
    );
    
    if (userToFind) {
      if (role === UserRole.Parent) {
         const parentUser = mockUsers.find(u => u.role === UserRole.Parent && u.email.toLowerCase() === email.toLowerCase());
         if(parentUser) {
            setUser(parentUser as LoggedInUser);
            return true;
         }
      } else {
        setUser(userToFind as LoggedInUser);
        return true;
      }
    }
    
    // Dean can also login via teacher portal
    if (role === UserRole.Teacher) {
      const deanUser = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase() && u.role === UserRole.Dean);
      if(deanUser) {
        setUser(deanUser as LoggedInUser);
        return true;
      }
    }

    return false;
  };

  const signUpAsGuest = (role: UserRole) => {
    let guestUser: LoggedInUser | undefined;
    switch (role) {
      case UserRole.Teacher:
        guestUser = mockUsers.find(u => u.id === 'teacher1') as Teacher;
        break;
      case UserRole.Parent:
        guestUser = mockUsers.find(u => u.id === 'parent1') as Parent;
        break;
      case UserRole.Student:
      default:
        guestUser = mockUsers.find(u => u.id === 'student1') as Student;
        break;
    }
    if (guestUser) {
      setUser(guestUser);
    }
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, signUpAsGuest }}>
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
