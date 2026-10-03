import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const API = 'http://192.168.1.102:3000';
const MAX_TAGS = 3;

export default function TagPicker({
  selectedTags,
  onChange,
}: {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/tags?query=${encodeURIComponent(query)}`);
        const data = await res.json();
        setSuggestions(data.filter((t: string) => !selectedTags.includes(t)));
      } catch (e) {
        console.log('tag fetch error', e);
      }
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selectedTags]);

  const addTag = (tag: string) => {
    if (selectedTags.length >= MAX_TAGS) return;
    onChange([...selectedTags, tag]);
    setQuery('');
  };

  const removeTag = (tag: string) => {
    onChange(selectedTags.filter((t) => t !== tag));
  };

  return (
    <View>
      <Text style={styles.label}>
        Tags ({selectedTags.length}/{MAX_TAGS}) — required
      </Text>

      <View style={styles.chipRow}>
        {selectedTags.map((tag) => (
          <TouchableOpacity key={tag} style={styles.chipSelected} onPress={() => removeTag(tag)}>
            <Text style={styles.chipSelectedText}>{tag}</Text>
            <Ionicons name="close" size={14} color="white" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        ))}
      </View>

      {selectedTags.length < MAX_TAGS && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Search topics (e.g. cooking, fitness)..."
            placeholderTextColor="#666"
            value={query}
            onChangeText={setQuery}
          />
          {suggestions.length > 0 && (
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 8 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.suggestionChip} onPress={() => addTag(item)}>
                  <Text style={styles.suggestionText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: '#a78bfa', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chipSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipSelectedText: { color: 'white', fontSize: 13, fontWeight: '600' },
  input: { backgroundColor: '#2a2a3e', borderRadius: 10, padding: 10, color: 'white', fontSize: 14 },
  suggestionChip: {
    backgroundColor: '#2a2a3e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 8,
  },
  suggestionText: { color: '#ccc', fontSize: 13 },
});