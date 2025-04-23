import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { useUser } from '../../context/UserContext';
import Icon from '../../components/Icon';
import axios from 'axios';
import DeviceInfo from 'react-native-device-info';
import { refreshAccessToken } from '../../services/service';

const Dashboard = ({ navigation }) => {
  const { userData, updateUserData } = useUser();
  const [data, setData] = useState([]);
  const isFetching = useRef(false);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Dashboard',
      headerTitleAlign: 'center',
      headerStyle: { backgroundColor: '#0a34cc' },
      headerTintColor: 'white',
      headerTitleStyle: { fontWeight: '900' },
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.navigate('AddAccount')}
        >
          <Icon name="account-multiple-plus" size={25} color="#fff" type="MaterialCommunityIcons" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const getCommonHeaders = async (token) => {
    const userAgent = 'MyTM/4.11.1/Android/35';
    const deviceName = await DeviceInfo.getDeviceName() || DeviceInfo.getModel();
    const today = new Date().toUTCString();
    return {
      Authorization: `Bearer ${token}`,
      Connection: 'Keep-Alive',
      'Accept-Encoding': 'gzip',
      'X-Server-Select': 'production',
      'User-Agent': userAgent,
      'Device-Name': deviceName,
      'If-Modified-Since': today,
      Host: 'store.atom.com.mm'
    };
  };

  const fetchData = async () => {
    if (!userData || userData.length === 0 || isFetching.current) return;
    isFetching.current = true;
    try {
      const updatedData = await Promise.all(userData.map(async (item) => {
        try {
          const attribute = await refreshAccessToken(item.refresh_token, item.msisdn, item.user_id);
          if (!attribute) return item;

          const headers = await getCommonHeaders(attribute.token);
          const params = { msisdn: item.msisdn, userid: item.user_id, v: '4.11' };

          const dashboardRes = await axios.get(
            'https://store.atom.com.mm/mytmapi/v1/my/dashboard?isFirstTime=1',
            { params, headers }
          );

          const profileRes = await axios.get(
            'https://store.atom.com.mm/mytmapi/v1/my/lightweight-balance',
            { params, headers }
          );

          await axios.get('https://store.atom.com.mm/mytmapi/v1/my/settings', { params, headers });

          const pointCheck = await axios.get(
            'https://store.atom.com.mm/mytmapi/v1/my/point-system/claim-list',
            { params, headers }
          );

          return {
            ...attribute,
            mainBalance: profileRes.data?.data?.attribute?.mainBalance || {
              availableTotalBalance: 0,
              currency: 'Ks',
            },
            totalPoint: dashboardRes.data.data.attribute.starInfo.totalPoint,
            points: pointCheck.data.data.attribute[0],
            label: pointCheck.data.data.attribute[0]?.label || ''
          };
        } catch (error) {
          console.error(`Error refreshing token for ${item.user_id}:`, error.message);
          return item;
        }
      }));

      // Avoid duplicate updates
      if (JSON.stringify(updatedData) !== JSON.stringify(userData)) {
        updateUserData(updatedData); // This should handle AsyncStorage itself
        setData(updatedData);
      }
    } catch (error) {
      Alert.alert('Error', 'API data fetch လုပ်ရာတွင် အမှားတစ်ခုခု ဖြစ်ပါသည်');
      setData(userData);
      updateUserData(userData);
    } finally {
      isFetching.current = false;
    }
  };

  const claimAll = async () => {
    if (!userData.length) return;
    let isAnyClaimed = false;
    try {
      const updatedData = await Promise.all(userData.map(async (item) => {
        try {
          if (!item.points?.enable) return item;

          const attribute = await refreshAccessToken(item.refresh_token, item.msisdn, item.user_id);
          if (!attribute) return item;

          const headers = await getCommonHeaders(attribute.token);
          const params = { msisdn: item.msisdn, userid: item.user_id };

          await axios.post(
            'https://store.atom.com.mm/mytmapi/v1/my/point-system/claim',
            { id: item.points.id },
            { params, headers }
          );

          isAnyClaimed = true;
          return { ...item, ...attribute };
        } catch (error) {
          console.error(`Error claiming points for ${item.user_id}:`, error.message);
          return item;
        }
      }));

      updateUserData(updatedData); // Handles AsyncStorage internally
      setData(updatedData);

      if (isAnyClaimed) {
        Alert.alert('Success', 'All points claimed successfully!');
        fetchData();
      }
    } catch (error) {
      console.error('Claim all error:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userData]);

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={fetchData}>
          <Text style={styles.buttonText}>Refresh</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={claimAll}>
          <Text style={styles.buttonText}>Claim All</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={data}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>📱 Phone:</Text>
              <Text style={styles.value}>{item?.msisdn}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>💰 Main Balance:</Text>
              <Text style={styles.value}>
                {item?.mainBalance?.availableTotalBalance} {item?.mainBalance?.currency}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>⭐ Total Points:</Text>
              <Text style={styles.value}>{item?.totalPoint}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>🏷️ Point Label:</Text>
              <Text style={[
                styles.value,
                item?.label === 'Claim' && { color: 'green',fontWeight:'bold' },
                item?.label === 'Claimed' && { color: 'red',fontWeight:'bold' },
              ]}
              >{item?.label}</Text>
            </View>
          </View>

        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  buttonContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 15 },
  button: { backgroundColor: '#0a34cc', padding: 10, borderRadius: 5, marginHorizontal: 10 },
  buttonText: { color: 'white', fontWeight: 'bold' },
  headerButton: { marginRight: 10, width: 50, height: 35, alignItems: 'center', justifyContent: 'center' },

  card: {
    padding: 15,
    marginBottom: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    // Android shadow
    elevation: 4,
  },
  label: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333',
    marginRight: 10
  },
  value: {
    fontSize: 15,
    color: '#0a34cc',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 6,
  },
});


export default Dashboard;
