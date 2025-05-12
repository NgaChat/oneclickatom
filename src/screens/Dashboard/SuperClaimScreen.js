import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Text, Button, useTheme, Divider, ActivityIndicator, Chip } from 'react-native-paper';
import { useCreateUserData } from '../../hooks/';
import { LoadingModal, useHeader } from '../../components';
import { getCombineData } from '../../services/service';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

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
    claimed: combinedData.filter(item => item.label === 'Claimed').length,
    unclaimed: combinedData.filter(item => item.label === 'Claim').length,
    totalPoints: combinedData.reduce((sum, item) => sum + (item.totalPoint || 0), 0),
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <LoadingModal
        visible={loadingState.isLoading && !isRefreshing}
        progress={loadingState.progress}
      />

      <Card style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <View style={styles.headerRow}>
            <MaterialIcons name="stars" size={32} color={theme.colors.primary} />
            <Text variant="titleLarge" style={[styles.title, { color: theme.colors.primary }]}>
              Super Claim Summary
            </Text>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.statsRow}>
            <Chip icon="database" style={styles.chip}>
              Total: <Text style={styles.boldText}>{summary.totalItems}</Text>
            </Chip>
            <Chip icon="check-circle" style={[styles.chip, { backgroundColor: '#e3f2fd' }]}>
              Claimed: <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{summary.claimed}</Text>
            </Chip>
            <Chip icon="alert-circle" style={[styles.chip, { backgroundColor: '#ffebee' }]}>
              Unclaimed: <Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>{summary.unclaimed}</Text>
            </Chip>
            <Chip icon="star" style={styles.chip}>
              Points: <Text style={styles.boldText}>{summary.totalPoints}</Text>
            </Chip>
          </View>
        </Card.Content>
      </Card>

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
          style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
          labelStyle={{ color: theme.colors.onPrimary }}
        >
          Refresh
        </Button>
        <Button
          mode="contained"
          icon="star"
          onPress={() => claimAllPoints({ data: combinedData })}
          loading={loadingState.isClaiming}
          style={[styles.actionButton, { backgroundColor: theme.colors.tertiary }]}
          labelStyle={{ color: theme.colors.onTertiary }}
        >
          Claim All
        </Button>
      </View>

      {loadingState.isLoading && !isRefreshing ? (
        <ActivityIndicator
          animating={true}
          style={styles.loader}
          color={theme.colors.primary}
          size="large"
        />
      ) : combinedData.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="cloud-off" size={56} color={theme.colors.onSurfaceVariant} />
          <Text
            variant="bodyLarge"
            style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}
          >
            No data found
          </Text>
        </View>
      ) : (
        <Card style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 8, color: theme.colors.primary }}>
              Data Preview ({combinedData.length})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                {combinedData.slice(0, 10).map((item, idx) => (
                  <View
                    key={item.user_id || item.userId || idx}
                    style={[
                      styles.dataRow,
                      {
                        backgroundColor: item.isClaimed
                          ? '#e3fbe6'
                          : '#fff8e1',
                        borderRadius: 10,
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        marginBottom: 6,
                        alignItems: 'center',
                        minWidth: 220,
                        borderWidth: 1,
                        borderColor: item.isClaimed
                          ? theme.colors.primary
                          : theme.colors.warning || '#ffb300',
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={item.label == 'Claimed' ? 'check-circle' : 'radio-button-unchecked'}
                      size={22}
                      color={item.label == 'Claimed' ? theme.colors.primary : theme.colors.outline}
                      style={{ marginRight: 10 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.dataText, { fontWeight: 'bold', fontSize: 16 }]}>
                        {item.msisdn || item.user_id || item.userId || 'No ID'}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        <Chip
                          style={{
                            backgroundColor: item.label == 'Claimed' ? '#c8e6c9' : '#ffe0b2',
                            marginRight: 8,
                            height: 26,
                          }}
                          textStyle={{
                            color: item.label == 'Claimed' ? theme.colors.primary : theme.colors.error,
                            fontWeight: 'bold',
                          }}
                          icon={item.label == 'Claimed' ? 'check' : 'timer-sand'}
                          compact
                        >
                          {item.label}
                        </Chip>
                        <Text style={{ color: theme.colors.outline, fontSize: 13 }}>
                          • {item.totalPoint || 0} pts
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
                {combinedData.length > 10 && (
                  <Text style={styles.moreText}>...and {combinedData.length - 10} more</Text>
                )}
              </View>
            </ScrollView>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32 },
  sectionCard: {
    marginBottom: 20,
    borderRadius: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 20,
    marginLeft: 6,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
    marginBottom: 2,
    alignItems: 'center',
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
  boldText: {
    fontWeight: 'bold',
    marginLeft: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    elevation: 2,
    marginHorizontal: 2,
    height: 48,
    justifyContent: 'center',
  },
  loader: {
    marginVertical: 24,
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
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dataText: {
    fontSize: 15,
    color: '#333',
  },
  moreText: {
    marginTop: 6,
    color: '#888',
    fontStyle: 'italic',
    fontSize: 13,
  },
});

export default SuperClaimScreen;