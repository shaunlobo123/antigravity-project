import React, { useEffect, useRef, memo, useState } from 'react';
import { StyleSheet, View, Dimensions, Animated, Text, Image, Easing, FlatList, TouchableOpacity, Modal, PanResponder, TextInput, Keyboard } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { G, Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import RollingNumber from './RollingNumber';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Fit the canvas to the largest safe area without overflowing the screen
const CANVAS_SIZE = Math.min(SCREEN_WIDTH * 0.98, Math.max(300, SCREEN_HEIGHT - 220));
const PANEL_WIDTH = SCREEN_WIDTH * 0.65;

const AnimatedG = Animated.createAnimatedComponent(G);

const REALISTIC_LEAF_PATH = "M 0 0 C -3 -6, -8 -12, -2 -20 C 4 -12, 1 -6, 0 0 M -2 -10 C -8 -12, -14 -10, -16 -16 C -10 -13, -5 -11, -2 -10 M 1 -8 C 6 -10, 12 -11, 15 -6 C 9 -8, 4 -7, 1 -8";
const BIRD_PATH = "M 0 10 Q 5 0 10 8 Q 15 0 20 10 Q 15 6 10 9 Q 5 6 0 10 Z";

const SCREEN_OFFSET = (SCREEN_WIDTH - CANVAS_SIZE) / 2;
const BIRD_START_X = -SCREEN_OFFSET - 60;
const BIRD_END_X = CANVAS_SIZE + SCREEN_OFFSET + 60;

const Bird = memo(({ id, initialDelay, onFinished }) => {
  const x = useRef(new Animated.Value(BIRD_START_X)).current;
  const y = useRef(Math.random() * (CANVAS_SIZE * 0.45) + 20).current;
  const scale = useRef(0.55 + Math.random() * 0.45).current;
  const duration = useRef(14000 + Math.random() * 8000).current;
  const opacity = useRef(0.35 + Math.random() * 0.3).current;

  useEffect(() => {
    let anim;
    const timer = setTimeout(() => {
      anim = Animated.timing(x, {
        toValue: BIRD_END_X,
        duration: duration,
        easing: Easing.linear,
        useNativeDriver: true,
      });
      anim.start(({ finished }) => {
        if (finished) {
          onFinished(id);
        }
      });
    }, initialDelay);

    return () => {
      clearTimeout(timer);
      if (anim) {
        anim.stop();
      }
    };
  }, [duration, id, initialDelay, onFinished, x]);

  return (
    <Animated.View style={[styles.birdContainer, { top: y, transform: [{ translateX: x }, { scale }] }]}>
      <Svg width={20} height={15}>
        <Path d={BIRD_PATH} fill="#94a3b8" opacity={opacity} />
      </Svg>
    </Animated.View>
  );
});
Bird.displayName = 'Bird';

const CANOPY_POSITIONS = [
  { id: 1, px: 0.50, py: 0.35, rot: 0, scale: 1.3 }, { id: 2, px: 0.42, py: 0.30, rot: -20, scale: 1.2 },
  { id: 3, px: 0.58, py: 0.30, rot: 20, scale: 1.2 }, { id: 4, px: 0.48, py: 0.22, rot: -10, scale: 1.1 },
  { id: 5, px: 0.53, py: 0.22, rot: 10, scale: 1.1 }, { id: 6, px: 0.35, py: 0.38, rot: -40, scale: 1.2 },
  { id: 7, px: 0.65, py: 0.38, rot: 40, scale: 1.2 }, { id: 8, px: 0.38, py: 0.24, rot: -30, scale: 1.1 },
  { id: 9, px: 0.63, py: 0.24, rot: 30, scale: 1.1 }, { id: 10, px: 0.30, py: 0.48, rot: -50, scale: 1.0 },
  { id: 11, px: 0.70, py: 0.48, rot: 50, scale: 1.0 }, { id: 12, px: 0.44, py: 0.15, rot: -15, scale: 1.2 },
  { id: 13, px: 0.57, py: 0.15, rot: 15, scale: 1.2 }, { id: 14, px: 0.22, py: 0.38, rot: -60, scale: 1.1 },
  { id: 15, px: 0.78, py: 0.38, rot: 60, scale: 1.1 }, { id: 16, px: 0.25, py: 0.28, rot: -50, scale: 1.2 },
  { id: 17, px: 0.75, py: 0.28, rot: 50, scale: 1.2 }, { id: 18, px: 0.33, py: 0.16, rot: -35, scale: 1.1 },
  { id: 19, px: 0.68, py: 0.16, rot: 35, scale: 1.1 }, { id: 20, px: 0.20, py: 0.51, rot: -70, scale: 1.0 },
  { id: 21, px: 0.80, py: 0.51, rot: 70, scale: 1.0 }, { id: 22, px: 0.28, py: 0.62, rot: -80, scale: 1.2 },
  { id: 23, px: 0.72, py: 0.62, rot: 80, scale: 1.2 }, { id: 24, px: 0.38, py: 0.56, rot: -45, scale: 1.1 },
  { id: 25, px: 0.63, py: 0.56, rot: 45, scale: 1.1 }, { id: 26, px: 0.32, py: 0.70, rot: -65, scale: 1.0 },
  { id: 27, px: 0.68, py: 0.70, rot: 65, scale: 1.0 }, { id: 28, px: 0.43, py: 0.65, rot: -30, scale: 1.2 },
  { id: 29, px: 0.58, py: 0.65, rot: 30, scale: 1.2 }, { id: 30, px: 0.50, py: 0.45, rot: 0, scale: 1.1 }
];

const formatMilestoneDate = (dateData) => {
  if (!dateData) return '';
  let date;
  if (typeof dateData === 'object' && dateData.toDate) {
    date = dateData.toDate();
  } else if (typeof dateData === 'number') {
    date = new Date(dateData > 9999999999 ? dateData : dateData * 1000);
  } else {
    date = new Date(dateData);
  }
  if (isNaN(date.getTime())) return '';

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const InteractiveLeaf = memo(({ config, isUnlocked, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(isUnlocked ? 1 : 0.8)).current;
  const prevUnlocked = useRef(isUnlocked);
  const x = config.px * CANVAS_SIZE;
  const y = config.py * CANVAS_SIZE;
  const visualScale = (config.scale || 1) * 1.6;

  useEffect(() => {
    if (!prevUnlocked.current && isUnlocked) {
      Animated.sequence([
        Animated.spring(scaleAnim, { toValue: 1.4, tension: 50, friction: 3, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 40, friction: 5, useNativeDriver: true })
      ]).start();
    }
    prevUnlocked.current = isUnlocked;
  }, [isUnlocked, scaleAnim]);

  return (
    <>
      <Circle cx={x} cy={y - 10} r={26} fill="transparent" onPress={() => {
        Animated.sequence([
          Animated.spring(scaleAnim, { toValue: 1.2, useNativeDriver: true }),
          Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true })
        ]).start();
        if (isUnlocked) Haptics.selectionAsync();
        if (isUnlocked && onPress) onPress();
      }} />
      <G transform={`translate(${x}, ${y})`}>
        <AnimatedG transform={[{ scale: scaleAnim }]}>
          <G transform={`rotate(${config.rot}) scale(${visualScale})`}>
            {isUnlocked ? (
              // Unlocked: bold gold fill, white outer stroke + deep amber inner stroke for contrast
              <>
                {/* White outline layer — renders behind to create separation from dark trunk */}
                <Path d={REALISTIC_LEAF_PATH} fill="none" stroke="#ffffff" strokeWidth={4} pointerEvents="none" opacity={0.9} />
                {/* Gold filled leaf with amber border */}
                <Path d={REALISTIC_LEAF_PATH} fill="url(#goldGradient)" stroke="#a75a0c" strokeWidth={1.8} pointerEvents="none" opacity={1} />
              </>
            ) : (
              // Locked: light slate with visible border so user can see slots to fill
              <Path d={REALISTIC_LEAF_PATH} fill="#d1d5db" stroke="#9ca3af" strokeWidth={1.5} pointerEvents="none" opacity={0.45} />
            )}
          </G>
        </AnimatedG>
      </G>
    </>
  );
});
InteractiveLeaf.displayName = 'InteractiveLeaf';

