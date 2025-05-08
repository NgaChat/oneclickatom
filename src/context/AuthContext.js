// src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { database } from '../config/firebase';
import { ref, set, get, onValue } from 'firebase/database';
import DeviceInfo from 'react-native-device-info';
import { AlertContext } from '../utils/alertUtils'; // Import AlertContext



const AuthContext = createContext();


export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showAlert } = useContext(AlertContext); // Use AlertContext


  useEffect(() => {
    const checkAuthState = async () => {
      try {
        // Get the current device ID from DeviceInfo
        const localDeviceId = await DeviceInfo.getUniqueId();
        console.log('Local Device ID:', localDeviceId);
    
        // Get the current user from AsyncStorage
        const storedUser = await AsyncStorage.getItem('user');
        if (!storedUser) {
          
          setIsAuthenticated(false);
          return;
        }
    
    
        const user = JSON.parse(storedUser);
        const userId = user.id;
    
        console.log('User ID:', localDeviceId);
    
        if (user.deviceId !== localDeviceId) {
          showAlert({
            title: 'Device Mismatch',
            message: 'Device ID mismatch detected. Please log in again.',
          });
          setIsAuthenticated(false);
          return;
        }
    
        if (!userId) {
          showAlert({
            title: 'Authentication Error',
            message: ' Please log in again.',
          });
          setIsAuthenticated(false);
          return;
        }
    
        // Reference to the user's deviceId in Firebase
        const deviceIdRef = ref(database, `users/${userId}/deviceId`);
        const snapshot = await get(deviceIdRef);
    
        if (snapshot.exists()) {
          const firebaseDeviceId = snapshot.val(); // Get the deviceId from Firebase
          console.log(`Device ID from Firebase: ${firebaseDeviceId}`);
    
          if (firebaseDeviceId !== localDeviceId) {
            showAlert({
              title: 'Device Mismatch',
              message: 'Device ID mismatch detected. Please log in again.',
            });
            setIsAuthenticated(false);
          } else {
            console.log('Device ID matches. Access granted.');
          }
        } else {
          showAlert({
            title: 'Authentication Error',
            message: 'Please log in again.',
          });
          setIsAuthenticated(false);
        }
      } catch (error) {
         showAlert({
          title: 'Error',
          message: 'An error occurred while checking authentication. Please try again.',
        });
        setIsAuthenticated(false);
      }
    };

    checkAuthState();
  }, []);


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



  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);