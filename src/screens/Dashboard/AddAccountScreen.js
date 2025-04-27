import React, { useState, useLayoutEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

const AddAccountScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('09787406689');
  const [loading, setLoading] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Add New Account',
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

  const sendOTP = async () => {
    if (phoneNumber.length !== 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit phone number.');
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
        navigation.navigate('OTPVerification', { 
          msisdn, 
          code,
          phoneNumber // Pass phone number to next screen
        });
      } else {
        Alert.alert('Error', result.message || 'Failed to send OTP. Please try again.');
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Connection Error', 'Unable to connect to server. Please check your internet connection.');
    }
  };

  return (
    <LinearGradient colors={['#f5f7fa', '#e4e8f0']} style={styles.container}>
      <View style={styles.content}>
        {/* Header Illustration */}
        <View style={styles.headerIllustration}>
          <View style={styles.iconContainer}>
            <Icon name="sim-card" size={40} color="#0a34cc" />
          </View>
          <Text style={styles.title}>Add ATOM Account</Text>
          <Text style={styles.subtitle}>Enter your Atom phone number to continue</Text>
        </View>

        {/* Input Field */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Phone Number</Text>
          <View style={styles.phoneInputWrapper}>
            <Text style={styles.countryCode}>+95</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 09787406689"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              maxLength={11}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              autoFocus={true}
            />
            {phoneNumber ? (
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={() => setPhoneNumber('')}
              >
                <Icon name="close" size={20} color="#999" />
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={styles.noteText}>We'll send a verification code to this number</Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={sendOTP}
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
                <Text style={styles.buttonText}>Continue</Text>
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
  headerIllustration: {
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
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    maxWidth: '80%',
  },
  inputContainer: {
    marginBottom: 30,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginLeft: 5,
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    elevation: 1,
  },
  countryCode: {
    fontSize: 16,
    color: '#333',
    marginRight: 5,
    fontWeight: '500',
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 5,
  },
  noteText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    marginLeft: 5,
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

export default AddAccountScreen;