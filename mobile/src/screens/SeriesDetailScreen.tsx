import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as VideoThumbnails from 'expo-video-thumbnails';
import type { RootStackParamList } from '../../App';

const API = 'http://192.168.1.102:3000';
const { width } = Dimensions.get('window');
const TILE_SIZE = width / 3 - 4;

type VideoItem = {
  id: string;
  url: string;
  caption: string;
  userName: string;
};

export default function SeriesDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'SeriesDetail'>>();
  const { seriesId, title } = route.params;
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  const loadVideos = async () => {
    try {
      const res = await fetch(`${API}/series/${seriesId}/videos`);
      const data = await res.json();
      setVideos(data);
    } catch (e) {
      console.log('load series videos error', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadVideos();
    }, [seriesId])
  );

  const generateThumbnail = async (video: VideoItem) => {
    if (thumbnails[video.id]) return;
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(video.url, { time: 500 });
      setThumbnails((prev) => ({ ...prev, [video.id]: uri }));
    } catch (e) {
      // ignore
    }
  };

  React.useEffect(() => {
    videos.forEach((v) => generateThumbnail(v));
  }, [videos]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.count}>{videos.length} videos</Text>

        <TouchableOpacity
          style={styles.manageBtn}
          onPress={() => navigation.navigate('AddToSeries', { seriesId, title })}
        >
          <Text style={styles.manageBtnText}>+ Manage Videos</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={videos}
        keyExtractor={(v) => v.id}
        numColumns={3}
        contentContainerStyle={{ padding: 2 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.tile}
            onPress={() =>
  navigation.navigate('VideoDetail', {
    url: item.url,
    caption: item.caption,
    userName: item.userName,
    id: item.id,
    fromProfile: true,
  })
}
          >
            {thumbnails[item.id] ? (
              <Image source={{ uri: thumbnails[item.id] }} style={StyleSheet.absoluteFill} />
            ) : null}
            <View style={styles.tileOverlay}>
              <Text style={styles.tileCaption} numberOfLines={2}>
                {item.caption || 'Untitled'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: '#666' }}>No videos in this series yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: { padding: 20, alignItems: 'center' },
  title: { color: 'white', fontSize: 20, fontWeight: '700' },
  count: { color: '#888', marginTop: 4 },
  manageBtn: {
    backgroundColor: '#4c1d95',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 12,
  },
  manageBtnText: { color: 'white', fontWeight: '600' },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    margin: 2,
    backgroundColor: '#1a1a2e',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tileOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 6,
  },
  tileCaption: { color: 'white', fontSize: 11 },
  empty: { padding: 40, alignItems: 'center' },
});