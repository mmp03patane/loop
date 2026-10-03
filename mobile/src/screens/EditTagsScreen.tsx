import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import TagPicker from '../components/TagPicker';
import type { RootStackParamList } from '../../App';

const API = 'http://192.168.1.102:3000';

export default function EditTagsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'EditTags'>>();
  const { videoId } = route.params;

  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/videos/${videoId}`);
        const data = await res.json();
        setTags(data.tags || []);
      } catch (e) {
        console.log('load video error', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [videoId]);

  const save = async () => {
    if (tags.length === 0) {
      Alert.alert('At least one tag is required');
      return;
    }
    setSaving(true);
    try {
      await fetch(`${API}/videos/${videoId}/tags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags }),
      });
      navigation.goBack();
    } catch (e) {
      console.log('save tags error', e);
      Alert.alert('Could not save tags');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={{ color: '#888' }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TagPicker selectedTags={tags} onChange={setTags} />

      <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
        <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Tags'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a', padding: 20 },
  saveBtn: {
    backgroundColor: '#7c3aed',
    padding: 16,
    borderRadius: 12,
    marginTop: 30,
    alignItems: 'center',
  },
  saveBtnText: { color: 'white', fontWeight: '600', fontSize: 16 },
});