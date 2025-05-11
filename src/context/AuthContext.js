// src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { database } from '../config/firebase';
import { ref, set, get, onValue, remove } from 'firebase/database';
import DeviceInfo from 'react-native-device-info';
import { AlertContext } from '../utils/alertUtils';
import { deleteAllSqlData } from '../services/service';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showAlert } = useContext(AlertContext);

  // Function to update device ID in Firebase
  const updateDeviceIdInFirebase = async (userId, deviceId) => {
    try {
      const deviceIdRef = ref(database, `users/${userId}/deviceId`);
      await set(deviceIdRef, deviceId);
    } catch (error) {
      console.error('Error updating device ID in Firebase:', error);
      throw error;
    }
  };

  // Function to clear device ID in Firebase
  const clearDeviceIdInFirebase = async (userId) => {
    try {
      const deviceIdRef = ref(database, `users/${userId}/deviceId`);
      await remove(deviceIdRef);
    } catch (error) {
      console.error('Error clearing device ID in Firebase:', error);
      throw error;
    }
  };

  // Check authentication state with device ID verification
  const checkAuthState = async () => {
    try {
      const localDeviceId = await DeviceInfo.getUniqueId();
      const storedUser = await AsyncStorage.getItem('user');
      
      if (!storedUser) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      const user = JSON.parse(storedUser);
      const userId = user.id;

      if (!userId) {
        await AsyncStorage.removeItem('user');
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // Check device ID in Firebase
      const deviceIdRef = ref(database, `users/${userId}/deviceId`);
      const snapshot = await get(deviceIdRef);

      if (!snapshot.exists()) {
        // No device ID in Firebase - allow login
        await updateDeviceIdInFirebase(userId, localDeviceId);
        setUserData({ ...user, deviceId: localDeviceId });
        setIsAuthenticated(true);
      } else {
        const firebaseDeviceId = snapshot.val();
        
        if (firebaseDeviceId === localDeviceId) {
          // Device IDs match - allow access
          setUserData({ ...user, deviceId: localDeviceId });
          setIsAuthenticated(true);
        } else {
          // Device IDs don't match - show error and logout
          showAlert({
            title: 'Already Logged In',
            message: 'This account is already logged in on another device.',
          });
          await logout();
        }
      }
    } catch (error) {
      console.error('Authentication check error:', error);
      showAlert({
        title: 'Error',
        message: 'An error occurred while checking authentication. Please try again.',
      });
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Login function with device ID handling
  const login = async (user) => {
    try {
      setIsLoading(true);
      const localDeviceId = await DeviceInfo.getUniqueId();
      
      // Check if user is already logged in on another device
      const deviceIdRef = ref(database, `users/${user.id}/deviceId`);
      const snapshot = await get(deviceIdRef);

      if (snapshot.exists() && snapshot.val() !== null && snapshot.val() !== localDeviceId) {
        showAlert({
          title: 'Already Logged In',
          message: 'This account is already logged in on another device.',
        });
        return false;
      }

      // Update device ID in Firebase
      await updateDeviceIdInFirebase(user.id, localDeviceId);

      // Store user data with device ID
      const userWithDevice = { ...user, deviceId: localDeviceId };
      await AsyncStorage.setItem('user', JSON.stringify(userWithDevice));

      setUserData(userWithDevice);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      showAlert({
        title: 'Login Failed',
        message: 'An error occurred during login. Please try again.',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function with device ID clearing
  const logout = async () => {
    try {
      setIsLoading(true);
      const storedUser = await AsyncStorage.getItem('user');
      
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user.id) {
          await clearDeviceIdInFirebase(user.id);
        }
      }
      
      await AsyncStorage.removeItem('user');
      await deleteAllSqlData(); // Clear local SQL data if needed
      setUserData(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
      showAlert({
        title: 'Logout Error',
        message: 'An error occurred during logout. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check authentication state on mount
  useEffect(() => {
    checkAuthState();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        userData,
        login,
        logout,
        checkAuthState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);