import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function HeaderSearchBar() {
  const navigation = useNavigation<any>();

  return (
    <TouchableOpacity
      style={styles.bar}
      onPress={() => navigation.navigate('Search')}
      activeOpacity={0.7}
    >
      <Ionicons name="search" size={16} color="#a78bfa" />
      <Text style={styles.text}>Search</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 12,
    minWidth: 110,
    gap: 7,
  },
  text: {
    color: '#888',
    fontSize: 13,
  },
});