export default function GoldenTree({ history = [], onMilestonePanelChange, isTreeOpen = false }) {
  const completedCount = history.length;
  const [displayedCount, setDisplayedCount] = useState(completedCount);

  useEffect(() => {
    if (isTreeOpen) {
      setDisplayedCount(completedCount);
    }
  }, [isTreeOpen, completedCount]);

  // ── Bird state management for smooth spawning and off-screen lifecycles
  const [birds, setBirds] = useState([
    { id: 1, delay: 0 },
    { id: 2, delay: 4500 },
    { id: 3, delay: 2000 },
    { id: 4, delay: 7000 },
  ]);
  const nextBirdId = useRef(5);
  const activeTimers = useRef(new Set());

  useEffect(() => {
    const timers = activeTimers.current;
    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, []);

  const handleBirdFinished = (id) => {
    setBirds((prev) => prev.filter((b) => b.id !== id));
    // Schedule a new bird to spawn after a randomized delay
    const spawnDelay = 2000 + Math.random() * 4000;
    const timer = setTimeout(() => {
      activeTimers.current.delete(timer);
      setBirds((prev) => [...prev, { id: nextBirdId.current++, delay: 0 }]);
    }, spawnDelay);
    activeTimers.current.add(timer);
  };

  // Sun animation: travels from left to right across the scene
  // sunProgress: 0 = far left, 1 = far right
  const sunProgress = useRef(new Animated.Value(0)).current;


  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const flatListRef = useRef(null);
  const [milestoneNotes, setMilestoneNotes] = useState({});
  const [editingNoteId, setEditingNoteId] = useState(null);

  const slideAnim = useRef(new Animated.Value(-PANEL_WIDTH)).current;
  const fadeAnim = useRef(slideAnim.interpolate({
    inputRange: [-PANEL_WIDTH, 0],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  })).current;

  // Simple touch state for swipe detection
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const openPanel = (index) => {
    Haptics.selectionAsync();
    setCurrentSlideIndex(index);
    setIsModalVisible(true);
    slideAnim.setValue(-PANEL_WIDTH);
    Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }).start();
    setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToIndex({ index, animated: false });
      }
    }, 40);
  };

  const closePanel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.timing(slideAnim, { toValue: -PANEL_WIDTH, duration: 280, easing: Easing.out(Easing.ease), useNativeDriver: true }).start(() => {
      setIsModalVisible(false);
    });
  };




  // ── Sun animation: persistent loop regardless of which page is active
  useEffect(() => {
    const sunLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sunProgress, { toValue: 1, duration: 80000, easing: Easing.linear, useNativeDriver: true }),
        Animated.delay(4000),
        Animated.timing(sunProgress, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    sunLoop.start();
    return () => sunLoop.stop();
  }, [sunProgress]);


  useEffect(() => {
    if (typeof onMilestonePanelChange === 'function') {
      onMilestonePanelChange(isModalVisible);
    }
  }, [isModalVisible, onMilestonePanelChange]);

  const lastVisibleSlideIndex = useRef(0);
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const nextIndex = viewableItems[0].index;
      if (nextIndex !== lastVisibleSlideIndex.current) {
        Haptics.selectionAsync();
        lastVisibleSlideIndex.current = nextIndex;
      }
      setCurrentSlideIndex(nextIndex);
    }
  }).current;

  const onMomentumScrollEnd = (event) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / PANEL_WIDTH);
    if (nextIndex !== lastVisibleSlideIndex.current) {
      Haptics.selectionAsync();
      lastVisibleSlideIndex.current = nextIndex;
    }
    setCurrentSlideIndex(nextIndex);
  };

  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderMilestoneCard = ({ item, index }) => {
    const taskTitle = item.title || item.task || item.name || item.text || "Task Completed";
    const imageSource = item.image || item.picture || item.photo || item.imageUri || item.photoUrl;
    const description = item.description || item.notes || item.details;
    const dateData = item.date || item.createdAt || item.timestamp;
    const noteKey = item.id || index.toString();
    const isEditing = editingNoteId === noteKey;
    const noteText = milestoneNotes[noteKey] || '';

    return (
      <View style={styles.carouselSlide}>
        <Text style={styles.milestoneDayText}>Milestone {index + 1}</Text>
        <Text style={styles.milestoneTitle}>{taskTitle}</Text>

        {imageSource ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageSource }} style={styles.milestoneImage} />
          </View>
        ) : null}

        {/* Note section with pen icon */}
        {isEditing ? (
          <View style={styles.noteEditContainer}>
            <TextInput
              style={styles.noteTextInput}
              placeholder="Add a note about this milestone..."
              placeholderTextColor="#64748b"
              multiline
              autoFocus
              value={noteText}
              onChangeText={(text) => setMilestoneNotes(prev => ({ ...prev, [noteKey]: text }))}
              onBlur={() => setEditingNoteId(null)}
            />
          </View>
        ) : (
          <TouchableOpacity
            style={styles.noteRow}
            onPress={() => { Haptics.selectionAsync(); setEditingNoteId(noteKey); }}
            activeOpacity={0.7}
          >
            {noteText ? (
              <Text style={styles.noteDisplayText}>{noteText}</Text>
            ) : (
              <Text style={styles.notePlaceholderText}>Tap to add a note...</Text>
            )}
            <View style={styles.penIconWrapper}>
              <Text style={styles.penIconText}>✏</Text>
            </View>
          </TouchableOpacity>
        )}

        {description ? <Text style={styles.milestoneDescription}>{description}</Text> : null}
        <Text style={styles.milestoneDate}>{formatMilestoneDate(dateData)}</Text>
      </View>
    );
  };

  return (
    // SIMPLE SWIPE DETECTION: left-to-right swipe opens the milestone panel
    <View
      style={styles.container}
      onTouchStart={e => {
        touchStartX.current = e.nativeEvent.pageX;
        touchStartY.current = e.nativeEvent.pageY;
      }}
      onTouchEnd={e => {
        const dx = e.nativeEvent.pageX - touchStartX.current;
        const dy = Math.abs(e.nativeEvent.pageY - touchStartY.current);
        // Left-to-right swipe: at least 60px horizontal, less than 40px vertical drift
        if (dx > 60 && dy < 40 && history.length > 0 && !isModalVisible) {
          openPanel(0);
        }
      }}
    >
      <View style={styles.scrollContent}>
        <View style={styles.metricsHeaderBlock}>
          <Text style={styles.treeProgressCaption}>Discipline Canopy</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <RollingNumber
              value={Math.min(displayedCount, 30)}
              height={32}
              fontSize={26}
              fontWeight="900"
              color="#d97706"
              active={isTreeOpen}
            />
            <Text style={[styles.counterSuperText, { marginTop: 0, fontSize: 26, lineHeight: 32 }]}> / 30 Leaves</Text>
          </View>
        </View>

        <View style={styles.canvasContainer}>
          {birds.map((b) => (
            <Bird key={b.id} id={b.id} initialDelay={b.delay} onFinished={handleBirdFinished} />
          ))}


          {/* ☀️ Sun — rendered BEFORE tree image so it sits fully behind the trunk */}
          {(() => {
            const SUN_SIZE = CANVAS_SIZE * 0.13;
            const sunX = sunProgress.interpolate({
               inputRange: [0, 1],
               outputRange: [-(SUN_SIZE + SCREEN_WIDTH * 0.15), CANVAS_SIZE + SCREEN_WIDTH * 0.15],
            });
            const sunY = sunProgress.interpolate({
               inputRange: [0, 0.5, 1],
               outputRange: [0, -(CANVAS_SIZE * 0.50), 0],
            });
            return (
              // Single Animated container handles all movement; glow layers are children
              <Animated.View style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: SUN_SIZE,
                height: SUN_SIZE,
                transform: [{ translateX: sunX }, { translateY: sunY }],
              }}>
                {/* 5 overlapping glow layers — each barely visible, together they form a smooth radial blend */}
                {[
                  { mul: 5.5, alpha: 0.04 },
                  { mul: 4.0, alpha: 0.06 },
                  { mul: 2.8, alpha: 0.09 },
                  { mul: 1.9, alpha: 0.14 },
                  { mul: 1.35, alpha: 0.20 },
                ].map(({ mul, alpha }, i) => (
                  <View key={i} style={{
                    position: 'absolute',
                    width: SUN_SIZE * mul,
                    height: SUN_SIZE * mul,
                    borderRadius: (SUN_SIZE * mul) / 2,
                    backgroundColor: `rgba(253, 220, 80, ${alpha})`,
                    top: -(SUN_SIZE * (mul - 1) / 2),
                    left: -(SUN_SIZE * (mul - 1) / 2),
                  }} />
                ))}
                {/* Core disc */}
                <View style={{
                  width: SUN_SIZE,
                  height: SUN_SIZE,
                  borderRadius: SUN_SIZE / 2,
                  backgroundColor: '#fffde7',
                  shadowColor: '#fde68a',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 1,
                  shadowRadius: 18,
                  elevation: 20,
                }} />
              </Animated.View>
            );
          })()}

          <Image source={require('../../assets/image_86ac9a.png')} style={styles.baseTreeSkeletonImage} resizeMode="contain" />

          {/* SVG leaf layer — rendered AFTER the tree image so leaves appear in front and receive touches */}
          <Svg width={CANVAS_SIZE} height={CANVAS_SIZE} style={[StyleSheet.absoluteFillObject, { zIndex: 2 }]}>
            <Defs>
              <LinearGradient id="goldGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#d97706" />
                <Stop offset="50%" stopColor="#fbbf24" />
                <Stop offset="100%" stopColor="#fef08a" />
              </LinearGradient>
            </Defs>

            {CANOPY_POSITIONS.map((leaf, index) => (
              <InteractiveLeaf key={leaf.id} config={leaf} isUnlocked={index < displayedCount} onPress={() => openPanel(index)} />
            ))}
          </Svg>

          {/* ── Grass + Sun scene — lives INSIDE canvasContainer so grass overlaps roots ── */}
          {(() => {
          // Dense grass tufts spread across full width
          // Each tuft has x (0-1 of canvas width), scale (height/width), and bottom offset (px)
          const GRASS_TUFTS = [
            { key: 'g0',  x: -0.01, scale: 0.55, b: 0  },
            { key: 'g1',  x: 0.03,  scale: 0.25, b: 6  },
            { key: 'g2',  x: 0.07,  scale: 0.60, b: -3 },
            { key: 'g3',  x: 0.11,  scale: 0.32, b: 8  },
            { key: 'g4',  x: 0.15,  scale: 0.50, b: 2  },
            { key: 'g5',  x: 0.19,  scale: 0.20, b: 10 },
            { key: 'g6',  x: 0.23,  scale: 0.58, b: -4 },
            { key: 'g7',  x: 0.27,  scale: 0.28, b: 7  },
            { key: 'g8',  x: 0.31,  scale: 0.48, b: 1  },
            { key: 'g9',  x: 0.35,  scale: 0.18, b: 12 },
            { key: 'g10', x: 0.39,  scale: 0.55, b: -2 },
            { key: 'g11', x: 0.43,  scale: 0.30, b: 5  },
            { key: 'g12', x: 0.47,  scale: 0.60, b: 0  },
            { key: 'g13', x: 0.51,  scale: 0.22, b: 9  },
            { key: 'g14', x: 0.55,  scale: 0.52, b: -3 },
            { key: 'g15', x: 0.59,  scale: 0.35, b: 4  },
            { key: 'g16', x: 0.63,  scale: 0.58, b: 11 },
            { key: 'g17', x: 0.67,  scale: 0.20, b: -1 },
            { key: 'g18', x: 0.71,  scale: 0.48, b: 6  },
            { key: 'g19', x: 0.75,  scale: 0.28, b: 3  },
            { key: 'g20', x: 0.79,  scale: 0.55, b: -4 },
            { key: 'g21', x: 0.83,  scale: 0.18, b: 8  },
            { key: 'g22', x: 0.87,  scale: 0.60, b: 0  },
            { key: 'g23', x: 0.91,  scale: 0.25, b: 10 },
            { key: 'g24', x: 0.95,  scale: 0.50, b: -2 },
            { key: 'g25', x: 0.98,  scale: 0.30, b: 5  },
            // second layer offset for density
            { key: 'h0',  x: 0.01,  scale: 0.40, b: 7  },
            { key: 'h1',  x: 0.05,  scale: 0.58, b: -3 },
            { key: 'h2',  x: 0.09,  scale: 0.22, b: 9  },
            { key: 'h3',  x: 0.13,  scale: 0.55, b: 2  },
            { key: 'h4',  x: 0.17,  scale: 0.30, b: 11 },
            { key: 'h5',  x: 0.21,  scale: 0.60, b: -4 },
            { key: 'h6',  x: 0.25,  scale: 0.20, b: 6  },
            { key: 'h7',  x: 0.29,  scale: 0.48, b: 0  },
            { key: 'h8',  x: 0.33,  scale: 0.35, b: 8  },
            { key: 'h9',  x: 0.37,  scale: 0.58, b: -2 },
            { key: 'h10', x: 0.41,  scale: 0.18, b: 12 },
            { key: 'h11', x: 0.45,  scale: 0.52, b: 3  },
            { key: 'h12', x: 0.49,  scale: 0.28, b: -1 },
            { key: 'h13', x: 0.53,  scale: 0.60, b: 7  },
            { key: 'h14', x: 0.57,  scale: 0.22, b: 4  },
            { key: 'h15', x: 0.61,  scale: 0.50, b: -3 },
            { key: 'h16', x: 0.65,  scale: 0.32, b: 10 },
            { key: 'h17', x: 0.69,  scale: 0.55, b: 1  },
            { key: 'h18', x: 0.73,  scale: 0.20, b: 6  },
            { key: 'h19', x: 0.77,  scale: 0.48, b: -4 },
            { key: 'h20', x: 0.81,  scale: 0.25, b: 9  },
            { key: 'h21', x: 0.85,  scale: 0.58, b: 2  },
            { key: 'h22', x: 0.89,  scale: 0.18, b: 5  },
            { key: 'h23', x: 0.93,  scale: 0.52, b: -2 },
            { key: 'h24', x: 0.97,  scale: 0.30, b: 11 },
          ];

          const GRASS_BASE_W = 72;
          const GRASS_BASE_H = 72;

          return (
            <View style={styles.sceneContainer}>
              {/* Dense grey grass row — each tuft has its own bottom offset */}
              {GRASS_TUFTS.map(tuft => (
                <Image
                  key={tuft.key}
                  source={require('../../assets/grass.png')}
                  style={[
                    styles.grassTuft,
                    {
                      width: GRASS_BASE_W * tuft.scale * (CANVAS_SIZE / 340),
                      height: GRASS_BASE_H * tuft.scale * (CANVAS_SIZE / 340),
                      left: tuft.x * CANVAS_SIZE,
                      bottom: tuft.b,
                    },
                  ]}
                  resizeMode="contain"
                />
              ))}
            </View>
          );
        })()}
        </View>

        {/* Stray grass fade strip — sparse tufts that dissolve downward toward the quote */}
        <View style={styles.stragglerContainer}>
          {[
            // ── Tier 1: densest, right below main clump (b: 78-95) ──
            { key: 'a0',  x: 0.00,  scale: 0.30, b: 90, op: 0.55 },
            { key: 'a1',  x: 0.04,  scale: 0.22, b: 94, op: 0.50 },
            { key: 'a2',  x: 0.08,  scale: 0.28, b: 85, op: 0.52 },
            { key: 'a3',  x: 0.12,  scale: 0.20, b: 92, op: 0.48 },
            { key: 'a4',  x: 0.16,  scale: 0.32, b: 88, op: 0.56 },
            { key: 'a5',  x: 0.20,  scale: 0.24, b: 95, op: 0.50 },
            { key: 'a6',  x: 0.24,  scale: 0.26, b: 80, op: 0.52 },
            { key: 'a7',  x: 0.28,  scale: 0.18, b: 93, op: 0.44 },
            { key: 'a8',  x: 0.32,  scale: 0.30, b: 86, op: 0.54 },
            { key: 'a9',  x: 0.36,  scale: 0.22, b: 91, op: 0.48 },
            { key: 'a10', x: 0.40,  scale: 0.28, b: 82, op: 0.52 },
            { key: 'a11', x: 0.44,  scale: 0.20, b: 95, op: 0.46 },
            { key: 'a12', x: 0.48,  scale: 0.32, b: 88, op: 0.54 },
            { key: 'a13', x: 0.52,  scale: 0.24, b: 84, op: 0.50 },
            { key: 'a14', x: 0.56,  scale: 0.26, b: 92, op: 0.48 },
            { key: 'a15', x: 0.60,  scale: 0.20, b: 79, op: 0.44 },
            { key: 'a16', x: 0.64,  scale: 0.30, b: 90, op: 0.52 },
            { key: 'a17', x: 0.68,  scale: 0.22, b: 86, op: 0.48 },
            { key: 'a18', x: 0.72,  scale: 0.28, b: 93, op: 0.50 },
            { key: 'a19', x: 0.76,  scale: 0.18, b: 81, op: 0.44 },
            { key: 'a20', x: 0.80,  scale: 0.26, b: 88, op: 0.50 },
            { key: 'a21', x: 0.84,  scale: 0.22, b: 95, op: 0.46 },
            { key: 'a22', x: 0.88,  scale: 0.30, b: 83, op: 0.52 },
            { key: 'a23', x: 0.92,  scale: 0.20, b: 90, op: 0.46 },
            { key: 'a24', x: 0.96,  scale: 0.26, b: 87, op: 0.50 },
            // ── Tier 2 (b: 58-77) ──
            { key: 'b0',  x: 0.02,  scale: 0.22, b: 72, op: 0.38 },
            { key: 'b1',  x: 0.09,  scale: 0.18, b: 66, op: 0.34 },
            { key: 'b2',  x: 0.17,  scale: 0.24, b: 75, op: 0.40 },
            { key: 'b3',  x: 0.24,  scale: 0.16, b: 60, op: 0.32 },
            { key: 'b4',  x: 0.31,  scale: 0.20, b: 70, op: 0.36 },
            { key: 'b5',  x: 0.39,  scale: 0.22, b: 63, op: 0.38 },
            { key: 'b6',  x: 0.46,  scale: 0.18, b: 77, op: 0.34 },
            { key: 'b7',  x: 0.53,  scale: 0.24, b: 58, op: 0.40 },
            { key: 'b8',  x: 0.61,  scale: 0.16, b: 68, op: 0.32 },
            { key: 'b9',  x: 0.69,  scale: 0.22, b: 74, op: 0.38 },
            { key: 'b10', x: 0.77,  scale: 0.18, b: 62, op: 0.34 },
            { key: 'b11', x: 0.85,  scale: 0.20, b: 70, op: 0.36 },
            { key: 'b12', x: 0.94,  scale: 0.16, b: 65, op: 0.32 },
            // ── Tier 3 (b: 38-57) ──
            { key: 'c0',  x: 0.05,  scale: 0.16, b: 52, op: 0.26 },
            { key: 'c1',  x: 0.14,  scale: 0.12, b: 44, op: 0.22 },
            { key: 'c2',  x: 0.23,  scale: 0.18, b: 56, op: 0.28 },
            { key: 'c3',  x: 0.33,  scale: 0.14, b: 40, op: 0.24 },
            { key: 'c4',  x: 0.43,  scale: 0.16, b: 50, op: 0.26 },
            { key: 'c5',  x: 0.54,  scale: 0.12, b: 38, op: 0.22 },
            { key: 'c6',  x: 0.63,  scale: 0.18, b: 54, op: 0.28 },
            { key: 'c7',  x: 0.73,  scale: 0.14, b: 46, op: 0.24 },
            { key: 'c8',  x: 0.82,  scale: 0.16, b: 42, op: 0.22 },
            { key: 'c9',  x: 0.91,  scale: 0.12, b: 57, op: 0.26 },
            // ── Tier 4 (b: 18-37) ──
            { key: 'd0',  x: 0.07,  scale: 0.12, b: 32, op: 0.16 },
            { key: 'd1',  x: 0.19,  scale: 0.10, b: 25, op: 0.14 },
            { key: 'd2',  x: 0.30,  scale: 0.14, b: 36, op: 0.18 },
            { key: 'd3',  x: 0.42,  scale: 0.10, b: 22, op: 0.14 },
            { key: 'd4',  x: 0.52,  scale: 0.12, b: 30, op: 0.16 },
            { key: 'd5',  x: 0.64,  scale: 0.10, b: 18, op: 0.13 },
            { key: 'd6',  x: 0.75,  scale: 0.12, b: 34, op: 0.16 },
            { key: 'd7',  x: 0.87,  scale: 0.10, b: 26, op: 0.14 },
            // ── Tier 5: ghost wisps near the quote (b: 0-17) ──
            { key: 'e0',  x: 0.04,  scale: 0.09, b: 14, op: 0.09 },
            { key: 'e1',  x: 0.15,  scale: 0.08, b: 8,  op: 0.07 },
            { key: 'e2',  x: 0.27,  scale: 0.10, b: 16, op: 0.10 },
            { key: 'e3',  x: 0.38,  scale: 0.08, b: 5,  op: 0.07 },
            { key: 'e4',  x: 0.50,  scale: 0.09, b: 12, op: 0.08 },
            { key: 'e5',  x: 0.62,  scale: 0.08, b: 3,  op: 0.06 },
            { key: 'e6',  x: 0.74,  scale: 0.09, b: 10, op: 0.08 },
            { key: 'e7',  x: 0.85,  scale: 0.08, b: 17, op: 0.09 },
            { key: 'e8',  x: 0.95,  scale: 0.08, b: 6,  op: 0.06 },
          ].map(t => (
            <Image
              key={t.key}
              source={require('../../assets/grass.png')}
              style={{
                position: 'absolute',
                bottom: t.b,
                left: t.x * CANVAS_SIZE,
                width:  72 * t.scale * (CANVAS_SIZE / 340),
                height: 72 * t.scale * (CANVAS_SIZE / 340),
                tintColor: '#334155',
                opacity: t.op,
              }}
              resizeMode="contain"
            />
          ))}
        </View>

        {/* Inspirational Quote */}
        <Text style={styles.quoteText}>“One good thing a day, grown into a forest of triumphs.”</Text>

      </View>

      {/* SIDEBAR PANEL OVERLAY (NOT MODAL) */}
      <View style={[StyleSheet.absoluteFill, { zIndex: 100 }]} pointerEvents={isModalVisible ? 'auto' : 'none'}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim, backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closePanel} />
        </Animated.View>

        <Animated.View
          style={[styles.sidePanelWindow, { transform: [{ translateX: slideAnim }] }]}
        >
          <FlatList
            ref={flatListRef}
            data={history}
            keyExtractor={(item, index) => index.toString()}
            renderItem={renderMilestoneCard}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewConfigRef}
            onMomentumScrollEnd={onMomentumScrollEnd}
            initialScrollIndex={currentSlideIndex}
            getItemLayout={(data, index) => ({ length: PANEL_WIDTH, offset: PANEL_WIDTH * index, index })}
          />

          <View style={styles.dotsContainer}>
            {history.map((_, index) => (
              <View key={index} style={[styles.dot, currentSlideIndex === index ? styles.activeDot : styles.inactiveDot]} />
            ))}
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcfaf2' }, // Warm ivory background
  scrollContent: { flex: 1, alignItems: 'center', paddingTop: 20, paddingBottom: 110 },
  metricsHeaderBlock: { alignItems: 'center', marginBottom: 10 },
  treeProgressCaption: { color: '#8a7767', fontSize: 11, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },
  counterSuperText: { color: '#d97706', fontSize: 26, fontWeight: '900', marginTop: 4 }, // Warm honey amber

  canvasContainer: {
    width: CANVAS_SIZE, height: CANVAS_SIZE, position: 'relative',
    justifyContent: 'center', alignItems: 'center',
  },
  baseTreeSkeletonImage: { width: '100%', height: '100%', position: 'absolute', zIndex: 0 },
  birdContainer: { position: 'absolute', zIndex: 1 },
  treeFooterHint: { color: '#8a7767', fontSize: 13, fontWeight: '500', textAlign: 'center', marginTop: 15, paddingHorizontal: 36, lineHeight: 19.5 }, // 1.5x lineHeight

  // Grass + Sun scene — absolutely positioned at the bottom of canvasContainer
  sceneContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: CANVAS_SIZE,
    height: CANVAS_SIZE * 0.22,
  },
  grassTuft: {
    position: 'absolute',
    tintColor: '#bda68f', // Warm earthy color to blend in light mode
    opacity: 0.85,
  },
  sun: {
    position: 'absolute',
    backgroundColor: '#fffde7',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 10,
    opacity: 0.92,
  },

  // Stray grass that fades out below the main clump, drifting toward the quote
  stragglerContainer: {
    width: CANVAS_SIZE,
    height: 140,
    position: 'relative',
    marginTop: -14,
  },

  quoteText: {
    color: '#3b2f27',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 40,
    opacity: 0.8,
    lineHeight: 21, // 1.5x lineHeight
    fontWeight: '500',
    marginBottom: 80,
  },

  sidePanelWindow: {
    position: 'absolute', top: 0, left: 0, bottom: 0, width: PANEL_WIDTH,
    backgroundColor: '#fffdf9', borderRightWidth: 1, borderRightColor: '#e8dec9',
    shadowColor: '#2d221a', shadowOffset: { width: 5, height: 0 }, shadowOpacity: 0.12,
    shadowRadius: 15, elevation: 20, paddingTop: 80, paddingBottom: 110,
  },

  carouselSlide: { width: PANEL_WIDTH, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center' },
  milestoneDayText: { color: '#d97706', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },
  milestoneTitle: { color: '#2d221a', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },

  imageContainer: { width: PANEL_WIDTH - 40, height: PANEL_WIDTH - 40, borderRadius: 18, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#e8dec9' },
  milestoneImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  milestoneDescription: { color: '#8a7767', fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 15 }, // 1.5x lineHeight
  milestoneDate: { color: '#b59370', fontSize: 13, fontWeight: '600', fontStyle: 'italic', marginTop: 'auto' },

  dotsContainer: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', paddingHorizontal: 20, marginTop: 10, paddingBottom: 10 },
  dot: { width: 7, height: 7, borderRadius: 3.5, marginHorizontal: 4, marginVertical: 4 },
  activeDot: { backgroundColor: '#d97706', width: 9, height: 9, borderRadius: 4.5 },
  inactiveDot: { backgroundColor: '#e8dec9' },

  // Milestone inline note styles
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5efe4',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e8dec9',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 14,
    width: '100%',
    minHeight: 48,
  },
  noteDisplayText: {
    flex: 1,
    color: '#3b2f27',
    fontSize: 14,
    lineHeight: 21, // 1.5x lineHeight
    marginRight: 10,
  },
  notePlaceholderText: {
    flex: 1,
    color: '#8a7767',
    fontSize: 13,
    fontStyle: 'italic',
    marginRight: 10,
  },
  penIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: 'rgba(217, 119, 6, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  penIconText: {
    fontSize: 16,
    color: '#d97706',
  },
  noteEditContainer: {
    marginTop: 14,
    width: '100%',
    backgroundColor: '#fffdf9',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#d97706',
    padding: 12,
  },
  noteTextInput: {
    color: '#3b2f27',
    fontSize: 14,
    lineHeight: 21, // 1.5x lineHeight
    minHeight: 70,
    textAlignVertical: 'top',
  },
});