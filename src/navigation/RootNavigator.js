// src/navigation/RootNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/Login/Login';
import Dashboard from '../screens/Dashboard/Dashboard';
import LoadingIndicator from '../components/LoadingIndicator';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';

const Stack = createStackNavigator();

const RootNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingIndicator />;
  }

  return (
    <NavigationContainer>
      
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
     
    </NavigationContainer>
  );
};

export default RootNavigator;