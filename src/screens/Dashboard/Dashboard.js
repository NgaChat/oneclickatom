import React, { useCallback, useEffect, useMemo, useLayoutEffect, useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import DeviceInfo from 'react-native-device-info';
import { useUser } from '../../context/UserContext';
import { useDashboardData, useDashboardActions } from '../../hooks';
import {
  AccountCard,
  DashboardHeader,
  FloatingActionMenu,
  LoadingModal,
  SearchBar,
  SummaryCard,
  Icon,
  useHeader
} from '../../components';

const Dashboard = ({ navigation }) => {
  const { userData, updateUserData } = useUser();
  const [searchText, setSearchText] = useState('');

  useHeader(navigation, 'Dashboard')

  // Hooks with stable getHeaders
  const { data, loadingState, fetchData, setData } = useDashboardData(
    userData,
    updateUserData,

  );

  const { handleDelete, claimAllPoints } = useDashboardActions(
    data,
    updateUserData,

    setData
  );



  const filteredData = useMemo(() => {
    return searchText
      ? data.filter(item => item.msisdn.includes(searchText))
      : data;
  }, [data, searchText]);


  return (
    <LinearGradient colors={['#f5f7fa', '#e4e8f0']} style={styles.container}>
      <LoadingModal visible={loadingState.isLoading} progress={loadingState.progress} />

      <SummaryCard data={data} />

      <SearchBar
        onSearch={setSearchText}
        placeholder="Search by phone number..."
      />

      <FlatList
        data={filteredData}
        renderItem={({ item }) => (
          <AccountCard
            item={item}
            onDelete={handleDelete}
            onPress={() => navigation.navigate('AccountDetail', { account: item })}
          />
        )}
        keyExtractor={item => item.user_id}
        contentContainerStyle={styles.listContent}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={10}
      />

      <FloatingActionMenu
        onRefresh={() => fetchData(userData, false)}
        onTransfer={() => navigation.navigate('TransferPoint')}
        onClaimAll={claimAllPoints}
        toAddAccount={() => navigation.navigate('AddAccount')}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  listContent: {
    paddingBottom: 80,
  },
  headerButton: {
    paddingHorizontal: 16,
  },
});

export default Dashboard;
