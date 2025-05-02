import React, { useState, useLayoutEffect, useContext, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useUser } from '../../context/UserContext';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getBasicHeaders } from '../../services/service';
import { AlertContext } from '../../utils/alertUtils';

const OTPVerificationScreen = ({ route, navigation }) => {
  const { msisdn, code, expire_within, phoneNumber } = route.params;
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(expire_within || 0);
  const { updateUserData } = useUser();
  const { showAlert } = useContext(AlertContext);

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

  // Countdown effect
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const handleOtpChange = (value, index) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputsRef.current[index + 1].focus();
    }
  };

  const inputsRef = React.useRef([]);

  const storeTokenWithExpiry = async (userData) => {
    try {
      const cacheKey = `token_${userData.user_id}`;
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

      await AsyncStorage.setItem(
        cacheKey,
        JSON.stringify({
          token: userData.token,
          refresh_token: userData.refresh_token,
          expiresAt
        })
      );
    } catch (error) {
      console.error('Error storing token:', error);
    }
  };

  const verifyOTP = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      showAlert({
        title: 'Invalid OTP',
        message: 'Please enter a complete 6-digit OTP code.',
        type: 'error'
      });
      return;
    }

    setLoading(true);

    const headers = await getBasicHeaders();
    const url = `https://store.atom.com.mm/mytmapi/v1/en/local-auth/verify-otp?msisdn=${msisdn}&userid=-1&v=4.11`;
    const body = { msisdn, code, otp: otpString };

    try {
      const response = await axios.post(url, body, { headers });
      const result = response.data;

      if (result.status === 'success') {
        const attributeData = result.data.attribute;

        await storeTokenWithExpiry(attributeData);
        let storedData = JSON.parse(await AsyncStorage.getItem('userData')) || [];

        const userIndex = storedData.findIndex(item => item.user_id === attributeData.user_id);

        if (userIndex > -1) {
          storedData[userIndex] = attributeData;
        } else {
          storedData.push(attributeData);
        }

        updateUserData(storedData);

        showAlert({
          title: 'Verification Successful',
          message: 'Your account has been added successfully!',
          type: 'success',
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Dashboard' }],
            });
          }
        });
      } else {
        showAlert({
          title: 'Verification Failed',
          message: result.message || 'The OTP you entered is incorrect. Please try again.',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('OTP Verification Error:', error);
      let title = 'Error';
      let errorMessage = 'Unable to verify OTP. Please check your internet connection and try again.';
      if (error.response && error.response.data && error.response.data.errors?.message) {
        errorMessage = error.response.data.errors.message.message;
        title = error.response.data.errors.message.title || title;
      }
      showAlert({
        title: title,
        message: errorMessage,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#f5f7fa', '#e4e8f0']} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Icon name="verified-user" size={40} color="#0a34cc" />
          </View>
          <Text style={styles.title}>Verify Your Number</Text>
          <Text style={styles.subtitle}>We've sent a 6-digit code to</Text>
          <Text style={styles.phoneNumber}>+95 {phoneNumber}</Text>
          {countdown > 0 ? (
            <Text style={styles.countdownText}>Expires in {formatTime(countdown)}</Text>
          ) : (
            <Text style={styles.expiredText}>OTP has expired</Text>
          )}
        </View>

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
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={verifyOTP}
          disabled={loading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={loading ? ['#ccc', '#aaa'] : ['#0a34cc', '#1a4bdf']}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
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
  countdownText: {
    fontSize: 14,
    color: '#f44336',
    marginTop: 5,
  },
  expiredText: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
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
