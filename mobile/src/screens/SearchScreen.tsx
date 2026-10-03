import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const API = 'http://192.168.1.102:3000';

export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [allVideos, setAllVideos] = useState<any[]>([]);

  const runSearch = async (text: string) => {
    setQuery(text);
    if (!allVideos.length) {
      try {
        const res = await fetch(`${API}/feed`);
        const data = await res.json();
        setAllVideos(data);
        filterResults(text, data);
      } catch (e) {
        console.log('Search fetch error', e);
      }
    } else {
      filterResults(text, allVideos);
    }
  };

  const filterResults = (text: string, data: any[]) => {
  if (!text.trim()) {
    setResults([]);
    return;
  }
  const lower = text.toLowerCase();
  setResults(
    data.filter(
      (v) =>
        v.caption?.toLowerCase().includes(lower) ||
        v.userName?.toLowerCase().includes(lower) ||
        v.tags?.some((t: string) => t.toLowerCase().includes(lower))
    )
  );
};

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Search captions or users..."
        placeholderTextColor="#666"
        value={query}
        onChangeText={runSearch}
        autoFocus
      />

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.resultRow}
            onPress={() =>
              navigation.navigate('VideoDetail', {
                url: item.url,
                caption: item.caption,
                userName: item.userName,
              })
            }
          >
            <Text style={styles.resultUser}>@{item.userName}</Text>
            <Text style={styles.resultCaption} numberOfLines={1}>{item.caption}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          query.trim() ? (
            <Text style={styles.empty}>No results for "{query}"</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a', padding: 16 },
  input: {
    backgroundColor: '#1a1a2e',
    color: 'white',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  resultRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  resultUser: { color: '#a78bfa', fontWeight: '600' },
  resultCaption: { color: 'white', marginTop: 4 },
  empty: { color: '#666', textAlign: 'center', marginTop: 40 },
});