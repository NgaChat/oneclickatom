import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import CheckBox from '@react-native-community/checkbox';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

const TransferPoint = ({ route, navigation }) => {
  const { data } = route.params;
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Transfer Points',
      headerTitleAlign: 'center',
      headerStyle: { 
        backgroundColor: '#0a34cc',
        elevation: 0,
        shadowOpacity: 0,
      },
      headerTintColor: 'white',
      headerTitleStyle: { 
        fontWeight: 'bold',
        fontSize: 18,
      },
    });
  }, [navigation]);

  const handleTransfer = () => {
    if (selectedItem !== null) {
      const selectedItemData = sortedData[selectedItem];
      console.log('Selected item for transfer:', selectedItemData);
    } else {
      console.log('No item selected');
    }
  };

  const toggleSelectItem = (index) => {
    setSelectedItem(selectedItem === index ? null : index);
  };

  const sortedData = data
    .sort((a, b) => Number(b.totalPoint) - Number(a.totalPoint));

  const isTransferDisabled = !phone || !amount || selectedItem === null;

  return (
    <LinearGradient colors={['#f5f7fa', '#e4e8f0']} style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Icon name="swap-horiz" size={30} color="#0a34cc" style={styles.headerIcon} />
        <Text style={styles.title}>Transfer Points</Text>
        <Text style={styles.subtitle}>Select an account to transfer from</Text>
      </View>

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
            <Text style={styles.buttonText}>Transfer Points</Text>
            <Icon name="arrow-forward" size={20} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Accounts List */}
      <Text style={styles.sectionTitle}>Available Accounts</Text>
      <FlatList
        data={sortedData}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <TouchableOpacity 
            style={[
              styles.card,
              selectedItem === index && styles.selectedCard
            ]}
            onPress={() => toggleSelectItem(index)}
          >
            <View style={styles.cardHeader}>
              <CheckBox
                value={selectedItem === index}
                onValueChange={() => toggleSelectItem(index)}
                boxType="circle"
                tintColor="#0a34cc"
                onCheckColor="#0a34cc"
                onFillColor="#0a34cc"
                onTintColor="#0a34cc"
                style={styles.checkbox}
              />
              <View style={styles.phoneContainer}>
                <Icon name="sim-card" size={18} color="#0a34cc" />
                <Text style={styles.phoneText}>{item?.msisdn}</Text>
              </View>
            </View>
            
            <View style={styles.cardDetails}>
              <View style={styles.detailRow}>
                <Icon name="account-balance-wallet" size={16} color="#4caf50" />
                <Text style={styles.detailLabel}>Balance:</Text>
                <Text style={styles.detailValue}>
                  {item?.mainBalance?.availableTotalBalance} {item?.mainBalance?.currency}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Icon name="star" size={16} color="#ffd700" />
                <Text style={styles.detailLabel}>Points:</Text>
                <Text style={[styles.detailValue, { color: '#0a34cc' }]}>
                  {item?.totalPoint}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerIcon: {
    backgroundColor: 'rgba(10, 52, 204, 0.1)',
    padding: 15,
    borderRadius: 50,
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0a34cc',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
    marginLeft: 5,
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
});

export default TransferPoint;