export const API_CONFIG = {
    BASE_URL: process.env.API_BASE_URL,
    ENDPOINTS: {
      DASHBOARD: '/mytmapi/v1/my/dashboard',
      OTP_SEND: '/mytmapi/v1/en/local-auth/send-otp',
      OTP_VERIFY: '/mytmapi/v1/en/local-auth/verify-otp',
      REFRESH_TOKEN: '/mytmapi/v3/my/oauth/refresh-token',
      TRANSFER_POINTS: '/mytmapi/v1/my/point-system/transfer'
    }
  };