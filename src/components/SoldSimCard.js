import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';

// Enhanced Date Utilities with DD/MM/YY support
const parseCustomDate = (dateString) => {
  if (!dateString) return null;

  // Handle "DD/MM/YY" format (e.g., "15/05/25")
  if (typeof dateString === 'string' && dateString.match(/^\d{2}\/\d{2}\/\d{2}$/)) {
    const [day, month, year] = dateString.split('/');
    // Convert 2-digit year to 4-digit (assuming 2000s)
    const fullYear = 2000 + parseInt(year);
    return new Date(fullYear, parseInt(month) - 1, parseInt(day));
  }

  // Fallback to default Date parsing
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
};

const isValidDate = (dateString) => {
  return !!parseCustomDate(dateString);
};

const formatDate = (dateString) => {
  const date = parseCustomDate(dateString);
  if (!date) return 'N/A';
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const timeSince = (dateString) => {
  const date = parseCustomDate(dateString);
  if (!date) return 'N/A';
  
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 0) return 'in the future';
  if (seconds < 60) return 'just now';
  
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return interval === 1 ? `${interval} ${unit} ago` : `${interval} ${unit}s ago`;
    }
  }
  
  return 'just now';
};

const getExpirationStatus = (expireAt) => {
  const date = parseCustomDate(expireAt);
  if (!date) return { status: 'unknown', color: '#adb5bd', textColor: '#495057' };
  
  const now = new Date();
  const daysRemaining = Math.floor((date - now) / (1000 * 60 * 60 * 24));
  
  if (daysRemaining < 0) {
    return { status: 'expired', color: '#ff6b6b', textColor: '#fff' };
  } else if (daysRemaining <= 1) {
    return { status: 'expiring today!', color: '#ff6b6b', textColor: '#fff' };
  } else if (daysRemaining <= 3) {
    return { status: `expiring in ${daysRemaining} days`, color: '#ff922b', textColor: '#fff' };
  } else if (daysRemaining <= 7) {
    return { status: `expiring in ${daysRemaining} days`, color: '#fcc419', textColor: '#495057' };
  } else {
    return { status: 'active', color: '#40c057', textColor: '#fff' };
  }
};

