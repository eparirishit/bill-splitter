"use client";
    
import { usePathname, useRouter } from 'next/navigation';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const verifyAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      // Check for auth cookie
      const response = await fetch('/api/auth/status', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        const wasAuthenticated = isAuthenticated;
        setIsAuthenticated(data.isAuthenticated);
        
              // If user was not authenticated before but is now (login), clear any stale state
      if (!wasAuthenticated && data.isAuthenticated) {
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
          try {
            localStorage.removeItem('bill-splitter-state');
          } catch (error) {
            console.warn('Failed to clear stale bill-splitter state from localStorage:', error);
          }
        }
      }
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Error verifying auth status:", error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    verifyAuth();
  }, [verifyAuth, pathname]);

  const login = () => {
    window.location.href = '/api/auth/splitwise/login';
  };

  const logout = () => {
    setIsAuthenticated(false);
    // Clear bill-splitter state from localStorage
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('bill-splitter-state');
      } catch (error) {
        console.warn('Failed to clear bill-splitter state from localStorage:', error);
      }
    }
    // Clear the auth cookie by redirecting to logout endpoint
    window.location.href = '/api/auth/logout';
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
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