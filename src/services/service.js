// src/services/service.js
import axios from 'axios';
import DeviceInfo from 'react-native-device-info';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const refreshAccessToken = async (refresh_token, msisdn, user_id) => {
  try {
    // Check if we have a valid cached token
    const cacheKey = `token_${user_id}`;
    const cachedToken = await AsyncStorage.getItem(cacheKey);
    
    if (cachedToken) {
      const { token, expiresAt } = JSON.parse(cachedToken);
      // If token is still valid (not expired), return it
      if (expiresAt > Date.now()) {
        return { token, refresh_token };
      }
    }

    // No valid cached token, proceed with refresh
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
      }
    );

    const attribute = response.data?.data?.attribute;
    if (attribute) {
      // Cache the new token with expiration (24 hours from now)
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
      await AsyncStorage.setItem(
        cacheKey, 
        JSON.stringify({ ...attribute, expiresAt })
      );
    }

    return attribute || null;
  } catch (error) {
    console.error(`Refresh token failed for ${user_id}:`, error.message);
    return null;
  }
};

// Call this after OTP verification to skip immediate refresh
export const storeTokenWithoutRefresh = async (user_id, tokenData) => {
  const cacheKey = `token_${user_id}`;
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  await AsyncStorage.setItem(
    cacheKey,
    JSON.stringify({ ...tokenData, expiresAt })
  );
};