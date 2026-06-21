import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, View } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function Confetti() {
  const confettiPieces = useRef([]).current;

  useEffect(() => {
    // Generate 40 confetti pieces with random properties
    confettiPieces.length = 0;
    for (let i = 0; i < 40; i++) {
      confettiPieces.push({
        id: i,
        left: Math.random() * SCREEN_WIDTH,
        delay: Math.random() * 200,
        duration: 2000 + Math.random() * 1000,
        rotation: Math.random() * 360,
        emoji: ['🎉', '✨', '⭐', '🎊', '💫', '🌟'][Math.floor(Math.random() * 6)],
        animValue: new Animated.Value(0),
      });
    }

    // Animate all confetti pieces
    confettiPieces.forEach((piece) => {
      Animated.sequence([
        Animated.delay(piece.delay),
        Animated.timing(piece.animValue, {
          toValue: 1,
          duration: piece.duration,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, []);

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, width: SCREEN_WIDTH, height: SCREEN_HEIGHT, overflow: 'hidden', pointerEvents: 'none', zIndex: 1 }}>
      {confettiPieces.map((piece) => {
        const yTranslate = piece.animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, SCREEN_HEIGHT + 100],
        });

        const xOffset = Math.sin(piece.rotation) * 100;
        const xTranslate = piece.animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, xOffset],
        });

        const rotateZ = piece.animValue.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${piece.rotation * 3}deg`],
        });

        const opacity = piece.animValue.interpolate({
          inputRange: [0, 0.7, 1],
          outputRange: [1, 1, 0],
        });

        const scale = piece.animValue.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, 1, 0.3],
        });

        return (
          <Animated.View
            key={piece.id}
            style={{
              position: 'absolute',
              left: piece.left,
              top: -50,
              width: 40,
              height: 40,
              justifyContent: 'center',
              alignItems: 'center',
              transform: [
                { translateY: yTranslate },
                { translateX: xTranslate },
                { rotate: rotateZ },
                { scale },
              ],
              opacity,
            }}
          >
            <Animated.Text style={{ fontSize: 28, lineHeight: 40 }}>
              {piece.emoji}
            </Animated.Text>
          </Animated.View>
        );
      })}
    </View>
  );
}
