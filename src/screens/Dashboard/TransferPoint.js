import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import CheckBox from '@react-native-community/checkbox';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useHeader } from '../../components';
import { getCommonHeaders, getAllLocalSimData } from '../../services/service';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';

const TransferPoint = ({ navigation, route }) => {
  const {
    data,
    fetchData,
    loadMore,
    refreshData,
    hasMore,
    isRefreshing,
    isLoadingMore,
    loadingState,
    fetchAllData,
    fetchSingleItem
  } = useDashboardData();

  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [localData, setLocalData] = useState([]);
  const [isLoadingLocal, setIsLoadingLocal] = useState(false);

  // Load local SIM data
  const loadLocalData = useCallback(async () => {
    try {
      setIsLoadingLocal(true);
      const localSimData = await getAllLocalSimData();
      setLocalData(localSimData);
    } catch (error) {
      console.error('Failed to load local SIM data:', error);
    } finally {
      setIsLoadingLocal(false);
    }
  }, []);

  // Fetch initial data on mount
  useEffect(() => {
    const initialize = async () => {
      await fetchData();
      await loadLocalData();
    };
    initialize();
  }, [fetchData, loadLocalData]);

  useFocusEffect(
    useCallback(() => {
      if (route.params?.msisdn) {
        fetchSingleItem(route.params.msisdn);
      }
    }, [route.params?.msisdn, fetchSingleItem])
  );

  useHeader(navigation, 'Transfer Points');

  // Toggle show all and refresh data
  const toggleShowAll = async () => {
    const newShowAll = !showAll;
    setShowAll(newShowAll);

    if (newShowAll) {
      await fetchAllData();
    } else {
      await refreshData();
    }
    await loadLocalData();
  };

  // Combine remote and local data
  const combinedData = useMemo(() => {
    const remoteItems = data || [];
    const localItems = localData || [];
    
    const combined = [...remoteItems];
    
    localItems.forEach(localItem => {
      const exists = remoteItems.some(remoteItem => 
        remoteItem.msisdn === localItem.msisdn
      );
      if (!exists) {
        combined.push({
          ...localItem,
          isLocal: true
        });
      }
    });
    
    return combined;
  }, [data, localData]);

  // Filter data based on search query and showAll status
  const filteredData = useMemo(() => {
    const lowerCaseSearch = searchQuery.toLowerCase();
    
    return combinedData.filter(item => {
      const matchesSearch = searchQuery === '' || 
        item.msisdn.includes(searchQuery) || 
        (item.name && item.name.toLowerCase().includes(lowerCaseSearch)) ||
        (item.user_id && item.user_id.toString().includes(searchQuery));
      
      return showAll ? matchesSearch : (matchesSearch && (item.totalPoint || 0) > 0);
    });
  }, [combinedData, searchQuery, showAll]);

  const handleTransfer = async () => {
    if (selectedItem === null) {
      Alert.alert('Error', 'Please select an account to transfer from');
      return;
    }

    if (!phone || !amount) {
      Alert.alert('Error', 'Please enter both phone number and amount');
      return;
    }

    if (isNaN(amount)) {
      Alert.alert('Error', 'Please enter a valid number for amount');
      return;
    }

    try {
      const selectedItemData = filteredData[selectedItem];
      
      if (selectedItemData.isLocal) {
        Alert.alert('Error', 'Cannot transfer from local-only accounts');
        return;
      }

      const headers = await getCommonHeaders(selectedItemData.access_token);
      const params = { 
        msisdn: selectedItemData.msisdn, 
        userid: selectedItemData.user_id 
      };

      const body = {
        transfereeId: phone,
        amount: Number(amount),
      };

      const transfer = await axios.post(
        'https://store.atom.com.mm/mytmapi/v1/my/point-system/point-transfer', 
        body,
        { params, headers }
      );

      const result = transfer.data.data.attribute;
      
      if (result.response.message === 'OTP needed!') {
        navigation.navigate('TransferOtp', { data: result, item: selectedItemData });
      } else {
        Alert.alert('Success', 'Points transferred successfully!');
        setPhone('');
        setAmount('');
        setSelectedItem(null);
        refreshData();
      }
    } catch (error) {
      console.error('Transfer error:', error);
      const errorMsg = error.response?.data?.errors?.message || error.message;
      Alert.alert('Error', errorMsg || 'Failed to transfer points');
    }
  };

  const toggleSelectItem = (index) => {
    setSelectedItem(selectedItem === index ? null : index);
  };

  const isTransferDisabled = !phone || !amount || selectedItem === null || loadingState.isLoading;

  return (
    <LinearGradient colors={['#f5f7fa', '#e4e8f0']} style={styles.container}>
      {/* Transfer Form */}
      <View style={styles.formCard}>
        <View style={styles.inputContainer}>
          <Icon name="phone" size={20} color="#0a34cc" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Recipient phone number"
            placeholderTextColor="#999"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            editable={!loadingState.isLoading}
          />
        </View>

        <View style={styles.inputContainer}>
          <Icon name="star" size={20} color="#0a34cc" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Points amount"
            placeholderTextColor="#999"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            editable={!loadingState.isLoading}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, isTransferDisabled && styles.buttonDisabled]}
          onPress={handleTransfer}
          disabled={isTransferDisabled}
        >
          <LinearGradient
            colors={isTransferDisabled ? ['#ccc', '#aaa'] : ['#0a34cc', '#1a4bdf']}
            style={styles.buttonGradient}
          >
            {loadingState.isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text style={styles.buttonText}>Transfer Points</Text>
                <Icon name="arrow-forward" size={20} color="white" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchInputContainer}>
        <Icon name="search" size={20} color="#0a34cc" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search accounts..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Accounts List Header */}
      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>
          {showAll ? 'All Accounts' : 'Accounts With Points'} ({filteredData.length})
        </Text>
        <TouchableOpacity onPress={toggleShowAll} style={styles.showAllButton}>
          <Text style={styles.showAllButtonText}>
            {showAll ? 'Show Less' : 'Show All'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Accounts List */}
      {(loadingState.isLoading || isLoadingLocal) && !isRefreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0a34cc" />
          <Text style={styles.loadingText}>{loadingState.progress?.message || 'Loading accounts...'}</Text>
        </View>
      ) : filteredData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="info-outline" size={40} color="#999" />
          <Text style={styles.emptyText}>
            {searchQuery ? 'No matching accounts found' : showAll ? 'No accounts available' : 'No accounts with points'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item, index) => `${item.user_id || 'local'}_${index}`}
          contentContainerStyle={styles.listContent}
          onEndReached={() => hasMore && !isLoadingMore && loadMore()}
          onEndReachedThreshold={0.5}
          refreshing={isRefreshing}
          onRefresh={() => {
            refreshData();
            loadLocalData();
          }}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator size="small" color="#0a34cc" />
              </View>
            ) : null
          }
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={[
                styles.card,
                selectedItem === index && styles.selectedCard,
                (item.totalPoint || 0) === 0 && styles.zeroPointsCard,
                item.isLocal && styles.localCard
              ]}
              onPress={() => (item.totalPoint || 0) > 0 && !item.isLocal && toggleSelectItem(index)}
              disabled={(item.totalPoint || 0) === 0 || item.isLocal}
            >
              <View style={styles.cardHeader}>
                <CheckBox
                  value={selectedItem === index}
                  onValueChange={() => (item.totalPoint || 0) > 0 && !item.isLocal && toggleSelectItem(index)}
                  disabled={(item.totalPoint || 0) === 0 || item.isLocal}
                  boxType="circle"
                  tintColor={(item.totalPoint || 0) === 0 || item.isLocal ? "#ccc" : "#0a34cc"}
                  onCheckColor="#0a34cc"
                  onFillColor="#0a34cc"
                  onTintColor="#0a34cc"
                  style={styles.checkbox}
                />
                <View style={styles.phoneContainer}>
                  <Icon 
                    name="sim-card" 
                    size={18} 
                    color={item.isLocal ? "#888" : ((item.totalPoint || 0) === 0 ? "#ccc" : "#0a34cc")} 
                  />
                  <Text style={[
                    styles.phoneText, 
                    (item.totalPoint || 0) === 0 && styles.zeroPointsText,
                    item.isLocal && styles.localText
                  ]}>
                    {item.msisdn} {item.isLocal && '(Local)'}
                  </Text>
                </View>
              </View>

              <View style={styles.cardDetails}>
                <View style={styles.detailRow}>
                  <Icon name="account-balance-wallet" size={16} color="#4caf50" />
                  <Text style={styles.detailLabel}>Balance:</Text>
                  <Text style={styles.detailValue}>
                    {item.mainBalance?.availableTotalBalance || 0} {item.mainBalance?.currency || 'Ks'}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Icon 
                    name="star" 
                    size={16} 
                    color={item.isLocal ? "#888" : ((item.totalPoint || 0) === 0 ? "#ccc" : "#ffd700")} 
                  />
                  <Text style={[
                    styles.detailValue, 
                    { color: item.isLocal ? "#888" : ((item.totalPoint || 0) === 0 ? "#999" : "#0a34cc") }
                  ]}>
                    {item.totalPoint || 0}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 14,
    color: '#333',
  },
  button: {
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 10,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
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
    color: '#333',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    marginLeft: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  showAllButton: {
    backgroundColor: '#0a34cc',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
  },
  showAllButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#eee',
  },
  selectedCard: {
    borderColor: '#0a34cc',
    backgroundColor: 'rgba(10, 52, 204, 0.05)',
  },
  zeroPointsCard: {
    opacity: 0.7,
  },
  localCard: {
    borderColor: '#888',
    backgroundColor: 'rgba(136, 136, 136, 0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  zeroPointsText: {
    color: '#999',
  },
  localText: {
    color: '#888',
  },
  cardDetails: {
    marginLeft: 30,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    marginRight: 5,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  footerLoading: {
    paddingVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default TransferPoint;