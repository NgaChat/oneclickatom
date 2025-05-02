import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from './Icon';

const AccountCard = ({ item, onDelete }) => {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.phoneContainer}>
          <Icon name="phone" size={18} color="#0a34cc" style={styles.cardIcon} />
          <Text style={styles.phoneText}>{item?.msisdn}</Text>
        </View>
        <TouchableOpacity onPress={() => onDelete(item.user_id)}>
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
          <Text style={styles.detailValue}>{item?.totalPoint || 0}</Text>
        </View>
      </View>
      
      {item?.label && (
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusBadge,
            item.label === 'Claim' ? styles.claimBadge : styles.claimedBadge
          ]}>
            <Text style={styles.statusText}>{item.label}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
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
});

export default AccountCard;