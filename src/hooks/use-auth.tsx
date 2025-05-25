"use client";
    
    import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
    import { useRouter, usePathname } from 'next/navigation';
    
    // This URL should point to Node.js auth server
    const AUTH_SERVER_URL = process.env.NEXT_PUBLIC_AUTH_SERVER_URL;
    
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
          // Ask auth server if the user is authenticated (checks for the cookie)
          const response = await fetch(`${AUTH_SERVER_URL}/auth/status`, { credentials: 'include' });
          if (response.ok) {
            const data = await response.json();
            setIsAuthenticated(data.isAuthenticated);
          } else {
            setIsAuthenticated(false);
          }
        } catch (error) {
          console.error("Error verifying auth status:", error);
          setIsAuthenticated(false);
        } finally {
          setIsLoading(false);
        }
      }, []);
    
      useEffect(() => {
        // Verify auth on initial load and whenever the path changes (e.g., after redirect from auth server)
        verifyAuth();
      }, [verifyAuth, pathname]);
    
      const login = () => {
        // Redirect to the Node.js server's login initiation route
        if (AUTH_SERVER_URL) {
          window.location.href = `${AUTH_SERVER_URL}/auth/splitwise/login`;
        } else {
          console.error("Auth Server URL not configured.");
        }
      };
    
      const logout = () => {
        // Redirect to the Node.js server's logout route
        if (AUTH_SERVER_URL) {
          setIsAuthenticated(false);
          window.location.href = `${AUTH_SERVER_URL}/auth/logout`;
        } else {
          console.error("Auth Server URL not configured.");
        }
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