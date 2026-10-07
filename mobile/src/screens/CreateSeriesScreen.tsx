import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const API = 'http://192.168.1.102:3000';

export default function CreateSeriesScreen() {
  const navigation = useNavigation<any>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const create = async () => {
    if (!title.trim()) {
      Alert.alert('Title required');
      return;
    }
    try {
      const res = await fetch(`${API}/series`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });
      const newSeries = await res.json();
      // Go straight into adding videos — no dead end
      navigation.replace('AddToSeries', { seriesId: newSeries.id, title: newSeries.title });
    } catch (e) {
      console.log('create series error', e);
      Alert.alert('Could not create series');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Series Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Beginner Squat Form"
        placeholderTextColor="#666"
      />

      <Text style={styles.label}>Description (optional)</Text>
      <TextInput
        style={[styles.input, { height: 100 }]}
        value={description}
        onChangeText={setDescription}
        multiline
        placeholder="What is this series about?"
        placeholderTextColor="#666"
      />

      <TouchableOpacity style={styles.button} onPress={create}>
        <Text style={styles.buttonText}>Create & Add Videos</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a', padding: 20 },
  label: { color: '#a78bfa', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#1a1a2e', color: 'white', padding: 14, borderRadius: 12 },
  button: { backgroundColor: '#7c3aed', padding: 16, borderRadius: 12, marginTop: 30, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '600', fontSize: 16 },
});