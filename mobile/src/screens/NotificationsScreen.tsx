import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function NotificationsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>No notifications yet</Text>
      <Text style={styles.subtext}>Likes and comments will show up here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a', justifyContent: 'center', alignItems: 'center' },
  text: { color: '#a78bfa', fontSize: 16, fontWeight: '600' },
  subtext: { color: '#666', marginTop: 8 },
});