// utils/auth.js
import axios from 'axios';
import DeviceInfo from 'react-native-device-info';
import { showErrorAlert } from './alertUtils';

export const refreshAccessToken = async (refresh_token, msisdn, user_id) => {
  try {
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
      'If-Modified-Since': today,
      Host: 'store.atom.com.mm'
    };

    const response = await axios.post(
      'https://store.atom.com.mm/mytmapi/v3/my/oauth/refresh-token',
      { refresh_token },
      {
        params: { msisdn, userid: user_id, v: '4.11' },
        headers,
        timeout: 10000 // 10 seconds timeout
      }
    );

    if (!response.data?.data?.attribute) {
      throw new Error('Invalid response format from server');
    }

    return response.data.data.attribute;

  } catch (error) {
    // console.error(`Refresh token failed for ${msisdn}:`, error.message);
    
    let errorMessage = 'Session refresh failed.';
    let actionText = 'Try Again';
    
    if (error.response) {
      // Server responded with error status (4xx, 5xx)
      const status = error.response.status;
      
      if (status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
        actionText = 'Go to Login';
      } else if (status === 403) {
        errorMessage = 'Access denied. Please check your credentials.';
      } else if (status === 404) {
        errorMessage = 'Service not available. Please try again later.';
      } else if (status >= 500) {
        errorMessage = 'Server is currently unavailable. Please try again later.';
      }
    } else if (error.request) {
      // Request was made but no response received
      errorMessage = 'No response from server. Check your internet connection.';
    } else if (error.code === 'ECONNABORTED') {
      // Timeout error
      errorMessage = 'Connection timed out. Please try again.';
    }

    showErrorAlert({
      title: 'Session Error',
      message: errorMessage,
      buttonText: actionText,
      onPress: () => {
        if (error.response?.status === 401) {
          // Navigate to login screen if session expired
          // You'll need to pass navigation prop or use navigation service
        }
      }
    });

    return null;
  }
};