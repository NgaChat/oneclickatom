import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, TextInput, Modal, ActivityIndicator } from 'react-native';
import { useUser } from '../../context/UserContext';
import Icon from '../../components/Icon';
import axios from 'axios';
import DeviceInfo from 'react-native-device-info';
import { refreshAccessToken } from '../../services/service';
import { FAB } from 'react-native-elements';
import LinearGradient from 'react-native-linear-gradient';

const Dashboard = ({ navigation }) => {
  const { userData, updateUserData } = useUser();
  const [data, setData] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [fabOpen, setFabOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ 
    current: 0, 
    total: 0,
    message: 'Loading...' 
  });
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
      Host: 'store.atom.com.mm',
    };
  };

  const fetchData = async () => {
    if (!userData || userData.length === 0 || isFetching.current) return;
    
    isFetching.current = true;
    setIsLoading(true);
    setLoadingProgress({
      current: 0,
      total: userData.length,
      message: 'Fetching data...'
    });

    try {
      const updatedData = await Promise.all(
        userData.map(async (item, index) => {
          try {
            setLoadingProgress(prev => ({
              ...prev,
              current: index + 1,
              message: `Fetching ${index + 1}/${userData.length}...`
            }));

            const attribute = await refreshAccessToken(item.refresh_token, item.msisdn, item.user_id);
            if (!attribute) return item;

            const headers = await getCommonHeaders(attribute.token);
            const params = { msisdn: item.msisdn, userid: item.user_id, v: '4.11' };

            const dashboardRes = await axios.get('https://store.atom.com.mm/mytmapi/v1/my/dashboard?isFirstTime=1', { params, headers });
            const profileRes = await axios.get('https://store.atom.com.mm/mytmapi/v1/my/lightweight-balance', { params, headers });
            await axios.get('https://store.atom.com.mm/mytmapi/v1/my/settings', { params, headers });
            const pointCheck = await axios.get('https://store.atom.com.mm/mytmapi/v1/my/point-system/claim-list', { params, headers });

            return {
              ...attribute,
              mainBalance: profileRes.data?.data?.attribute?.mainBalance || {
                availableTotalBalance: 0,
                currency: 'Ks',
              },
              totalPoint: dashboardRes.data.data.attribute.starInfo.totalPoint,
              points: pointCheck.data.data.attribute[0],
              label: pointCheck.data.data.attribute[0]?.label || '',
            };
          } catch (error) {
            console.error(`Error refreshing token for ${item.user_id}:`, error.message);
            return item;
          }
        })
      );

      if (JSON.stringify(updatedData) !== JSON.stringify(userData)) {
        updateUserData(updatedData);
        setData(updatedData);
      }
    } catch (error) {
      Alert.alert('Error', 'API data fetch လုပ်ရာတွင် အမှားတစ်ခုခု ဖြစ်ပွားခဲ့သည်။');
      setData(userData);
      updateUserData(userData);
    } finally {
      isFetching.current = false;
      setIsLoading(false);
      setLoadingProgress({ current: 0, total: 0, message: 'Loading...' });
    }
  };

  const claimAll = async () => {
    if (!userData.length) return;
    
    const claimableItems = userData.filter(item => item.points?.enable);
    if (claimableItems.length === 0) {
      Alert.alert('Info', 'No points available to claim!');
      return;
    }
    
    setIsLoading(true);
    setLoadingProgress({
      current: 0,
      total: claimableItems.length,
      message: `Preparing to claim ${claimableItems.length} items...`
    });

    let isAnyClaimed = false;
    try {
      const updatedData = [...userData];
      
      for (let i = 0; i < claimableItems.length; i++) {
        const item = claimableItems[i];
        try {
          setLoadingProgress({
            current: i + 1,
            total: claimableItems.length,
            message: `Claiming ${i + 1}/${claimableItems.length}...`
          });

          const attribute = await refreshAccessToken(item.refresh_token, item.msisdn, item.user_id);
          if (!attribute) continue;

          const headers = await getCommonHeaders(attribute.token);
          const params = { msisdn: item.msisdn, userid: item.user_id };

          await axios.post(
            'https://store.atom.com.mm/mytmapi/v1/my/point-system/claim', 
            { id: item.points.id }, 
            { params, headers }
          );

          const itemIndex = updatedData.findIndex(d => d.user_id === item.user_id);
          if (itemIndex !== -1) {
            updatedData[itemIndex] = { ...updatedData[itemIndex], ...attribute };
          }
          
          isAnyClaimed = true;
        } catch (error) {
          console.error(`Error claiming points for ${item.user_id}:`, error.message);
        }
      }

      updateUserData(updatedData);
      setData(updatedData);

      if (isAnyClaimed) {
        Alert.alert('Success', 'All points claimed successfully!');
        fetchData();
      }
    } catch (error) {
      console.error('Claim all error:', error);
      Alert.alert('Error', 'Failed to claim all points');
    } finally {
      setIsLoading(false);
      setLoadingProgress({ current: 0, total: 0, message: 'Loading...' });
    }
  };

  const handleDeleteItem = (itemId) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: () => {
            const updatedData = data.filter(item => item.user_id !== itemId);
            updateUserData(updatedData);
            setData(updatedData);
            Alert.alert('Success', 'Item deleted successfully.');
          },
        },
      ],
      { cancelable: false }
    );
  };

  useEffect(() => {
    fetchData();
  }, [userData]);

  const filteredData = searchText
    ? data.filter((item) => item.msisdn.toLowerCase().includes(searchText.toLowerCase()))
    : data;

  const sortedData = filteredData.sort((a, b) => {
    return (b.totalPoint || 0) - (a.totalPoint || 0);
  });

  const totalPhoneNumber = data.length;
  const totalPoints = data.reduce((sum, item) => sum + (item.totalPoint || 0), 0);
  const claimedCount = data.filter((item) => item.label === 'Claimed').length;
  const unclaimedCount = data.filter((item) => item.label === 'Claim').length;

  return (
    <LinearGradient colors={['#f5f7fa', '#e4e8f0']} style={styles.container}>
      {/* Loading Modal */}
      <Modal
        transparent={true}
        animationType="fade"
        visible={isLoading}
        onRequestClose={() => {}}>
        <View style={styles.modalBackground}>
          <View style={styles.activityIndicatorWrapper}>
            <ActivityIndicator
              animating={isLoading}
              size="large"
              color="#0a34cc"
            />
            <Text style={styles.loadingText}>{loadingProgress.message}</Text>
            {loadingProgress.total > 0 && (
              <Text style={styles.progressText}>
                {loadingProgress.current}/{loadingProgress.total}
              </Text>
            )}
          </View>
        </View>
      </Modal>

      {/* Top Summary Card */}
      <LinearGradient colors={['#0a34cc', '#1a4bdf']} style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>📊 Account Summary</Text>
        
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryItemLabel}>Phone Numbers</Text>
            <Text style={styles.summaryItemValue}>{totalPhoneNumber}</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryItemLabel}>Total Points</Text>
            <Text style={[styles.summaryItemValue, { color: '#ffd700' }]}>{totalPoints}</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryItemLabel}>Claimed</Text>
            <Text style={[styles.summaryItemValue, { color: '#4caf50' }]}>{claimedCount}</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryItemLabel}>Unclaimed</Text>
            <Text style={[styles.summaryItemValue, { color: '#f44336' }]}>{unclaimedCount}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          placeholder="Search Phone Number..."
          placeholderTextColor="#999"
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText ? (
          <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearSearch}>
            <Icon name="close" size={20} color="#999" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Main List */}
      <FlatList
        data={sortedData}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.phoneContainer}>
                <Icon name="phone" size={18} color="#0a34cc" style={styles.cardIcon} />
                <Text style={styles.phoneText}>{item?.msisdn}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDeleteItem(item.user_id)}>
                <Icon name="trash-can-outline" size={22} color="#f44336" type="MaterialCommunityIcons" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Icon name="wallet" size={16} color="#4caf50" type="MaterialCommunityIcons" />
                <Text style={styles.detailLabel}>Balance:</Text>
                <Text style={styles.detailValue}>
                  {item?.mainBalance?.availableTotalBalance} {item?.mainBalance?.currency}
                </Text>
              </View>
              
              <View style={styles.detailItem}>
                <Icon name="star" size={16} color="#ffd700" type="MaterialCommunityIcons" />
                <Text style={styles.detailLabel}>Points:</Text>
                <Text style={styles.detailValue}>{item?.totalPoint}</Text>
              </View>
            </View>
            
            <View style={styles.statusContainer}>
              <View style={[
                styles.statusBadge,
                item?.label === 'Claim' ? styles.claimBadge : styles.claimedBadge
              ]}>
                <Text style={styles.statusText}>{item?.label}</Text>
              </View>
            </View>
          </View>
        )}
      />

      {/* Floating Action Buttons */}
      <FAB
        placement="right"
        icon={{ name: 'menu', type: 'MaterialIcons', color: 'white' }}
        color="#0a34cc"
        onPress={() => setFabOpen(!fabOpen)}
        style={styles.mainFab}
      />

      {fabOpen && (
        <View style={styles.fabGroup}>
          <FAB
            title="Refresh Data"
            icon={{ name: 'refresh', color: 'white' }}
            color="#0a34cc"
            style={styles.subFab}
            onPress={fetchData}
            titleStyle={styles.fabTitle}
            size="small"
          />
          
          <FAB
            title="Transfer Points"
            icon={{ name: 'swap-horiz', color: 'white' }}
            color="#ff9800"
            style={styles.subFab}
            onPress={() => navigation.navigate('TransferPoint', { data })}
            titleStyle={styles.fabTitle}
            size="small"
          />
          
          <FAB
            title="Claim All"
            icon={{ name: 'check-circle', color: 'white' }}
            color="#4caf50"
            style={styles.subFab}
            onPress={claimAll}
            titleStyle={styles.fabTitle}
            size="small"
          />
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
  },
  headerButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  // Summary Card
  summaryCard: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
    textAlign: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  summaryItemLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginBottom: 5,
  },
  summaryItemValue: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 25,
    paddingHorizontal: 15,
    marginBottom: 15,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 45,
    fontSize: 14,
  },
  clearSearch: {
    padding: 5,
  },
  // List
  listContent: {
    paddingBottom: 80,
  },
  // Card
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    marginRight: 8,
  },
  phoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    marginLeft: 6,
    marginRight: 4,
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  claimBadge: {
    backgroundColor: '#e8f5e9',
  },
  claimedBadge: {
    backgroundColor: '#ffebee',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  // FABs
  mainFab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    elevation: 5,
  },
  fabGroup: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    alignItems: 'flex-end',
    gap: 10,
  },
  subFab: {
    elevation: 3,
    borderRadius: 25,
    height: 40,
    paddingHorizontal: 15,
  },
  fabTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 5,
  },
  // Loading modal
  modalBackground: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  activityIndicatorWrapper: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%',
    elevation: 5,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  progressText: {
    marginTop: 5,
    fontSize: 14,
    color: '#666',
  },
});

export default Dashboard;