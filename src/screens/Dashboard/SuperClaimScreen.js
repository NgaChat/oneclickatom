import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Text, Button, useTheme } from 'react-native-paper';
import { useCreateUserData } from '../../hooks/';
import { LoadingModal, SummaryCard, useHeader } from '../../components';
import { getCombineData } from '../../services/service';

const SuperClaimScreen = ({ navigation }) => {
  const theme = useTheme();
  useHeader(navigation, 'SuperClaim');

  const [combinedData, setCombinedData] = useState([]);
  const { loadingState, fetchData, refreshData, claimAllPoints, isRefreshing } = useCreateUserData();

  // Load combined data from Firebase on mount
  useEffect(() => {
    const loadData = async () => {
      const data = await getCombineData();
      setCombinedData(data);
      fetchData({ data });
    };
    loadData();
    // eslint-disable-next-line
  }, []);

  // Summary calculation using the combined data
  const summary = {
    totalItems: combinedData.length,
    claimed: combinedData.filter(item => item.isClaimed).length,
    unclaimed: combinedData.filter(item => !item.isClaimed).length,
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <LoadingModal
        visible={loadingState.isLoading && !isRefreshing}
        progress={loadingState.progress}
      />

      <SummaryCard data={combinedData} summary={summary} />

      <View style={styles.buttonRow}>
        <Button
          mode="contained"
          icon="refresh"
          onPress={async () => {
            const data = await getCombineData();
            setCombinedData(data);
            refreshData({ data });
          }}
          loading={loadingState.isRefreshing}
          style={styles.actionButton}
        >
          Refresh
        </Button>
        <Button
          mode="contained"
          icon="star"
          onPress={() => claimAllPoints({ data: combinedData })}
          loading={loadingState.isClaiming}
          style={styles.actionButton}
        >
          Claim All
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32 },
  sectionCard: { marginBottom: 20, borderRadius: 12, elevation: 3 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
  actionButton: { flex: 1, borderRadius: 8 },
});

export default SuperClaimScreen;