import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TagPicker from '../components/TagPicker';

const API = 'http://192.168.1.102:3000';

export default function UploadScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'Upload'>>();
  const seriesId = route.params?.seriesId;
  const insets = useSafeAreaInsets();

  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        quality: 1,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPendingUri(result.assets[0].uri);
      } else {
        navigation.goBack();
      }
    } catch (e) {
      console.log('Gallery error:', e);
      Alert.alert('Could not open gallery');
      navigation.goBack();
    }
  };

  React.useEffect(() => {
    if (!pendingUri) {
      pickFromGallery();
    }
  }, []);

  const uploadVideo = async () => {
    if (!pendingUri) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('video', {
        uri: pendingUri,
        type: 'video/mp4',
        name: `video_${Date.now()}.mp4`,
      } as any);
      if (seriesId) formData.append('seriesId', seriesId);
      formData.append('caption', captionText.trim() || 'New video');
      formData.append('tags', JSON.stringify(selectedTags));

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API}/videos`);
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response);
          else reject(new Error(`Upload failed with status ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.ontimeout = () => reject(new Error('Upload timeout'));
        xhr.send(formData);
      });

      setUploadComplete(true);
    } catch (error) {
      console.log('Upload error:', error);
      Alert.alert('Error', 'Could not upload video');
    } finally {
      setUploading(false);
    }
  };

  const finishAndGoToProfile = () => {
    navigation.navigate('MainTabs', { screen: 'Profile' });
  };

  const cancel = () => {
    setPendingUri(null);
    navigation.goBack();
  };

  if (!pendingUri) {
    return (
      <View style={styles.center}>
        <Text style={{ color: '#888' }}>Opening gallery...</Text>
      </View>
    );
  }

  // ----- Post-upload success screen: no back button, just Done -----
  if (uploadComplete) {
    return (
      <View style={styles.center}>
        <Text style={styles.successTitle}>Video uploaded!</Text>
        {seriesId && <Text style={styles.successSubtitle}>Added to your series</Text>}
        <TouchableOpacity style={styles.doneBtn} onPress={finishAndGoToProfile}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <VideoPreview uri={pendingUri} />

      {uploading && (
        <View style={styles.uploadingOverlay}>
          <Text style={{ color: 'white', fontSize: 18 }}>Uploading...</Text>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        style={styles.captionModal}
      >
        <View style={[styles.captionBox, { paddingBottom: insets.bottom + 20 }]}>
          <Text style={styles.captionLabel}>Add a caption</Text>
          <TextInput
            style={styles.captionInput}
            placeholder="What's this video about?"
            placeholderTextColor="#666"
            value={captionText}
            onChangeText={setCaptionText}
          />

          <View style={{ marginTop: 16 }}>
            <TagPicker selectedTags={selectedTags} onChange={setSelectedTags} />
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <TouchableOpacity style={styles.captionCancelBtn} onPress={cancel}>
              <Text style={{ color: '#888' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.captionPostBtn, selectedTags.length === 0 && { opacity: 0.4 }]}
              onPress={uploadVideo}
              disabled={uploading || selectedTags.length === 0}
            >
              <Text style={{ color: 'white', fontWeight: '600' }}>
                {uploading ? 'Posting...' : 'Post'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });
  return <VideoView style={{ flex: 1 }} player={player} contentFit="contain" nativeControls={false} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#0f0f1a', justifyContent: 'center', alignItems: 'center', padding: 20 },
  successTitle: { color: 'white', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  successSubtitle: { color: '#888', marginBottom: 24 },
  doneBtn: { backgroundColor: '#7c3aed', paddingHorizontal: 40, paddingVertical: 16, borderRadius: 14 },
  doneBtnText: { color: 'white', fontWeight: '600', fontSize: 16 },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captionModal: { justifyContent: 'flex-end', flex: 1 },
  captionBox: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  captionLabel: { color: 'white', fontSize: 18, fontWeight: '600', marginBottom: 12 },
  captionInput: { backgroundColor: '#2a2a3e', borderRadius: 12, padding: 14, color: 'white', fontSize: 16 },
  captionCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#2a2a3e', alignItems: 'center' },
  captionPostBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#7c3aed', alignItems: 'center' },
});