import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import TagPicker from '../components/TagPicker';
import type { RootStackParamList } from '../../App';

const API = 'http://192.168.1.102:3000';

export default function EditVideoScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'EditVideo'>>();
  const { videoId } = route.params;

  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [memberSeries, setMemberSeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [videoRes, seriesRes] = await Promise.all([
          fetch(`${API}/videos/${videoId}`),
          fetch(`${API}/videos/${videoId}/series`),
        ]);
        const videoData = await videoRes.json();
        const seriesData = await seriesRes.json();
        setCaption(videoData.caption || '');
        setTags(videoData.tags || []);
        setMemberSeries(seriesData);
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
      await fetch(`${API}/videos/${videoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption, tags }),
      });
      navigation.goBack();
    } catch (e) {
      console.log('save error', e);
      Alert.alert('Could not save changes');
    } finally {
      setSaving(false);
    }
  };

  const removeFromSeries = (seriesId: string, title: string) => {
    Alert.alert('Remove from series?', `Remove this video from "${title}"`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API}/series/${seriesId}/remove-video`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ videoId }),
            });
            setMemberSeries((prev) => prev.filter((s) => s.id !== seriesId));
          } catch (e) {
            console.log('remove from series error', e);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={{ color: '#888' }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.label}>Caption</Text>
      <TextInput
        style={styles.input}
        value={caption}
        onChangeText={setCaption}
        placeholder="What's this video about?"
        placeholderTextColor="#666"
      />

      <View style={{ marginTop: 20 }}>
        <TagPicker selectedTags={tags} onChange={setTags} />
      </View>

      <Text style={[styles.label, { marginTop: 24 }]}>Series</Text>
      {memberSeries.length === 0 ? (
        <Text style={{ color: '#666' }}>Not in any series</Text>
      ) : (
        memberSeries.map((s) => (
          <View key={s.id} style={styles.seriesRow}>
            <Text style={styles.seriesRowText}>{s.title}</Text>
            <TouchableOpacity onPress={() => removeFromSeries(s.id, s.title)}>
              <Ionicons name="close-circle" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ))
      )}

      <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
        <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  center: { flex: 1, backgroundColor: '#0f0f1a', justifyContent: 'center', alignItems: 'center' },
  label: { color: '#a78bfa', fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: '#1a1a2e', color: 'white', padding: 14, borderRadius: 12 },
  seriesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  seriesRowText: { color: 'white' },
  saveBtn: { backgroundColor: '#7c3aed', padding: 16, borderRadius: 12, marginTop: 30, alignItems: 'center' },
  saveBtnText: { color: 'white', fontWeight: '600', fontSize: 16 },
});