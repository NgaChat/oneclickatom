// src/utils/alertUtils.js
import React, { useState, useContext } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ThemeContext } from '../context/ThemeContext';

let showAlertFunction;

export const AlertProvider = ({ children }) => {
  const theme = useContext(ThemeContext);
  const [visible, setVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    buttonText: 'OK',
    onPress: () => {}
  });

  showAlertFunction = (config) => {
    setAlertConfig(config);
    setVisible(true);
  };

  const styles = createStyles(theme);

  return (
    <>
      {children}
      <Modal
        transparent={true}
        visible={visible}
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.alertContainer}>
            <View style={styles.iconContainer}>
              <Icon name="error-outline" size={40} color={theme.colors.error} />
            </View>
            <Text style={styles.alertTitle}>{alertConfig.title}</Text>
            <Text style={styles.alertMessage}>{alertConfig.message}</Text>
            <TouchableOpacity
              style={styles.alertButton}
              onPress={() => {
                setVisible(false);
                alertConfig.onPress();
              }}
            >
              <Text style={styles.alertButtonText}>{alertConfig.buttonText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const createStyles = (theme) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: theme.spacing.large,
  },
  alertContainer: {
    width: '100%',
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

export const showErrorAlert = (config) => {
  if (showAlertFunction) {
    showAlertFunction({
      buttonText: 'OK',
      onPress: () => {},
      ...config
    });
  }
};