// import React, { createContext, useContext, useState } from 'react';

// const AuthContext = createContext();

// export const useAuth = () => useContext(AuthContext);

// export const AuthProvider = ({ children }) => {
//   const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user')));

//   const login = (userData) => {
//     setUser(userData);
//     localStorage.setItem('user', JSON.stringify(userData));
//   };

//   const logout = () => {
//     setUser(null);
//     localStorage.removeItem('user');
//   };

//   return (
//     <AuthContext.Provider value={{ user, login, logout }}>
//       {children}
//     </AuthContext.Provider>
//   );
// };
// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Generate a unique device ID that changes on each session
const generateDeviceId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const sessionId = Math.random().toString(36).substring(2, 15);
  return `web-${timestamp}-${random}-${sessionId}`;
};

// Get or create a session ID that persists only for the current browser session
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('krishilink_session_id');
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2, 15) + Date.now();
    sessionStorage.setItem('krishilink_session_id', sessionId);
  }
  return sessionId;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user');

    if (token && !user && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
      } catch (error) {
        console.error('Failed to parse user data:', error);
        logout();
      }
    }
    // Always sync sessionToken from localStorage
    if (token) {
      setSessionToken(token);
    }
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    // Clear any existing tokens first
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    setSessionToken(null);

    const deviceId = generateDeviceId();
    const formData = new FormData();
    formData.append('EmailorPhone', credentials.emailOrPhone);
    formData.append('Password', credentials.password);
    formData.append('DeviceId', deviceId);

    const result = await authAPI.passwordLogin(formData);
    if (result.success && result.data && result.data.token) {
      // Store the new token and update session
      const newToken = result.data.token;
      setUser(result.data);
      setSessionToken(newToken);
      localStorage.setItem('user', JSON.stringify(result.data));
      localStorage.setItem('authToken', newToken);
      if (result.data.refreshToken) {
        localStorage.setItem('refreshToken', result.data.refreshToken);
      }
      return { success: true };
    } else {
      return { success: false, error: result.error, errorDetails: result.errorDetails };
    }
  };

  const register = async (userData) => {
    const result = await authAPI.registerUser(userData);
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return { success: false, error: result.error, errorDetails: result.errorDetails };
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      const currentToken = localStorage.getItem('authToken');
      
      if (refreshToken) {
        // Send logout request to server to invalidate tokens
        await authAPI.logout(refreshToken);
        console.log('Logout request sent to server');
      }
      
      // Also try to invalidate the current token if available
      if (currentToken) {
        try {
          // You might want to add an endpoint to invalidate the current token
          // await authAPI.invalidateToken(currentToken);
          console.log('Current token invalidated locally');
        } catch (error) {
          console.log('Token invalidation failed:', error);
        }
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear all authentication data
      setUser(null);
      setSessionToken(null);
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      
      // Clear session storage
      sessionStorage.removeItem('krishilink_session_id');
      
      console.log('All authentication data cleared');
    }
  };

  const sendOTP = async (emailOrPhone) => {
    try {
      const formData = new FormData();
      formData.append('EmailorPhone', emailOrPhone);
      
      // Use unique device ID for OTP requests
      const deviceId = generateDeviceId();
      formData.append('DeviceId', deviceId);
      
      console.log('OTP request with device ID:', deviceId);

      const response = await authAPI.sendOTP(formData);
      return { success: true, message: response.data };
    } catch (error) {
      console.error('Send OTP failed:', error);
      const errorMessage = error.response?.data?.message || error.response?.data || 'Failed to send OTP';
      return { success: false, error: errorMessage };
    }
  };

  const verifyOTP = async (emailOrPhone, otp) => {
    try {
      // Clear any existing tokens first
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      setSessionToken(null);

      const formData = new FormData();
      formData.append('EmailorPhone', emailOrPhone);
      formData.append('otp', otp);

      const result = await authAPI.verifyOTP(formData);
      console.log('verifyOTP result:', result);

      if (result.success && result.data && result.data.token) {
        // Store the new token and update session
        const newToken = result.data.token;
        setUser(result.data);
        setSessionToken(newToken);

        localStorage.setItem('user', JSON.stringify(result.data));
        localStorage.setItem('authToken', newToken);

        if (result.data.refreshToken) {
          localStorage.setItem('refreshToken', result.data.refreshToken);
        }

        return { success: true };
      } else {
        // Log error details for debugging
        if (result && (result.error || result.errorDetails)) {
          console.log('verifyOTP error:', result.error, result.errorDetails);
        } else {
          console.log('verifyOTP unknown error, raw result:', result);
        }
        return { success: false, error: result.error, errorDetails: result.errorDetails };
      }
    } catch (error) {
      console.error('OTP verification failed:', error);
      if (error.response) {
        console.log('OTP verification error.response:', error.response);
        console.log('OTP verification error.response.data:', error.response.data);
      }
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.title ||
        (error.response?.data?.errors
          ? Object.values(error.response.data.errors).flat().join(' ')
          : '') ||
        'OTP verification failed';
      return { success: false, error: errorMessage };
    }
  };

  // Function to check if current token is still valid
  const isTokenValid = () => {
    const token = localStorage.getItem('authToken');
    return token && token === sessionToken;
  };

  // Function to force token refresh (useful for security)
  const refreshSession = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        const response = await authAPI.refreshToken(refreshToken);
        const data = response.data;
        
        if (data && data.token) {
          const newToken = data.token;
          setSessionToken(newToken);
          localStorage.setItem('authToken', newToken);
          
          if (data.refreshToken) {
            localStorage.setItem('refreshToken', data.refreshToken);
          }
          
          console.log('Token refreshed:', newToken.substring(0, 20) + '...');
          return true;
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        logout();
        return false;
      }
    }
    return false;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      register,
      sendOTP,
      verifyOTP,
      loading,
      isTokenValid,
      refreshSession,
      sessionToken
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;