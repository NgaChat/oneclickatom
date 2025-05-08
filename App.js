import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import { UserProvider } from './src/context/UserContext';
import { AlertProvider } from './src/utils/alertUtils'; // Import AlertProvider
import RootNavigator from './src/navigation/RootNavigator';
import { ThemeProvider } from './src/context/ThemeContext'; // Optional: for theme management
import { LoadingProvider } from './src/context/LoadingContext'; // Optional: for global loading indicator
import { initializeDatabase } from './src/services/service'; // Import initializeDatabase

export default function App() {
  useEffect(() => {
    // Initialize the SQLite database when the app starts
    initializeDatabase();
  }, []);

  return (
    <>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#0a34cc" 
        translucent={true} 
      />
      <ThemeProvider>
        <AlertProvider>
          <LoadingProvider>
            <AuthProvider>
              <UserProvider>
                <RootNavigator />
              </UserProvider>
            </AuthProvider>
          </LoadingProvider>
        </AlertProvider>
      </ThemeProvider>
    </>
  );
}