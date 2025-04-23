import React, { useState, useLayoutEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios'; // Axios ကို import လုပ်ပြီး
import { useUser } from '../../context/UserContext'; // Import the useUser hook
import DeviceInfo, { hasDynamicIsland } from 'react-native-device-info';

const OTPVerificationScreen = ({ route, navigation }) => {
  const { msisdn, code } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  // Get the updateUserData function from UserContext
  const { updateUserData } = useUser();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Verify OTP',
      headerTitleAlign: 'center',
      headerStyle: { backgroundColor: '#0a34cc' },
      headerTintColor: 'white',
      headerTitleStyle: { fontWeight: '900' },
    });
  }, [navigation]);

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP.');
      return;
    }

    setLoading(true);

    const userAgent = 'MyTM/4.11.1/Android/35';
    const deviceName = await DeviceInfo.getDeviceName() || DeviceInfo.getModel();
    const today = new Date().toUTCString();

    const headers = {
      'Content-Type': 'application/json; charset=UTF-8',
      Connection: 'Keep-Alive',
      'Accept-Encoding': 'gzip',
      'X-Server-Select': 'production',
      'User-Agent': userAgent,
      'Device-Name': deviceName,
      'Date': today,
      Host: 'store.atom.com.mm'
    };

    const url = `https://store.atom.com.mm/mytmapi/v1/en/local-auth/verify-otp?msisdn=${msisdn}&userid=-1&v=4.11`;
    const body = { msisdn, code, otp };

    
    try {
      const response = await axios.post(url, body, {
        headers:headers,
      });

      setLoading(false);
      const result = response.data; // Axios ရဲ့ response.data ကိုသုံးပါ

      console.log(result);

      if (result.status === 'success') {
        Alert.alert('Success', 'OTP verified successfully!');

        // Extract the attribute data from the response
        const attributeData = result.data.attribute;


        // Retrieve the existing array from AsyncStorage
        let storedData = JSON.parse(await AsyncStorage.getItem('userData')) || [];


        // Check if the user ID already exists in the array
        const userIndex = storedData.findIndex(item => item.user_id === attributeData.user_id);

        if (userIndex > -1) {
          // User ID exists, update the array
          storedData[userIndex] = attributeData;
        } else {
          // User ID does not exist, add a new entry
          storedData.push(attributeData);
        }

        // Save the updated array back to AsyncStorage
        // await AsyncStorage.setItem('userData', JSON.stringify(storedData));

        // Update the context with the updated user data
        updateUserData(storedData); // This will update the UserContext

        // Navigate to Dashboard after success
        navigation.navigate('Dashboard');
      } else {
        Alert.alert('Error', result.message || 'Invalid OTP. Please try again.');
      }
    } catch (error) {
      setLoading(false);
      console.error('Error during OTP verification:', error);  // Error logging
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Enter OTP</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter 6-digit OTP"
        keyboardType="numeric"
        maxLength={6}
        value={otp}
        onChangeText={setOtp}
      />
      <Button title={loading ? 'Verifying...' : 'Verify OTP'} onPress={verifyOTP} disabled={loading} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  label: { fontSize: 18, marginBottom: 10 },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 18,
  },
});

export default OTPVerificationScreen;
