import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function RewardsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Rewards</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  text: { fontSize: 20, color: '#111827', fontWeight: '600' },
});
