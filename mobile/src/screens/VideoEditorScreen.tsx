import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, PanResponder, Dimensions } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../../App';

const { width } = Dimensions.get('window');
const TRACK_WIDTH = width - 48;
const HANDLE_WIDTH = 24;

export default function VideoEditorScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'VideoEditor'>>();
  const { uri, seriesId } = route.params;

  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });

  // Explicitly release the player on unmount — don't let it linger in memory
  useEffect(() => {
    return () => {
      try {
        player.pause();
      } catch (e) {
        // safe to ignore — player may already be released
      }
    };
  }, [player]);

  const [startX, setStartX] = useState(0);
  const [endX, setEndX] = useState(TRACK_WIDTH - HANDLE_WIDTH);

  const startResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        const next = Math.max(0, Math.min(gesture.moveX - 24, endX - HANDLE_WIDTH));
        setStartX(next);
      },
    })
  ).current;

  const endResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        const next = Math.max(startX + HANDLE_WIDTH, Math.min(gesture.moveX - 24, TRACK_WIDTH - HANDLE_WIDTH));
        setEndX(next);
      },
    })
  ).current;

  const startPct = Math.round((startX / (TRACK_WIDTH - HANDLE_WIDTH)) * 100);
  const endPct = Math.round((endX / (TRACK_WIDTH - HANDLE_WIDTH)) * 100);

  const handleDone = () => {
    try {
      player.pause();
    } catch (e) {
      // safe to ignore
    }
    navigation.goBack();
    setTimeout(() => {
      navigation.navigate('Camera', { seriesId, editedUri: uri, trimStart: startPct, trimEnd: endPct });
    }, 100);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Video</Text>
        <TouchableOpacity onPress={handleDone}>
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </View>

      <VideoView style={styles.video} player={player} contentFit="contain" nativeControls={false} />

      <View style={styles.editorPanel}>
        <Text style={styles.trimLabel}>
          Trim: {startPct}% – {endPct}%
        </Text>
        <Text style={styles.trimNote}>Drag handles to select range (preview only for now)</Text>

        <View style={styles.track}>
          <View
            style={[
              styles.selectedRange,
              { left: startX + HANDLE_WIDTH / 2, width: endX - startX },
            ]}
          />
          <View {...startResponder.panHandlers} style={[styles.handle, { left: startX }]}>
            <Ionicons name="chevron-back" size={16} color="white" />
          </View>
          <View {...endResponder.panHandlers} style={[styles.handle, { left: endX }]}>
            <Ionicons name="chevron-forward" size={16} color="white" />
          </View>
        </View>

        <Text style={styles.audioLabel}>Audio (visual only — not yet editable)</Text>
        <View style={styles.audioTrack}>
          {Array.from({ length: 30 }).map((_, i) => (
            <View key={i} style={[styles.audioBar, { height: 8 + ((i * 37) % 20) }]} />
          ))}
        </View>

        <View style={styles.toolRow}>
          <TouchableOpacity style={styles.toolBtn} disabled>
            <Ionicons name="cut-outline" size={22} color="#555" />
            <Text style={styles.toolLabelDisabled}>Split</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} disabled>
            <Ionicons name="color-filter-outline" size={22} color="#555" />
            <Text style={styles.toolLabelDisabled}>Filters</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} disabled>
            <Ionicons name="speedometer-outline" size={22} color="#555" />
            <Text style={styles.toolLabelDisabled}>Speed</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.comingSoon}>Split, filters, and speed are coming soon</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 12,
  },
  headerTitle: { color: 'white', fontWeight: '600', fontSize: 16 },
  doneText: { color: '#a78bfa', fontWeight: '700', fontSize: 16 },
  video: { flex: 1 },
  editorPanel: { backgroundColor: '#1a1a2e', padding: 20, paddingBottom: 30 },
  trimLabel: { color: 'white', fontWeight: '600', marginBottom: 4 },
  trimNote: { color: '#666', fontSize: 12, marginBottom: 16 },
  track: {
    height: 40,
    backgroundColor: '#2a2a3e',
    borderRadius: 8,
    justifyContent: 'center',
    marginBottom: 16,
  },
  selectedRange: {
    position: 'absolute',
    height: 40,
    backgroundColor: 'rgba(124,58,237,0.35)',
    borderRadius: 8,
  },
  handle: {
    position: 'absolute',
    width: HANDLE_WIDTH,
    height: 40,
    backgroundColor: '#7c3aed',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioLabel: { color: '#666', fontSize: 11, marginBottom: 6 },
  audioTrack: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 28,
    gap: 2,
    marginBottom: 20,
  },
  audioBar: { flex: 1, backgroundColor: '#4c1d95', borderRadius: 2 },
  toolRow: { flexDirection: 'row', justifyContent: 'space-around' },
  toolBtn: { alignItems: 'center', gap: 4 },
  toolLabelDisabled: { color: '#555', fontSize: 12 },
  comingSoon: { color: '#555', fontSize: 11, textAlign: 'center', marginTop: 10 },
});