const SoldSimCard = ({ item, onDelete, onViewDetails }) => {
  const handleDelete = () => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this sold SIM record?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.user_id) }
      ]
    );
  };

  const renderLoyaltyBadge = () => {
    if (!item.loyaltyData || item.loyaltyData.length === 0) {
      return (
        <View style={[styles.badge, { backgroundColor: '#e9ecef' }]}>
          <Text style={[styles.badgeText, { color: '#495057' }]}>No Loyalty Data</Text>
        </View>
      );
    }

    const loyaltyItem = item.loyaltyData[0];
    const { status, color, textColor } = getExpirationStatus(loyaltyItem.expireAt);
    const iconName = status.includes('expired') ? 'clock-alert-outline' 
                  : status.includes('expiring') ? 'clock-alert' 
                  : 'clock-check-outline';

    return (
      <View style={[styles.badge, { backgroundColor: color }]}>
        <Icon 
          name={iconName}
          size={16} 
          color={textColor} 
          style={styles.badgeIcon}
        />
        <Text style={[styles.badgeText, { color: textColor }]}>
          {status.toUpperCase()}
        </Text>
      </View>
    );
  };

  const renderLoyaltyDetails = () => {
    if (!item.loyaltyData || item.loyaltyData.length === 0) return null;

    const loyaltyItem = item.loyaltyData[0];
    
    const expiryDate = parseCustomDate(loyaltyItem.expireAt);
    const { status, color } = expiryDate ? getExpirationStatus(loyaltyItem.expireAt) : 
      { status: 'invalid date', color: '#adb5bd' };

    return (
      <View style={[
        styles.loyaltyDetails,
        status.includes('expir') && { backgroundColor: `${color}20`, borderColor: `${color}50` }
      ]}>
        <View style={styles.loyaltyHeader}>
          <Text style={styles.loyaltyTitle}>{loyaltyItem.title}</Text>
          {status.includes('expir') && (
            <Icon 
              name="alert-circle" 
              size={18} 
              color={color} 
              style={styles.warningIcon}
            />
          )}
        </View>
        
        <View style={styles.progressContainer}>
          <Text style={styles.progressLabel}>
            Progress: {loyaltyItem.remainingAmount || 0}/{loyaltyItem.totalAmount || 0} {loyaltyItem.remainingUnit || ''}
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { 
                  width: `${Math.min(100, ((loyaltyItem.remainingAmount || 0) / (loyaltyItem.totalAmount || 1)) * 100)}%`,
                  backgroundColor: color
                }
              ]}
            />
          </View>
        </View>
        
        <View style={styles.expiryRow}>
          <Icon name="clock-outline" size={14} color="#495057" />
          <Text style={styles.expiryText}>
            {expiryDate ? (
              <>
                {status.includes('expired') ? 'Expired' : 'Expires'}: {formatDate(loyaltyItem.expireAt)} • {timeSince(loyaltyItem.expireAt)}
              </>
            ) : 'Invalid date format'}
          </Text>
        </View>
      </View>
    );
  };


  return (
    <View style={styles.cardContainer}>
      <LinearGradient
        colors={['#f8f9fa', '#e9ecef']}
        style={[
          styles.card,
          item.loyaltyData?.[0]?.expireAt && 
          parseCustomDate(item.loyaltyData[0].expireAt) < new Date() && 
          styles.expiredCard
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.phoneContainer}>
            <Icon name="sim" size={20} color="#495057" style={styles.simIcon} />
            <Text style={styles.phoneNumber}>{item.msisdn || 'N/A'}</Text>
          </View>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              onPress={() => onViewDetails(item)} 
              style={styles.detailsButton}
            >
              <Icon name="eye-outline" size={20} color="#228be6" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
              <Icon name="trash-can-outline" size={20} color="#fa5252" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            
            
            <View style={styles.detailItem}>
              <Icon name="calendar" size={16} color="#7950f2" />
              <Text style={styles.detailLabel}>Sold On:</Text>
              <Text style={styles.detailValue}>
                {item.sale_details?.sale_date ? formatDate(item.sale_details.sale_date) : 'N/A'}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Icon name="star" size={16} color="#fab005" />
              <Text style={styles.detailLabel}>Points:</Text>
              <Text style={styles.detailValue}>{item.totalPoint?.toLocaleString() || 0}</Text>
            </View>
            
            <View style={styles.detailItem}>
              <Icon name="wallet" size={16} color="#fd7e14" />
              <Text style={styles.detailLabel}>Balance:</Text>
              <Text style={styles.detailValue}>
                {item.mainBalance?.availableTotalBalance?.toLocaleString() || 0} {item.mainBalance?.currency || 'Ks'}
              </Text>
            </View>
          </View>
        </View>

        {renderLoyaltyBadge()}
        {renderLoyaltyDetails()}
      </LinearGradient>
    </View>
  );
};

// ... [keep your existing styles unchanged]


const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
  },
  card: {
    padding: 16,
  },
  expiredCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b6b',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  simIcon: {
    marginRight: 8,
  },
  phoneNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsButton: {
    marginRight: 12,
    padding: 4,
  },
  deleteButton: {
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginVertical: 8,
  },
  detailsContainer: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#495057',
    marginLeft: 6,
    marginRight: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  badgeIcon: {
    marginRight: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loyaltyDetails: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  loyaltyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  loyaltyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
  },
  warningIcon: {
    marginLeft: 8,
  },
  progressContainer: {
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 13,
    color: '#495057',
    marginBottom: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expiryText: {
    fontSize: 12,
    color: '#495057',
    marginLeft: 4,
  },
});

export default SoldSimCard;