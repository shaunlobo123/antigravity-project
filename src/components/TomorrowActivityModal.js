import React, { useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Animated, Dimensions, PanResponder, StyleSheet, Keyboard, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function TomorrowActivityModal({ visible, onClose, tomorrowInput, setTomorrowInput, onSave }) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current; // start off-screen
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 300, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 300, useNativeDriver: true })
      ]).start();
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          // Dismiss
          onClose();
        } else {
          // Snap back
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const handleSave = () => {
    if (tomorrowInput.trim() === '') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      return;
    }
    Haptics.selectionAsync();
    onSave();
    onClose();
  };

  if (!visible) return null;

  return (
    <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
      <Animated.View
        style={[styles.modalContainer, { transform: [{ translateY: slideAnim }] }]}
        {...panResponder.panHandlers}
      >
        <View style={styles.pill} />
        <Text style={styles.heading}>What's your goal for tomorrow?</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Plan tomorrow's workout, set meeting agenda..."
          placeholderTextColor="#999"
          multiline
          value={tomorrowInput}
          onChangeText={setTomorrowInput}
          onSubmitEditing={Keyboard.dismiss}
        />
        <TouchableOpacity style={styles.button} onPress={handleSave}>
          <Text style={styles.buttonText}>Set Tomorrow's Goal</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
  },
  pill: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
    alignSelf: 'center',
    marginBottom: 12,
  },
  heading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2d221a',
    textAlign: 'center',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e8dec9',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2d221a',
    marginBottom: 16,
    minHeight: 80,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#d97706',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
