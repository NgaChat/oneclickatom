import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Dashboard from '../screens/Dashboard/Dashboard';
import AddAccountScreen from '../screens/Dashboard/AddAccountScreen';
import OTPVerification from '../screens/Dashboard/OTPVerification';
import TransferPoint from '../screens/Dashboard/TransferPoint'
import Search from '../screens/Dashboard/Search'
import CreateUserScreen from '../screens/Dashboard/CreateUserScreen';
import TransferOtp from '../screens/Dashboard/TransferOtp';
import SoldSimInventoryScreen from '../screens/Dashboard/SoldSimInventoryScreen';
import SuperClaimScreen from '../screens/Dashboard/SuperClaimScreen';

const Stack = createStackNavigator();

const AppNavigator = () => (
  <Stack.Navigator
   
  >
    {/* <Stack.Screen name="Dashboard" component={Dashboard} />
    <Stack.Screen name="AddAccount" component={AddAccountScreen} />
    <Stack.Screen name="OTPVerification" component={OTPVerification} />
    <Stack.Screen name="TransferPoint" component={TransferPoint} />
    <Stack.Screen name="Search" component={Search} />
    <Stack.Screen name="TransferOtp" component={TransferOtp} />
    <Stack.Screen name="SoldSimInventory" component={SoldSimInventoryScreen} /> */}
    {/* Add more screens as needed */}


     <Stack.Screen name="CreateUser" component={CreateUserScreen} />
     <Stack.Screen name="SuperCliam" component={SuperClaimScreen}/>
  </Stack.Navigator>
);

export default AppNavigator;
