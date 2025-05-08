import React, { useState, useLayoutEffect, useCallback, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import DeviceInfo from 'react-native-device-info';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { emitRefreshEvent } from '../../utils/eventEmitter';
import { getCommonHeaders } from '../../services/service';
import { AlertContext } from '../../utils/alertUtils'; // Import AlertContext

import { useHeader } from '../../components';

const OtpVerifyScreen = ({ route }) => {
  const navigation = useNavigation();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const { data, item } = route.params;
  const { showAlert } = useContext(AlertContext); // Use AlertContext
  useHeader(navigation, 'OTP Verification');



  useEffect(() => {
    // Start countdown on mount
    const timer = countdown > 0 && setInterval(() => {
      setCountdown(countdown - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    // Fade animation for success message
    if (success) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.ease,
        useNativeDriver: true,
      }).start();
    }
  }, [success]);

  const handleResendOtp = async () => {
    try {
      setResendLoading(true);
      setError(null);

      // TODO: Implement actual OTP resend API call
      // This is just a simulation
      await new Promise(resolve => setTimeout(resolve, 1500));

      setCountdown(60);
      showAlert({
        title: 'OTP Sent',
        message: 'A new OTP has been sent to your registered phone number.',
      });
    } catch (err) {
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleVerify = async () => {
    if (otp.trim() === '') {
      setError('Please enter OTP');
      return;
    }

    if (otp.length !== 4) {
      setError('OTP must be 4 digits');
      return;
    }

    try {

      setLoading(true);
      setError(null);

      const headers = await getCommonHeaders(item.token);
      const params = { msisdn: item.msisdn, userid: item.user_id };
      const body = {
        otp: otp,
        requestId: data.requestId,
      };

      const transfer = await axios.post(
        'https://store.atom.com.mm/mytmapi/v1/my/point-system/point-transfer',
        body,
        { params, headers }
      );

      const result = transfer.data.data.attribute;
      console.log(result);

      if (transfer.data.status === 'success') {
        // Call fetchSingleItem with item.msisdn


        // Proceed with success actions after fetchSingleItem completes
        setSuccess(true);
        setTimeout(() => {
          setOtp('');
          // navigation.goBack({ params: { msisdn: item.msisdn } });
          navigation.navigate('TransferPoint', { msisdn: item.msisdn });
        }, 2000);
      } else {
        setError(result.response.message || 'Verification failed');
        showAlert({
          title: 'Verification Failed',
          message: result.response.message || 'Verification failed.',
        });
      }
    } catch (err) {
      showAlert({
        title: 'Error',
        message: err.response?.data?.message || 'An error occurred during verification.',
      });
      console.error('OTP Verification Error:', err);
      setError(err.response?.data?.message || 'An error occurred during verification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Icon name="verified-user" size={60} color="#0a34cc" />
            <Text style={styles.title}>Point Transfer Verification</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit OTP sent to {item.msisdn}
            </Text>
          </View>

          <View style={styles.otpContainer}>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              placeholder="Enter OTP"
              placeholderTextColor="#999"
              maxLength={6}
              value={otp}
              onChangeText={(text) => {
                setOtp(text);
                setError(null);
              }}
              selectionColor="#0a34cc"
              autoFocus
            />
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Icon name="error-outline" size={20} color="#d32f2f" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {success && (
            <Animated.View style={[styles.successContainer, { opacity: fadeAnim }]}>
              <Icon name="check-circle" size={20} color="#4CAF50" />
              <Text style={styles.successText}>Transfer successful!</Text>
            </Animated.View>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={loading || success}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify & Transfer</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResendOtp}
            disabled={countdown > 0 || resendLoading}
          >

          </TouchableOpacity>


        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  otpContainer: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    backgroundColor: '#fff',
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: 'bold',
    color: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  button: {
    backgroundColor: '#0a34cc',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#0a34cc',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendButton: {
    alignItems: 'center',
    marginTop: 16,
    padding: 8,
  },
  resendText: {
    color: '#0a34cc',
    fontSize: 14,
    fontWeight: '500',
  },
  resendDisabled: {
    color: '#999',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#d32f2f',
    marginLeft: 8,
    fontSize: 14,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successText: {
    color: '#4CAF50',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  transferDetails: {
    marginTop: 32,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 16,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    color: '#666',
    fontSize: 16,
  },
  detailValue: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default OtpVerifyScreen;