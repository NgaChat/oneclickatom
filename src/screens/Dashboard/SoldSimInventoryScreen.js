import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, RefreshControl, View, Text, Alert } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSoldSimInventory } from '../../hooks';
import { deleteAllSqlData, getAllLocalSimData } from '../../services/service';
import {
  AccountCard,
  FloatingActionMenu,
  LoadingModal,
  SearchBar,
  SoldSimCard,
  useHeader
} from '../../components';

const BATCH_SIZE = 20;
const LOAD_MORE_THRESHOLD = 0.5;

const SoldSimInventoryScreen = ({ navigation }) => {
  const [searchText, setSearchText] = useState('');
  const [localData, setLocalData] = useState([]);
  const [isLoadingLocal, setIsLoadingLocal] = useState(false);
  
  const {
    loadingState,
    data,
    fetchData,
    refreshData,
    isRefreshing,
    deleteSimData,
 
  } = useSoldSimInventory();

  useHeader(navigation, 'Sold SIM Inventory');

  // Load local SIM data
  const loadLocalData = useCallback(async () => {
    try {
      setIsLoadingLocal(true);
      const localSimData = await getAllLocalSimData();
      setLocalData(localSimData);
    } catch (error) {
      console.error('Failed to load local SIM data:', error);
      // Alert.alert('Error', 'Failed to load local data');
    } finally {
      setIsLoadingLocal(false);
    }
  }, []);

  // Combined initial data loading
  useEffect(() => {
    const initialize = async () => {
      try {
        // await syncFirebaseToLocal();
        await fetchData();
        // await loadLocalData();
      } catch (error) {
        console.error('Initialization error:', error);
      }
    };
    initialize();
  }, [fetchData, loadLocalData]);

  // Combined refresh function
  const handleRefresh = useCallback(async () => {
    try {
      await refreshData();
      await loadLocalData();
    } catch (error) {
      console.error('Refresh error:', error);
    }
  }, [refreshData, loadLocalData]);

  // Combine and deduplicate data
  const combinedData = useMemo(() => {
    // Merge remote and local data, giving priority to remote data
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
          isLocal: true // Flag to identify local-only items
        });
      }
    });
    
    return combined;
  }, [data, localData]);

  // Filter data based on search text
  const filteredData = useMemo(() => {
    if (!searchText) return combinedData;

    const lowerCaseSearch = searchText.toLowerCase();
    return combinedData.filter(item =>
      item.msisdn.includes(searchText) ||
      (item.name && item.name.toLowerCase().includes(lowerCaseSearch)) ||
      (item.user_id && item.user_id.toString().includes(searchText))
    );
  }, [combinedData, searchText]);

  // Render each account item
  const renderItem = useCallback(({ item }) => (
    <SoldSimCard
      item={item}
      onDelete={() => deleteSimData(item.user_id)}
      isLocal={item.isLocal} // Pass local flag to card
    />
  ), [deleteSimData]);



  // Combined loading states
  const isLoading = loadingState.isLoading || isRefreshing || isLoadingLocal;



  // Delete all user data with confirmation
  const onDeleteAllUserData = useCallback(() => {
    Alert.alert(
      'Warning',
      'This will delete ALL user data (both remote and local). Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAllSqlData();
              await refreshData();
              await loadLocalData();
              Alert.alert('Success', 'All data has been deleted');
            } catch (error) {
              console.error('Deletion error:', error);
              Alert.alert('Error', 'Failed to delete all data');
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, [deleteAllSqlData, refreshData, loadLocalData]);

  return (
    <LinearGradient colors={['#f5f7fa', '#e4e8f0']} style={styles.container}>
      <LoadingModal
        visible={loadingState.isLoading && !isRefreshing}
        progress={loadingState.progress}
      />


      <SearchBar
        value={searchText}
        onSearch={setSearchText}
        placeholder="Search by phone, name, or ID..."
        containerStyle={styles.searchBar}
        onClear={() => setSearchText('')}
      />

      <FlatList
        data={filteredData}
        renderItem={renderItem}
        keyExtractor={item => `${item.user_id || 'local'}_${item.msisdn}`}
        contentContainerStyle={styles.listContent}
        initialNumToRender={BATCH_SIZE}
        maxToRenderPerBatch={BATCH_SIZE}
        windowSize={5}
        // onEndReached={handleLoadMore}
        onEndReachedThreshold={LOAD_MORE_THRESHOLD}
        removeClippedSubviews={true}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#1890ff']}
            tintColor="#1890ff"
          />
        }
        // ListFooterComponent={
        //   (isLoadingMore || isLoadingLocal) ? (
        //     <View style={styles.footerLoading}>
        //       <LoadingModal visible={true} small />
        //     </View>
        //   ) : null
        // }
        ListEmptyComponent={
          !isLoading && filteredData.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchText ? 'No matching accounts found' : 'No accounts available'}
              </Text>
            </View>
          ) : null
        }
      />

     
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  searchBar: {
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 80,
  },
  footerLoading: {
    paddingVertical: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default SoldSimInventoryScreen;