import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MOTIVATIONAL_QUOTES = [
  "Every triumph builds momentum.",
  "You're stronger than you think.",
  "This is how legends are built—one day at a time.",
  "You just proved you can do hard things.",
  "Your future self thanks you.",
  "This moment matters more than you know.",
  "Consistency is magic.",
];

export default function CelebrationScreen({
  task,
  totalTriumphs,
  streak,
  celebrationPhase,
  onPhaseComplete,
  capturedPhoto,
  onShare,
  onSkip,
}) {
  const titleScale = useRef(new Animated.Value(0.8)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const contentSlideIn = useRef(new Animated.Value(50)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  const [displayedQuote] = useState(
    MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(titleScale, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(contentSlideIn, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }, 300);
  }, []);

  const handleShare = () => {
    Haptics.selectionAsync();
    onShare?.();
  };

  const handleSkip = () => {
    Haptics.selectionAsync();
    onSkip?.();
  };

  if (celebrationPhase === 'impact') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.nonScrollableContent}>
          {/* Celebration emoji and title */}
          <View style={{ alignItems: 'center' }}>
            <Animated.Text
              style={[
                styles.celebrationEmoji,
                {
                  opacity: titleOpacity,
                  transform: [{ scale: titleScale }],
                },
              ]}
            >
              ✨
            </Animated.Text>

            <Animated.Text
              style={[
                styles.celebrationTitle,
                {
                  opacity: titleOpacity,
                  transform: [{ scale: titleScale }],
                },
              ]}
            >
              You did it.
            </Animated.Text>
          </View>

          {/* Task recap - minimal */}
          <View style={styles.taskRecapContainer}>
            <Text style={styles.taskRecapLabel}>Today's victory</Text>
            <Text style={styles.taskRecapText}>"{task}"</Text>
          </View>

          {/* Motivational quote */}
          <Animated.View
            style={[
              styles.quoteContainer,
              {
                opacity: contentOpacity,
                transform: [{ translateY: contentSlideIn }],
              },
            ]}
          >
            <Text style={styles.quoteText}>{displayedQuote}</Text>
          </Animated.View>

          {/* Stats section - clean and spacious */}
          <Animated.View
            style={[
              styles.statsContainer,
              {
                opacity: contentOpacity,
                transform: [{ translateY: contentSlideIn }],
              },
            ]}
          >
            <View style={styles.statRow}>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{totalTriumphs + 1}</Text>
                <Text style={styles.statLabel}>total wins</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{streak}</Text>
                <Text style={styles.statLabel}>day streak</Text>
              </View>
            </View>
          </Animated.View>

          {/* Next action button */}
          <TouchableOpacity
            style={[styles.primaryButton, { marginBottom: 10 }]}
            onPress={() => {
              Haptics.selectionAsync();
              onPhaseComplete?.();
            }}
          >
            <Text style={styles.primaryButtonText}>Capture this moment →</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              onSkip?.();
            }}
          >
            <Text style={styles.noThanksText}>No thanks</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fcfaf2',
  },
  nonScrollableContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 110,
    justifyContent: 'space-between',
    alignItems: 'stretch',
  },
  photoContent: {
    paddingHorizontal: 24,
    paddingBottom: 200,
  },

  celebrationEmoji: {
    fontSize: 64,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  celebrationTitle: {
    fontSize: 38,
    fontWeight: '800',
    textAlign: 'center',
    color: '#2d221a',
    letterSpacing: -0.5,
    marginBottom: 16,
  },

  taskRecapContainer: {
    backgroundColor: '#f3eade',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#d97706',
  },
  taskRecapLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8a7767',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  taskRecapText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d221a',
    lineHeight: 24,
  },

  quoteContainer: {
    marginBottom: 20,
  },
  quoteText: {
    fontSize: 20,
    fontWeight: '500',
    color: '#8a7767',
    textAlign: 'center',
    lineHeight: 30,
    fontStyle: 'italic',
  },

  statsContainer: {
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stat: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 16,
  },
  statNumber: {
    fontSize: 42,
    fontWeight: '800',
    color: '#d97706',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8a7767',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#e8dec9',
    marginHorizontal: 20,
  },

  photoTitle: {
    fontSize: 32,
    fontWeight: '600',
    color: '#2d221a',
    textAlign: 'center',
    marginBottom: 8,
  },
  photoSubtitle: {
    fontSize: 14,
    color: '#8a7767',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },

  photoPreviewContainer: {
    marginBottom: 24,
  },
  photoPreview: {
    width: '100%',
    height: 300,
    borderRadius: 20,
    backgroundColor: '#f3eade',
    marginBottom: 12,
  },
  retakeButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f3eade',
    borderRadius: 12,
    alignItems: 'center',
  },
  retakeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8a7767',
  },

  bottomActionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#fcfaf2',
    borderTopWidth: 1,
    borderTopColor: '#e8dec9',
  },

  primaryButton: {
    backgroundColor: '#d97706',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#d97706',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#fcfaf2',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  secondaryButton: {
    backgroundColor: '#f3eade',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e8dec9',
  },
  secondaryButtonText: {
    color: '#8a7767',
    fontSize: 15,
    fontWeight: '600',
  },
  noThanksText: {
    color: '#b59370',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
    paddingVertical: 6,
  },
});
