import { DeviceEventEmitter } from 'react-native';

export const EventTypes = {
  REFRESH_DATA: 'REFRESH_DATA'
};

export const emitRefreshEvent = () => {
  DeviceEventEmitter.emit(EventTypes.REFRESH_DATA);
};

export const listenForRefresh = (callback) => {
  const subscription = DeviceEventEmitter.addListener(
    EventTypes.REFRESH_DATA,
    callback
  );
  return () => subscription.remove();
};