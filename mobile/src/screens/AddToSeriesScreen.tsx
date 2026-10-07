import React, { useCallback, useState, useLayoutEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Image, Dimensions } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../../App';

const API = 'http://192.168.1.102:3000';
const { width } = Dimensions.get('window');
const TILE_SIZE = width / 3 - 4;

type VideoItem = {
  id: string;
  url: string;
  caption: string;
};

export default function AddToSeriesScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'AddToSeries'>>();
  const { seriesId, title } = route.params;

  const [allVideos, setAllVideos] = useState<VideoItem[]>([]);
  const [seriesVideoIds, setSeriesVideoIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // No back arrow, no swipe-back — Done is the only way out of this screen
  useLayoutEffect(() => {
    navigation.setOptions({ headerBackVisible: false, gestureEnabled: false });
  }, [navigation]);

  const loadData = async () => {
    try {
      const [feedRes, seriesRes] = await Promise.all([
        fetch(`${API}/feed`),
        fetch(`${API}/series/${seriesId}/videos`),
      ]);
      const feedData = await feedRes.json();
      const seriesVideos = await seriesRes.json();
      setAllVideos(feedData);
      setSeriesVideoIds(seriesVideos.map((v: any) => v.id));
    } catch (e) {
      console.log('load error', e);
    }
  };

  // Refetches every time this screen gains focus — so returning from
  // Upload (which posted a new video already tagged to this series)
  // picks up the new video automatically, already marked as "in series"
  useFocusEffect(
    useCallback(() => {
      loadData();
      setSelectedIds([]);
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
    allVideos.forEach((v) => generateThumbnail(v));
  }, [allVideos]);

  const toggleSelect = (id: string) => {
    if (seriesVideoIds.includes(id)) return;
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const saveSelection = async () => {
    if (selectedIds.length === 0) return;
    setSaving(true);
    try {
      await fetch(`${API}/series/${seriesId}/add-videos`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoIds: selectedIds }),
      });
      // Stay on this screen, refresh state so newly-added videos move
      // into the "already in series" section immediately
      await loadData();
      setSelectedIds([]);
    } catch (e) {
      console.log('add to series error', e);
    } finally {
      setSaving(false);
    }
  };

  // Done now saves any pending selection first, so you can never lose
  // picked videos by tapping Done without having tapped "Add to Series"
  const finish = async () => {
    if (selectedIds.length > 0) {
      setSaving(true);
      try {
        await fetch(`${API}/series/${seriesId}/add-videos`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoIds: selectedIds }),
        });
      } catch (e) {
        console.log('final save error', e);
      } finally {
        setSaving(false);
      }
    }
    navigation.navigate('MainTabs', { screen: 'Profile' });
  };

  const inSeriesVideos = allVideos.filter((v) => seriesVideoIds.includes(v.id));
  const availableVideos = allVideos.filter((v) => !seriesVideoIds.includes(v.id));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{title}</Text>
        <Text style={styles.headerSubtitle}>
          {inSeriesVideos.length} video{inSeriesVideos.length === 1 ? '' : 's'} in this series
        </Text>
      </View>

      <TouchableOpacity
        style={styles.uploadRow}
        onPress={() => navigation.navigate('Upload', { seriesId })}
      >
        <Ionicons name="cloud-upload-outline" size={22} color="#a78bfa" />
        <Text style={styles.uploadText}>Upload a new video for this series</Text>
        <Ionicons name="chevron-forward" size={18} color="#666" />
      </TouchableOpacity>

      {inSeriesVideos.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>In this series</Text>
          <FlatList
            data={inSeriesVideos}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 14, gap: 8 }}
            renderItem={({ item }) => (
              <View style={styles.inSeriesTile}>
                {thumbnails[item.id] ? (
                  <Image source={{ uri: thumbnails[item.id] }} style={StyleSheet.absoluteFill} />
                ) : null}
                <View style={styles.inSeriesBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#7c3aed" />
                </View>
              </View>
            )}
          />
        </>
      )}

      <Text style={styles.sectionLabel}>
        Add from your existing videos {selectedIds.length > 0 ? `(${selectedIds.length} selected)` : ''}
      </Text>

      <FlatList
        data={availableVideos}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={{ padding: 2 }}
        renderItem={({ item }) => {
          const isSelected = selectedIds.includes(item.id);
          return (
            <TouchableOpacity
              style={[styles.tile, isSelected && styles.tileSelected]}
              onPress={() => toggleSelect(item.id)}
            >
              {thumbnails[item.id] ? (
                <Image source={{ uri: thumbnails[item.id] }} style={StyleSheet.absoluteFill} />
              ) : null}
              <View style={styles.checkCircle}>
                <Ionicons
                  name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={isSelected ? '#7c3aed' : 'white'}
                />
              </View>
              <View style={styles.tileOverlay}>
                <Text style={styles.tileCaption} numberOfLines={1}>
                  {item.caption || 'Untitled'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={{ padding: 30, alignItems: 'center' }}>
            <Text style={{ color: '#666' }}>No other videos available to add</Text>
          </View>
        }
      />

      <View style={styles.footer}>
        {selectedIds.length > 0 && (
          <TouchableOpacity style={styles.addBtn} onPress={saveSelection} disabled={saving}>
            <Text style={styles.addBtnText}>{saving ? 'Adding...' : `Add ${selectedIds.length} to Series`}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.doneBtn} onPress={finish} disabled={saving}>
          <Text style={styles.doneBtnText}>{saving ? 'Saving...' : 'Done'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: { padding: 20, paddingBottom: 12 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: '700' },
  headerSubtitle: { color: '#888', marginTop: 4 },
  uploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1a1a2e',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
  },
  uploadText: { color: 'white', flex: 1, fontWeight: '500' },
  sectionLabel: { color: '#a78bfa', paddingHorizontal: 16, marginBottom: 8, marginTop: 4, fontWeight: '600' },
  inSeriesTile: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#1a1a2e',
    overflow: 'hidden',
  },
  inSeriesBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    margin: 2,
    backgroundColor: '#1a1a2e',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tileSelected: { borderWidth: 2, borderColor: '#7c3aed' },
  checkCircle: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 10 },
  tileOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 4,
  },
  tileCaption: { color: 'white', fontSize: 10 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#1a1a2e' },
  addBtn: { backgroundColor: '#2a2a3e', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  addBtnText: { color: 'white', fontWeight: '600', fontSize: 16 },
  doneBtn: { backgroundColor: '#7c3aed', padding: 16, borderRadius: 12, alignItems: 'center' },
  doneBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
});