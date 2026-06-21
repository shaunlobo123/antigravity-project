// src/components/OrbAnimation.js
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Dimensions, Easing, TouchableOpacity, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function OrbAnimation({ isTreeOpen, onTreeAbsorbComplete, onOrbPress, onReachedIcon }) {
  // Coordinates tracking
  const moveX = useRef(new Animated.Value(SCREEN_WIDTH / 2 - 15)).current;
  const moveY = useRef(new Animated.Value(SCREEN_HEIGHT * 0.45)).current;
  
  // Visual tracking
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Track stages: 'initial' | 'waiting' | 'absorbing'
  const [stage, setStage] = useState('initial');
  const pulseLoopRef = useRef(null);

  useEffect(() => {
    if (stage === 'initial') {
      // Step 1: Fly smoothly from the task completion card up to the top-left tree button corner
      Animated.parallel([
        Animated.timing(moveX, {
          toValue: 28, // Center with tree button left offset
          duration: 900,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(moveY, {
          toValue: Platform.OS === 'ios' ? 61 : 38, // Center with tree button vertically
          duration: 900,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setStage('waiting');
        if (onReachedIcon) {
          onReachedIcon();
        }
      });
    }
  }, [stage]);

  useEffect(() => {
    // Step 2: Continuous glowing loop while waiting at the top right corner
    if (stage === 'waiting') {
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoopRef.current.start();
    }

    return () => {
      if (pulseLoopRef.current) pulseLoopRef.current.stop();
    };
  }, [stage]);

  useEffect(() => {
    // Step 3: Trigger absorption when the user opens the tree view page
    if (isTreeOpen && stage === 'waiting') {
      setStage('absorbing');
      if (pulseLoopRef.current) pulseLoopRef.current.stop();

      // Reset standard pulse tracking safely for translation modifications
      pulseAnim.setValue(1);

      Animated.parallel([
        // Drop down into the absolute base root of the tree trunk
        Animated.timing(moveX, {
          toValue: SCREEN_WIDTH / 2 - 15,
          duration: 1100,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(moveY, {
          toValue: SCREEN_HEIGHT * 0.72, // Perfectly aligned to enter the HTML tree root base
          duration: 1100,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        // Shrink away and dissolve directly into the root system base
        Animated.sequence([
          Animated.delay(850),
          Animated.parallel([
            Animated.timing(scale, { toValue: 0.2, duration: 250, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
          ])
        ])
      ]).start(() => {
        if (onTreeAbsorbComplete) {
          onTreeAbsorbComplete();
        }
      });
    }
  }, [isTreeOpen, stage]);

  const handlePress = () => {
    if (stage === 'waiting' && onOrbPress) {
      onOrbPress();
    }
  };

  return (
    <Animated.View 
      style={[
        styles.orb, 
        {
          transform: [
            { translateX: moveX },
            { translateY: moveY },
            { scale: Animated.multiply(scale, pulseAnim) }
          ],
          opacity: stage === 'waiting' ? 0 : opacity,
          shadowOpacity: stage === 'waiting' ? 0 : 1,
          elevation: stage === 'waiting' ? 0 : 20,
        }
      ]} 
    >
      <TouchableOpacity 
        style={styles.touchableArea} 
        onPress={handlePress}
        activeOpacity={0.7}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFD700', // Highly vibrant gold
    zIndex: 9999,
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 25,
    elevation: 20,
  },
  touchableArea: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
  }
});