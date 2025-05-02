import React, { useState } from 'react';
import { FAB } from 'react-native-elements';
import { View, StyleSheet, ToastAndroid } from 'react-native';

const FloatingActionMenu = ({ onRefresh, onTransfer, onClaimAll, toAddAccount }) => {
  const [fabOpen, setFabOpen] = useState(false);

  return (
    <>
      <FAB
        placement="right"
        icon={{ name: 'menu', color: 'white' }}
        color="#0a34cc"
        onPress={() => setFabOpen(!fabOpen)}
        style={styles.mainFab}
      />

      {fabOpen && (
        <View style={styles.fabGroup}>
          <FAB
            title="Add SIM"
            icon={{ name: 'sim-card-download', color: 'white' }}
            color="#4caf50"
            onPress={toAddAccount}
            size="small"
          />
          <FAB
            title="Refresh"
            icon={{ name: 'refresh', color: 'white' }}
            color="#0a34cc"
            onPress={onRefresh}
            size="small"
          />
          <FAB
            title="Transfer"
            icon={{ name: 'swap-horiz', color: 'white' }}
            color="#ff9800"
            onPress={onTransfer}
            size="small"
          />
          <FAB
            title="Claim All"
            icon={{ name: 'check-circle', color: 'white' }}
            color="#4caf50"
            onPress={onClaimAll}
            size="small"
          />

        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  mainFab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
  },
  fabGroup: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    gap: 12,
  },
});

export default FloatingActionMenu;