import React, { createContext, useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';

const NetworkContext = createContext({ isConnected: true });

export function useNetwork() {
  return useContext(NetworkContext);
}

export function NetworkProvider({ children }) {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? true);
    });
    return unsubscribe;
  }, []);

  return (
    <NetworkContext.Provider value={{ isConnected }}>
      {children}
      {!isConnected && <OfflineBanner />}
    </NetworkContext.Provider>
  );
}

function OfflineBanner() {
  return (
    <View style={styles.banner} accessibilityRole="alert" accessibilityLabel="You are offline">
      <Ionicons name="cloud-offline-outline" size={16} color="#FFF" />
      <Text style={styles.text}>No internet connection</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    zIndex: 9999,
  },
  text: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
