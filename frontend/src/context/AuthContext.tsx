import React, { createContext, useContext, useState, useEffect } from 'react';
import { axiosClient } from '../api/axiosClient';

export type UserRole = 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginAsRole: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  setRole: (role: UserRole) => Promise<void>;
}

const roleEmails: Record<UserRole, string> = {
  ADMIN: 'admin@demo.com',
  SALES: 'sales@demo.com',
  WAREHOUSE: 'warehouse@demo.com',
  ACCOUNTS: 'accounts@demo.com',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('auth_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [isLoading, setIsLoading] = useState(false);

  // Re-authenticate active session on startup if user is logged in
  useEffect(() => {
    const initAuth = async () => {
      const savedUser = localStorage.getItem('auth_user');
      if (savedUser) {
        try {
          const userObj = JSON.parse(savedUser) as User;
          const roleEmail = roleEmails[userObj.role] || 'admin@demo.com';
          await login(roleEmail, 'Demo@123');
        } catch {
          // If token refresh fails, clear session
          setUser(null);
          localStorage.removeItem('auth_user');
          localStorage.removeItem('access_token');
        }
      }
    };
    initAuth();
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      localStorage.removeItem('auth_user');
      localStorage.removeItem('access_token');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await axiosClient.post('/auth/login', { email, password });
      const { user: userData, accessToken } = response.data.data;
      
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('auth_user', JSON.stringify(userData));
      setUser(userData);
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsRole = async (role: UserRole) => {
    const email = roleEmails[role];
    await login(email, 'Demo@123');
  };

  const setRole = async (role: UserRole) => {
    const email = roleEmails[role];
    try {
      await login(email, 'Demo@123');
    } catch (err) {
      // Fallback local update if offline
      if (user) {
        const updated = { ...user, role };
        localStorage.setItem('auth_user', JSON.stringify(updated));
        setUser(updated);
      }
    }
  };

  const logout = async () => {
    try {
      await axiosClient.post('/auth/logout');
    } catch {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('auth_user');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginAsRole,
        logout,
        setRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
