import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  Modal,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Ionicons } from '@expo/vector-icons';

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

type SeriesItem = {
  id: string;
  title: string;
  videoIds: string[];
};

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [seriesList, setSeriesList] = useState<SeriesItem[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [seriesPickerOpen, setSeriesPickerOpen] = useState(false);

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

  const generateThumbnail = async (id: string, url: string) => {
    if (thumbnails[id]) return;
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(url, { time: 500 });
      setThumbnails((prev) => ({ ...prev, [id]: uri }));
    } catch (e) {
      // ignore individual thumbnail failures
    }
  };

  // Thumbnails for ungrouped videos (flat grid)
  useEffect(() => {
    videos.forEach((v) => generateThumbnail(v.id, v.url));
  }, [videos]);

  // Thumbnails for each series — generated from its first video's frame
  useEffect(() => {
    seriesList.forEach((s) => {
      if (s.videoIds.length === 0) return;
      const firstVideoId = s.videoIds[0];
      const firstVideo = videos.find((v) => v.id === firstVideoId);
      if (firstVideo) {
        generateThumbnail(`series-${s.id}`, firstVideo.url);
      }
    });
  }, [seriesList, videos]);

  useFocusEffect(
    useCallback(() => {
      loadVideos();
      loadSeries();
    }, [])
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const enterSelectMode = (id: string) => {
    setSelectMode(true);
    setSelectedIds([id]);
  };

  const cancelSelectMode = () => {
    setSelectMode(false);
    setSelectedIds([]);
  };

  const addSelectedToSeries = async (seriesId: string) => {
    try {
      await fetch(`${API}/series/${seriesId}/add-videos`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoIds: selectedIds }),
      });
      setSeriesPickerOpen(false);
      cancelSelectMode();
      loadSeries();
    } catch (e) {
      console.log('add to series error', e);
    }
  };

  const handleTilePress = (item: VideoItem) => {
    if (selectMode) {
      toggleSelect(item.id);
    } else {
      navigation.navigate('VideoDetail', {
        url: item.url,
        caption: item.caption,
        userName: item.userName,
        id: item.id,
        fromProfile: true,
      });
    }
  };

  // A video belonging to any series is hidden from the flat grid —
  // it only appears inside that series' own thumbnail view
  const groupedVideoIds = new Set(seriesList.flatMap((s) => s.videoIds));
  const ungroupedVideos = videos.filter((v) => !groupedVideoIds.has(v.id));

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

      {seriesList.length > 0 && (
        <View style={{ paddingVertical: 12 }}>
          <Text style={{ color: '#a78bfa', paddingHorizontal: 12, marginBottom: 8, fontWeight: '600' }}>
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
                style={styles.seriesCard}
                onPress={() =>
                  navigation.navigate('SeriesDetail', { seriesId: item.id, title: item.title })
                }
              >
                {thumbnails[`series-${item.id}`] ? (
                  <Image source={{ uri: thumbnails[`series-${item.id}`] }} style={StyleSheet.absoluteFill} />
                ) : (
                  <View style={styles.seriesCardPlaceholder}>
                    <Ionicons name="albums-outline" size={24} color="#555" />
                  </View>
                )}
                <View style={styles.seriesCardOverlay}>
                  <Text style={styles.seriesCardTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.seriesCardCount}>
                    {item.videoIds?.length ?? 0} video{item.videoIds?.length === 1 ? '' : 's'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12 }}>
        <Text style={{ color: '#a78bfa', fontWeight: '600' }}>
          {selectMode ? `${selectedIds.length} selected` : 'Videos'}
        </Text>
        {selectMode && (
          <TouchableOpacity onPress={cancelSelectMode}>
            <Text style={{ color: '#888' }}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={ungroupedVideos}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={{ padding: 2, paddingBottom: selectMode ? 90 : 2 }}
        renderItem={({ item }) => {
          const isSelected = selectedIds.includes(item.id);
          return (
            <TouchableOpacity
              style={[styles.tile, isSelected && styles.tileSelected]}
              onPress={() => handleTilePress(item)}
              onLongPress={() => !selectMode && enterSelectMode(item.id)}
            >
              {thumbnails[item.id] ? (
                <Image source={{ uri: thumbnails[item.id] }} style={StyleSheet.absoluteFill} />
              ) : null}

              {selectMode && (
                <View style={styles.checkCircle}>
                  <Ionicons
                    name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={isSelected ? '#7c3aed' : 'white'}
                  />
                </View>
              )}

              <View style={styles.tileOverlay}>
                <Text style={styles.tileCaption} numberOfLines={2}>
                  {item.caption || 'Untitled'}
                </Text>
                <Text style={styles.tileMeta}>💜 {item.likesCount}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: '#666' }}>
              {videos.length === 0
                ? 'No videos yet — upload one to get started!'
                : 'All your videos are organized into series'}
            </Text>
          </View>
        }
      />

      {selectMode && selectedIds.length > 0 && (
        <View style={styles.selectBar}>
          <TouchableOpacity style={styles.selectBarBtn} onPress={() => setSeriesPickerOpen(true)}>
            <Ionicons name="albums-outline" size={18} color="white" />
            <Text style={styles.selectBarBtnText}>Add to Series</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={seriesPickerOpen} animationType="slide" transparent>
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setSeriesPickerOpen(false)}
        >
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Add to Series</Text>

            <TouchableOpacity
              style={styles.pickerNewRow}
              onPress={() => {
                setSeriesPickerOpen(false);
                cancelSelectMode();
                navigation.navigate('CreateSeries');
              }}
            >
              <Ionicons name="add-circle-outline" size={20} color="#a78bfa" />
              <Text style={styles.pickerNewText}>Create New Series</Text>
            </TouchableOpacity>

            <FlatList
              data={seriesList}
              keyExtractor={(s) => s.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.pickerRow} onPress={() => addSelectedToSeries(item.id)}>
                  <Text style={styles.pickerRowText}>{item.title}</Text>
                  <Text style={styles.pickerRowCount}>{item.videoIds?.length ?? 0} videos</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={{ color: '#666', padding: 12 }}>No series yet — create one above</Text>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
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
  seriesCard: {
    width: 140,
    height: 90,
    borderRadius: 10,
    marginRight: 10,
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
  },
  seriesCardPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seriesCardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
  },
  seriesCardTitle: { color: 'white', fontWeight: '600', fontSize: 13 },
  seriesCardCount: { color: '#ccc', fontSize: 11, marginTop: 2 },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    margin: 2,
    backgroundColor: '#1a1a2e',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tileSelected: {
    borderWidth: 2,
    borderColor: '#7c3aed',
  },
  checkCircle: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 11,
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
  selectBar: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
  selectBarBtn: {
    backgroundColor: '#7c3aed',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  selectBarBtnText: { color: 'white', fontWeight: '600', fontSize: 15 },
  pickerBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  pickerSheet: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '60%',
  },
  pickerTitle: { color: 'white', fontSize: 18, fontWeight: '600', marginBottom: 12 },
  pickerNewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#0f0f1a',
    marginBottom: 6,
  },
  pickerNewText: { color: '#a78bfa', fontWeight: '600' },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#0f0f1a',
  },
  pickerRowText: { color: 'white' },
  pickerRowCount: { color: '#888', fontSize: 12 },
});