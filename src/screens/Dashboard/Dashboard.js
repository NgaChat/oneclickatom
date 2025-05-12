import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, RefreshControl, View, Text, Alert } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useDashboardData } from '../../hooks';
import { deleteAllSqlData, getAllLocalSimData } from '../../services/service';
import {
  AccountCard,
  FloatingActionMenu,
  LoadingModal,
  SearchBar,
  SummaryCard,
  useHeader
} from '../../components';
import { useAuth } from '../../context/AuthContext';

const BATCH_SIZE = 20;
const LOAD_MORE_THRESHOLD = 0.5;

const Dashboard = ({ navigation }) => {
  const [searchText, setSearchText] = useState('');
  const [localData, setLocalData] = useState([]);
  const [isLoadingLocal, setIsLoadingLocal] = useState(false);
  const { checkAuthState } = useAuth();
  
  const {
    loadingState,
    data,
    fetchData,
    loadMore,
    refreshData,
    hasMore,
    isRefreshing,
    isLoadingMore,
    deleteSimData,
    claimAllPoints,
    fetchAllData,
    claimSinglePoints
  } = useDashboardData();

  useHeader(navigation, 'Dashboard');


  useEffect(() => {
    checkAuthState();
  }, []);
  // Combined initial data loading
  useEffect(() => {
    const initialize = async () => {
      try {
        await fetchData();
        
      } catch (error) {
        console.error('Initialization error:', error);
      }
    };
    initialize();
  }, [fetchData]);

  // Combined refresh function
  const handleRefresh = useCallback(async () => {
    try {
      await refreshData();
    } catch (error) {
      console.error('Refresh error:', error);
    }
  }, [refreshData]);



  // Filter data based on search text
  const filteredData = useMemo(() => {
    if (!searchText) return data;

    const lowerCaseSearch = searchText.toLowerCase();
    return data.filter(item =>
      item.msisdn.includes(searchText) ||
      (item.name && item.name.toLowerCase().includes(lowerCaseSearch)) ||
      (item.user_id && item.user_id.toString().includes(searchText))
    );
  }, [data, searchText]);

  // Render each account item
  const renderItem = useCallback(({ item }) => (
    <AccountCard
      item={item}
      onDelete={() => deleteSimData(item.user_id)}
      isLocal={item.isLocal} // Pass local flag to card
      onClaimPoints={async () => {
        try {
          await claimSinglePoints(item);
        } catch (error) {
          console.error('Claim points error:', error);
        }
      }}
    />
  ), [deleteSimData]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoadingMore && !loadingState.isLoading) {
      loadMore();
    }
  }, [hasMore, isLoadingMore, loadMore, loadingState]);

  // Combined loading states
  const isLoading = loadingState.isLoading || isRefreshing || isLoadingLocal;

  const handleShowAll = useCallback(async () => {
    try {
      await fetchAllData();
    } catch (error) {
      console.error('Error showing all accounts:', error);
      Alert.alert('Error', 'Failed to load all accounts');
    }
  }, [fetchAllData]);

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
  }, [deleteAllSqlData, refreshData, ]);

  return (
    <LinearGradient colors={['#f5f7fa', '#e4e8f0']} style={styles.container}>
      <LoadingModal
        visible={loadingState.isLoading && !isRefreshing}
        progress={loadingState.progress}
      />

      <SummaryCard data={filteredData} />

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
        onEndReached={handleLoadMore}
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
        ListFooterComponent={
          (isLoadingMore || isLoadingLocal) ? (
            <View style={styles.footerLoading}>
              <LoadingModal visible={true} small />
            </View>
          ) : null
        }
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

      <FloatingActionMenu
        toAddAccount={() => navigation.navigate('AddAccount')}
        onClaimAll={() => claimAllPoints()}
        onRefresh={handleRefresh}
        onTransfer={() => navigation.navigate('TransferPoint')}
        onDeleteAllUserData={onDeleteAllUserData}
        onShowAll={handleShowAll}
        onCreateUser={() => navigation.navigate('CreateUser')}
        toSoldSimInventory={() => navigation.navigate('SoldSimInventory')}
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

export default Dashboard;