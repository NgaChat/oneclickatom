import React, { useRef } from 'react';
import { View, Alert } from 'react-native';
import { WebView } from 'react-native-webview';

const TelegramLogin = () => {
  const webViewRef = useRef(null);

  // HTML template with Telegram Widget
  const htmlTemplate = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
      body {
        margin: 0;
        padding: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        background-color: #f5f5f5;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      }
      .container {
        text-align: center;
        padding: 20px;
      }
      .loading {
        color: #888;
        margin-top: 20px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div id="telegram-login"></div>
      <p class="loading" id="status">Loading Telegram Widget...</p>
    </div>
  
    <script src="https://telegram.org/js/telegram-widget.js?22" 
            data-telegram-login="AtomMaster_bot"
            data-size="large"
            data-radius="20"
            data-onauth="onTelegramAuth(user)"
            data-request-access="write"
            async></script>
  
    <script>
      // Status monitoring
      const statusEl = document.getElementById('status');
      
      setTimeout(function() {
        if (!document.querySelector('iframe')) {
          statusEl.textContent = 'Failed to load Telegram Widget. Please check your internet connection.';
          statusEl.style.color = 'red';
        }
      }, 5000);
  
      function onTelegramAuth(user) {
        window.ReactNativeWebView.postMessage(JSON.stringify(user));
        statusEl.textContent = 'Login successful!';
        statusEl.style.color = 'green';
      }
    </script>
  </body>
  </html>
  `;

  const handleMessage = (event) => {
    try {
      const userData = JSON.parse(event.nativeEvent.data);
      Alert.alert(
        'Login Successful',
        `Welcome ${userData.first_name} (ID: ${userData.id})`
      );
      // Handle user data (store in AsyncStorage, etc.)
      console.log('Telegram user data:', userData);
    } catch (error) {
      console.error('Error parsing Telegram auth data:', error);
    }
  };

  return (
    <View style={{ flex: 1 }}>
<WebView
  source={{ html: htmlTemplate }}
  javaScriptEnabled={true}
  domStorageEnabled={true}
  mixedContentMode="always"
  allowsInlineMediaPlayback={true}
  startInLoadingState={true}
  style={{ flex: 1, backgroundColor: 'transparent' }}
  onLoadEnd={() => console.log('WebView loaded completely')}
  onError={(syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.warn('WebView error: ', nativeEvent);
  }}
/>
    </View>
  );
};

export default TelegramLogin;