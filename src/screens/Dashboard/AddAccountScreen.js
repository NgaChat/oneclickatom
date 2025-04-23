import React, { useState, useLayoutEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import DeviceInfo, { hasDynamicIsland } from 'react-native-device-info';

const AddAccountScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('09787406689');
  const [loading, setLoading] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Add Account',
      headerTitleAlign: 'center',
      headerStyle: { backgroundColor: '#0a34cc' },
      headerTintColor: 'white',
      headerTitleStyle: { fontWeight: '900' },
    });
  }, [navigation]);

  const sendOTP = async () => {
    if (phoneNumber.length !== 11) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number.');
      return;
    }

    setLoading(true);

    const url = `https://store.atom.com.mm/mytmapi/v1/en/local-auth/send-otp?msisdn=${phoneNumber}&userid=-1&v=4.11`;
    const body = { msisdn: phoneNumber };

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

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
      });

      const result = await response.json();
      setLoading(false);

      if (result.status === 'success') {
        const { msisdn, code } = result.data.attribute;

        navigation.navigate('OTPVerification', { msisdn, code });
      } else {
        Alert.alert('Error', result.message || 'Failed to send OTP.');
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Enter Phone Number</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your phone number"
        keyboardType="phone-pad"
        maxLength={11}
        value={phoneNumber}
        onChangeText={setPhoneNumber}
      />
      <Button title={loading ? 'Sending...' : 'Next'} onPress={sendOTP} disabled={loading} />
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
  },
});

export default AddAccountScreen;
