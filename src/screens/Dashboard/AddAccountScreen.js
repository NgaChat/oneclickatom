import { useUser } from '../../context/UserContext';
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useHeader } from '../../components';
import { getBasicHeaders } from '../../services/service';

const AddAccountScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [accountLimit, setAccountLimit] = useState(3); // Default limit
  const { userData } = useUser();

  useHeader(navigation, 'Add SIM')

  // Get account limit from AsyncStorage
  useEffect(() => {
    const getAccountLimit = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          console.log(user)
          // Use the limit from storage or default to 3
          setAccountLimit(user.limitNumber || 3);
        }
      } catch (error) {
        console.error('Error getting account limit:', error);
        // Fallback to default limit if error occurs
        setAccountLimit(3);
      }
    };
    getAccountLimit();
  }, []);

  const sendOTP = async () => {
    // Validate inputs
    if (phoneNumber.length !== 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit phone number');
      return;
    }

    // Check if reached account limit
    if (userData?.length >= accountLimit) {
      Alert.alert(
        'Account Limit Reached',
        `You can only add up to ${accountLimit} accounts.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Check for duplicate account
    if (userData?.some(account => account.msisdn === `+95${phoneNumber}`)) {
      Alert.alert('Error', 'This phone number is already added');
      return;
    }

    setLoading(true);

    // Prepare API request
    const url = `https://store.atom.com.mm/mytmapi/v1/en/local-auth/send-otp?msisdn=${phoneNumber}&userid=-1&v=4.11`;
    const body = { msisdn: phoneNumber };



    const headers =  await getBasicHeaders();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
      });

      const result = await response.json();
      console.log(result)

      if (result.status === 'success') {
        navigation.navigate('OTPVerification', {
          msisdn: result.data.attribute.msisdn,
          code: result.data.attribute.code,
          expire_within : result.data.attribute.expire_within,
          phoneNumber
        });
      } else {
        Alert.alert('Error', result.message || 'Failed to send OTP');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // Determine if continue button should be disabled
  const isContinueDisabled = loading || phoneNumber.length !== 10;

  return (
    <LinearGradient colors={['#f5f7fa', '#e4e8f0']} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.headerIllustration}>
          <View style={styles.iconContainer}>
            <Icon name="sim-card" size={40} color="#0a34cc" />
          </View>
          <Text style={styles.title}>Add ATOM Account</Text>
          <Text style={styles.subtitle}>Enter your phone number to continue</Text>

          <Text style={styles.limitText}>
            Account limit: {userData?.length || 0}/{accountLimit}
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Phone Number</Text>
          <View style={styles.phoneInputWrapper}>
            <Text style={styles.countryCode}>+95</Text>
            <TextInput
              style={styles.input}
              placeholder="9787406689"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              maxLength={10}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              autoFocus={true}
            />
            {phoneNumber && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setPhoneNumber('')}
              >
                <Icon name="close" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.noteText}>We'll send a verification code</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, isContinueDisabled && styles.buttonDisabled]}
          onPress={sendOTP}
          disabled={isContinueDisabled}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={isContinueDisabled ? ['#ccc', '#aaa'] : ['#0a34cc', '#1a4bdf']}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
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
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  loadingText: {
    marginLeft: 10,
    color: '#666',
  },
  limitText: {
    marginTop: 10,
    color: '#666',
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 30,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
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
  },
  countryCode: {
    fontSize: 16,
    color: '#333',
    marginRight: 5,
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
  },
  button: {
    borderRadius: 10,
    overflow: 'hidden',
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