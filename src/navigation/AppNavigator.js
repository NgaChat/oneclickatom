import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Dashboard from '../screens/Dashboard/Dashboard';
import AddAccountScreen from '../screens/Dashboard/AddAccountScreen';
import OTPVerification from '../screens/Dashboard/OTPVerification';

const Stack = createStackNavigator();

const AppNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: true, // ✅ Header ပြန်ပေါ်စေမယ့် Option
    }}
  >
    <Stack.Screen name="Dashboard" component={Dashboard} />
    <Stack.Screen name="AddAccount" component={AddAccountScreen} />
    <Stack.Screen name="OTPVerification" component={OTPVerification} />
  </Stack.Navigator>
);

export default AppNavigator;
