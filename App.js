import React from 'react';
import { StatusBar } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import { UserProvider } from './src/context/UserContext'; // Import UserProvider
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#0a34cc" 
        translucent={true} 
      />
      <AuthProvider>
        <UserProvider> 
          <RootNavigator />
        </UserProvider>
      </AuthProvider>
    </>
  );
}
