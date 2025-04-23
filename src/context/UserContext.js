import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create the context
const UserContext = createContext();

// UserContext Provider Component
export const UserProvider = ({ children }) => {
  const [userData, setUserData] = useState(null); // Initial state

  // On first load, check if there is stored user data in AsyncStorage
  useEffect(() => {
    const getUserData = async () => {
      const storedData = await AsyncStorage.getItem('userData');
     
      if (storedData) {
        setUserData(JSON.parse(storedData)); // Set the data in context if it exists
      }
    };
    getUserData();
  }, []);

  const updateUserData = (data) => {
    setUserData(data);
    AsyncStorage.setItem('userData', JSON.stringify(data)); // Store it in AsyncStorage too
    console.log('Update Data Successfully')
  };

  return (
    <UserContext.Provider value={{ userData, updateUserData }}>
      {children}
    </UserContext.Provider>
  );
};

// Custom hook to use the UserContext
export const useUser = () => useContext(UserContext);
