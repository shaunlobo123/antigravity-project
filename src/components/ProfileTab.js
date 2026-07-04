import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  TextInput,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Modal,
  Switch,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  StatusBar,
  PanResponder,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { supabase } from '../utils/supabase';
import { sendFriendRequest, acceptFriendRequest } from '../services/friendService';
import GoldenTree from './GoldenTree';

const DEFAULT_AVATAR = require('../../assets/default_avatar.png');

// ─── Icon Components ──────────────────────────────────────────────────────────
const BellIcon = ({ color = '#3e2723', size = 22, badgeCount = 0, styles }) => (
  <View>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </Svg>
    {badgeCount > 0 && styles && (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
      </View>
    )}
  </View>
);

const GearIcon = ({ color = '#3e2723', size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="3" />
    <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Svg>
);

const PlusIcon = ({ color = '#fff', size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round">
    <Line x1="12" y1="5" x2="12" y2="19" />
    <Line x1="5" y1="12" x2="19" y2="12" />
  </Svg>
);


// Bell inside a circle — used to nudge friends to complete their daily challenge
const BellCircleIcon = ({ color = '#d97706', size = 32 }) => (
  <View style={{
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 1.5,
    borderColor: color,
    alignItems: 'center',
    justifyContent: 'center',
  }}>
    <Svg width={size * 0.52} height={size * 0.52} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </Svg>
  </View>
);

const ChevronRight = ({ color = '#bba98e', size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M9 18l6-6-6-6" />
  </Svg>
);

const CameraIcon = ({ color = '#fff', size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <Circle cx="12" cy="13" r="4" />
  </Svg>
);

// ─── Avatar Upload Helper ─────────────────────────────────────────────────────
async function uploadAvatarToSupabase(userId, uri) {
  const fileExt = uri.split('.').pop().toLowerCase() || 'jpg';
  const mimeType = fileExt === 'png' ? 'image/png' : 'image/jpeg';
  const fileName = `${userId}/${Date.now()}.${fileExt}`;
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  const arrayBuffer = decode(base64);
  const { error: uploadError } = await supabase.storage
    .from('avatars').upload(fileName, arrayBuffer, { contentType: mimeType, upsert: true });
  if (uploadError) throw new Error(uploadError.message);
  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
  return publicUrl;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProfileTab({ streak = 0, totalTriumphs = 0 }) {
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Friend data
  const [pendingRequests, setPendingRequests] = useState([]);
  const [acceptedFriends, setAcceptedFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(true);

  // Modal visibility
  const [notifVisible, setNotifVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [addFriendVisible, setAddFriendVisible] = useState(false);
  const [viewFriendProfile, setViewFriendProfile] = useState(null);
  const [friendStats, setFriendStats] = useState(null);
  const [friendStatsLoading, setFriendStatsLoading] = useState(false);
  const [friendPosts, setFriendPosts] = useState([]);

  // Add friend state
  const [addFriendInput, setAddFriendInput] = useState('');
  const [addFriendLoading, setAddFriendLoading] = useState(false);

  // Settings edit state
  const [editUsername, setEditUsername] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const { colors, isDark: darkMode, toggleTheme } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const createSwipeDownResponder = useCallback((onClose) => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (gestureState.dy > 20) {
        onClose();
      }
    }
  }), []);

  const notifPan = useMemo(() => createSwipeDownResponder(() => setNotifVisible(false)), [createSwipeDownResponder]);
  const addFriendPan = useMemo(() => createSwipeDownResponder(() => { setAddFriendVisible(false); setAddFriendInput(''); }), [createSwipeDownResponder]);
  const settingsPan = useMemo(() => createSwipeDownResponder(() => setSettingsVisible(false)), [createSwipeDownResponder]);
  const viewFriendPan = useMemo(() => createSwipeDownResponder(() => setViewFriendProfile(null)), [createSwipeDownResponder]);

  // ─── Load profile ───────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url, email')
        .eq('id', user.id)
        .single();
      if (data) {
        let profileData = data;
        // Self-healing fallback: if email is missing in public.profiles,
        // automatically populate it using the user email from auth.
        if (!data.email && user.email) {
          await supabase.from('profiles').update({ email: user.email }).eq('id', user.id);
          profileData = { ...data, email: user.email };
        }
        setProfile(profileData);
        setEditUsername(profileData.username || '');
        setEditDisplayName(profileData.display_name || '');
      }
      setProfileLoading(false);
    }
    load();
  }, []);

  // ─── Load friendships ───────────────────────────────────────────────────────
  const loadFriendships = useCallback(async () => {
    if (!userId) return;
    setFriendsLoading(true);
    try {
      const [{ data: incoming }, { data: accepted }] = await Promise.all([
        supabase.from('friendships')
          .select('id, sender_id, profiles:sender_id(username, display_name, avatar_url)')
          .eq('receiver_id', userId).eq('status', 'pending'),
        supabase.from('friendships')
          .select('id, sender_id, receiver_id, profiles:sender_id(username, display_name, avatar_url), receiver_profile:receiver_id(username, display_name, avatar_url)')
          .eq('status', 'accepted')
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`),
      ]);
      setPendingRequests(incoming || []);
      setAcceptedFriends((accepted || []).map(f => {
        const isSender = f.sender_id === userId;
        const p = isSender ? f.receiver_profile : f.profiles;
        const friendUserId = isSender ? f.receiver_id : f.sender_id;
        return { id: f.id, user_id: friendUserId, username: p?.username, display_name: p?.display_name, avatar_url: p?.avatar_url };
      }));
    } finally {
      setFriendsLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadFriendships(); }, [loadFriendships]);

  // ─── Add Friend ─────────────────────────────────────────────────────────────
  const handleAddFriend = async () => {
    if (!addFriendInput.trim()) return;
    Haptics.selectionAsync();
    setAddFriendLoading(true);
    try {
      await sendFriendRequest(addFriendInput.trim());
      setAddFriendInput('');
      setAddFriendVisible(false);
      Alert.alert('Request Sent! 🎉', `Friend request sent to @${addFriendInput.trim()}.`);
    } catch (err) {
      Alert.alert('Could not send request', err.message);
    } finally {
      setAddFriendLoading(false);
    }
  };

  // ─── Accept Request ─────────────────────────────────────────────────────────
  const handleAcceptRequest = async (friendshipId) => {
    Haptics.selectionAsync();
    try {
      await acceptFriendRequest(friendshipId);
      await loadFriendships();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleSendReminder = (friend) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      '🔔 Reminder Sent!',
      `${friend.display_name || friend.username} has been nudged to complete their daily challenge.`,
      [{ text: 'OK' }]
    );
  };

  // ─── Fetch Friend Stats when modal opens ────────────────────────────────────
  useEffect(() => {
    if (!viewFriendProfile?.user_id) {
      setFriendStats(null);
      setFriendPosts([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setFriendStatsLoading(true);
      try {
        // Fetch profile created_at and their posts
        const [{ data: profileData }, { data: postsData }] = await Promise.all([
          supabase.from('profiles')
            .select('created_at')
            .eq('id', viewFriendProfile.user_id)
            .single(),
          supabase.from('posts')
            .select('*')
            .eq('user_id', viewFriendProfile.user_id)
            .order('created_at', { ascending: true }),
        ]);
        if (!cancelled) {
          const joinDate = profileData?.created_at ? new Date(profileData.created_at) : null;
          setFriendPosts(postsData || []);
          setFriendStats({
            joinedOn: joinDate,
            totalWins: postsData ? postsData.length : 0,
            streak: 0, // Streak calculation would need daily post analysis
          });
        }
      } catch {
        if (!cancelled) setFriendStats(null);
      } finally {
        if (!cancelled) setFriendStatsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [viewFriendProfile?.user_id]);

  // ─── Change Avatar ──────────────────────────────────────────────────────────
  const handleChangeAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera roll access is needed to update your photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.75,
    });
    if (result.canceled || !result.assets?.length) return;
    setAvatarUploading(true);
    try {
      const publicUrl = await uploadAvatarToSupabase(userId, result.assets[0].uri);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId);
      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Updated!', 'Profile photo changed.');
    } catch (err) {
      Alert.alert('Upload failed', err.message);
    } finally {
      setAvatarUploading(false);
    }
  };

  // ─── Save Settings ──────────────────────────────────────────────────────────
  const handleSaveSettings = async () => {
    if (!editUsername.trim()) {
      Alert.alert('Validation', 'Username cannot be empty.');
      return;
    }
    Haptics.selectionAsync();
    setSettingsSaving(true);
    try {
      const updates = { username: editUsername.trim() };
      if (editDisplayName.trim()) updates.display_name = editDisplayName.trim();
      await supabase.from('profiles').update(updates).eq('id', userId);
      setProfile(prev => ({ ...prev, ...updates }));
      setSettingsVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      Alert.alert('Save failed', err.message);
    } finally {
      setSettingsSaving(false);
    }
  };

  // ─── Logout ─────────────────────────────────────────────────────────────────
  const handleLogOut = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive', onPress: async () => {
          setSigningOut(true);
          await supabase.auth.signOut();
        }
      },
    ]);
  };

  // ─── Derived ─────────────────────────────────────────────────────────────────
  const displayName = profile?.display_name || profile?.username || '—';
  const username = profile?.username || '—';
  const hasChanges = editUsername.trim() !== (profile?.username || '').trim() ||
                     editDisplayName.trim() !== (profile?.display_name || '').trim();

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={darkMode ? "light-content" : "dark-content"} backgroundColor={colors.bg} />

      {/* ── Header Bar ── */}
      <View style={styles.headerBar}>
        {/* Notification Bell */}
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => { Haptics.selectionAsync(); setNotifVisible(true); }}
        >
          <BellIcon badgeCount={pendingRequests.length} color={colors.text} styles={styles} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Profile</Text>

        {/* Settings Gear */}
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => { Haptics.selectionAsync(); setSettingsVisible(true); }}
        >
          <GearIcon color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* ── Profile Banner ── */}
      {profileLoading ? (
        <View style={styles.profileBannerSkeleton}>
          <ActivityIndicator color="#d97706" />
        </View>
      ) : (
        <View style={styles.profileBannerContainer}>
          <View style={styles.profileBannerCard}>
            <View style={styles.profileTopRow}>
              {/* Avatar */}
              <View style={styles.avatarWrapper}>
                {avatarUploading ? (
                  <View style={[styles.avatarImg, styles.avatarLoading]}>
                    <ActivityIndicator color="#d97706" />
                  </View>
                ) : profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
                ) : (
                  <Image source={DEFAULT_AVATAR} style={styles.avatarImg} />
                )}
              </View>

              {/* Name block */}
              <View style={styles.profileNameBlock}>
                <Text style={styles.profileDisplayName} numberOfLines={1}>{displayName}</Text>
                <Text style={styles.profileUsername}>@{username}</Text>
              </View>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statBoxEmoji}>🔥</Text>
                <View style={styles.statBoxText}>
                  <Text style={styles.statNumber}>{streak}</Text>
                  <Text style={styles.statLabel}>Day Streak</Text>
                </View>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxEmoji}>✨</Text>
                <View style={styles.statBoxText}>
                  <Text style={styles.statNumber}>{totalTriumphs}</Text>
                  <Text style={styles.statLabel}>Total Wins</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ── Friends List ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Friends</Text>
        <TouchableOpacity
          style={styles.addFriendInlineBtn}
          onPress={() => { Haptics.selectionAsync(); setAddFriendVisible(true); }}
          activeOpacity={0.7}
        >
          <PlusIcon color={colors.accent} size={14} />
        </TouchableOpacity>
      </View>

      {friendsLoading ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator color="#d97706" />
        </View>
      ) : acceptedFriends.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>👋</Text>
          <Text style={styles.emptyTitle}>No friends yet</Text>
          <Text style={styles.emptySubtitle}>Tap the + button to find people</Text>
        </View>
      ) : (
        <FlatList
          data={acceptedFriends}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.friendRow}>
              <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setViewFriendProfile(item); }} activeOpacity={0.7}>
                {item.avatar_url ? (
                  <Image source={{ uri: item.avatar_url }} style={styles.friendAvatar} />
                ) : (
                  <Image source={DEFAULT_AVATAR} style={styles.friendAvatar} />
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.friendInfo} onPress={() => { Haptics.selectionAsync(); setViewFriendProfile(item); }} activeOpacity={0.7}>
                <Text style={styles.friendDisplayName}>{item.display_name || item.username}</Text>
                <Text style={styles.friendUsername}>@{item.username}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleSendReminder(item)}
                activeOpacity={0.7}
              >
                <BellCircleIcon color={colors.accent} size={30} />
              </TouchableOpacity>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}


      {/* ══════════════════════════════════════════════════════════
          NOTIFICATION MODAL (Pending Requests)
      ══════════════════════════════════════════════════════════ */}
      {/* ══════════════════════════════════════════════════════════
          NOTIFICATION MODAL (Pending Requests)
      ══════════════════════════════════════════════════════════ */}
      <Modal visible={notifVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setNotifVisible(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <View
            style={styles.dragHandleWrapper}
            {...notifPan.panHandlers}
          >
            <View style={styles.dragHandlePill} />
          </View>

          <View style={styles.modalHeaderCentered}>
            <Text style={styles.modalTitle}>Notifications</Text>
          </View>

          {pendingRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🔔</Text>
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptySubtitle}>No pending friend requests.</Text>
            </View>
          ) : (
            <FlatList
              data={pendingRequests}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <View style={styles.notifRow}>
                  {item.profiles?.avatar_url ? (
                    <Image source={{ uri: item.profiles.avatar_url }} style={styles.friendAvatar} />
                  ) : (
                    <Image source={DEFAULT_AVATAR} style={styles.friendAvatar} />
                  )}
                  <View style={styles.friendInfo}>
                    <Text style={styles.friendDisplayName}>
                      {item.profiles?.display_name || item.profiles?.username}
                    </Text>
                    <Text style={styles.friendUsername}>Wants to be your friend</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={() => { handleAcceptRequest(item.id); setNotifVisible(false); }}
                  >
                    <Text style={styles.acceptBtnText}>Accept</Text>
                  </TouchableOpacity>
                </View>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* ══════════════════════════════════════════════════════════
          ADD FRIEND MODAL
      ══════════════════════════════════════════════════════════ */}
      <Modal visible={addFriendVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setAddFriendVisible(false); setAddFriendInput(''); }}>
        <SafeAreaView style={styles.modalSafe}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={{ flex: 1 }}>
                <View
                  style={styles.dragHandleWrapper}
                  {...addFriendPan.panHandlers}
                >
                  <View style={styles.dragHandlePill} />
                </View>

                <View style={styles.modalHeaderCentered}>
                  <Text style={styles.modalTitle}>Add Friend</Text>
                </View>

                <View style={styles.addFriendContent}>
                  <Text style={styles.addFriendHint}>Enter someone{"'"}s username to send them a friend request.</Text>
                  <View style={styles.inputRow}>
                    <Text style={styles.atSymbol}>@</Text>
                    <TextInput
                      style={styles.addFriendInput}
                      placeholder="username"
                      placeholderTextColor="#bba98e"
                      value={addFriendInput}
                      onChangeText={setAddFriendInput}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoFocus
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.primaryBtn, !addFriendInput.trim() && styles.primaryBtnDisabled]}
                    onPress={handleAddFriend}
                    disabled={addFriendLoading || !addFriendInput.trim()}
                  >
                    {addFriendLoading
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={styles.primaryBtnText}>Send Request</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ══════════════════════════════════════════════════════════
          SETTINGS MODAL
      ══════════════════════════════════════════════════════════ */}
      <Modal visible={settingsVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSettingsVisible(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={{ flex: 1 }}>
                <View
                  style={styles.dragHandleWrapper}
                  {...settingsPan.panHandlers}
                >
                  <View style={styles.dragHandlePill} />
                </View>

                {/* Header */}
                <View style={styles.modalHeaderCentered}>
                  <Text style={styles.modalTitle}>Settings</Text>
                  {hasChanges && (
                    <TouchableOpacity
                      onPress={handleSaveSettings}
                      disabled={settingsSaving}
                      style={[styles.headerSaveBtn, settingsSaving && { opacity: 0.5 }]}
                    >
                      {settingsSaving ? (
                        <ActivityIndicator size="small" color="#d97706" />
                      ) : (
                        <Text style={styles.headerSaveBtnText}>Save</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                <ScrollView bounces={false}>
                  {/* ── Profile Picture ── */}
                  <View style={styles.settingsAvatarBlock}>
                    <TouchableOpacity onPress={handleChangeAvatar} style={styles.settingsAvatarWrap}>
                      {avatarUploading ? (
                        <View style={[styles.settingsAvatar, styles.avatarLoading]}>
                          <ActivityIndicator color="#d97706" />
                        </View>
                      ) : profile?.avatar_url ? (
                        <Image source={{ uri: profile.avatar_url }} style={styles.settingsAvatar} />
                      ) : (
                        <Image source={DEFAULT_AVATAR} style={styles.settingsAvatar} />
                      )}
                      <View style={styles.cameraOverlay}>
                        <CameraIcon />
                      </View>
                    </TouchableOpacity>
                    <Text style={styles.changePhotoLabel}>Change Photo</Text>
                  </View>

                  {/* ── Profile Section ── */}
                  <Text style={styles.settingsSectionLabel}>PROFILE</Text>
                  <View style={styles.settingsCard}>
                    <View style={styles.settingsField}>
                      <Text style={styles.fieldLabel}>Display Name</Text>
                      <TextInput
                        style={styles.fieldInput}
                        value={editDisplayName}
                        onChangeText={setEditDisplayName}
                        placeholder="Your full name"
                        placeholderTextColor="#bba98e"
                      />
                    </View>
                    <View style={styles.fieldDivider} />
                    <View style={styles.settingsField}>
                      <Text style={styles.fieldLabel}>Username</Text>
                      <TextInput
                        style={styles.fieldInput}
                        value={editUsername}
                        onChangeText={setEditUsername}
                        placeholder="username"
                        placeholderTextColor="#bba98e"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                  </View>

                  {/* ── Appearance Section ── */}
                  <Text style={styles.settingsSectionLabel}>APPEARANCE</Text>
                  <View style={styles.settingsCard}>
                    <View style={styles.settingsRow}>
                      <View>
                        <Text style={styles.settingsRowLabel}>Dark Mode</Text>
                        <Text style={styles.settingsRowSub}>Toggle light or dark theme</Text>
                      </View>
                       <Switch
                         value={darkMode}
                         onValueChange={() => { toggleTheme(); Haptics.selectionAsync(); }}
                         trackColor={{ false: colors.isDark ? '#4d3a2b' : '#e5d5c0', true: colors.accent }}
                         thumbColor="#fff"
                       />
                    </View>
                  </View>

                  {/* ── Account Section ── */}
                  <Text style={styles.settingsSectionLabel}>ACCOUNT</Text>
                  <View style={styles.settingsCard}>
                    <View style={styles.settingsRow}>
                      <View>
                        <Text style={styles.settingsRowLabel}>Email</Text>
                        <Text style={styles.settingsRowSub}>{profile?.email || '—'}</Text>
                      </View>
                      <ChevronRight />
                    </View>
                    <View style={styles.fieldDivider} />
                    <View style={styles.settingsRow}>
                      <View>
                        <Text style={styles.settingsRowLabel}>Notifications</Text>
                        <Text style={styles.settingsRowSub}>Friend requests & activity</Text>
                      </View>
                      <Switch
                        value={true}
                        trackColor={{ false: '#e5d5c0', true: '#d97706' }}
                        thumbColor="#fff"
                        disabled
                      />
                    </View>
                  </View>

                  {/* ── Danger Zone ── */}
                  <TouchableOpacity
                    style={styles.logoutBtn}
                    onPress={handleLogOut}
                    disabled={signingOut}
                  >
                    {signingOut
                      ? <ActivityIndicator color="#ef4444" />
                      : <Text style={styles.logoutBtnText}>Log Out</Text>
                    }
                  </TouchableOpacity>

                  <View style={{ height: 40 }} />
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ══════════════════════════════════════════════════════════
          VIEW FRIEND PROFILE MODAL
      ══════════════════════════════════════════════════════════ */}
      <Modal visible={!!viewFriendProfile} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setViewFriendProfile(null)}>
        <SafeAreaView style={styles.modalSafe}>
          <View
            style={styles.dragHandleWrapper}
            {...viewFriendPan.panHandlers}
          >
            <View style={styles.dragHandlePill} />
          </View>

          {viewFriendProfile && (
            <View style={styles.viewFriendContainer}>
              {viewFriendProfile.avatar_url ? (
                <Image source={{ uri: viewFriendProfile.avatar_url }} style={styles.viewFriendAvatar} />
              ) : (
                <Image source={DEFAULT_AVATAR} style={styles.viewFriendAvatar} />
              )}
              <Text style={styles.viewFriendDisplayName}>
                {viewFriendProfile.display_name || viewFriendProfile.username}
              </Text>
              <Text style={styles.viewFriendUsername}>
                @{viewFriendProfile.username}
              </Text>

              {/* Joined date */}
              {friendStats?.joinedOn && (
                <Text style={styles.viewFriendJoined}>
                  Joined in {friendStats.joinedOn.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </Text>
              )}

              <View style={styles.viewFriendStatsRow}>
                <View style={styles.viewFriendStatBox}>
                  <Text style={styles.viewFriendStatNumber}>🔥 {friendStats ? friendStats.streak : 0}</Text>
                  <Text style={styles.viewFriendStatLabel}>Day Streak</Text>
                </View>
                <View style={styles.viewFriendStatBox}>
                  <Text style={styles.viewFriendStatNumber}>✨ {friendStats ? friendStats.totalWins : 0}</Text>
                  <Text style={styles.viewFriendStatLabel}>Total Wins</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleSendReminder(viewFriendProfile)}
                  activeOpacity={0.7}
                >
                  <BellCircleIcon color={colors.accent} size={42} />
                </TouchableOpacity>
              </View>

              <View style={{ flex: 1, width: '100%', marginTop: 10, alignItems: 'center', justifyContent: 'center' }}>
                <GoldenTree 
                  history={friendPosts} 
                  isTreeOpen={true} 
                  hideSun={true}
                  hideLeavesCount={true}
                  disableGrowAnimation={true}
                  customTitle={`${viewFriendProfile.display_name || viewFriendProfile.username}'s Canopy`}
                />
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const getStyles = (colors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // Header
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: colors.bg,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },

  // Badge
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.badgeRed,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.bg,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.white,
  },

  // Profile Banner
  profileBannerContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: colors.bg,
  },
  profileBannerCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileBannerSkeleton: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
    marginRight: 16,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarLoading: {
    backgroundColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileNameBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  profileDisplayName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  profileUsername: {
    fontSize: 14,
    color: colors.textMuted, // slightly lighter
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  statBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 8,
  },
  statBoxEmoji: {
    fontSize: 20,
  },
  statBoxText: {
    flexDirection: 'column',
    flex: 1,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.accentDark,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textSection,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
    backgroundColor: colors.isDark ? '#3d2e22' : '#fef3c7',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 1,
    overflow: 'hidden',
  },

  // Friends list
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  friendAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.borderLight,
  },
  friendInfo: { flex: 1 },
  friendDisplayName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  friendUsername: {
    fontSize: 13,
    color: colors.textMuted,
  },
  separator: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginLeft: 54,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
    gap: 8,
  },
  emptyEmoji: { fontSize: 36, marginBottom: 4 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  centerLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Inline + add friend button next to section header
  addFriendInlineBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // View Friend Profile Modal
  viewFriendContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 24,
    gap: 6,
  },
  viewFriendAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: colors.accent,
    marginBottom: 12,
  },
  viewFriendDisplayName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  viewFriendUsername: {
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: 4,
  },
  viewFriendJoined: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
    opacity: 0.7,
    marginBottom: 16,
  },
  viewFriendStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  viewFriendStatBox: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: colors.isDark ? 'rgba(61, 46, 34, 0.5)' : 'rgba(254, 243, 199, 0.6)',
    minWidth: 110,
  },
  viewFriendStatNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  viewFriendStatLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  viewFriendReminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.accent,
    marginTop: 8,
  },
  viewFriendReminderText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent,
  },

  // Modal shared
  modalSafe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  dragHandleWrapper: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: colors.bg,
  },
  dragHandlePill: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.isDark ? '#4d3a2b' : '#d5c9bc',
  },
  modalHeaderCentered: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: colors.bg,
  },
  headerSaveBtn: {
    position: 'absolute',
    right: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: colors.isDark ? '#3d2e22' : '#fef3c7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.isDark ? '#5c4533' : '#fde68a',
  },
  headerSaveBtnText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  modalClose: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: colors.borderLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalCloseText: {
    color: colors.accent,
    fontWeight: '600',
    fontSize: 14,
  },

  // Notification Modal
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  acceptBtn: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  acceptBtnText: {
    color: colors.bg,
    fontWeight: '700',
    fontSize: 13,
  },

  // Add Friend Modal
  addFriendContent: {
    padding: 24,
    gap: 20,
  },
  addFriendHint: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
  },
  atSymbol: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.accent,
    marginRight: 4,
  },
  addFriendInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.text,
  },

  // Primary Button
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: '700',
  },
  saveBtn: {
    marginHorizontal: 16,
    marginBottom: 8,
  },

  // Settings Modal
  settingsAvatarBlock: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  settingsAvatarWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    position: 'relative',
  },
  settingsAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    backgroundColor: colors.borderLight,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  changePhotoLabel: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '600',
  },
  settingsSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSection,
    letterSpacing: 1.5,
    paddingHorizontal: 20,
    paddingBottom: 8,
    paddingTop: 4,
  },
  settingsCard: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 20,
    overflow: 'hidden',
  },
  settingsField: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  fieldInput: {
    fontSize: 16,
    color: colors.text,
    paddingVertical: 2,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginHorizontal: 16,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingsRowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  settingsRowSub: {
    fontSize: 12,
    color: colors.textMuted,
  },

  // Logout
  logoutBtn: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: colors.isDark ? '#5c1d1d' : '#fca5a5',
    backgroundColor: colors.isDark ? '#311c1c' : '#fef2f2',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: colors.badgeRed,
    fontWeight: '700',
    fontSize: 16,
  },
});
