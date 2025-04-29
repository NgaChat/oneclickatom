// src/screens/Admin/CreateUserScreen.js
import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { database } from '../../config/firebase';
import { ref, query, orderByChild, equalTo, get, push, set, serverTimestamp } from 'firebase/database';

const CreateUserScreen = () => {
  const [phoneNumber, setPhoneNumber] = useState('09787406689');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateUser = async () => {
    if (!phoneNumber || !/^\d{10,15}$/.test(phoneNumber)) {
      Alert.alert('Error', 'Please enter valid phone number (10-15 digits)');
      return;
    }

    setIsLoading(true);

    try {
      // Query to check if phone number already exists
      const userQuery = query(
        ref(database, 'users'),
        orderByChild('phoneNumber'),
        equalTo(phoneNumber)
      );

      const snapshot = await get(userQuery);

      // If the phone number already exists
      if (snapshot.exists()) {
        Alert.alert('Error', 'Phone number already exists');
        setIsLoading(false);
        return;
      }

      // Proceed to create new user if phone number doesn't exist
      const userRef = push(ref(database, 'users'));
      await set(userRef, {
        phoneNumber: phoneNumber,
        deviceId: '',
        limitNumber: 100,
        data: {},
        createdAt: serverTimestamp(),
      });

      Alert.alert('Success', 'User created successfully');
      setPhoneNumber('');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        label="Phone Number"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
        mode="outlined"
        style={styles.input}
        left={<TextInput.Icon name="phone" />}
      />

      {isLoading ? (
        <ActivityIndicator animating={true} size="large" />
      ) : (
        <Button
          mode="contained"
          onPress={handleCreateUser}
          style={styles.button}
        >
          Create User
        </Button>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  input: {
    marginBottom: 20,
  },
  button: {
    marginTop: 10,
  },
});

export default CreateUserScreen;
