import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as VideoThumbnails from 'expo-video-thumbnails';

const API = 'http://192.168.1.102:3000';
const { width } = Dimensions.get('window');
const TILE_SIZE = width / 3 - 4;

type VideoItem = {
  id: string;
  url: string;
  caption: string;
  likesCount: number;
  commentsCount: number;
  userName: string;
};

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [seriesList, setSeriesList] = useState<any[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  const loadVideos = async () => {
    try {
      const res = await fetch(`${API}/feed`);
      const data = await res.json();
      setVideos(data);
    } catch (e) {
      console.log('Profile load error', e);
    }
  };

  const loadSeries = async () => {
    try {
      const res = await fetch(`${API}/series`);
      setSeriesList(await res.json());
    } catch (e) {
      console.log('Series load error', e);
    }
  };

  const generateThumbnail = async (video: VideoItem) => {
    if (thumbnails[video.id]) return; // already have one
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(video.url, {
        time: 500,
      });
      setThumbnails((prev) => ({ ...prev, [video.id]: uri }));
    } catch (e) {
      console.log('Thumbnail error for', video.id, e);
    }
  };

  useEffect(() => {
    videos.forEach((v) => generateThumbnail(v));
  }, [videos]);

  useFocusEffect(
    useCallback(() => {
      loadVideos();
      loadSeries();
    }, [])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>C</Text>
        </View>
        <Text style={styles.name}>@Creator</Text>
        <Text style={styles.count}>{videos.length} videos</Text>

        <TouchableOpacity
          style={styles.createSeriesBtn}
          onPress={() => navigation.navigate('CreateSeries')}
        >
          <Text style={styles.createSeriesText}>+ Create Series</Text>
        </TouchableOpacity>
      </View>

      {/* Series horizontal row */}
      {seriesList.length > 0 && (
        <View style={{ paddingVertical: 12 }}>
          <Text
            style={{
              color: '#a78bfa',
              paddingHorizontal: 12,
              marginBottom: 8,
              fontWeight: '600',
            }}
          >
            Series
          </Text>
          <FlatList
            horizontal
            data={seriesList}
            keyExtractor={(s) => s.id}
            contentContainerStyle={{ paddingHorizontal: 12 }}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={{
                  backgroundColor: '#1a1a2e',
                  padding: 14,
                  borderRadius: 10,
                  marginRight: 10,
                  width: 140,
                }}
                onPress={() =>
                  navigation.navigate('SeriesDetail', {
                    seriesId: item.id,
                    title: item.title,
                  })
                }
              >
                <Text style={{ color: 'white', fontWeight: '600' }} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
                  {item.videoIds?.length ?? 0} videos
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <FlatList
        data={videos}
        keyExtractor={(item) => item.id}
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
              <Image
                source={{ uri: thumbnails[item.id] }}
                style={StyleSheet.absoluteFill}
              />
            ) : null}
            <View style={styles.tileOverlay}>
              <Text style={styles.tileCaption} numberOfLines={2}>
                {item.caption || 'Untitled'}
              </Text>
              <Text style={styles.tileMeta}>💜 {item.likesCount}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: '#666' }}>No videos yet — record one to get started!</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#4c1d95',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: { color: 'white', fontSize: 28, fontWeight: '700' },
  name: { color: 'white', fontSize: 18, fontWeight: '600' },
  count: { color: '#888', marginTop: 4 },
  createSeriesBtn: {
    backgroundColor: '#4c1d95',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 12,
  },
  createSeriesText: { color: 'white', fontWeight: '600' },
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
  tileCaption: { color: 'white', fontSize: 12 },
  tileMeta: { color: '#a78bfa', fontSize: 11 },
  empty: { padding: 40, alignItems: 'center' },
});