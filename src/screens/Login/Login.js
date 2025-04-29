import React, { useState, useContext } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import { database } from '../../config/firebase';
import { ref, query, orderByChild, equalTo, get, set } from 'firebase/database';
import DeviceInfo from 'react-native-device-info';
import { AlertContext } from '../../utils/alertUtils';
import LinearGradient from 'react-native-linear-gradient';

const LoginScreen = () => {
  const { login, isLoading } = useAuth();
  const { showAlert } = useContext(AlertContext);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (!phoneNumber) {
      showAlert({ title: 'Error', message: 'Please enter your phone number' });
      return;
    }

    try {
      setIsLoggingIn(true);
      const currentDeviceId = await DeviceInfo.getUniqueId();
      const userQuery = query(ref(database, 'users'), orderByChild('phoneNumber'), equalTo(phoneNumber));
      const snapshot = await get(userQuery);

      if (!snapshot.exists()) {
        showAlert({ title: 'Account not exist', message: 'The phone number you entered is not registered.' });
        return;
      }

      const userData = snapshot.val();
      const userId = Object.keys(userData)[0];
      const user = userData[userId];

      if (!user.deviceId) {
        await set(ref(database, `users/${userId}/deviceId`), currentDeviceId);
        showAlert({ title: 'Success', message: 'Device registered successfully' });
        await login(phoneNumber);
      } else if (user.deviceId !== currentDeviceId) {
        showAlert({ title: 'Device Mismatch', message: 'This account is registered on another device.' });
      } else {
        await login(phoneNumber);
      }
    } catch (error) {
      showAlert({ title: 'Login Failed', message: error.message || 'An error occurred during login' });
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0a34cc" />
      <LinearGradient colors={['#0a34cc', '#0f3eea']} style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.innerContainer}>
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Icon name="shield-account" size={40} color="#fff" />
              </View>
              <Text style={styles.title}>Welcome</Text>
              <Text style={styles.subtitle}>Enter your phone number to login</Text>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={styles.inputWrapper}>
                <Icon name="phone" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  style={styles.input}
                  placeholder="09xxxxxxxxx"
                  placeholderTextColor="#999"
                  disabled={isLoggingIn || isLoading}
                  underlineColor="transparent"
                  activeUnderlineColor="transparent"
                  mode="flat"
                  theme={{ colors: { text: '#000', background: 'transparent' } }}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, (isLoggingIn || isLoading) && styles.buttonDisabled]}
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
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Login</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 25,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    backgroundColor: '#ffffff33',
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
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    backgroundColor: 'transparent',
  },
  button: {
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 3,
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
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});

export default LoginScreen;
