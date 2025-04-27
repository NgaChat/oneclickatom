// utils/auth.js
import axios from 'axios';
import DeviceInfo from 'react-native-device-info';

export const refreshAccessToken = async (refresh_token, msisdn, user_id) => {
  try {
    // const userAgent = await DeviceInfo.getUserAgent();
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

    return response.data?.data?.attribute || null;
  } catch (error) {
    console.error(`Refresh token failed for ${user_id}:`, error.message);
    return null;
  }
};
