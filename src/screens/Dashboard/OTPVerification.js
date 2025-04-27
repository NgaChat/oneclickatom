import React, { useState, useLayoutEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useUser } from '../../context/UserContext';
import DeviceInfo from 'react-native-device-info';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

const OTPVerificationScreen = ({ route, navigation }) => {
  const { msisdn, code, phoneNumber } = route.params;
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const { updateUserData } = useUser();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Verify OTP',
      headerTitleAlign: 'center',
      headerStyle: { 
        backgroundColor: '#0a34cc',
        elevation: 0,
        shadowOpacity: 0,
      },
      headerTintColor: 'white',
      headerTitleStyle: { 
        fontWeight: 'bold',
        fontSize: 18,
      },
    });
  }, [navigation]);

  const handleOtpChange = (value, index) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    // Auto focus to next input
    if (value && index < 5) {
      inputsRef.current[index + 1].focus();
    }
  };

  const inputsRef = React.useRef([]);

  const verifyOTP = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter a complete 6-digit OTP code.');
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
    const body = { msisdn, code, otp: otpString };

    try {
      const response = await axios.post(url, body, { headers });
      setLoading(false);
      const result = response.data;

      if (result.status === 'success') {
        const attributeData = result.data.attribute;
        let storedData = JSON.parse(await AsyncStorage.getItem('userData')) || [];

        const userIndex = storedData.findIndex(item => item.user_id === attributeData.user_id);

        if (userIndex > -1) {
          storedData[userIndex] = attributeData;
        } else {
          storedData.push(attributeData);
        }

        updateUserData(storedData);
        
        navigation.reset({
          index: 0,
          routes: [{ name: 'Dashboard' }],
        });
      } else {
        Alert.alert('Verification Failed', result.message || 'The OTP you entered is incorrect. Please try again.');
      }
    } catch (error) {
      setLoading(false);
      console.error('OTP Verification Error:', error);
      Alert.alert('Connection Error', 'Unable to verify OTP. Please check your internet connection and try again.');
    }
  };

  return (
    <LinearGradient colors={['#f5f7fa', '#e4e8f0']} style={styles.container}>
      <View style={styles.content}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Icon name="verified-user" size={40} color="#0a34cc" />
          </View>
          <Text style={styles.title}>Verify Your Number</Text>
          <Text style={styles.subtitle}>We've sent a 6-digit code to</Text>
          <Text style={styles.phoneNumber}>+95 {phoneNumber}</Text>
        </View>

        {/* OTP Input Fields */}
        <View style={styles.otpContainer}>
          <Text style={styles.otpLabel}>Enter Verification Code</Text>
          <View style={styles.otpInputs}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={ref => inputsRef.current[index] = ref}
                style={styles.otpInput}
                placeholder="•"
                placeholderTextColor="#ccc"
                keyboardType="numeric"
                maxLength={1}
                value={digit}
                onChangeText={(value) => handleOtpChange(value, index)}
                onKeyPress={({ nativeEvent }) => {
                  if (nativeEvent.key === 'Backspace' && !digit && index > 0) {
                    inputsRef.current[index - 1].focus();
                  }
                }}
                selectTextOnFocus
              />
            ))}
          </View>
          <TouchableOpacity>
            <Text style={styles.resendText}>Didn't receive code? <Text style={styles.resendLink}>Resend</Text></Text>
          </TouchableOpacity>
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={verifyOTP}
          disabled={loading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={loading ? ['#ccc', '#aaa'] : ['#0a34cc', '#1a4bdf']}
            style={styles.buttonGradient}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text style={styles.buttonText}>Verify & Continue</Text>
                <Icon name="arrow-forward" size={20} color="white" style={styles.buttonIcon} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 25,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    backgroundColor: 'rgba(10, 52, 204, 0.1)',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0a34cc',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  phoneNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  otpContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  otpLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  otpInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 15,
  },
  otpInput: {
    width: 45,
    height: 60,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    backgroundColor: 'white',
    elevation: 2,
  },
  resendText: {
    fontSize: 13,
    color: '#666',
  },
  resendLink: {
    color: '#0a34cc',
    fontWeight: '500',
  },
  button: {
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 3,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonIcon: {
    marginLeft: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});

export default OTPVerificationScreen;