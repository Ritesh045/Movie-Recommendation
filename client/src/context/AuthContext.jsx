import React, { createContext, useState, useEffect, useContext } from 'react';
import apiClient from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('cinesphere_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('cinesphere_token') || null);
  const [loading, setLoading] = useState(true);

  // Restore & verify session on startup if token exists
  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem('cinesphere_token');
      if (storedToken) {
        try {
          const res = await apiClient.get('/auth/me');
          if (res.data && res.data.user) {
            setUser(res.data.user);
            localStorage.setItem('cinesphere_user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.warn('Session expired or invalid, logging out:', err);
          logout();
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    verifySession();
  }, []);

  const login = async (email, password) => {
    const res = await apiClient.post('/auth/login', { email, password });
    const { access_token, user: userData } = res.data;

    setToken(access_token);
    setUser(userData);

    localStorage.setItem('cinesphere_token', access_token);
    localStorage.setItem('cinesphere_user', JSON.stringify(userData));

    return userData;
  };

  const signup = async (name, email, password) => {
    const res = await apiClient.post('/auth/signup', { name, email, password });
    const { access_token, user: userData } = res.data;

    setToken(access_token);
    setUser(userData);

    localStorage.setItem('cinesphere_token', access_token);
    localStorage.setItem('cinesphere_user', JSON.stringify(userData));

    return userData;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('cinesphere_token');
    localStorage.removeItem('cinesphere_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        login,
        signup,
        logout,
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

export default AuthContext;
