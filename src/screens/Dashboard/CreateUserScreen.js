// src/screens/Admin/CreateUserScreen.js
import React, { useState, useEffect } from 'react';
import { ScrollView, Alert, FlatList, StyleSheet, View } from 'react-native';
import {
  TextInput,
  Button,
  ActivityIndicator,
  Text,
  Card,
  IconButton,
  useTheme
} from 'react-native-paper';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { database } from '../../config/firebase';
import {
  ref,
  get,
  push,
  set,
  serverTimestamp,
  update,
  remove
} from 'firebase/database';
import { useHeader } from '../../components';

const CreateUserScreen = ({ navigation }) => {
  const theme = useTheme();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [limitAccount, setLimitAccount] = useState('100');
  const [deviceId, setDeviceId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [editingId, setEditingId] = useState(null);

  useHeader(navigation, 'Create User', {
    headerStyle: {
      backgroundColor: theme.colors.primaryContainer,
    },
    headerTintColor: theme.colors.onPrimaryContainer,
  });

  const fetchUsers = async () => {
    const usersRef = ref(database, 'users');
    const snapshot = await get(usersRef);

    if (snapshot.exists()) {
      const usersArray = Object.entries(snapshot.val()).map(([id, data]) => ({
        id,
        ...data,
        createdAt: data.createdAt ? new Date(data.createdAt).toLocaleString() : 'Unknown',
        dataCount: data.data ? data.data.length : 0,
      }));
      setUsers(usersArray.sort((a, b) => b.createdAt?.localeCompare(a.createdAt)));
    } else {
      setUsers([]);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateOrUpdate = async () => {
    if (!phoneNumber || !/^09\d{9}$/.test(phoneNumber)) {
      Alert.alert('Error', 'Please enter valid Myanmar phone number (09xxxxxxxxx)');
      return;
    }

    if (!limitAccount || isNaN(limitAccount) || parseInt(limitAccount) <= 0) {
      Alert.alert('Error', 'Please enter valid account limit (number greater than 0)');
      return;
    }

    setIsLoading(true);

    try {
      if (editingId) {
        // update existing user
        await update(ref(database, `users/${editingId}`), {
          phoneNumber,
          limitAccount: parseInt(limitAccount),
          deviceId,
        });
        Alert.alert('Success', 'User updated successfully');
      } else {
        // create new user
        const usersRef = ref(database, 'users');
        const snapshot = await get(usersRef);

        if (snapshot.exists()) {
          const phoneExists = Object.values(snapshot.val()).some(
            user => user.phoneNumber === phoneNumber
          );

          if (phoneExists) {
            Alert.alert('Error', 'Phone number already exists');
            setIsLoading(false);
            return;
          }
        }

        const userRef = push(ref(database, 'users'));
        await set(userRef, {
          phoneNumber,
          deviceId,
          limitAccount: parseInt(limitAccount),
          data: [],
          createdAt: serverTimestamp(),
        });

        Alert.alert('Success', 'User created successfully');
      }

      await fetchUsers();
      setPhoneNumber('');
      setLimitAccount('100');
      setDeviceId('');
      setEditingId(null);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingId(user.id);
    setPhoneNumber(user.phoneNumber);
    setLimitAccount(user.limitAccount.toString());
    setDeviceId(user.deviceId || '');
  };

  const confirmDelete = (userId, phone) => {
    Alert.alert(
      'Confirm Delete',
      `Delete user ${phone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => handleDelete(userId) }
      ]
    );
  };

  const handleDelete = async (userId) => {
    try {
      await remove(ref(database, `users/${userId}`));
      await fetchUsers();
      Alert.alert('Success', 'User deleted successfully');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const renderUserItem = ({ item }) => (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}> 
      <Card.Content>
        <View style={styles.userHeader}>
          <MaterialIcons
            name="account-circle"
            size={24}
            color={theme.colors.primary}
          />
          <Text variant="titleMedium" style={styles.phoneText}>
            {item.phoneNumber}
          </Text>
        </View>

        <View style={styles.userDetails}>
          <View style={styles.detailRow}>
            <MaterialIcons
              name="lock"
              size={16}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="bodyMedium" style={styles.detailText}>
              Limit: {item.limitAccount}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons
              name="devices"
              size={16}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="bodyMedium" style={styles.detailText}>
              Device ID: {item.deviceId || 'N/A'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons
              name="data-usage"
              size={16}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="bodyMedium" style={styles.detailText}>
              Data count: {item.dataCount}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons
              name="date-range"
              size={16}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="bodySmall" style={styles.detailText}>
              Created: {item.createdAt}
            </Text>
          </View>
        </View>
      </Card.Content>

      <Card.Actions>
        <IconButton
          icon="pencil"
          size={20}
          onPress={() => handleEdit(item)}
          iconColor={theme.colors.primary}
        />

        <IconButton
          icon="delete"
          size={20}
          onPress={() => confirmDelete(item.id, item.phoneNumber)}
          iconColor={theme.colors.error}
        />
      </Card.Actions>
    </Card>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            {editingId ? 'Edit User' : 'Create New User'}
          </Text>

          <TextInput
            label="Phone Number (09xxxxxxxxx)"
            value={phoneNumber}
            onChangeText={(text) => setPhoneNumber(text.replace(/[^0-9]/g, ''))}
            keyboardType="phone-pad"
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="phone" />}
            maxLength={11}
          />

          <TextInput
            label="Account Limit"
            value={limitAccount}
            onChangeText={(text) => setLimitAccount(text.replace(/[^0-9]/g, ''))}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="account-lock" />}
          />

          <TextInput
            label="Device ID"
            value={deviceId}
            onChangeText={setDeviceId}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="devices" />}
          />

          <View style={styles.editActions}>
            {editingId && (
              <Button
                mode="outlined"
                onPress={() => {
                  setEditingId(null);
                  setPhoneNumber('');
                  setLimitAccount('100');
                  setDeviceId('');
                }}
                style={styles.createButton}
                contentStyle={styles.buttonContent}
              >
                Cancel
              </Button>
            )}

            <Button
              mode="contained"
              onPress={handleCreateOrUpdate}
              style={styles.createButton}
              contentStyle={styles.buttonContent}
              loading={isLoading}
            >
              {editingId ? 'Update User' : 'Create User'}
            </Button>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.sectionCard}>
        <Card.Content>
          <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            User List ({users.length})
          </Text>

          {users.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons
                name="people-outline"
                size={48}
                color={theme.colors.onSurfaceVariant}
              />
              <Text variant="bodyLarge" style={styles.emptyText}>
                No users found
              </Text>
            </View>
          ) : (
            <FlatList
              data={users}
              renderItem={renderUserItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.listContainer}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  sectionCard: { marginBottom: 20, borderRadius: 8, elevation: 2 },
  sectionTitle: { marginBottom: 16, fontWeight: 'bold' },
  input: { marginBottom: 12 },
  createButton: { marginTop: 8, flex: 1 },
  buttonContent: { height: 48 },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 8 },
  cancelButton: { flex: 1,justifyContent: 'center',height: 48 },
  card: { borderRadius: 8, elevation: 1 },
  userHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  phoneText: { marginLeft: 8, fontWeight: 'bold' },
  userDetails: { marginLeft: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  detailText: { marginLeft: 8 },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { marginTop: 8, opacity: 0.6 },
  listContainer: { paddingBottom: 8 },
  separator: { height: 8 },
});

export default CreateUserScreen;
