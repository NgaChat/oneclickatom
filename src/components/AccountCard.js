import React, { memo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import Icon from './Icon';
import { AlertContext } from '../utils/alertUtils';
import { markSimAsSold } from '../services/service';

const AccountCard = ({ item, onDelete, onClaimPoints }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const { showAlert } = React.useContext(AlertContext);

  // Determine if claim button should be enabled
  const isClaimable = item?.label === 'Claim' && item?.points?.enable;
  const claimButtonStyle = isClaimable ? styles.claimButton : styles.claimButtonDisabled;

  const handleSellPress = () => {
    setSelectedAction('sell');
    setModalVisible(true);
  };

  const handleDeletePress = () => {
    setSelectedAction('delete');
    setModalVisible(true);
  };

  const handleClaimPress = () => {
    if (isClaimable) {
      onClaimPoints(item);
    }
  };

  const handleConfirm = () => {
    setModalVisible(false);
    if (selectedAction === 'delete') {
      onDelete(item.user_id);
      showAlert({ 
        title: '', 
        message: 'Successfully deleted!',
        type: 'success'
      });
    } else {
      markSimAsSold(item);
      showAlert({ 
        title: 'Successfully Sold', 
        message: 'See you in the sold inventory!',
        type: 'success'
      });
    }
  };

  const handleDeleteAndSell = () => {
    setModalVisible(false);
    onDelete(item.user_id);
    markSimAsSold(item);
    showAlert({ 
      title: 'Sell and Delete', 
      message: 'Sell and delete operation completed successfully!', 
      type: 'success'
    });
  };

  return (
    <View style={styles.card}>
      {/* Modal for confirmation */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedAction === 'sell' ? 'Confirm Sale' : 'Confirm Deletion'}
            </Text>
            <Text style={styles.modalText}>
              {selectedAction === 'sell' 
                ? 'Are you sure you want to sell this account?' 
                : 'Are you sure you want to delete this account?'}
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>No</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleConfirm}
              >
                <Text style={styles.buttonText}>Delete</Text>
              </TouchableOpacity>
              
              {selectedAction === 'sell' && (
                <TouchableOpacity 
                  style={[styles.modalButton, styles.deleteAndSellButton]}
                  onPress={handleDeleteAndSell}
                >
                  <Text style={styles.buttonText}>Sell & Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.cardHeader}>
        <View style={styles.phoneContainer}>
          <Icon name="phone" size={18} color="#0a34cc" style={styles.cardIcon} />
          <Text style={styles.phoneText}>{item?.msisdn}</Text>
        </View>
        <View style={styles.actionButtons}>
          {/* <TouchableOpacity onPress={handleSellPress} style={styles.sellButton}>
            <Icon name="sell" size={22} color="#4CAF50" type="MaterialIcons" />
          </TouchableOpacity> */}
          <TouchableOpacity onPress={handleDeletePress}>
            <Icon name="trash-can-outline" size={22} color="#f44336" type="MaterialCommunityIcons" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.detailRow}>
        <View style={styles.detailItem}>
          <Icon name="wallet" size={16} color="#4caf50" type="MaterialCommunityIcons" />
          <Text style={styles.detailLabel}>Balance </Text>
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

      {/* Claim button and status badge */}
      <View style={styles.bottomRow}>
        {(item?.label || item?.errorLabel === 'SESSION_EXPIRED') && (
          <View
            style={[
              styles.statusBadge,
              item.label === 'Claim' ? styles.claimBadge : 
              item.label === 'Claimed' ? styles.claimedBadge :
              styles.sessionExpiredBadge
            ]}
          >
            <Text style={styles.statusText}>
              {item.errorLabel === 'SESSION_EXPIRED' ? 'Invalid Session' : item.label}
            </Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={claimButtonStyle}
          onPress={handleClaimPress}
          disabled={!isClaimable}
        >
          <Text style={styles.claimButtonText}>Claim Points</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default memo(AccountCard);


const styles = StyleSheet.create({
  card: {
    backgroundColor: Platform.select({
      ios: 'systemBackground',
      android: 'white',
    }),
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
    color: Platform.select({
      ios: 'label',
      android: 'black',
    }),
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  sellButton: {
    marginRight: 5,
  },
  divider: {
    height: 1,
    backgroundColor: Platform.select({
      ios: 'separator',
      android: '#eee',
    }),
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
    color: Platform.select({
      ios: 'secondaryLabel',
      android: '#666',
    }),
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Platform.select({
      ios: 'label',
      android: 'black',
    }),
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
  sessionExpiredBadge: {
    backgroundColor: '#fff3e0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'black',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: 'black',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 100,
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  deleteAndSellButton: {
    backgroundColor: '#FF9800',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  claimButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimButtonDisabled: {
    backgroundColor: '#cccccc',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});