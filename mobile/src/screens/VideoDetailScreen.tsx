import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../../App';

const { height } = Dimensions.get('window');

export default function VideoDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'VideoDetail'>>();
  const { url, caption, userName, id, fromProfile } = route.params;

  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.play();
  });

  return (
    <View style={styles.container}>
      <VideoView style={styles.video} player={player} contentFit="contain" nativeControls={false} />

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      {fromProfile && id && (
  <TouchableOpacity
    style={styles.editTagsBtn}
    onPress={() => navigation.navigate('EditVideo', { videoId: id })}
  >
    <Ionicons name="create-outline" size={16} color="#a78bfa" />
    <Text style={styles.editTagsText}>Edit Video</Text>
  </TouchableOpacity>
)}

      <View style={styles.overlay}>
        <Text style={styles.username}>@{userName}</Text>
        <Text style={styles.caption}>{caption}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  video: { flex: 1, height },
  backBtn: {
    position: 'absolute',
    top: 50,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  backText: { color: 'white', fontWeight: '600' },
  editTagsBtn: {
    position: 'absolute',
    top: 50,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editTagsText: { color: '#a78bfa', fontWeight: '600', fontSize: 13 },
  overlay: { position: 'absolute', bottom: 40, left: 16, right: 16 },
  username: { color: 'white', fontWeight: '700', fontSize: 16 },
  caption: { color: 'white', marginTop: 6 },
});