import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Dimensions,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

const API = 'http://192.168.1.102:3000';
const { height } = Dimensions.get('window');

type VideoItem = {
  id: string;
  url: string;
  caption: string;
  likesCount: number;
  commentsCount: number;
  likedByMe: boolean;
  userName: string;
  seriesId: string | null;
};

// One player per video item — expo-video's hook must live in its own component
function FeedVideoItem({ item, isActive }: { item: VideoItem; isActive: boolean }) {
  const player = useVideoPlayer(item.url, (p) => {
    p.loop = true;
    p.muted = false;
  });

  useEffect(() => {
    if (isActive) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, player]);

  return (
    <VideoView
      style={styles.video}
      player={player}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

export default function FeedScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = 60 + insets.bottom;
  const VIDEO_HEIGHT = height - TAB_BAR_HEIGHT;

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [commentModal, setCommentModal] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');

  const loadFeed = async () => {
    try {
      const res = await fetch(`${API}/feed`);
      const data = await res.json();
      setVideos(data);
    } catch (e) {
      console.log('Feed error', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadFeed();
    }, [])
  );

  const toggleLike = async (videoId: string) => {
    try {
      const res = await fetch(`${API}/videos/${videoId}/like`, { method: 'POST' });
      const data = await res.json();
      setVideos((prev) =>
        prev.map((v) =>
          v.id === videoId
            ? { ...v, likedByMe: data.liked, likesCount: data.likesCount }
            : v
        )
      );
    } catch (e) {
      console.log('Like error', e);
    }
  };

  const openComments = async (videoId: string) => {
    setCommentModal(videoId);
    try {
      const res = await fetch(`${API}/videos/${videoId}/comments`);
      const data = await res.json();
      setComments(data);
    } catch (e) {
      console.log('Comments error', e);
    }
  };

  const postComment = async () => {
    if (!newComment.trim() || !commentModal) return;
    try {
      await fetch(`${API}/videos/${commentModal}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newComment }),
      });
      setNewComment('');
      openComments(commentModal);
      loadFeed();
    } catch (e) {
      console.log('Post comment error', e);
    }
  };

  const renderItem = ({ item, index }: { item: VideoItem; index: number }) => (
    <View style={[styles.videoContainer, { height: VIDEO_HEIGHT }]}>
      <FeedVideoItem item={item} isActive={index === activeIndex} />

      <View style={styles.overlay}>
        <Text style={styles.username}>@{item.userName}</Text>
        <Text style={styles.caption}>{item.caption}</Text>

        <View style={styles.actions}>
          <TouchableOpacity onPress={() => toggleLike(item.id)} style={styles.actionBtn}>
            <Text style={{ fontSize: 28 }}>{item.likedByMe ? '💜' : '🤍'}</Text>
            <Text style={styles.actionText}>{item.likesCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => openComments(item.id)} style={styles.actionBtn}>
            <Text style={{ fontSize: 28 }}>💬</Text>
            <Text style={styles.actionText}>{item.commentsCount}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#0f0f1a' }}>
      <FlatList
        data={videos}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.y / VIDEO_HEIGHT);
          setActiveIndex(index);
        }}
        ListEmptyComponent={
          <View style={{ height: VIDEO_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#a78bfa', fontSize: 18 }}>No videos yet</Text>
            <Text style={{ color: '#666', marginTop: 8 }}>Create a series and upload!</Text>
          </View>
        }
      />

      <Modal visible={!!commentModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modal}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Comments</Text>

            <FlatList
              data={comments}
              keyExtractor={(c) => c.id}
              renderItem={({ item }) => (
                <View style={styles.comment}>
                  <Text style={styles.commentUser}>{item.userName}</Text>
                  <Text style={styles.commentText}>{item.text}</Text>
                </View>
              )}
            />

            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.input}
                placeholder="Add a comment..."
                placeholderTextColor="#666"
                value={newComment}
                onChangeText={setNewComment}
              />
              <TouchableOpacity onPress={postComment}>
                <Text style={{ color: '#a78bfa', fontWeight: '600' }}>Post</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => setCommentModal(null)}>
              <Text style={{ color: '#888', textAlign: 'center', marginTop: 12 }}>Close</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  videoContainer: {
    height, // overridden inline with VIDEO_HEIGHT
    width: '100%',
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 80,
  },
  username: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  caption: {
    color: 'white',
    marginTop: 6,
  },
  actions: {
    position: 'absolute',
    right: -60,
    bottom: 0,
  },
  actionBtn: {
    alignItems: 'center',
    marginBottom: 20,
  },
  actionText: {
    color: 'white',
    marginTop: 4,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    gap: 12,
  },
  fab: {
    backgroundColor: '#4c1d95',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 30,
  },
  fabText: {
    color: 'white',
    fontWeight: '600',
  },
  modal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  comment: {
    marginBottom: 12,
  },
  commentUser: {
    color: '#a78bfa',
    fontWeight: '600',
  },
  commentText: {
    color: 'white',
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    color: 'white',
    padding: 12,
    borderRadius: 12,
  },
});
