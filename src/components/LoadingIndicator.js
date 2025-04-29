// src/components/LoadingIndicator.js
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const LoadingIndicator = () => {
//   const { colors } = useTheme();

  return (
    <View style={[styles.container, {  }]}>
      <ActivityIndicator size="large"  />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LoadingIndicator;