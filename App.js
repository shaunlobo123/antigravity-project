// App.js
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, Alert,
  SafeAreaView, Animated, Easing, Keyboard, Platform,
  Image, ScrollView, KeyboardAvoidingView,
  TouchableWithoutFeedback, Dimensions, PanResponder, FlatList, Pressable, Modal
} from 'react-native';
import Svg, { Path, Circle, Polyline } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Video, ResizeMode } from 'expo-av';

import { MOTIVATIONAL_MESSAGES, MOCK_PHOTOS } from './src/data/mockData';
import GoldenTree from './src/components/GoldenTree';
import OrbAnimation from './src/components/OrbAnimation';
import Confetti from './src/components/Confetti';
import CelebrationScreen from './src/components/CelebrationScreen';
import CameraCapture from './src/components/CameraCapture';
import RollingNumber from './src/components/RollingNumber';
import AuthScreen from './src/components/AuthScreen';
import ProfileTab from './src/components/ProfileTab';
import { useAuth } from './src/hooks/useAuth';
import { supabase } from './src/utils/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';


const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PANEL_WIDTH = SCREEN_WIDTH * (2 / 3); // 2/3 Right side details drawer layout width alignment

export default function App() {
  // ─── Auth Gate ────────────────────────────────────────────────────────────
  // Must be called before any other hooks (Rules of Hooks)
  const { session, loading: authLoading } = useAuth();

  // ─── Main App State ───────────────────────────────────────────────────────

  const [taskInput, setTaskInput] = useState('');
  const [tomorrowInput, setTomorrowInput] = useState('');
  const [activeTriumph, setActiveTriumph] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [hasShared, setHasShared] = useState(false);
  const [isOrbAnimating, setIsOrbAnimating] = useState(false);
  const [growthTrigger, setGrowthTrigger] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [celebrationPhase, setCelebrationPhase] = useState('impact'); // 'impact' | 'camera' | 'photo' | 'shared'
  const [showCameraCapture, setShowCameraCapture] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [capturedType, setCapturedType] = useState('photo'); // 'photo' | 'video'
  const [activeCommentsPostId, setActiveCommentsPostId] = useState(null);
  const [commentInputText, setCommentInputText] = useState('');
  const commentSheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT * 0.7)).current;

  const dismissCommentSheet = () => {
    triggerHapticSelection();
    Animated.timing(commentSheetTranslateY, {
      toValue: SCREEN_HEIGHT * 0.7,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setActiveCommentsPostId(null);
      commentSheetTranslateY.setValue(SCREEN_HEIGHT * 0.7);
    });
  };

  const handleOpenComments = (postId) => {
    triggerHapticSelection();
    commentSheetTranslateY.setValue(SCREEN_HEIGHT * 0.7);
    setActiveCommentsPostId(postId);
    Animated.spring(commentSheetTranslateY, {
      toValue: 0,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  };

  const commentPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Dragging downwards triggers gesture sheet translation
        return gestureState.dy > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          commentSheetTranslateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.5) {
          dismissCommentSheet();
        } else {
          Animated.spring(commentSheetTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 12,
          }).start();
        }
      },
    })
  ).current;

  const holdProgressAnim = useRef(new Animated.Value(0)).current;
  const [isHoldingComplete, setIsHoldingComplete] = useState(false);
  const cardScale = useRef(new Animated.Value(1)).current;

  // Selected details track node state object hook
  const [selectedNodeDetails, setSelectedNodeDetails] = useState(null);

  const [triumphHistory, setTriumphHistory] = useState([
    { id: 'seed-1', task: 'Planted the initial seed of discipline.', date: 'Yesterday', photo: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=500' }
  ]);
  const [streak, setStreak] = useState(5);
  const hasSavedTriumph = useRef(false);
  const totalTriumphs = triumphHistory.length;

  const [currentMessage] = useState(MOTIVATIONAL_MESSAGES[0]);
  const [selectedPhoto, setSelectedPhoto] = useState(MOCK_PHOTOS[0].url);
  const [tomorrowTaskSaved, setTomorrowTaskSaved] = useState(false);
  const [isTreeIconPulsating, setIsTreeIconPulsating] = useState(false);
  const headerPulseAnim = useRef(new Animated.Value(1)).current;

  const [currentPage, setCurrentPage] = useState(1); // 0 = Tree, 1 = Feed, 2 = Profile
  const pageScrollRef = useRef(null);
  const isTreeOpen = currentPage === 0;

  const [isPlanningTomorrow, setIsPlanningTomorrow] = useState(false);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);

  const tomorrowSlide = useRef(new Animated.Value(-SCREEN_HEIGHT)).current;
  const panelSlide = useRef(new Animated.Value(PANEL_WIDTH)).current; // Node info panel spring control anchor
  const scrollX = useRef(new Animated.Value(SCREEN_WIDTH)).current; // Track page scroll position for fluid navigation island

  const setupFadeAnim = useRef(new Animated.Value(1)).current;
  const activeCardFade = useRef(new Animated.Value(1)).current;
  const celebCardFade = useRef(new Animated.Value(0)).current;
  const celebCardScale = useRef(new Animated.Value(0.8)).current;
  const celebCardTranslateY = useRef(new Animated.Value(100)).current;
  const feedListFade = useRef(new Animated.Value(0)).current;
  const workspaceHeightAnim = useRef(new Animated.Value(160)).current;
  const keyboardShiftAnim = useRef(new Animated.Value(0)).current;
  const scrollOffset = useRef(0);
  const slideState = useRef({ panel: false });
  const tomorrowPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5 && gestureState.dy < 0,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          tomorrowSlide.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -100) {
          closeTomorrow();
        } else {
          Animated.spring(tomorrowSlide, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 9
          }).start();
        }
      }
    })
  ).current;

  const stateRef = useRef({ activeTriumph });
  const isProgrammaticScroll = useRef(false);
  const triggerHapticSelection = () => { Haptics.selectionAsync(); };
  const triggerHapticImpact = () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); };
  const triggerHapticHoldStart = () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); };
  useEffect(() => {
    stateRef.current = { activeTriumph };
  }, [activeTriumph]);
  useEffect(() => {
    const listenerId = scrollX.addListener(({ value }) => {
      if (isProgrammaticScroll.current) return;
      const index = Math.round(value / SCREEN_WIDTH);
      const boundedIndex = Math.max(0, Math.min(2, index));
      if (boundedIndex !== currentPage) {
        setCurrentPage(boundedIndex);
        triggerHapticSelection();
      }
    });
    return () => {
      scrollX.removeListener(listenerId);
    };
  }, [currentPage, scrollX]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showListener = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardShiftAnim, {
        toValue: Platform.OS === 'ios' ? -e.endCoordinates.height * 0.45 : -80,
        duration: e.duration || 250,
        useNativeDriver: true,
      }).start();
    });

    const hideListener = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardShiftAnim, {
        toValue: 0,
        duration: e.duration || 200,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);
  useEffect(() => {
    let loop;
    if (isTreeIconPulsating) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(headerPulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(headerPulseAnim, {
            toValue: 0.8,
            duration: 800,
            useNativeDriver: true,
          })
        ])
      );
      loop.start();
    } else {
      headerPulseAnim.setValue(1);
    }
    return () => {
      if (loop) loop.stop();
    };
  }, [isTreeIconPulsating]);

  useEffect(() => {
    if (currentPage === 0) {
      setIsTreeIconPulsating(false);
    }
  }, [currentPage]);
  const [feedData, setFeedData] = useState([
    {
      id: 'f1',
      user: 'marcus_vance',
      task: 'Ran 5k and picked up local trail litter',
      img: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=500',
      likes: 24,
      liked: false,
      time: '2h ago',
      mutualFriend: 'clara_dev',
      commentCount: 3,
      comments: [
        { id: 'c1', user: 'clara_dev', text: 'This is incredible Marcus! Keep it up! 👏', time: '1h ago' },
        { id: 'c2', user: 'alex_growth', text: '5k run is no joke! Inspiring!', time: '45m ago' },
        { id: 'c3', user: 'your_triumphs', text: 'Clean trails, clear mind. Love this. 🌲', time: '30m ago' },
      ],
    },
    {
      id: 'f2',
      user: 'elena_rostova',
      task: 'Left a surprise coffee gift card on a coworker\'s desk',
      img: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=500',
      likes: 42,
      liked: false,
      time: '4h ago',
      mutualFriend: 'alex_growth',
      commentCount: 4,
      comments: [
        { id: 'c4', user: 'alex_growth', text: 'You made their day Elena! ☕️', time: '3h ago' },
        { id: 'c5', user: 'marcus_vance', text: 'Small acts of kindness build a better world.', time: '2h ago' },
        { id: 'c6', user: 'clara_dev', text: 'This is so sweet! Heartwarming.', time: '1h ago' },
        { id: 'c7', user: 'your_triumphs', text: 'Will definitely try doing this tomorrow!', time: '10m ago' },
      ],
    },
  ]);

  const scrollY = useRef(new Animated.Value(0)).current;
  const feedListRef = useRef(null);
  const lastTapRef = useRef({});
  const heartAnimationsRef = useRef({});

  feedData.forEach(item => {
    if (!heartAnimationsRef.current[item.id]) heartAnimationsRef.current[item.id] = new Animated.Value(0);
  });

  const openTree = () => {
    if (!isCompleted) {
      Alert.alert("Locked", "Complete today's task first to unlock the Progress Tree!");
      return;
    }
    triggerHapticSelection();
    pageScrollRef.current?.scrollTo({ x: 0, animated: true });
    setCurrentPage(0);
  };
  const closeTree = () => {
    triggerHapticSelection();
    pageScrollRef.current?.scrollTo({ x: SCREEN_WIDTH, animated: true });
    setCurrentPage(1);
  };

  const openTomorrow = () => { triggerHapticSelection(); Keyboard.dismiss(); Animated.timing(tomorrowSlide, { toValue: 0, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: true }).start(() => setIsPlanningTomorrow(true)); };
  const closeTomorrow = () => { triggerHapticSelection(); Animated.timing(tomorrowSlide, { toValue: -SCREEN_HEIGHT, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }).start(() => setIsPlanningTomorrow(false)); };

  // Trigger Slide Drawer details panel sequence layout logic
  const handleNodeSelectFromCanvas = (nodeId) => {
    const itemMatch = triumphHistory.find(node => node.id === nodeId);
    if (itemMatch) {
      setSelectedNodeDetails(itemMatch);
      slideState.current.panel = true;
      Animated.spring(panelSlide, {
        toValue: 0, // Slide onto viewport grid layout
        tension: 80,
        friction: 12,
        useNativeDriver: true
      }).start();
    }
  };

  const closeNodePanel = () => {
    slideState.current.panel = false;
    Animated.timing(panelSlide, {
      toValue: PANEL_WIDTH, // Cache off right screen edge boundaries
      duration: 200,
      useNativeDriver: true
    }).start(() => setSelectedNodeDetails(null));
  };



  const handleLockIn = () => {
    if (taskInput.trim() === '') { triggerHapticImpact(); return Alert.alert("Empty Focus", "Declare your triumph first!"); }
    triggerHapticSelection();
    Keyboard.dismiss();

    // Smooth transition: Fade & scale out the setup view
    Animated.timing(setupFadeAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true
    }).start(() => {
      setActiveTriumph(taskInput);
      activeCardFade.setValue(0);
      celebCardFade.setValue(0);
      workspaceHeightAnim.setValue(160);
      setGrowthTrigger(false);
      hasSavedTriumph.current = false;

      // Fade in the active task card smoothly
      Animated.timing(activeCardFade, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true
      }).start();
    });
  };

  const handleCompleteTrigger = () => {
    triggerHapticImpact();
    setIsCompleted(true);
    setShowConfetti(true);
    setCelebrationPhase('impact');
    setIsHoldingComplete(false);
    holdProgressAnim.setValue(0);
    setStreak(prev => prev + 1);

    Animated.parallel([
      Animated.timing(activeCardFade, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(workspaceHeightAnim, { toValue: SCREEN_HEIGHT, duration: 0, useNativeDriver: false }),
      Animated.timing(cardScale, { toValue: 1, duration: 0, useNativeDriver: true }),
    ]).start();

    // After 600ms, show the celebration screen
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(celebCardScale, { toValue: 1, tension: 40, friction: 8, useNativeDriver: true }),
        Animated.spring(celebCardTranslateY, { toValue: 0, tension: 40, friction: 8, useNativeDriver: true }),
        Animated.timing(celebCardFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();

      // Stop confetti after 3 seconds
      setTimeout(() => {
        setShowConfetti(false);
      }, 3000);
    }, 300);
  };

  const cancelHoldComplete = () => {
    Animated.spring(cardScale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start();

    if (!isHoldingComplete) return;
    setIsHoldingComplete(false);

    holdProgressAnim.stopAnimation();
    Animated.timing(holdProgressAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  };

  const startHoldComplete = () => {
    if (!activeTriumph || isHoldingComplete || isCompleted) return;
    triggerHapticHoldStart();

    Animated.spring(cardScale, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start();

    setIsHoldingComplete(true);
    holdProgressAnim.setValue(0);

    Animated.timing(holdProgressAnim, {
      toValue: 1,
      duration: 800, // 0.8 seconds (faster complete time)
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        Animated.spring(cardScale, {
          toValue: 1,
          useNativeDriver: true,
        }).start();
        handleCompleteTrigger();
      }
    });
  };

  const handleCelebrationPhaseComplete = () => {
    triggerHapticSelection();
    setShowCameraCapture(true);
  };

  const addTriumphToHistory = async (photoUri, mediaType = 'photo') => {
    if (hasSavedTriumph.current) return;
    hasSavedTriumph.current = true;

    const newId = Date.now().toString();
    const photoToUse = photoUri || selectedPhoto;

    // Optimistically update local state so the app feels instantly responsive
    setTriumphHistory(prev => [...prev, { id: newId, task: activeTriumph, date: 'Today', photo: photoToUse, mediaType }]);
    heartAnimationsRef.current[newId] = new Animated.Value(0);
    setFeedData(prev => [{ id: newId, user: 'your_triumphs', task: activeTriumph, img: photoToUse, mediaType, likes: 0, liked: false, time: 'Just now', mutualFriend: 'you', commentCount: 0 }, ...prev]);

    try {
      const userId = session?.user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Self-healing check: Ensure profile row exists in `profiles` to satisfy foreign key constraint.
      const { data: profileExists, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (profileCheckError) {
        console.warn('Profile check failed, trying to create one anyway:', profileCheckError.message);
      }

      if (!profileExists) {
        console.log('Profile missing for current user. Running JIT self-healing creation...');
        const email = session?.user?.email || '';
        const usernameFallback = email ? email.split('@')[0] : 'user_' + userId.substring(0, 8);
        const { error: profileCreateError } = await supabase
          .from('profiles')
          .insert([
            {
              id: userId,
              email: email,
              username: usernameFallback,
              display_name: usernameFallback,
            }
          ]);

        if (profileCreateError) {
          throw new Error(`Profile creation failed during self-healing: ${profileCreateError.message}`);
        }
      }

      let uploadedUrl = photoToUse;

      // Only perform the storage upload if it's a local file URI (e.g. from camera/gallery)
      const isLocalFile = photoToUse && !photoToUse.startsWith('http://') && !photoToUse.startsWith('https://');

      if (isLocalFile) {
        const fileExt = photoToUse.split('.').pop().toLowerCase() || 'jpg';
        const mimeType = mediaType === 'video' 
          ? `video/${fileExt === 'mov' ? 'quicktime' : 'mp4'}`
          : `image/${fileExt === 'png' ? 'png' : 'jpeg'}`;
        const fileName = `${userId}/${Date.now()}.${fileExt}`;

        // Read local file as base64 using FileSystem
        const base64 = await FileSystem.readAsStringAsync(photoToUse, {
          encoding: 'base64',
        });

        // Decode base64 to ArrayBuffer
        const arrayBuffer = decode(base64);

        // Upload to post-media storage bucket
        const { error: uploadError } = await supabase.storage
          .from('post-media')
          .upload(fileName, arrayBuffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('post-media')
          .getPublicUrl(fileName);

        uploadedUrl = publicUrl;
      }

      // Insert new row into the 'posts' table
      const { error: insertError } = await supabase
        .from('posts')
        .insert([
          {
            user_id: userId,
            task_title: activeTriumph,
            media_url: uploadedUrl,
            media_type: mediaType,
            created_at: new Date().toISOString(),
          }
        ]);

      if (insertError) {
        throw insertError;
      }
      
      console.log('Successfully saved triumph to database');
    } catch (err) {
      console.error('Error saving triumph to Supabase:', err);
      Alert.alert('Database Sync Failed', 'Your triumph was saved locally, but we could not upload it to the server: ' + err.message);
    }
  };

  const handlePhotoCaptured = async (photoData) => {
    triggerHapticSelection();
    const photoUri = photoData.uri;
    const type = photoData.type || 'photo';
    setCapturedPhoto(photoUri);
    setCapturedType(type);
    setShowCameraCapture(false);

    // Directly publish to feed — skip the intermediate "Proof of victory" page
    await addTriumphToHistory(photoUri, type);

    setCelebrationPhase('shared');
    setHasShared(true);
    setIsOrbAnimating(true);

    Animated.parallel([
      Animated.timing(celebCardScale, { toValue: 0.95, duration: 200, useNativeDriver: true }),
      Animated.timing(celebCardFade, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(feedListFade, { toValue: 1, duration: 400, delay: 100, useNativeDriver: true })
    ]).start();
  };

  const handleCameraClosed = () => {
    triggerHapticSelection();
    setShowCameraCapture(false);
  };

  const handlePublishToFeed = async () => {
    triggerHapticSelection();
    const photoToUse = capturedPhoto || selectedPhoto;
    await addTriumphToHistory(photoToUse, capturedType);

    setCelebrationPhase('shared');
    setHasShared(true);
    setIsOrbAnimating(true);

    // Animate celebration card out and feed in
    Animated.parallel([
      Animated.timing(celebCardScale, { toValue: 0.95, duration: 200, useNativeDriver: true }),
      Animated.timing(celebCardFade, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(feedListFade, { toValue: 1, duration: 400, delay: 100, useNativeDriver: true })
    ]).start();
  };

  const handleSkipSharing = async () => {
    triggerHapticSelection();
    await addTriumphToHistory(selectedPhoto, 'photo');

    setCelebrationPhase('shared');
    setHasShared(true);
    setIsOrbAnimating(true);

    // Animate celebration card out and feed in
    Animated.parallel([
      Animated.timing(celebCardScale, { toValue: 0.95, duration: 200, useNativeDriver: true }),
      Animated.timing(celebCardFade, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(feedListFade, { toValue: 1, duration: 400, delay: 100, useNativeDriver: true })
    ]).start();
  };

  const activeCommentsPost = useMemo(() => {
    return feedData.find(item => item.id === activeCommentsPostId);
  }, [feedData, activeCommentsPostId]);

  const handleAddComment = () => {
    if (!commentInputText.trim()) return;
    triggerHapticSelection();

    const newComment = {
      id: Date.now().toString(),
      user: 'your_triumphs',
      text: commentInputText.trim(),
      time: 'Just now',
    };

    setFeedData(prev => prev.map(post => {
      if (post.id === activeCommentsPostId) {
        return {
          ...post,
          commentCount: (post.commentCount || 0) + 1,
          comments: [...(post.comments || []), newComment]
        };
      }
      return post;
    }));

    setCommentInputText('');
    Keyboard.dismiss();
  };

  const shouldShowFeed = !isCompleted || hasShared;

  const toggleLikePost = (postId) => {
    triggerHapticSelection();
    setFeedData(prev => prev.map(item => item.id === postId ? { ...item, likes: item.liked ? item.likes - 1 : item.likes + 1, liked: !item.liked } : item));
  };

  const handleImageDoubleTap = (postId) => {
    const now = Date.now();
    if (now - (lastTapRef.current[postId] || 0) < 300) {
      triggerHapticSelection();
      setFeedData(prev => prev.map(item => item.id === postId && !item.liked ? { ...item, likes: item.likes + 1, liked: true } : item));
      const anim = heartAnimationsRef.current[postId];
      if (anim) {
        anim.setValue(0);
        Animated.sequence([
          Animated.spring(anim, { toValue: 1.3, friction: 3, tension: 140, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 150, delay: 350, useNativeDriver: true })
        ]).start();
      }
    }
    lastTapRef.current[postId] = now;
  };

  const handleLockInTomorrow = () => {
    if (tomorrowInput.trim() === '') { triggerHapticImpact(); return Alert.alert("Empty Intention", "Input an aspiration first!"); }
    triggerHapticSelection();
    Keyboard.dismiss();
    setTomorrowTaskSaved(true);
    closeTomorrow();
  };

  const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 47 : 24;

  const greetingOpacity = scrollY.interpolate({ inputRange: [0, 240], outputRange: [1, 0], extrapolate: 'clamp' });
  const greetingHeight = scrollY.interpolate({ inputRange: [0, 240], outputRange: [90, 0], extrapolate: 'clamp' });

  const stickyPaddingTop = scrollY.interpolate({
    inputRange: [0, 240],
    outputRange: [STATUS_BAR_HEIGHT + 10, 0],
    extrapolate: 'clamp'
  });
  const stickyPaddingBottom = scrollY.interpolate({
    inputRange: [0, 240],
    outputRange: [12, 0],
    extrapolate: 'clamp'
  });
  const stickyBorderWidth = scrollY.interpolate({
    inputRange: [0, 240],
    outputRange: [1, 0],
    extrapolate: 'clamp'
  });
  const frameMarginTop = scrollY.interpolate({
    inputRange: [0, 240],
    outputRange: [16, 0],
    extrapolate: 'clamp'
  }); 
  
  // Auth gate: shown after all hooks have been called (Rules of Hooks compliant)
  if (authLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fcfaf2', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 40 }}>🌱</Text>
      </View>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <View style={styles.rootWrapper}>
      <View style={styles.mainContainer}>

        <Animated.ScrollView
          ref={pageScrollRef}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          scrollEnabled={!!activeTriumph && !selectedNodeDetails && !isMilestoneModalOpen} // locks swipe when setting task, detailed panel or milestone modal is open
          contentOffset={{ x: SCREEN_WIDTH, y: 0 }} // Start on Center Page (index 1)
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(event) => {
            isProgrammaticScroll.current = false;
            const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            if (index !== currentPage) {
              setCurrentPage(index);
              triggerHapticSelection();
            }
          }}
        >
          {/* ================= COLUMN 1: PROGRESS TREE ================= */}
          <View style={{ width: SCREEN_WIDTH, height: '100%', backgroundColor: '#fcfaf2' }}>
            <SafeAreaView style={{ flex: 1 }}>
              <View style={{ flex: 1 }}>
                <GoldenTree
                  history={triumphHistory}
                  targetGrowthTrigger={growthTrigger}
                  onNodeSelect={handleNodeSelectFromCanvas}
                  onMilestonePanelChange={setIsMilestoneModalOpen}
                  isTreeOpen={currentPage === 0}
                />

                {/* Floating Plus button on Tree Page */}
                {isCompleted && (
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      top: 20,
                      right: 20,
                      padding: 8,
                      zIndex: 10,
                    }}
                    onPress={() => {
                      triggerHapticSelection();
                      openTomorrow();
                    }}
                  >
                    <Text style={{ color: '#d97706', fontSize: 32, fontWeight: '300', marginTop: Platform.OS === 'ios' ? -2 : -4 }}>+</Text>
                  </TouchableOpacity>
                )}
              </View>
            </SafeAreaView>
          </View>

          {/* ================= COLUMN 2: DAILY FOCUS & FEED ================= */}
          <View style={{ width: SCREEN_WIDTH, height: '100%', backgroundColor: '#fcfaf2' }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardAvoidingContainer} enabled={false}>

              {!activeTriumph ? (
                <SafeAreaView style={{ flex: 1 }}>
                  <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <Animated.View style={[
                      styles.cleanSetupCenteredContainer,
                      {
                        opacity: setupFadeAnim,
                        transform: [
                          { translateY: keyboardShiftAnim },
                          {
                            scale: setupFadeAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.94, 1]
                            })
                          }
                        ]
                      }
                    ]}>
                      <View style={styles.header}>
                        <Text style={styles.headerTitle}>One Thing Daily</Text>
                        <Text style={styles.subtitle}>What is your goal for the today?</Text>
                      </View>
                      <View style={styles.card}>
                        <TextInput
                          style={styles.input}
                          placeholder="e.g., Read 10 pages, call your mum..."
                          placeholderTextColor="#999"
                          multiline
                          value={taskInput}
                          onChangeText={setTaskInput}
                          blurOnSubmit={true}
                          onSubmitEditing={Keyboard.dismiss}
                        />
                        <TouchableOpacity style={styles.button} onPress={() => { triggerHapticSelection(); handleLockIn(); }}>
                          <Text style={styles.buttonText}>Set Daily Task</Text>
                        </TouchableOpacity>
                      </View>
                    </Animated.View>
                  </TouchableWithoutFeedback>
                </SafeAreaView>
              ) : (
                <View style={{ flex: 1 }}>
                  <Animated.View style={[styles.stickyDashboardWrapper, {
                    paddingTop: stickyPaddingTop,
                    paddingBottom: stickyPaddingBottom,
                    borderBottomWidth: stickyBorderWidth
                  }]}>
                    <Animated.View style={{ opacity: greetingOpacity, height: greetingHeight, overflow: 'hidden' }}>
                      <View style={styles.inlineHeaderRow}>
                        <TouchableOpacity
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 19,
                            borderWidth: 1.5,
                            borderColor: '#ebd5b0',
                            backgroundColor: '#f3eade',
                            justifyContent: 'center',
                            alignItems: 'center',
                            zIndex: 2,
                            overflow: 'hidden',
                          }}
                          onPress={() => {
                            triggerHapticSelection();
                            pageScrollRef.current?.scrollTo({ x: 0, animated: true });
                            setCurrentPage(0);
                          }}
                        >
                          {isTreeIconPulsating && (
                            <Animated.View
                              style={{
                                position: 'absolute',
                                width: 28,
                                height: 28,
                                borderRadius: 14,
                                backgroundColor: '#FFD700',
                                shadowColor: '#FFD700',
                                shadowOffset: { width: 0, height: 0 },
                                shadowOpacity: 0.8,
                                shadowRadius: 10,
                                elevation: 5,
                                transform: [{ scale: headerPulseAnim }],
                                opacity: 0.8,
                              }}
                            />
                          )}
                          <Image
                            source={require('./assets/image_86ac9a.png')}
                            style={{ width: 22, height: 22, zIndex: 3, resizeMode: 'contain' }}
                          />
                        </TouchableOpacity>

                        <View style={styles.greetingCenterWrapper}>
                          <Text style={styles.greetingText}>Hello, Champion</Text>
                        </View>

                        {/* Simple Fire emoji inline status */}
                        <View style={[styles.inlineStatsRow, { flexDirection: 'row', alignItems: 'center' }]}>
                          <Text style={styles.inlineStatText}>🔥 </Text>
                          <RollingNumber
                            value={streak}
                            height={16}
                            fontSize={14}
                            fontWeight="800"
                            color="#d97706"
                            active={currentPage === 1}
                          />
                        </View>
                      </View>
                      <Text style={styles.insightText}>{currentMessage}</Text>
                    </Animated.View>
                  </Animated.View>

                  <Animated.View style={[styles.hardwareWorkspaceFrame, { flex: 1, marginHorizontal: 0, width: SCREEN_WIDTH, marginTop: frameMarginTop, paddingBottom: 0 }]}>
                    <Pressable
                      onPressIn={startHoldComplete}
                      onPressOut={cancelHoldComplete}
                      disabled={isCompleted}
                      style={{ flex: 1 }}
                    >
                      <Animated.View
                        style={[
                          styles.taskHeroCard,
                          {
                            opacity: activeCardFade,
                            zIndex: !isCompleted ? 10 : 0,
                            transform: [{ scale: cardScale }]
                          }
                        ]}
                      >
                        <View style={{ flex: 1, justifyContent: 'space-between', width: '100%' }}>
                          <View>
                            <Text style={styles.activeSectionLabel}>{"TODAY'S ONE THING"}</Text>
                            <Text style={styles.taskHeroTag}>Focus + Flow</Text>
                          </View>

                          <View style={styles.taskTextWrapper}>
                            <Text style={styles.triumphDisplayFormat} numberOfLines={5}>{activeTriumph}</Text>
                          </View>

                          <Text style={styles.holdInstructionText}>
                            {isHoldingComplete ? 'Holding to complete...' : 'Hold anywhere to complete'}
                          </Text>
                        </View>

                        <View style={styles.sliderProgressTrack}>
                          <Animated.View
                            style={[
                              styles.sliderProgressFill,
                              {
                                width: holdProgressAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: ['0%', '100%'],
                                }),
                              },
                            ]}
                          />
                        </View>
                      </Animated.View>
                    </Pressable>

                    <Animated.View style={[StyleSheet.absoluteFillObject, styles.celebrationFullScreenOverlay, { opacity: celebCardFade, zIndex: 999, backgroundColor: 'rgba(252, 250, 242, 0.93)' }]} pointerEvents={(isCompleted && !hasShared) ? 'auto' : 'none'}>
                      {showCameraCapture ? (
                        <CameraCapture
                          onPhotoCaptured={handlePhotoCaptured}
                          onCancel={handleCameraClosed}
                          onSkip={handleSkipSharing}
                          task={activeTriumph}
                        />
                      ) : (
                        <CelebrationScreen
                          task={activeTriumph}
                          totalTriumphs={totalTriumphs}
                          streak={streak}
                          celebrationPhase={celebrationPhase}
                          onPhaseComplete={handleCelebrationPhaseComplete}
                          capturedPhoto={capturedPhoto}
                          onShare={handlePublishToFeed}
                          onSkip={handleSkipSharing}
                        />
                      )}
                    </Animated.View>

                    {hasShared && (
                      <FlatList
                        data={feedData}
                        renderItem={({ item }) => {
                          const overlayScale = heartAnimationsRef.current[item.id] || new Animated.Value(0);
                          return (
                            <View style={styles.instagramPostCard}>
                              {/* User Header Section (Outside / Above Image) */}
                              <View style={styles.postCardHeader}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                  <Text style={styles.postUserBadge}>{item.user}</Text>
                                  <Text style={styles.postActionText} numberOfLines={2}>
                                    {item.task}
                                  </Text>
                                </View>
                                <Text style={styles.postTimeLabel}>{item.time}</Text>
                              </View>

                              <TouchableWithoutFeedback onPress={() => { triggerHapticSelection(); handleImageDoubleTap(item.id); }}>
                                <View style={styles.postImageWrapper}>
                                  {item.mediaType === 'video' ? (
                                    <Video
                                      source={{ uri: item.img }}
                                      rate={1.0}
                                      volume={1.0}
                                      isMuted={true}
                                      resizeMode={ResizeMode.COVER}
                                      shouldPlay
                                      isLooping
                                      style={styles.postHeroImage}
                                    />
                                  ) : (
                                    <Image source={{ uri: item.img }} style={styles.postHeroImage} />
                                  )}

                                  {/* Double-tap big heart animation */}
                                  <Animated.View style={[styles.centerHeartOverlay, { opacity: overlayScale, transform: [{ scale: overlayScale }] }]}>
                                    <Text style={styles.overlayHeartText}>❤️</Text>
                                  </Animated.View>

                                  {/* Like, Comment, and Liked-by status overlaid on the bottom portion of the picture */}
                                  <View style={styles.bottomOverlayContainer}>
                                    <View style={styles.reelsActionBar}>
                                      <TouchableOpacity
                                        style={styles.actionIconButton}
                                        onPress={() => { triggerHapticSelection(); toggleLikePost(item.id); }}
                                      >
                                        <Svg width={24} height={24} viewBox="0 0 24 24" fill={item.liked ? "#d97706" : "none"} stroke={item.liked ? "#d97706" : "#fcfaf2"} strokeWidth={2}>
                                          <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                        </Svg>
                                      </TouchableOpacity>

                                      <TouchableOpacity
                                        style={styles.actionIconButton}
                                        onPress={() => handleOpenComments(item.id)}
                                      >
                                        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#fcfaf2" strokeWidth={2}>
                                          <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                                        </Svg>
                                      </TouchableOpacity>
                                    </View>

                                    <View style={styles.socialProofRow}>
                                      <Text style={styles.likedByTextOverlaid}>
                                        Liked by <Text style={styles.boldUsernameOverlaid}>{item.likes} others</Text>
                                        {(item.commentCount || 0) > 0 && <Text style={styles.commentProofTextOverlaid}>  •  {item.commentCount} comments</Text>}
                                      </Text>
                                    </View>
                                  </View>
                                </View>
                              </TouchableWithoutFeedback>
                            </View>
                          );
                        }}
                        keyExtractor={item => item.id}
                        windowSize={5}
                        contentContainerStyle={{ paddingTop: 12, paddingBottom: 110, paddingHorizontal: 16 }}
                        onScroll={Animated.event(
                          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                          {
                            useNativeDriver: false,
                            listener: (event) => { scrollOffset.current = event.nativeEvent.contentOffset.y; }
                          }
                        )}
                        scrollEventThrottle={16}
                        ListHeaderComponent={
                          <View style={styles.feedHeaderRowBypass}>
                            <Text style={styles.feedSectionLabel}>{"What's everyone else up to?"}</Text>
                          </View>
                        }
                      />
                    )}
                  </Animated.View>
                </View>
              )}
            </KeyboardAvoidingView>
          </View>

          {/* ================= COLUMN 3: PROFILE, FRIENDS & NOTIFICATIONS ================= */}
          <View style={{ width: SCREEN_WIDTH, height: '100%', backgroundColor: '#fcfaf2' }}>
            <ProfileTab streak={streak} totalTriumphs={totalTriumphs} />
          </View>
        </Animated.ScrollView>

        {/* ================= FLOATING NAVIGATION ISLAND ================= */}
        {activeTriumph && !(isCompleted && !hasShared) && (
          <View style={styles.floatingNavIsland}>
            {/* Tree Tab */}
            <TouchableOpacity
              style={[styles.floatingNavItem, currentPage === 0 && styles.floatingNavItemActive]}
              onPress={() => {
                triggerHapticSelection();
                isProgrammaticScroll.current = true;
                pageScrollRef.current?.scrollTo({ x: 0, animated: true });
                setCurrentPage(0);
              }}
            >
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={currentPage === 0 ? "#a75a0c" : "#8a7767"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M12 2L19 9H15V15H17L12 22L7 15H9V9H5L12 2Z" />
              </Svg>
            </TouchableOpacity>

            {/* Feed Tab */}
            <TouchableOpacity
              style={[styles.floatingNavItem, currentPage === 1 && styles.floatingNavItemActive]}
              onPress={() => {
                triggerHapticSelection();
                isProgrammaticScroll.current = true;
                pageScrollRef.current?.scrollTo({ x: SCREEN_WIDTH, animated: true });
                setCurrentPage(1);
              }}
            >
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={currentPage === 1 ? "#a75a0c" : "#8a7767"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <Polyline points="9 22 9 12 15 12 15 22" />
              </Svg>
            </TouchableOpacity>

            {/* Profile/Notifications Tab */}
            <TouchableOpacity
              style={[styles.floatingNavItem, currentPage === 2 && styles.floatingNavItemActive]}
              onPress={() => {
                triggerHapticSelection();
                isProgrammaticScroll.current = true;
                pageScrollRef.current?.scrollTo({ x: SCREEN_WIDTH * 2, animated: true });
                setCurrentPage(2);
              }}
            >
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={currentPage === 2 ? "#a75a0c" : "#8a7767"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <Circle cx="12" cy="7" r="4" />
              </Svg>
            </TouchableOpacity>
          </View>
        )}

        {/* ================= 2/3 RIGHT SLIDE PANEL DETAILED DRAWER ================= */}
        <Animated.View style={[styles.nodeDetailsSideDrawer, { transform: [{ translateX: panelSlide }] }]}>
          {selectedNodeDetails && (
            <View style={{ flex: 1 }}>
              <View style={styles.drawerHeaderNavRow}>
                <Text style={styles.drawerHeaderTitle}>Milestone Info</Text>
                <TouchableOpacity style={styles.drawerCloseCrossButton} onPress={() => { triggerHapticSelection(); closeNodePanel(); }}>
                  <Text style={styles.closeCrossIconText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.drawerContentScrollView} showsVerticalScrollIndicator={false}>
                <Text style={styles.drawerDateLabel}>{selectedNodeDetails.date || 'Completed Milestone'}</Text>
                <Text style={styles.drawerTaskStatement}>“{selectedNodeDetails.task}”</Text>

                <Text style={styles.sectionDividerTextLabel}>VISUAL PROOF</Text>
                {selectedNodeDetails.photo ? (
                  <Image source={{ uri: selectedNodeDetails.photo }} style={styles.drawerHeroImageRender} resizeMode="cover" />
                ) : (
                  <View style={styles.drawerImagePlaceholderBox}>
                    <Text style={styles.placeholderBoxEmojiText}>🌱</Text>
                    <Text style={styles.placeholderBoxNotice}>No photo attached to this specific target seed node segment.</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          )}
        </Animated.View>

        {/* ================= TOMORROW'S BLUEPRINT ================= */}
        <Animated.View style={[styles.tomorrowPageScreen, { transform: [{ translateY: tomorrowSlide }] }]} pointerEvents={isPlanningTomorrow ? 'auto' : 'none'} {...tomorrowPanResponder.panHandlers}>
          <SafeAreaView style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
              {!tomorrowTaskSaved ? (
                <View style={[styles.cleanSetupCenteredContainer, { height: 'auto', marginBottom: 0 }]}>
                  <View style={styles.header}>
                    <Text style={styles.headerTitle}>One Thing Daily</Text>
                    <Text style={styles.subtitle}>{"What's your sidequest for tomorrow?"}</Text>
                  </View>
                  <View style={styles.card}>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Read 10 pages, call your mum..."
                      placeholderTextColor="#999"
                      multiline
                      value={tomorrowInput}
                      onChangeText={setTomorrowInput}
                      blurOnSubmit={true}
                      onSubmitEditing={Keyboard.dismiss}
                    />
                    <TouchableOpacity style={styles.button} onPress={() => { triggerHapticSelection(); handleLockInTomorrow(); }}>
                      <Text style={styles.buttonText}>{"Set Tomorrow's Sidequest"}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.tomorrowLockedContainer}>
                  <Text style={styles.lockedCheckmark}>🔒 Locked & Ready</Text>
                  <Text style={styles.tomorrowLockedText}>“{tomorrowInput}”</Text>
                  <Text style={styles.tomorrowFooterNotice}>
                    We will activate this automatically for you when the sun comes up tomorrow morning. Great preparation!
                  </Text>
                  <TouchableOpacity
                    style={styles.changeFocusButton}
                    onPress={() => { triggerHapticSelection(); setTomorrowTaskSaved(false); }}
                  >
                    <Text style={styles.changeFocusButtonText}>✏ Change focus</Text>
                  </TouchableOpacity>
                </View>
              )}
              {/* Grab/Swipe indicator pill at the bottom */}
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginTop: 12 }} />
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </View>

      {/* ================= INSTAGRAM-STYLE COMMENTS BOTTOM SHEET ================= */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={activeCommentsPostId !== null}
        onRequestClose={dismissCommentSheet}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlayContainer}>
            <TouchableWithoutFeedback onPress={dismissCommentSheet}>
              <View style={styles.modalOverlayBackdrop} />
            </TouchableWithoutFeedback>

            <Animated.View
              style={[
                styles.commentSheetContainer,
                { transform: [{ translateY: commentSheetTranslateY }] }
              ]}
            >
              {/* Slide Down Drag Handle & Header */}
              <View style={styles.commentSheetHeader} {...commentPanResponder.panHandlers}>
                <View style={styles.sheetHandleBar} />
                <View style={styles.headerTitleRow}>
                  <Text style={styles.commentSheetTitle}>Comments</Text>
                  <TouchableOpacity
                    style={styles.commentSheetCloseButton}
                    onPress={dismissCommentSheet}
                  >
                    <Text style={styles.commentSheetCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Comments List */}
              <FlatList
                data={activeCommentsPost?.comments || []}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.commentsListScroll}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View style={styles.commentRow}>
                    <View style={styles.commentUserAvatar}>
                      <Text style={styles.avatarText}>
                        {item.user.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.commentContentBlock}>
                      <Text style={styles.commentInlineBody}>
                        <Text style={styles.commentUsername}>{item.user} </Text>
                        <Text style={styles.commentBodyText}>{item.text}</Text>
                      </Text>
                      <Text style={styles.commentTimeText}>{item.time}</Text>
                    </View>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyCommentsBox}>
                    <Text style={styles.emptyCommentsEmoji}>🌱</Text>
                    <Text style={styles.emptyCommentsText}>No thoughts shared yet</Text>
                    <Text style={styles.emptyCommentsSubtext}>Encourage their focus with a kind word.</Text>
                  </View>
                }
              />

              {/* Minimalistic Add Comment Area */}
              <View style={styles.commentInputRow}>
                <TextInput
                  style={styles.commentTextInput}
                  placeholder="Add a comment..."
                  placeholderTextColor="#a89a8c"
                  value={commentInputText}
                  onChangeText={setCommentInputText}
                  multiline
                />
                <TouchableOpacity
                  style={[
                    styles.commentPostButton,
                    !commentInputText.trim() && styles.commentPostButtonDisabled,
                  ]}
                  onPress={handleAddComment}
                  disabled={!commentInputText.trim()}
                >
                  <Text style={styles.commentPostButtonText}>Post</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {showConfetti && <Confetti />}

      {isOrbAnimating && (
        <OrbAnimation
          isTreeOpen={isTreeOpen}
          onOrbPress={openTree}
          onReachedIcon={() => setIsTreeIconPulsating(true)}
          onTreeAbsorbComplete={() => {
            setIsOrbAnimating(false);
            setGrowthTrigger(true);
            setIsTreeIconPulsating(false);
          }}
        />
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  rootWrapper: { flex: 1 },
  mainContainer: { flex: 1, backgroundColor: '#fcfaf2' }, // Soft warm ivory background

  mainDashboardAnimatedWrapper: { flex: 1, width: SCREEN_WIDTH, height: '100%', backgroundColor: '#fcfaf2' },
  keyboardAvoidingContainer: { flex: 1, width: '100%' },
  fullWidthScrollView: { flex: 1, width: '100%', paddingHorizontal: 24 },

  tomorrowPageScreen: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fcfaf2',
    zIndex: 102,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },

  // ================= 2/3 SLIDE SIDE DRAWER STYLES =================
  nodeDetailsSideDrawer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 90 : 75,
    bottom: 0,
    right: 0,
    width: PANEL_WIDTH,
    backgroundColor: 'rgba(252, 250, 242, 0.94)', // Soft warm cream glassmorphic overlay
    zIndex: 200,
    borderLeftWidth: 1,
    borderColor: '#e8dec9',
    shadowColor: '#2d221a',
    shadowOffset: { width: -6, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 15,
    elevation: 10,
    padding: 20
  },
  drawerHeaderNavRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: '#e8dec9', paddingBottom: 12, marginBottom: 16 },
  drawerHeaderTitle: { fontSize: 16, fontWeight: '800', color: '#2d221a', letterSpacing: -0.3 },
  drawerCloseCrossButton: { backgroundColor: '#f3eade', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  closeCrossIconText: { fontSize: 12, fontWeight: '800', color: '#8a7767' },
  drawerContentScrollView: { paddingBottom: 32 },
  drawerDateLabel: { fontSize: 11, fontWeight: '700', color: '#d97706', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  drawerTaskStatement: { fontSize: 15, fontWeight: '600', color: '#3b2f27', lineHeight: 22.5, marginBottom: 20 }, // 1.5x lineHeight
  sectionDividerTextLabel: { fontSize: 10, fontWeight: '800', color: '#b59370', letterSpacing: 1.5, marginBottom: 8 },
  drawerHeroImageRender: { width: '100%', height: 180, borderRadius: 18, backgroundColor: '#f3eade', borderWidth: 1, borderColor: '#e8dec9' },
  drawerImagePlaceholderBox: { width: '100%', height: 150, backgroundColor: '#fcfaf2', borderRadius: 18, justifyContent: 'center', alignItems: 'center', padding: 16, borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#dcd0bc' },
  placeholderBoxEmojiText: { fontSize: 24, marginBottom: 6 },
  placeholderBoxNotice: { fontSize: 11, color: '#8a7767', textAlign: 'center', lineHeight: 16.5 }, // 1.5x lineHeight

  headerNavRowStyle: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e8dec9', paddingBottom: 16, marginBottom: 0, paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 20 : 30 },
  arrowBackButton: { paddingRight: 16, paddingVertical: 4 },
  arrowIconText: { fontSize: 32, color: '#2d221a', fontWeight: '300' },
  headerTitleTextCenter: { fontSize: 20, fontWeight: '800', color: '#2d221a', flex: 1, textAlign: 'center', marginRight: 28 },
  headerSpacerNode: { width: 10, height: 10 },

  stickyDashboardWrapper: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 12, backgroundColor: '#fcfaf2', zIndex: 10, borderBottomWidth: 1, borderColor: '#e8dec9' },
  inlineHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  hamburgerIcon: { width: 30, height: 24, justifyContent: 'space-between', paddingVertical: 4 },
  hamburgerLine: { width: 22, height: 2.5, backgroundColor: '#2d221a', borderRadius: 2 },
  greetingCenterWrapper: { flex: 1, alignItems: 'center' },
  greetingText: { fontSize: 24, fontWeight: '900', color: '#2d221a', letterSpacing: -0.5 },
  emptySpacerRight: { width: 30 },
  insightText: { fontSize: 13, fontWeight: '600', color: '#d97706', textAlign: 'center', marginTop: 4, lineHeight: 19.5, fontStyle: 'italic' }, // 1.5x lineHeight, warm gold/amber tone

  cleanSetupCenteredContainer: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, height: SCREEN_HEIGHT * 0.8, marginBottom: 90 },
  header: { marginBottom: 32, alignItems: 'center' },
  headerTitle: { fontSize: 36, fontWeight: '900', color: '#d97706', letterSpacing: -0.5 }, // Intentional amber tone
  subtitle: { fontSize: 16, color: '#8a7767', marginTop: 8 },
  card: { backgroundColor: '#fffdf9', borderRadius: 20, padding: 20, minHeight: 160, shadowColor: '#2d221a', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: '#e8dec9' },
  input: { fontSize: 18, color: '#3b2f27', textAlignVertical: 'top', minHeight: 80, marginBottom: 16, lineHeight: 27 }, // 1.5x lineHeight
  button: { backgroundColor: '#d97706', paddingVertical: 16, borderRadius: 16, alignItems: 'center' }, // Warm amber/honey button
  buttonText: { color: '#fcfaf2', fontSize: 16, fontWeight: 'bold' },

  hardwareWorkspaceFrame: { width: SCREEN_WIDTH, marginTop: 16, position: 'relative', overflow: 'hidden' },
  inlineStatsRow: { paddingHorizontal: 12, paddingVertical: 4, backgroundColor: '#f3eade', borderRadius: 16, borderOpacity: 0.1, borderWidth: 1, borderColor: '#e8dec9' },
  inlineStatText: { fontSize: 14, fontWeight: '800', color: '#d97706' },
  workspaceCard: { backgroundColor: '#fffdf9', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#e8dec9' },
  taskHeroCard: { backgroundColor: '#f7edd7', borderRadius: 31, paddingVertical: 42, paddingHorizontal: 36, borderWidth: 1.3, borderColor: '#ebd5b0', shadowColor: '#d97706', shadowOpacity: 0.12, shadowRadius: 42, shadowOffset: { width: 0, height: 23 }, elevation: 13, height: SCREEN_HEIGHT * 0.57, justifyContent: 'space-between', overflow: 'hidden', marginHorizontal: 24, marginBottom: 75, marginTop: 8 },
  holdCompleteButton: { backgroundColor: '#a75a0c', borderRadius: 20, paddingVertical: 22, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', marginTop: 16, shadowColor: '#a75a0c', shadowOpacity: 0.24, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 8, width: '100%' },
  holdCompleteButtonActive: { backgroundColor: '#8c4b07' },
  holdProgressTrack: { marginTop: 16, width: '100%', height: 8, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, overflow: 'hidden' },
  holdProgressFill: { height: '100%', backgroundColor: '#fcfaf2', borderRadius: 999 },
  activeTaskFooter: { fontSize: 13, color: '#8a7767', textAlign: 'center', marginTop: 18, lineHeight: 19.5 }, // 1.5x lineHeight
  celebrationFullScreenOverlay: { backgroundColor: 'transparent', borderRadius: 0, padding: 0, borderWidth: 0, zIndex: 999 },
  celebrationCard: { backgroundColor: '#fffdf9', borderRadius: 24, padding: 28, borderWidth: 1, borderColor: '#e8dec9', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 6, alignItems: 'center', justifyContent: 'center' },
  activeSectionLabel: { fontSize: 14, fontWeight: '800', color: '#d97706', letterSpacing: 1.95, marginBottom: 16, textAlign: 'center' },
  taskHeroTag: { textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#a75a0c', marginBottom: 16, letterSpacing: 1.43 },
  triumphDisplayFormat: { fontSize: 34, fontWeight: '800', color: '#2d221a', textAlign: 'center', lineHeight: 51, letterSpacing: -0.65, fontStyle: 'italic' }, // 1.5x lineHeight
  taskTextWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 26 },
  quoteMarkOpen: { fontSize: 83, fontWeight: '800', color: '#ebd5b0', opacity: 0.4, marginBottom: -20, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  quoteMarkClose: { fontSize: 83, fontWeight: '800', color: '#ebd5b0', opacity: 0.4, marginTop: -20, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  holdInstructionText: { fontSize: 17, fontWeight: '600', color: '#d97706', textAlign: 'center', marginBottom: 31, letterSpacing: 0.65, textTransform: 'uppercase' },
  sliderProgressTrack: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 16, backgroundColor: 'rgba(217, 119, 6, 0.15)', overflow: 'hidden' },
  sliderProgressFill: { height: '100%', backgroundColor: '#d97706' },
  activeTaskMood: { fontSize: 15, color: '#8a7767', textAlign: 'center', marginBottom: 22, lineHeight: 22.5 }, // 1.5x lineHeight
  completeButtonBadge: { backgroundColor: '#a75a0c', paddingVertical: 18, borderRadius: 18, alignItems: 'center', marginHorizontal: 16 },
  completeButtonBadgeText: { color: '#fcfaf2', fontSize: 16, fontWeight: '800' },
  celebrationBadge: { fontSize: 38, marginBottom: 16 },
  celebrationBody: { color: '#8a7767', fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 21 }, // 1.5x lineHeight
  celebrationImpactContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, backgroundColor: '#fcfaf2' },
  celebrationBadgeHuge: { fontSize: 120, marginBottom: 24, lineHeight: 140 },
  celebrationTitleHuge: { fontSize: 56, fontWeight: '900', color: '#2d221a', textAlign: 'center', marginBottom: 12, lineHeight: 64, letterSpacing: -1 },
  celebrationSubtitleLarge: { fontSize: 18, color: '#8a7767', textAlign: 'center', marginBottom: 40, lineHeight: 27, maxWidth: '85%' }, // 1.5x lineHeight
  celebrationMetricsRow: { flexDirection: 'row', alignItems: 'center', gap: 0, marginTop: 32 },
  metricCell: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  metricValue: { fontSize: 42, fontWeight: '900', color: '#d97706', marginBottom: 4 },
  metricLabel: { fontSize: 13, color: '#8a7767', fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  metricDivider: { width: 1, height: 60, backgroundColor: 'rgba(45, 34, 26, 0.1)' },

  celebrationPhotoContainer: { flex: 1, justifyContent: 'flex-start', paddingTop: 60, backgroundColor: '#fcfaf2' },
  photoSelectionScroll: { paddingHorizontal: 24, paddingBottom: 40 },
  photoPromptTitle: { fontSize: 28, fontWeight: '900', color: '#2d221a', textAlign: 'center', marginBottom: 8 },
  photoPromptSubtitle: { fontSize: 14, color: '#8a7767', textAlign: 'center', marginBottom: 32, lineHeight: 21 }, // 1.5x lineHeight
  photoGridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  photoGridItem: { width: (SCREEN_WIDTH - 72) / 2, height: 140, borderRadius: 18, overflow: 'hidden', borderWidth: 2, borderColor: '#e8dec9', position: 'relative' },
  photoGridItemSelected: { borderColor: '#d97706', borderWidth: 3, shadowColor: '#d97706', shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  photoGridImage: { width: '100%', height: '100%' },
  photoCheckmark: { position: 'absolute', top: 0, right: 0, width: 36, height: 36, backgroundColor: '#d97706', borderRadius: 18, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4 },
  photoCheckmarkText: { color: '#fcfaf2', fontSize: 18, fontWeight: 'bold' },
  shareNowButton: { backgroundColor: '#d97706', paddingVertical: 18, borderRadius: 18, alignItems: 'center', marginBottom: 12, shadowColor: '#d97706', shadowOpacity: 0.3, shadowRadius: 12, elevation: 5 },
  shareNowButtonText: { color: '#fcfaf2', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  skipSharingButton: { backgroundColor: '#f3eade', paddingVertical: 16, borderRadius: 18, alignItems: 'center', borderWidth: 1.5, borderColor: '#dcd0bc' },
  skipSharingButtonText: { color: '#8a7767', fontSize: 15, fontWeight: '600' },

  celebrationEmoji: { fontSize: 26, textAlign: 'center', marginBottom: 4 },
  celebrationTitle: { fontSize: 20, fontWeight: '900', color: '#d97706', textAlign: 'center' },
  celebrationSubtitle: { fontSize: 12, color: '#8a7767', textAlign: 'center', marginTop: 2, marginBottom: 12 },
  photoTrayRow: { flexDirection: 'row', gap: 8, marginBottom: 16, justifyContent: 'center' },
  photoSelectionPill: { flex: 1, backgroundColor: '#f3eade', borderRadius: 12, padding: 6, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  photoSelectionPillActive: { borderColor: '#d97706', backgroundColor: '#fffdf9' },
  trayThumbImage: { width: '100%', height: 42, borderRadius: 8, marginBottom: 4 },
  photoPillText: { fontSize: 10, color: '#8a7767', fontWeight: '600' },
  photoPillTextActive: { color: '#d97706', fontWeight: '700' },
  shareTimelineButton: { backgroundColor: '#d97706', paddingVertical: 14, borderRadius: 18, alignItems: 'center' },
  shareTimelineButtonText: { color: '#fcfaf2', fontSize: 15, fontWeight: '700' },

  feedHeaderRowBypass: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 12, paddingHorizontal: 24 },
  feedSectionLabel: { fontSize: 11, fontWeight: '800', color: '#b59370', letterSpacing: 1.5 },
  nextIntentionPill: { backgroundColor: '#f3eade', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  resetLinkText: { fontSize: 12, color: '#d97706', fontWeight: '800' },

  instagramPostCard: { backgroundColor: '#fffdf9', borderRadius: 24, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#dcd0bc', shadowColor: '#2d221a', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 }, // Slightly darker beige outline
  postCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#e8dec9' },
  postCardFooter: { padding: 16 },
  postUserBadge: { fontSize: 14, fontWeight: '800', color: '#3b2f27' },
  postActionText: { fontSize: 13, color: '#8a7767', marginTop: 2, lineHeight: 18, fontStyle: 'italic' }, // Same color as greeting quote
  postTimeLabel: { fontSize: 12, color: '#8a7767' },
  postCaptionText: { fontSize: 14, color: '#3b2f27', lineHeight: 21, marginBottom: 8 },
  postImageWrapper: { position: 'relative', width: '100%', height: 420 },
  postHeroImage: { width: '100%', height: '100%', backgroundColor: '#f3eade' },
  bottomOverlayContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: 'rgba(34, 25, 18, 0.4)' }, // Soft translucent backing
  centerHeartOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 5 },
  overlayHeartText: { fontSize: 80, textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 8 },
  reelsActionBar: { flexDirection: 'row', gap: 16, alignItems: 'center', marginBottom: 6 },
  actionIconButton: { padding: 4 },
  actionIconSymbol: { fontSize: 26, color: '#2d221a' },
  actionIconSymbolLiked: { color: '#ef4444' },
  socialProofRow: { marginTop: 2 },
  likedByText: { fontSize: 13, color: '#8a7767' },
  commentProofText: { color: '#b59370' },
  boldUsername: { fontWeight: '800', color: '#3b2f27' },
  likedByTextOverlaid: { fontSize: 13, color: '#fcfaf2', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  boldUsernameOverlaid: { fontWeight: '800', color: '#fcfaf2' },
  commentProofTextOverlaid: { color: '#ebd5b0' },

  inputFormGroup: { paddingTop: 4 },
  tomorrowDescription: { fontSize: 14, color: '#8a7767', lineHeight: 21, marginBottom: 20 }, // 1.5x lineHeight
  tomorrowTextInput: { backgroundColor: '#fffdf9', borderRadius: 18, paddingHorizontal: 16, fontSize: 16, color: '#3b2f27', height: 54, borderWidth: 1, borderColor: '#e8dec9', marginBottom: 20 },
  tomorrowLockButton: { backgroundColor: '#d97706', paddingVertical: 16, borderRadius: 18, alignItems: 'center' }, // Warm amber lock button
  tomorrowLockButtonText: { color: '#fcfaf2', fontSize: 16, fontWeight: '700' },
  tomorrowLockedContainer: { alignItems: 'center', paddingVertical: 44 },
  lockedCheckmark: { fontSize: 16, fontWeight: '800', color: '#d97706', backgroundColor: '#f3eade', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: '#e8dec9' },
  tomorrowLockedText: { fontSize: 22, fontWeight: '700', color: '#3b2f27', textAlign: 'center', lineHeight: 33, marginBottom: 12, fontStyle: 'italic' }, // 1.5x lineHeight
  tomorrowFooterNotice: { fontSize: 12, color: '#8a7767', textAlign: 'center', paddingHorizontal: 16, lineHeight: 18, marginBottom: 20 }, // 1.5x lineHeight
  changeFocusButton: { marginTop: 4, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1.5, borderColor: '#dcd0bc', backgroundColor: '#fcfaf2' },
  changeFocusButtonText: { fontSize: 14, fontWeight: '600', color: '#8a7767' },

  // ================= 3-COLUMN LAYOUT & NAVIGATION ISLAND STYLES =================
  rightPageScrollView: { flex: 1, backgroundColor: '#fcfaf2' },
  profileHeaderSection: { flexDirection: 'row', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderColor: '#e8dec9' },
  avatarContainer: { position: 'relative' },
  profileAvatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: '#a75a0c' },
  profileDetails: { flex: 1, marginLeft: 16 },
  profileUsername: { fontSize: 18, fontWeight: '800', color: '#2d221a' },
  profileBio: { fontSize: 13, color: '#8a7767', marginTop: 4, lineHeight: 18 },
  notificationIconButton: { position: 'relative', width: 44, height: 44, borderRadius: 22, backgroundColor: '#f3eade', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e8dec9' },
  notificationBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#ef4444', minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  notificationBadgeText: { color: '#ffffff', fontSize: 10, fontWeight: '800' },
  profileStatsRow: { flexDirection: 'row', paddingVertical: 16, backgroundColor: '#fffdf9', borderBottomWidth: 1, borderColor: '#e8dec9' },
  profileStatItem: { flex: 1, alignItems: 'center' },
  profileStatNumber: { fontSize: 20, fontWeight: '800', color: '#a75a0c' },
  profileStatLabel: { fontSize: 11, color: '#8a7767', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  friendsActivitySection: { padding: 24 },
  friendsActivityTitle: { fontSize: 12, fontWeight: '800', color: '#b59370', letterSpacing: 1.5, marginBottom: 16, textTransform: 'uppercase' },
  friendActivityCard: { flexDirection: 'row', backgroundColor: '#fffdf9', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e8dec9', alignItems: 'center' },
  friendAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: '#dcd0bc' },
  friendCardContent: { flex: 1, marginLeft: 12 },
  friendNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  friendName: { fontSize: 14, fontWeight: '800', color: '#3b2f27' },
  friendTime: { fontSize: 11, color: '#8a7767' },
  friendTriumphText: { fontSize: 13, color: '#8a7767', marginTop: 4, lineHeight: 18, fontStyle: 'italic' },
  friendHighFiveButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f3eade', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  friendHighFiveEmoji: { fontSize: 16 },

  floatingNavIsland: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 34 : 20,
    left: 24,
    right: 24,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(252, 250, 242, 0.65)',
    borderWidth: 1.5,
    borderColor: 'rgba(232, 222, 201, 0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#2d221a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 90
  },
  floatingNavItem: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  floatingNavItemActive: {
    backgroundColor: '#f3eade',
    borderWidth: 1,
    borderColor: '#dcd0bc'
  },
  modalOverlayContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(28, 22, 17, 0.16)', // Extremely soft warm dim overlay
  },
  commentSheetContainer: {
    backgroundColor: '#fffdf9', // Crisp soft warm ivory sheet background
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: SCREEN_HEIGHT * 0.7,
    width: '100%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: 1.5,
    borderTopColor: '#f0e6d2',
    shadowColor: '#2d221a',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 24,
  },
  sheetHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e6dbcd',
    marginBottom: 10,
  },
  commentSheetHeader: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0e6d2',
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2d221a',
    letterSpacing: -0.3,
  },
  commentSheetCloseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f3eade',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentSheetCloseText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8a7767',
  },
  commentsListScroll: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
  },
  commentRow: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
    paddingHorizontal: 4,
  },
  commentUserAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5ecd8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e8dec9',
  },
  avatarText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#a75a0c',
  },
  commentContentBlock: {
    flex: 1,
    marginTop: 2,
  },
  commentInlineBody: {
    fontSize: 14,
    lineHeight: 19,
    color: '#2d221a',
  },
  commentUsername: {
    fontWeight: '700',
    color: '#2d221a',
  },
  commentBodyText: {
    color: '#3b2f27',
  },
  commentTimeText: {
    fontSize: 11,
    color: '#a39081',
    marginTop: 4,
  },
  emptyCommentsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyCommentsEmoji: {
    fontSize: 44,
    marginBottom: 12,
  },
  emptyCommentsText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2d221a',
    marginBottom: 4,
  },
  emptyCommentsSubtext: {
    fontSize: 12,
    color: '#8a7767',
    textAlign: 'center',
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0e6d2',
    backgroundColor: '#fffdf9',
  },
  commentTextInput: {
    flex: 1,
    backgroundColor: '#fcfaf2',
    borderWidth: 1,
    borderColor: '#ebd5b0',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    color: '#3b2f27',
    maxHeight: 100,
  },
  commentPostButton: {
    marginLeft: 14,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  commentPostButtonDisabled: {
    opacity: 0.4,
  },
  commentPostButtonText: {
    color: '#d97706',
    fontSize: 15,
    fontWeight: '700',
  }
});