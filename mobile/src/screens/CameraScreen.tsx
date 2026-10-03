import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  PanResponder,
} from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { Ionicons } from '@expo/vector-icons';
import TagPicker from '../components/TagPicker';

const API = 'http://192.168.1.102:3000';
const MAX_DURATION = 60;

const FONT_OPTIONS = [
  { label: 'Classic', fontFamily: undefined, fontWeight: '400' as const, fontStyle: 'normal' as const },
  { label: 'Bold', fontFamily: undefined, fontWeight: '800' as const, fontStyle: 'normal' as const },
  { label: 'Italic', fontFamily: undefined, fontWeight: '400' as const, fontStyle: 'italic' as const },
  {
    label: 'Mono',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '400' as const,
    fontStyle: 'normal' as const,
  },
];

export default function CameraScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'Camera'>>();
  const seriesId = route.params?.seriesId;

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState(0);

  // Multiple takes — record, stop, record again, pick which one to finish with
  const [takes, setTakes] = useState<string[]>([]);

  const [textToolOpen, setTextToolOpen] = useState(false);
  const [overlayText, setOverlayText] = useState('');
  const [overlayFont, setOverlayFont] = useState(0);
  const [overlayPos, setOverlayPos] = useState({ x: 100, y: 100 });

  const cameraRef = useRef<CameraView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const overlayResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        setOverlayPos({ x: gesture.moveX - 60, y: gesture.moveY - 20 });
      },
    })
  ).current;

  useEffect(() => {
    (async () => {
      if (!cameraPermission?.granted) await requestCameraPermission();
      if (!micPermission?.granted) await requestMicPermission();
    })();
  }, []);

  useEffect(() => {
    if (route.params?.editedUri) {
      setPendingUri(route.params.editedUri);
    }
  }, [route.params?.editedUri]);

  useEffect(() => {
    if (recording) {
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev + 1 >= MAX_DURATION) {
            stopRecording();
          }
          return prev + 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recording]);

  const uploadVideo = async (uri: string) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('video', {
        uri: uri,
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

      Alert.alert('Success', 'Video uploaded!');
      setPendingUri(null);
      setCaptionText('');
      setOverlayText('');
      setSelectedTags([]);
      setTakes([]);
      navigation.goBack();
    } catch (error) {
      console.log('Upload error:', error);
      Alert.alert('Error', 'Could not upload video');
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    if (!cameraRef.current) return;
    if (!cameraPermission?.granted || !micPermission?.granted) {
      Alert.alert('Permissions needed', 'Please allow Camera and Microphone.');
      return;
    }
    try {
      setRecording(true);
      const video = await cameraRef.current.recordAsync({ maxDuration: MAX_DURATION });
      setRecording(false);
      if (video?.uri) {
        setTakes((prev) => [...prev, video.uri]);
      }
    } catch (e) {
      setRecording(false);
      console.log('Recording error:', e);
      Alert.alert('Recording failed');
    }
  };

  const stopRecording = () => {
    if (cameraRef.current) cameraRef.current.stopRecording();
  };

  const removeTake = (index: number) => {
    setTakes((prev) => prev.filter((_, i) => i !== index));
  };

  const finishWithTake = (uri: string) => {
    setPendingUri(uri);
  };

  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        quality: 1,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPendingUri(result.assets[0].uri);
      }
    } catch (e) {
      console.log('Gallery error:', e);
      Alert.alert('Could not open gallery');
    }
  };

  const flipCamera = () => {
    setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  };

  const retake = () => {
    setPendingUri(null);
    setCaptionText('');
    setOverlayText('');
    setSelectedTags([]);
    setTextToolOpen(false);
  };

  const openEditor = () => {
    if (!pendingUri) return;
    const uriToEdit = pendingUri;
    setPendingUri(null);
    navigation.navigate('VideoEditor', { uri: uriToEdit, seriesId });
  };

  if (!cameraPermission?.granted || !micPermission?.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>Camera and Microphone permissions are required</Text>
        <TouchableOpacity
          style={styles.permissionBtn}
          onPress={async () => {
            await requestCameraPermission();
            await requestMicPermission();
          }}
        >
          <Text style={styles.permissionBtnText}>Grant Permissions</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const activeOverlayFont = FONT_OPTIONS[overlayFont];

  // ----- Preview / caption screen -----
  if (pendingUri) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <VideoPreview uri={pendingUri} />

        <View style={styles.previewToolColumn}>
          <TouchableOpacity style={styles.previewToolBtn} onPress={openEditor}>
            <Ionicons name="create-outline" size={22} color="white" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.previewToolBtn} onPress={() => setTextToolOpen(true)}>
            <Text style={styles.aaIcon}>Aa</Text>
          </TouchableOpacity>
        </View>

        {!!overlayText && !textToolOpen && (
          <View
            {...overlayResponder.panHandlers}
            renderToHardwareTextureAndroid
            style={[styles.overlayTextWrap, { left: overlayPos.x, top: overlayPos.y }]}
          >
            <Text
              style={[
                styles.overlayText,
                {
                  fontFamily: activeOverlayFont.fontFamily,
                  fontWeight: activeOverlayFont.fontWeight,
                  fontStyle: activeOverlayFont.fontStyle,
                },
              ]}
            >
              {overlayText}
            </Text>
          </View>
        )}

        {uploading && (
          <View style={styles.uploadingOverlay}>
            <Text style={{ color: 'white', fontSize: 18 }}>Uploading...</Text>
          </View>
        )}

        {textToolOpen ? (
          <View style={styles.textToolBox}>
            <Text style={styles.captionLabel}>Add text to video</Text>
            <TextInput
              style={[
                styles.captionInput,
                {
                  fontFamily: activeOverlayFont.fontFamily,
                  fontWeight: activeOverlayFont.fontWeight,
                  fontStyle: activeOverlayFont.fontStyle,
                },
              ]}
              placeholder="Type text to overlay..."
              placeholderTextColor="#666"
              value={overlayText}
              onChangeText={setOverlayText}
              autoFocus
            />

            <View style={styles.fontRow}>
              {FONT_OPTIONS.map((font, idx) => (
                <TouchableOpacity
                  key={font.label}
                  style={[styles.fontChip, overlayFont === idx && styles.fontChipActive]}
                  onPress={() => setOverlayFont(idx)}
                >
                  <Text
                    style={{
                      color: overlayFont === idx ? 'white' : '#888',
                      fontFamily: font.fontFamily,
                      fontWeight: font.fontWeight,
                      fontStyle: font.fontStyle,
                    }}
                  >
                    {font.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.overlayNote}>Drag the text on the video to position it once saved</Text>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <TouchableOpacity
                style={styles.captionCancelBtn}
                onPress={() => {
                  setOverlayText('');
                  setTextToolOpen(false);
                }}
              >
                <Text style={{ color: '#888' }}>Remove</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.captionPostBtn} onPress={() => setTextToolOpen(false)}>
                <Text style={{ color: 'white', fontWeight: '600' }}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.captionModal}
          >
            <View style={styles.captionBox}>
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
                <TouchableOpacity style={styles.captionCancelBtn} onPress={retake}>
                  <Text style={{ color: '#888' }}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.captionPostBtn, selectedTags.length === 0 && { opacity: 0.4 }]}
                  onPress={() => {
                    if (pendingUri) uploadVideo(pendingUri);
                  }}
                  disabled={uploading || selectedTags.length === 0}
                >
                  <Text style={{ color: 'white', fontWeight: '600' }}>
                    {uploading ? 'Posting...' : 'Post'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        )}
      </View>
    );
  }

  // ----- Camera screen -----
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing={facing} mode="video" />

      {recording && (
        <View style={styles.timerBadge}>
          <View style={styles.recordDot} />
          <Text style={styles.timerText}>0:{elapsed.toString().padStart(2, '0')} / 1:00</Text>
        </View>
      )}

      {!recording && (
        <TouchableOpacity style={styles.flipBtn} onPress={flipCamera}>
          <Ionicons name="camera-reverse" size={28} color="white" />
        </TouchableOpacity>
      )}

      {/* Takes strip — shows after at least one stop, lets you add more or finish */}
      {takes.length > 0 && !recording && (
        <View style={styles.takesRow}>
          {takes.map((t, i) => (
            <TouchableOpacity key={i} style={styles.takeThumb} onPress={() => removeTake(i)}>
              <Text style={{ color: 'white', fontSize: 10 }}>Take {i + 1}</Text>
              <Ionicons
                name="close-circle"
                size={16}
                color="#ef4444"
                style={{ position: 'absolute', top: -6, right: -6 }}
              />
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.finishBtn}
            onPress={() => finishWithTake(takes[takes.length - 1])}
          >
            <Ionicons name="checkmark" size={24} color="white" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.controls}>
        <TouchableOpacity style={styles.galleryBtn} onPress={pickFromGallery}>
          <Text style={{ color: 'white' }}>Gallery</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.recordBtn, recording && styles.recording]}
          onPress={recording ? stopRecording : startRecording}
          disabled={uploading}
        />
      </View>
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
  center: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: { color: 'white', textAlign: 'center', marginBottom: 20, fontSize: 16 },
  permissionBtn: { backgroundColor: '#7c3aed', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  permissionBtnText: { color: 'white', fontWeight: '600' },
  controls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#ef4444', borderWidth: 4, borderColor: 'white' },
  recording: { backgroundColor: '#991b1b' },
  galleryBtn: {
    position: 'absolute',
    left: 30,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  flipBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 24,
  },
  timerBadge: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  recordDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444' },
  timerText: { color: 'white', fontWeight: '600' },
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
  takesRow: {
    position: 'absolute',
    bottom: 150,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  takeThumb: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#2a2a3e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  finishBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewToolColumn: {
    position: 'absolute',
    top: 50,
    right: 16,
    gap: 12,
  },
  previewToolBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aaIcon: { color: 'white', fontWeight: '700', fontSize: 15 },
  overlayTextWrap: { position: 'absolute' },
  overlayText: {
    color: 'white',
    fontSize: 22,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  captionModal: { justifyContent: 'flex-end', flex: 1 },
  captionBox: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  captionLabel: { color: 'white', fontSize: 18, fontWeight: '600', marginBottom: 12 },
  captionInput: { backgroundColor: '#2a2a3e', borderRadius: 12, padding: 14, color: 'white', fontSize: 16 },
  fontRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  fontChip: { backgroundColor: '#2a2a3e', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  fontChipActive: { backgroundColor: '#7c3aed' },
  overlayNote: { color: '#666', fontSize: 12, marginTop: 10 },
  captionCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#2a2a3e', alignItems: 'center' },
  captionPostBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#7c3aed', alignItems: 'center' },
  textToolBox: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
});