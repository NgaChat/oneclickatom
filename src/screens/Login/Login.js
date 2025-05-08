// src/screens/LoginScreen.js
import React, { useState, useContext,useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Linking
} from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import { database } from '../../config/firebase';
import { ref, query, orderByChild, equalTo, get, set } from 'firebase/database';
import DeviceInfo from 'react-native-device-info';
import { AlertContext } from '../../utils/alertUtils';
import LinearGradient from 'react-native-linear-gradient';
import FontAwesome5con from 'react-native-vector-icons/FontAwesome5';

const LoginScreen = ({ navigation }) => {
  const { login, isLoading } = useAuth();
  const { showAlert } = useContext(AlertContext);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    showAlert({
      title: 'သတိပြုရန်',
      message: 'မြန်မာနိုင်ငံရဲ့ အခြေအနေအရ VPN အသုံးပြုပေးပါ',
      duration: 6000 // Show for 6 seconds
    });
  }, []);

  // Validate Myanmar phone number format
  const validatePhoneNumber = (number) => {
    return /^09\d{9}$/.test(number);
  };

  const handleLogin = async () => {
    // Validate input
    if (!phoneNumber) {
      showAlert({ title: 'Error', message: 'Please enter your phone number' });
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      showAlert({
        title: 'Invalid Phone Number',
        message: 'Please enter a valid Myanmar phone number (09xxxxxxxxx)'
      });
      return;
    }

    try {
      setIsLoggingIn(true);
      const currentDeviceId = await DeviceInfo.getUniqueId();
      
      // Query Firebase for user with this phone number
      const userQuery = query(
        ref(database, 'users'), 
        orderByChild('phoneNumber'), 
        equalTo(phoneNumber)
      );
      const snapshot = await get(userQuery);

      if (!snapshot.exists()) {
        showAlert({ 
          title: 'Account Not Found', 
          message: 'The phone number you entered is not registered.' 
        });
        return;
      }

      // Get user data from snapshot
      const userData = snapshot.val();
      const userId = Object.keys(userData)[0];
      const user = { 
        ...userData[userId], 
        id: userId // Include user ID in the stored data
      };

      // Device verification logic
      if (!user.deviceId) {
        // First time login on this device
        await set(ref(database, `users/${userId}/deviceId`), currentDeviceId);
        // await set(ref(database, `users/${userId}/data`), []);
        showAlert({ 
          title: 'Device Registered', 
          message: 'This device has been successfully registered.' ,
          type :'success'
        });
        user.deviceId = currentDeviceId; // Update local user object
        await login(user);
      } else if (user.deviceId !== currentDeviceId) {
        // Device mismatch
        showAlert({ 
          title: 'Device Mismatch', 
          message: 'This account is registered on another device.' 
        });
      } else {
        // Successful login with matching device
        console.log(user)
        await login(user);
      }
    } catch (error) {
      console.error('Login error:', error);
      showAlert({ 
        title: 'Login Failed', 
        message: error.message || 'An error occurred during login' 
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleContactSupport = () => {
    Linking.openURL('https://t.me/mrngachat');
  };

  const handleCallSupport = () => {
    Linking.openURL('tel:+959978114808');
  };
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0a34cc" />
      <LinearGradient 
        colors={['#0a34cc', '#0f3eea']} 
        style={styles.gradientContainer}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.innerContainer}>
            {/* Header Section */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Icon name="shield-account" size={40} color="#fff" />
              </View>
              <Text style={styles.title}>Welcome</Text>
              <Text style={styles.subtitle}>Enter your phone number to login</Text>
            </View>

            {/* Form Section */}
            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={styles.inputWrapper}>
                <Icon name="phone" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  value={phoneNumber}
                  onChangeText={(text) => setPhoneNumber(text.replace(/[^0-9]/g, ''))}
                  keyboardType="phone-pad"
                  style={styles.input}
                  placeholder="09xxxxxxxxx"
                  placeholderTextColor="#999"
                  maxLength={11}
                  disabled={isLoggingIn || isLoading}
                  underlineColor="transparent"
                  activeUnderlineColor="transparent"
                  mode="flat"
                  theme={{ 
                    colors: { 
                      text: '#000', 
                      background: 'transparent',
                      placeholder: '#999'
                    } 
                  }}
                />
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[
                styles.button, 
                (isLoggingIn || isLoading) && styles.buttonDisabled
              ]}
              onPress={handleLogin}
              disabled={isLoggingIn || isLoading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#1d4ed8', '#2563eb']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isLoggingIn ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.buttonText}>LOGIN</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.contactContainer}>
              <Text style={styles.contactText}>Need help? Contact us:</Text>
              
              <TouchableOpacity 
                style={styles.contactButton}
                onPress={handleContactSupport}
              >
                <FontAwesome5con name="telegram-plane" size={20} color="#0088cc" />
                <Text style={[styles.contactLink, {color: '#0088cc'}]}>
                  @mrngachat
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.contactButton}
                onPress={handleCallSupport}
              >
                <Icon name="phone" size={20} color="#4CAF50" />
                <Text style={[styles.contactLink, {color: '#4CAF50'}]}>
                  09-978 114 808
                </Text>
              </TouchableOpacity>
            </View>


          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 25,
    paddingBottom: 50,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#e0e0e0',
  },
  formContainer: {
    marginBottom: 25,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
    marginLeft: 5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 50,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    backgroundColor: 'transparent',
    height: 50,
  },
  button: {
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonGradient: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  contactContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  contactText: {
    color: '#e0e0e0',
    marginBottom: 10,
    fontSize: 14,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  contactLink: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default LoginScreen;