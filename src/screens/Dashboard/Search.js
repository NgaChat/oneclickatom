import React, { useState, useEffect } from 'react';
import { View, TextInput, FlatList, Text, StyleSheet } from 'react-native';

const SearchPage = ({ route }) => {
  const { data } = route.params; // Dashboard ကနေ data ကို ပေးပို့လာမယ်
  const [searchText, setSearchText] = useState('');
  const [filteredData, setFilteredData] = useState([]);

  useEffect(() => {
    if (searchText === '') {
      setFilteredData([]); // searchText မရှိရင် မပြ
    } else {
      const filtered = data.filter(item =>
        item.msisdn.includes(searchText)
      );
      setFilteredData(filtered);
    }
  }, [searchText, data]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Search by phone number"
        value={searchText}
        onChangeText={setSearchText}
      />

      <FlatList
        data={filteredData}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>Phone: {item.msisdn}</Text>
            <Text>Balance: {item.mainBalance?.availableTotalBalance} {item.mainBalance?.currency}</Text>
            <Text>Points: {item.totalPoint}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  card: {
    padding: 15,
    backgroundColor: '#f9f9f9',
    marginBottom: 10,
    borderRadius: 8,
  },
});

export default SearchPage;
