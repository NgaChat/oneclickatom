// components/SummaryCard.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';

const SummaryCard = ({ data }) => {
  // Calculate summary data
  const summary = {
    totalPhoneNumber: data.length,
    totalPoints: data.reduce((sum, item) => sum + (item.totalPoint || 0), 0),
    claimedCount: data.filter(item => item.label === 'Claimed').length,
    unclaimedCount: data.filter(item => item.label === 'Claim').length
  };

  return (
    <LinearGradient colors={['#0a34cc', '#1a4bdf']} style={styles.card}>
      <Text style={styles.title}>📊 Account Summary</Text>
      
      <View style={styles.grid}>
        {/* Phone Numbers */}
        <View style={styles.item}>
          <Text style={styles.label}>Phone Numbers</Text>
          <Text style={styles.value}>{summary.totalPhoneNumber}</Text>
        </View>

        {/* Total Points */}
        <View style={styles.item}>
          <Text style={styles.label}>Total Points</Text>
          <Text style={[styles.value, { color: '#ffd700' }]}>{summary.totalPoints}</Text>
        </View>

        {/* Claimed */}
        <View style={styles.item}>
          <Text style={styles.label}>Claimed</Text>
          <Text style={[styles.value, { color: '#4caf50' }]}>{summary.claimedCount}</Text>
        </View>

        {/* Unclaimed */}
        <View style={styles.item}>
          <Text style={styles.label}>Unclaimed</Text>
          <Text style={[styles.value, { color: '#f44336' }]}>{summary.unclaimedCount}</Text>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  item: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  label: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginBottom: 5,
  },
  value: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default SummaryCard;