import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, FlatList, Alert, RefreshControl } from 'react-native';
import {
  TextInput,
  Button,
  ActivityIndicator,
  Text,
  Card,
  useTheme,
  FAB,
  Divider,
  Chip
} from 'react-native-paper';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { database } from '../../config/firebase';
import { ref, get, push, set, serverTimestamp, update, remove } from 'firebase/database';
import { useHeader } from '../../components';

const CreateUserScreen = ({ navigation }) => {
  const theme = useTheme();
  const [formData, setFormData] = useState({
    phoneNumber: '',
    limitAccount: '100',
    deviceId: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useHeader(navigation, 'User Management', {
    headerStyle: {
      backgroundColor: theme.colors.primaryContainer,
    },
    headerTintColor: theme.colors.onPrimaryContainer,
  });

  const fetchUsers = async () => {
    setRefreshing(true);
    try {
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);

   if (snapshot.exists()) {
  const usersData = snapshot.val();

  const usersArray = Object.keys(usersData).map(id => {
    const rawData = usersData[id].data;
    let dataArr = [];
    if (Array.isArray(rawData)) {
      dataArr = rawData;
    } else if (rawData && typeof rawData === 'object') {
      dataArr = Object.values(rawData);
    }
    return {
      id,
      phoneNumber: usersData[id].phoneNumber || '',
      deviceId: usersData[id].deviceId || '',
      limitAccount: usersData[id].limitAccount || 100,
      createdAt: usersData[id].createdAt
        ? new Date(usersData[id].createdAt).toLocaleString()
        : 'Unknown',
      data: dataArr,
      dataCount: dataArr.length,
    };
  });

  setUsers(usersArray.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
} else {
  setUsers([]);
}
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch users: ' + error.message);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInputChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: name === 'phoneNumber' || name === 'limitAccount'
        ? value.replace(/[^0-9]/g, '')
        : value
    }));
  };

  const handleCreateOrUpdate = async () => {
    if (!formData.phoneNumber || !/^09\d{9}$/.test(formData.phoneNumber)) {
      Alert.alert('Error', 'Please enter valid Myanmar phone number (09xxxxxxxxx)');
      return;
    }

    setIsLoading(true);

    try {
      const userData = {
        phoneNumber: formData.phoneNumber,
        deviceId: formData.deviceId,
        limitAccount: parseInt(formData.limitAccount) || 100,
        data: [],
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await update(ref(database, `users/${editingId}`), userData);
        Alert.alert('Success', 'User updated successfully');
      } else {
        userData.createdAt = serverTimestamp();
        const newUserRef = push(ref(database, 'users'));
        await set(newUserRef, userData);
        Alert.alert('Success', 'User created successfully');
      }

      await fetchUsers();
      resetForm();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      phoneNumber: '',
      limitAccount: '100',
      deviceId: ''
    });
    setEditingId(null);
  };

  const handleEdit = (user) => {
    setEditingId(user.id);
    setFormData({
      phoneNumber: user.phoneNumber,
      limitAccount: user.limitAccount.toString(),
      deviceId: user.deviceId
    });
  };

  const confirmDelete = (userId, phone) => {
    Alert.alert(
      'Confirm Delete',
      `Delete user ${phone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDelete(userId)
        }
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

  const getSummaryData = (data = []) => {
    if (!Array.isArray(data)) {
      return {
        totalPoints: 0,
        claimedCount: 0,
        unclaimedCount: 0
      };
    }

    return {
      totalPoints: data.reduce((sum, item) => sum + (item?.totalPoint || 0), 0),
      claimedCount: data.filter(item => item?.label === 'Claimed').length,
      unclaimedCount: data.filter(item => item?.label === 'Claim').length
    };
  };

  const filteredUsers = users.filter(user =>
    user.phoneNumber.includes(searchQuery) ||
    (user.deviceId && user.deviceId.includes(searchQuery))
  );

  const renderUserItem = ({ item }) => {
   
    const summary = getSummaryData(item.data);
    const isEditing = editingId === item.id;

    return (
      <Card style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          marginVertical: 10,
          borderWidth: isEditing ? 2 : 0,
          borderColor: isEditing ? theme.colors.primary : 'transparent',
          shadowColor: theme.colors.primary,
          shadowOpacity: 0.12,
          shadowRadius: 8,
          elevation: isEditing ? 5 : 2,
        }
      ]}>
        <Card.Content>
          <View style={styles.userHeader}>
            <View style={[
              styles.avatarCircle,
              { backgroundColor: isEditing ? theme.colors.primary : theme.colors.secondaryContainer }
            ]}>
              <MaterialIcons
                name={isEditing ? "edit" : "account-circle"}
                size={36}
                color={isEditing ? theme.colors.onPrimary : theme.colors.primary}
              />
            </View>
            <View style={styles.userInfo}>
              <Text
                variant="titleLarge"
                style={[
                  styles.phoneText,
                  { color: isEditing ? theme.colors.primary : theme.colors.onSurface }
                ]}
              >
                {item.phoneNumber}
              </Text>
              <Text
                variant="bodyMedium"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginTop: 2,
                  fontSize: 13
                }}
              >
                Created: {item.createdAt}
              </Text>
            </View>
          </View>

          <Divider style={[
            styles.divider,
            { marginVertical: 10, backgroundColor: theme.colors.surfaceVariant }
          ]} />

          <View style={styles.statsGrid}>
            <Chip style={styles.chip} icon="lock">
              Limit: {item.limitAccount}
            </Chip>
            <Chip style={styles.chip} icon="devices">
              Device: {item.deviceId || 'None'}
            </Chip>
            <Chip style={styles.chip} icon="database">
              Data: {item.dataCount}
            </Chip>
            <Chip style={[styles.chip, { backgroundColor: '#e3f2fd' }]} icon="check-circle">
              Claimed: <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{summary.claimedCount}</Text>
            </Chip>
            <Chip style={[styles.chip, { backgroundColor: '#ffebee' }]} icon="alert-circle">
              Unclaimed: <Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>{summary.unclaimedCount}</Text>
            </Chip>
            <Chip style={styles.chip} icon="star">
              Points: <Text style={{ fontWeight: 'bold' }}>{summary.totalPoints}</Text>
            </Chip>
          </View>
        </Card.Content>

        <Card.Actions style={styles.cardActions}>
          <Button
            mode="contained-tonal"
            onPress={() => handleEdit(item)}
            textColor={theme.colors.primary}
            icon="pencil"
            style={styles.actionButton}
            compact
          >
            Edit
          </Button>
          <Button
            mode="contained-tonal"
            onPress={() => confirmDelete(item.id, item.phoneNumber)}
            textColor={theme.colors.error}
            icon="delete"
            style={styles.actionButton}
            compact
          >
            Delete
          </Button>
        </Card.Actions>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchUsers}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Form Section */}
        <Card style={[styles.formCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text
              variant="titleLarge"
              style={[styles.sectionTitle, { color: theme.colors.primary }]}
            >
              {editingId ? '✏️ Edit User' : '➕ Create New User'}
            </Text>

            <TextInput
              label="Phone Number (09xxxxxxxxx)"
              value={formData.phoneNumber}
              onChangeText={(text) => handleInputChange('phoneNumber', text)}
              keyboardType="phone-pad"
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="phone" />}
              right={<TextInput.Affix text={`${formData.phoneNumber.length}/11`} />}
              maxLength={11}
              outlineColor={theme.colors.outline}
              activeOutlineColor={theme.colors.primary}
            />

            <TextInput
              label="Account Limit"
              value={formData.limitAccount}
              onChangeText={(text) => handleInputChange('limitAccount', text)}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="account-lock" />}
              outlineColor={theme.colors.outline}
              activeOutlineColor={theme.colors.primary}
            />

            <TextInput
              label="Device ID (Optional)"
              value={formData.deviceId}
              onChangeText={(text) => handleInputChange('deviceId', text)}
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="devices" />}
              outlineColor={theme.colors.outline}
              activeOutlineColor={theme.colors.primary}
            />

            <Button
              mode="contained"
              onPress={handleCreateOrUpdate}
              style={[
                styles.submitButton,
                {
                  backgroundColor: editingId ? theme.colors.secondary : theme.colors.primary,
                  shadowColor: theme.colors.primary,
                  elevation: 3,
                }
              ]}
              contentStyle={styles.buttonContent}
              loading={isLoading}
              icon={editingId ? "content-save" : "account-plus"}
              disabled={!formData.phoneNumber || isLoading}
              labelStyle={{ color: theme.colors.onPrimary }}
            >
              {editingId ? 'Update User' : 'Create User'}
            </Button>
          </Card.Content>
        </Card>

        {/* User List Section */}
        <View style={styles.listHeader}>
          <Text
            variant="titleLarge"
            style={[styles.sectionTitle, { color: theme.colors.primary }]}
          >
            👥 User List ({filteredUsers.length})
          </Text>
          <Button
            mode="text"
            onPress={fetchUsers}
            icon="refresh"
            textColor={theme.colors.primary}
            disabled={refreshing}
            compact
          >
            Refresh
          </Button>
        </View>

        <TextInput
          placeholder="Search by phone or device ID"
          value={searchQuery}
          onChangeText={setSearchQuery}
          mode="outlined"
          style={styles.searchInput}
          left={<TextInput.Icon icon="magnify" />}
          right={
            searchQuery ? (
              <TextInput.Icon
                icon="close"
                onPress={() => setSearchQuery('')}
              />
            ) : null
          }
          outlineColor={theme.colors.outline}
          activeOutlineColor={theme.colors.primary}
        />

        {isLoading && !refreshing ? (
          <ActivityIndicator
            animating={true}
            style={styles.loader}
            color={theme.colors.primary}
            size="large"
          />
        ) : filteredUsers.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons
              name="people-outline"
              size={56}
              color={theme.colors.onSurfaceVariant}
            />
            <Text
              variant="bodyLarge"
              style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}
            >
              {searchQuery ? 'No matching users found' : 'No users found'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredUsers}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </ScrollView>

      <FAB
        icon="star"
        label="Super Claim"
        style={[styles.fab, {
          backgroundColor: theme.colors.tertiary,
          right: 16,
          bottom: 24,
          shadowColor: theme.colors.tertiary,
          elevation: 6,
        }]}
        color={theme.colors.onTertiary}
        onPress={() => navigation.navigate('SuperCliam',{ users: filteredUsers})}
        uppercase={false}
        size="medium"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  formCard: {
    borderRadius: 18,
    marginBottom: 28,
    paddingBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
    fontSize: 20,
    letterSpacing: 0.2,
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  searchInput: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  submitButton: {
    marginTop: 8,
    borderRadius: 10,
    height: 48,
  },
  buttonContent: {
    height: 48,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    padding: 4,
    marginHorizontal: 2,
    backgroundColor: '#fff',
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  phoneText: {
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 0.1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
    marginBottom: 2,
    justifyContent: 'flex-start',
  },
  chip: {
    marginRight: 6,
    marginBottom: 6,
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    paddingHorizontal: 8,
    height: 32,
    alignItems: 'center',
  },
  divider: {
    height: 1,
  },
  cardActions: {
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
    paddingBottom: 8,
    paddingTop: 0,
    gap: 8,
  },
  actionButton: {
    borderRadius: 8,
    minWidth: 90,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 16,
    opacity: 0.7,
  },
  loader: {
    marginVertical: 24,
  },
  fab: {
    position: 'absolute',
    borderRadius: 28,
    elevation: 6,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  listContainer: {
    paddingBottom: 8,
  },
});

export default CreateUserScreen;