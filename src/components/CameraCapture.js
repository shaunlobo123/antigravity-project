import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Alert,
  Animated,
  Image,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CameraCapture({ onPhotoCaptured, onCancel, onSkip, task }) {
  const [facing, setFacing] = useState('back');
  const [zoom, setZoom] = useState(0);
  const [flash, setFlash] = useState('off');
  const [mode, setMode] = useState('picture'); // 'picture' | 'video'
  const [isRecording, setIsRecording] = useState(false);
  const [mediaType, setMediaType] = useState('photo'); // 'photo' | 'video'

  const handleToggleFacing = () => {
    Haptics.selectionAsync();
    setFacing(prev => (prev === 'back' ? 'front' : 'back'));
  };

  const handleToggleFlash = () => {
    Haptics.selectionAsync();
    setFlash(prev => {
      if (prev === 'off') return 'on';
      if (prev === 'on') return 'auto';
      return 'off';
    });
  };

  const cameraRef = useRef(null);
  const isMounted = useRef(true);
  const [permission, requestPermission] = useCameraPermissions();
  const [hasCapture, setHasCapture] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    isMounted.current = true;
    (async () => {
      if (!permission?.granted) {
        await requestPermission();
      }
    })();

    return () => {
      isMounted.current = false;
    };
  }, [permission, requestPermission]);

  const handleTakePicture = async () => {
    try {
      Haptics.selectionAsync();
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
        });
        if (!isMounted.current) return;
        setCapturedPhoto(photo.uri);
        setMediaType('photo');
        setHasCapture(true);

        Animated.parallel([
          Animated.timing(slideAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start();
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    }
  };

  const startRecording = async () => {
    if (cameraRef.current) {
      try {
        setIsRecording(true);
        const video = await cameraRef.current.recordAsync({
          maxDuration: 15,
        });
        if (video && isMounted.current) {
          setCapturedPhoto(video.uri);
          setMediaType('video');
          setHasCapture(true);

          Animated.parallel([
            Animated.timing(slideAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          ]).start();
        }
      } catch (err) {
        console.error("Failed to record video", err);
      } finally {
        setIsRecording(false);
      }
    }
  };

  const stopRecording = async () => {
    if (cameraRef.current && isRecording) {
      await cameraRef.current.stopRecording();
      setIsRecording(false);
    }
  };

  const handleShutterPress = () => {
    if (mode === 'picture') {
      handleTakePicture();
    } else {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    }
  };

  const handlePickFromLibrary = async () => {
    try {
      Haptics.selectionAsync();
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 15,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedAsset = result.assets[0];

        // Validation: Limit video duration to 15 seconds (15000 ms)
        if (pickedAsset.type === 'video' && pickedAsset.duration && pickedAsset.duration > 15000) {
          Alert.alert("Video Too Long", "Please choose a video that is 15 seconds or shorter.");
          return;
        }

        setCapturedPhoto(pickedAsset.uri);
        setMediaType(pickedAsset.type === 'video' ? 'video' : 'photo');
        setHasCapture(true);

        Animated.parallel([
          Animated.timing(slideAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start();
      }
    } catch (err) {
      console.log("Error picking from library:", err);
      Alert.alert("Error", "Could not access photo library.");
    }
  };

  const handleRetake = () => {
    Haptics.selectionAsync();
    setCapturedPhoto(null);
    setHasCapture(false);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const handlePublish = () => {
    Haptics.selectionAsync();
    onPhotoCaptured({ uri: capturedPhoto, type: mediaType });
  };

  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorTitle}>Camera Access Required</Text>
          <Text style={styles.errorMessage}>
            To capture your victory, please enable camera access in your phone settings.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              Haptics.selectionAsync();
              onCancel?.();
            }}
          >
            <Text style={styles.primaryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (hasCapture) {
    return (
      <SafeAreaView style={styles.fullscreenContainer}>
        <Animated.View
          style={[
            styles.fullscreenAnimatedView,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [60, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.fullscreenNoteTitle}>Your victory is captured ✨</Text>

          {/* Captured Photo/Video and Task Text Container */}
          <View style={styles.imageAndTaskContainer}>
            {capturedPhoto && (
              mediaType === 'video' ? (
                <Video
                  source={{ uri: capturedPhoto }}
                  rate={1.0}
                  volume={1.0}
                  isMuted={false}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay
                  isLooping
                  style={styles.fullscreenPreviewImage}
                />
              ) : (
                <Image
                  source={{ uri: capturedPhoto }}
                  style={styles.fullscreenPreviewImage}
                  resizeMode="cover"
                />
              )
            )}
            <View style={styles.taskOverlayBox}>
              <Text style={styles.taskOverlayLabel}>TODAY&apos;S VICTORY</Text>
              <Text style={styles.taskOverlayText} numberOfLines={3}>&quot;{task}&quot;</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionSection}>
            <TouchableOpacity style={styles.retakeButtonLarge} onPress={handleRetake}>
              <Text style={styles.retakeButtonTextLarge}>Retake Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.primaryButtonBig} onPress={handlePublish}>
              <Text style={styles.primaryButtonTextBig}>Publish to Feed</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                onSkip?.();
              }}
              style={{ marginTop: 16, alignSelf: 'center', paddingVertical: 8 }}
            >
              <Text style={styles.noThanksText}>No thanks</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cameraWrapper}>
        <CameraView 
          style={styles.camera} 
          ref={cameraRef} 
          facing={facing}
          zoom={zoom}
          flash={flash}
          mode={mode}
        >
          {/* Top control bar overlay */}
          <View style={styles.topControlBar}>
            <TouchableOpacity 
              style={styles.headerIconButton} 
              onPress={handleToggleFlash}
            >
              <Text style={styles.headerIconText}>
                {flash === 'off' ? 'FLASH: OFF' : flash === 'on' ? 'FLASH: ON' : 'FLASH: AUTO'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.headerIconButton} 
              onPress={handleToggleFacing}
            >
              <Text style={styles.headerIconText}>FLIP</Text>
            </TouchableOpacity>
          </View>

          {/* Floating minimal instruction banner */}
          <View style={styles.instructionContainer}>
            <Text style={styles.instructionSmall} numberOfLines={2}>&quot;{task}&quot;</Text>
          </View>
        </CameraView>
      </View>

      {/* PHOTO / VIDEO Mode Selectors */}
      <View style={styles.modeTabsContainer}>
        <TouchableOpacity 
          style={[styles.modeTab, mode === 'picture' && styles.modeTabActive]}
          onPress={() => { if (!isRecording) { Haptics.selectionAsync(); setMode('picture'); } }}
        >
          <Text style={[styles.modeTabText, mode === 'picture' && styles.modeTabTextActive]}>PHOTO</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.modeTab, mode === 'video' && styles.modeTabActive]}
          onPress={() => { if (!isRecording) { Haptics.selectionAsync(); setMode('video'); } }}
        >
          <Text style={[styles.modeTabText, mode === 'video' && styles.modeTabTextActive]}>VIDEO</Text>
        </TouchableOpacity>
      </View>

      {/* Minimalist Zoom Presets */}
      <View style={styles.zoomButtonsContainer}>
        <TouchableOpacity 
          style={[styles.zoomPill, zoom === 0 && styles.zoomPillActive]} 
          onPress={() => { Haptics.selectionAsync(); setZoom(0); }}
        >
          <Text style={[styles.zoomText, zoom === 0 && styles.zoomTextActive]}>1x</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.zoomPill, zoom === 0.08 && styles.zoomPillActive]} 
          onPress={() => { Haptics.selectionAsync(); setZoom(0.08); }}
        >
          <Text style={[styles.zoomText, zoom === 0.08 && styles.zoomTextActive]}>2x</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.zoomPill, zoom === 0.16 && styles.zoomPillActive]} 
          onPress={() => { Haptics.selectionAsync(); setZoom(0.16); }}
        >
          <Text style={[styles.zoomText, zoom === 0.16 && styles.zoomTextActive]}>3x</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={styles.libraryButton}
          onPress={handlePickFromLibrary}
          disabled={isRecording}
        >
          <Text style={styles.libraryButtonText}>Library</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.captureButton}
          onPress={handleShutterPress}
        >
          <View style={[
            styles.captureButtonInner,
            mode === 'video' && { backgroundColor: '#ef4444' },
            isRecording && { borderRadius: 6, width: 28, height: 28 }
          ]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => {
            if (isRecording) stopRecording();
            Haptics.selectionAsync();
            onCancel?.();
          }}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraWrapper: {
    height: SCREEN_HEIGHT * 0.50,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#3d2e22', // Dark outline
    overflow: 'hidden',
    marginHorizontal: 24,
    marginTop: 20,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  topControlBar: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  headerIconButton: {
    backgroundColor: 'rgba(26, 19, 15, 0.6)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3d2e22', // Clean outline
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconText: {
    color: '#f5eedc',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modeTabsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    marginTop: 16,
  },
  modeTab: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  modeTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#fb923c',
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#a69282',
    letterSpacing: 1,
  },
  modeTabTextActive: {
    color: '#fb923c',
  },
  libraryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flex: 1,
    alignItems: 'flex-start',
  },
  libraryButtonText: {
    color: '#a69282',
    fontSize: 15,
    fontWeight: '600',
  },
  zoomButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 24,
    marginBottom: 8,
  },
  zoomPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  zoomPillActive: {
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
  },
  zoomText: {
    color: '#a69282',
    fontSize: 13,
    fontWeight: '600',
  },
  zoomTextActive: {
    color: '#fb923c',
    fontWeight: '800',
  },
  noThanksText: {
    color: '#a69282',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  instructionContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(26, 19, 15, 0.9)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3d2e22',
  },
  instruction: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f5eedc',
    marginBottom: 4,
  },
  instructionSmall: {
    fontSize: 13,
    color: '#a69282',
    fontWeight: '600',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 18,
  },

  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 110,
    backgroundColor: 'transparent',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flex: 1,
    alignItems: 'flex-end',
  },
  cancelButtonText: {
    color: '#a69282',
    fontSize: 15,
    fontWeight: '600',
  },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#3d2e22', // Darker outer ring
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fb923c', // Glowing amber shutter center
  },
  spacer: {
    width: 40,
  },

  // Post-capture screen styles
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fullscreenAnimatedView: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 110,
    justifyContent: 'space-between',
  },
  fullscreenNoteTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#f5eedc',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  imageAndTaskContainer: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.42,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#1a130f',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#3d2e22',
    marginBottom: 20,
  },
  fullscreenPreviewImage: {
    width: '100%',
    height: '100%',
  },
  taskOverlayBox: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(18, 13, 9, 0.85)',
    padding: 16,
  },
  taskOverlayLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fb923c',
    letterSpacing: 1,
    marginBottom: 4,
  },
  taskOverlayText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  actionSection: {
    width: '100%',
    marginTop: 8,
  },
  retakeButtonLarge: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#3d2e22',
    backgroundColor: '#1a130f',
    marginBottom: 12,
  },
  retakeButtonTextLarge: {
    color: '#a69282',
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButtonBig: {
    backgroundColor: '#fb923c',
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: '#fb923c',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  primaryButtonTextBig: {
    color: '#120d09',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  centerContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  primaryButton: {
    backgroundColor: '#fb923c',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#120d09',
    fontSize: 16,
    fontWeight: '700',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f5eedc',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#a69282',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
});
