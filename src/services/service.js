import axios from 'axios';
import DeviceInfo from 'react-native-device-info';

// Common headers generator
export const getCommonHeaders = async (token) => {
  const userAgent = 'MyTM/4.11.1/Android/35';
  const deviceName = await DeviceInfo.getDeviceName() || DeviceInfo.getModel();
  const today = new Date().toUTCString();

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json; charset=UTF-8',
    Connection: 'Keep-Alive',
    'Accept-Encoding': 'gzip',
    'X-Server-Select': 'production',
    'User-Agent': userAgent,
    'Device-Name': deviceName,
    'If-Modified-Since': today,
    Host: 'store.atom.com.mm'
  };
};

export const refreshAccessToken = async (item, forceRefresh = false) => {
  try {
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    const fiveMinutesInSeconds = 5 * 60; // 5 minutes



    // Skip refresh if not forced and token is still valid
    if (!forceRefresh && item.access_token_expire_at - currentTimeInSeconds > fiveMinutesInSeconds) {
      console.log('Token still valid (expires in more than 5 minutes)');
      return item;
    }

    console.log('Refreshing token for user:', item.user_id);

    const headers = await getCommonHeaders(item.access_token);
    const response = await axios.post(
      'https://store.atom.com.mm/mytmapi/v3/my/oauth/refresh-token',
      { refresh_token: item.refresh_token },
      {
        params: { 
          msisdn: item.msisdn, 
          userid: item.user_id, 
          v: '4.11' 
        },
        headers,
      }
    );

    if (!response.data?.data?.attribute) {
      throw new Error('Invalid refresh token response');
    }

    console.log('Token refresh successful');
    return {
      ...item,
      ...response.data.data.attribute
    };

  } catch (error) {
    console.error(`Refresh token failed for ${item.user_id}:`, error.message);

    if (error.response?.data?.errors?.message === "Invalid refresh token") {
      console.error('Invalid refresh token detected');
      // You might want to handle this case (e.g., remove user or force logout)
    }

    return item; // Return original item if refresh fails
  }
};

export const getBasicHeaders = async () => {
  const userAgent = 'MyTM/4.11.1/Android/35';
  const deviceName = await DeviceInfo.getDeviceName() || DeviceInfo.getModel();
  const today = new Date().toUTCString();

  return {
    'Content-Type': 'application/json; charset=UTF-8',
    Connection: 'Keep-Alive',
    'Accept-Encoding': 'gzip',
    'X-Server-Select': 'production',
    'User-Agent': userAgent,
    'Device-Name': deviceName,
    'If-Modified-Since': today,
    Host: 'store.atom.com.mm'
  };
};
