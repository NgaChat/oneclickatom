// src/context/LoadingContext.js
import React, { createContext, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { ThemeContext } from './ThemeContext';

export const LoadingContext = createContext();

export const LoadingProvider = ({ children }) => {
  const theme = React.useContext(ThemeContext);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Loading...');

  const showLoading = (text = 'Loading...') => {
    setLoadingText(text);
    setLoading(true);
  };

  const hideLoading = () => {
    setLoading(false);
  };

  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading }}>
      {children}
      {loading && <GlobalLoadingIndicator text={loadingText} theme={theme} />}
    </LoadingContext.Provider>
  );
};

const GlobalLoadingIndicator = ({ text, theme }) => {
  return (
    <View style={styles.overlay}>
      <View style={[styles.container, { backgroundColor: theme.colors.white }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        {text && <Text style={[styles.text, { color: theme.colors.black }]}>{text}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  container: {
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 5,
    minWidth: 120,
  },
  text: {
    marginTop: 10,
    fontSize: 16,
  },
});