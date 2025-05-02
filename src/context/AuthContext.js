// src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load authentication state on app startup
  useEffect(() => {
    const loadAuthState = async () => {
      try {
        const storedData = await AsyncStorage.getItem('user');
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          setUserData(parsedData);
          setIsAuthenticated(true);
        }
      } catch (e) {
        console.error('Failed to load auth state', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuthState();
  }, []);

  // Login function that accepts complete user object
  const login = async (user) => {
    try {
      setIsLoading(true);
      
      // In a real app, you would verify credentials with your backend
      // For now, we'll just store the user object
      await AsyncStorage.setItem('user', JSON.stringify(user));
      
      setUserData(user);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setIsLoading(true);
      await AsyncStorage.removeItem('user');
      setUserData(null);
      setIsAuthenticated(false);
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Update user data function
  const updateUser = async (updatedData) => {
    try {
      const newData = { ...userData, ...updatedData };
      await AsyncStorage.setItem('user', JSON.stringify(newData));
      setUserData(newData);
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userData,
        isLoading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);