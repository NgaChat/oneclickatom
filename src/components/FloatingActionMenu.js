import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { FAB } from 'react-native-elements';
import { useAuth } from '../context/AuthContext';

const FloatingActionMenu = ({
  onRefresh,
  onTransfer,
  onClaimAll,
  toAddAccount,
  onDeleteAllUserData,
  onCreateUser,
  onShowAll,
  toSoldSimInventory,
}) => {
  const [fabOpen, setFabOpen] = useState(false);
  const { logout } = useAuth();

  const actions = [
    { title: 'Add SIM', icon: 'sim-card-download', color: '#4caf50', key: 'add' },
    { title: 'Refresh', icon: 'refresh', color: '#0a34cc', key: 'refresh' },
    { title: 'Transfer', icon: 'swap-horiz', color: '#ff9800', key: 'transfer' },
    { title: 'Claim All', icon: 'check-circle', color: '#4caf50', key: 'claim' },
    { title: 'Show All', icon: 'menu-open', color: '#4caf50', key: 'show' },
    // { title: 'Inventory', icon: 'inventory', color: '#4caf50', key: 'inventory' },
    { title: 'Logout', icon: 'logout', color: '#f44336', key: 'logout' },
  ];

  const animations = useRef(actions.map(() => ({
    translateX: new Animated.Value(100),
    opacity: new Animated.Value(0),
  }))).current;

  const toggleFAB = () => {
    if (fabOpen) {
      // Close
      Animated.stagger(40, animations.map(anim =>
        Animated.parallel([
          Animated.timing(anim.translateX, {
            toValue: 100,
            duration: 200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim.opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ])
      ).reverse()).start(() => setFabOpen(false));
    } else {
      // Open
      setFabOpen(true);
      Animated.stagger(50, animations.map(anim =>
        Animated.parallel([
          Animated.timing(anim.translateX, {
            toValue: 0,
            duration: 300,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim.opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      )).start();
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const handlers = {
    add: toAddAccount,
    refresh: onRefresh,
    transfer: onTransfer,
    claim: onClaimAll,
    show: onShowAll,
    inventory: toSoldSimInventory,
    logout: handleLogout,
  };

  return (
    <View style={styles.container}>
      {fabOpen && (
        <View style={styles.fabGroup}>
          {actions.map((action, index) => (
            <Animated.View
              key={action.key}
              style={[
                styles.animatedFab,
                {
                  opacity: animations[index].opacity,
                  transform: [{ translateX: animations[index].translateX }],
                },
              ]}
            >
              <FAB
                title={action.title}
                icon={{ name: action.icon, color: 'white' }}
                color={action.color}
                onPress={() => {
                  toggleFAB();
                  handlers[action.key]?.();
                }}
                size="small"
                buttonStyle={styles.fabButton}
                containerStyle={styles.fabContainer}
              />
            </Animated.View>
          ))}
        </View>
      )}
      <FAB
        placement="right"
        icon={{ name: 'menu', color: 'white' }}
        color="#0a34cc"
        onPress={toggleFAB}
        style={styles.mainFab}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    alignItems: 'flex-end',
    zIndex: 10,
  },
  mainFab: {
    zIndex: 20,
  },
  fabGroup: {
    marginBottom: 70,
    alignItems: 'flex-end',
  },
  animatedFab: {
    marginBottom: 8,
  },
  fabContainer: {
    width: 180, // Consistent width
  },
  fabButton: {
    width: '100%',
    justifyContent: 'flex-start',
    paddingLeft: 10,
  },
});

export default FloatingActionMenu;
