import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
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
  onSkipPhoto,
  capturedPhoto,
  selectedPhoto,
  onShare,
  onSkipShare,
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
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
            <Text style={styles.taskRecapLabel}>Today&apos;s victory</Text>
            <Text style={styles.taskRecapText}>&quot;{task}&quot;</Text>
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
              onSkipPhoto?.();
            }}
          >
            <Text style={styles.noThanksText}>No thanks</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (celebrationPhase === 'share_prompt') {
    const displayPhoto = capturedPhoto || selectedPhoto;
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.nonScrollableContent}>
          <View style={{ alignItems: 'center', marginTop: 10 }}>
            <Text style={styles.celebrationTitle}>Inspire others.</Text>
            <Text style={styles.photoSubtitle}>Share your victory to the public feed, or keep it private to your own tree.</Text>
          </View>

          <View style={styles.photoPreviewContainer}>
             <Animated.Image source={{ uri: displayPhoto }} style={styles.photoPreview} resizeMode="cover" />
          </View>

          <View>
            <TouchableOpacity style={styles.primaryButton} onPress={handleShare}>
              <Text style={styles.primaryButtonText}>Share to Feed</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => { Haptics.selectionAsync(); onSkipShare?.(); }}>
              <Text style={styles.secondaryButtonText}>Keep Private</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
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
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 16,
  },

  taskRecapContainer: {
    backgroundColor: colors.borderLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  taskRecapLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  taskRecapText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 24,
  },

  quoteContainer: {
    marginBottom: 20,
  },
  quoteText: {
    fontSize: 20,
    fontWeight: '500',
    color: colors.textMuted,
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
    color: colors.accent,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 50,
    backgroundColor: colors.border,
    marginHorizontal: 20,
  },

  photoTitle: {
    fontSize: 32,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  photoSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
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
    backgroundColor: colors.borderLight,
    marginBottom: 12,
  },
  retakeButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.borderLight,
    borderRadius: 12,
    alignItems: 'center',
  },
  retakeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },

  bottomActionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  primaryButton: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: colors.accent,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  primaryButtonText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  secondaryButton: {
    backgroundColor: colors.borderLight,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  noThanksText: {
    color: colors.textSection,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
    paddingVertical: 6,
  },
});
