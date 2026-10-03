import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../../App';

const API = 'http://192.168.1.102:3000';

export default function SeriesDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'SeriesDetail'>>();
  const { seriesId, title } = route.params;
  const [videos, setVideos] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API}/series/${seriesId}/videos`)
      .then(r => r.json())
      .then(setVideos);
  }, [seriesId]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <FlatList
        data={videos}
        keyExtractor={v => v.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={{ color: 'white' }}>{item.caption || 'Video'}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={{ color: '#666' }}>No videos in this series yet</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a', padding: 16 },
  title: { color: '#a78bfa', fontSize: 22, fontWeight: '700', marginBottom: 16 },
  card: { backgroundColor: '#1a1a2e', padding: 16, borderRadius: 12, marginBottom: 10 },
});