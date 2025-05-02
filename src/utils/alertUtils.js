import React, { useState, useContext, createContext } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ThemeContext } from '../context/ThemeContext';

// Context for the alert
export const AlertContext = createContext();

// The alert provider component to wrap the app
export const AlertProvider = ({ children }) => {
  const theme = useContext(ThemeContext);
  const [visible, setVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    buttonText: 'OK',
    type: 'error', // default type
    onPress: () => {},
  });

  // Show alert function
  const showAlert = (config) => {
    setAlertConfig({
      buttonText: 'OK',
      onPress: () => {},
      type: 'error',
      ...config,
    });
    setVisible(true);
  };

  const styles = createStyles(theme);

  // Determine icon and color based on type
  const getIcon = () => {
    switch (alertConfig.type) {
      case 'success':
        return <Icon name="check-circle" size={40} color={theme.colors.success} />;
      case 'warning':
        return <Icon name="warning" size={40} color={theme.colors.warning} />;
      case 'info':
        return <Icon name="info" size={40} color={theme.colors.info} />;
      default:
        return <Icon name="error-outline" size={40} color={theme.colors.error} />;
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <Modal
        transparent={true}
        visible={visible}
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.alertContainer}>
            <View style={styles.iconContainer}>{getIcon()}</View>
            <Text style={styles.alertTitle}>{alertConfig.title}</Text>
            <Text style={styles.alertMessage}>{alertConfig.message}</Text>
            <TouchableOpacity
              style={styles.alertButton}
              onPress={() => {
                setVisible(false);
                if (typeof alertConfig.onPress === 'function') {
                  alertConfig.onPress();
                }
              }}
            >
              <Text style={styles.alertButtonText}>{alertConfig.buttonText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
};

// Styles for the modal
const createStyles = (theme) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: theme.spacing.large,
  },
  alertContainer: {
    width: '80%',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.large,
    padding: theme.spacing.large,
    alignItems: 'center',
    elevation: 5,
  },
  iconContainer: {
    marginBottom: theme.spacing.medium,
  },
  alertTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.bold,
    color: theme.colors.black,
    marginBottom: theme.spacing.small,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    color: theme.colors.darkGray,
    marginBottom: theme.spacing.large,
    textAlign: 'center',
    lineHeight: 22,
  },
  alertButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.medium,
    paddingVertical: theme.spacing.small,
    paddingHorizontal: theme.spacing.large,
    minWidth: 120,
  },
  alertButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontFamily: theme.fonts.medium,
    textAlign: 'center',
  },
});
