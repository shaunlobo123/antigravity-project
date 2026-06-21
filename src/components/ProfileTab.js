import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { supabase } from '../utils/supabase';
import { sendFriendRequest, acceptFriendRequest } from '../services/friendService';

const DEFAULT_AVATAR = require('../../assets/default_avatar.png');

// ─── Icon Components ──────────────────────────────────────────────────────────
const BellIcon = ({ color = '#3e2723', size = 22, badgeCount = 0 }) => (
  <View>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </Svg>
    {badgeCount > 0 && (
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

const CheckIcon = ({ color = '#22c55e', size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M20 6L9 17l-5-5" />
  </Svg>
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

  // Add friend state
  const [addFriendInput, setAddFriendInput] = useState('');
  const [addFriendLoading, setAddFriendLoading] = useState(false);

  // Settings edit state
  const [editUsername, setEditUsername] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

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
        return { id: f.id, username: p?.username, display_name: p?.display_name, avatar_url: p?.avatar_url };
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
      <StatusBar barStyle="dark-content" backgroundColor="#fcfaf2" />

      {/* ── Header Bar ── */}
      <View style={styles.headerBar}>
        {/* Notification Bell */}
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => { Haptics.selectionAsync(); setNotifVisible(true); }}
        >
          <BellIcon badgeCount={pendingRequests.length} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Profile</Text>

        {/* Settings Gear */}
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => { Haptics.selectionAsync(); setSettingsVisible(true); }}
        >
          <GearIcon />
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
        <Text style={styles.sectionCount}>{acceptedFriends.length}</Text>
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
              {item.avatar_url ? (
                <Image source={{ uri: item.avatar_url }} style={styles.friendAvatar} />
              ) : (
                <Image source={DEFAULT_AVATAR} style={styles.friendAvatar} />
              )}
              <View style={styles.friendInfo}>
                <Text style={styles.friendDisplayName}>{item.display_name || item.username}</Text>
                <Text style={styles.friendUsername}>@{item.username}</Text>
              </View>
              <CheckIcon />
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* ── Floating + FAB ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => { Haptics.selectionAsync(); setAddFriendVisible(true); }}
      >
        <PlusIcon />
      </TouchableOpacity>

      {/* ══════════════════════════════════════════════════════════
          NOTIFICATION MODAL (Pending Requests)
      ══════════════════════════════════════════════════════════ */}
      {/* ══════════════════════════════════════════════════════════
          NOTIFICATION MODAL (Pending Requests)
      ══════════════════════════════════════════════════════════ */}
      <Modal visible={notifVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setNotifVisible(false)}>
        <SafeAreaView style={styles.modalSafe}>
          {/* Drag Handle */}
          <TouchableOpacity
            style={styles.dragHandleWrapper}
            onPress={() => { Haptics.selectionAsync(); setNotifVisible(false); }}
            activeOpacity={0.6}
          >
            <View style={styles.dragHandlePill} />
          </TouchableOpacity>

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
                {/* Drag Handle */}
                <TouchableOpacity
                  style={styles.dragHandleWrapper}
                  onPress={() => { Haptics.selectionAsync(); setAddFriendVisible(false); setAddFriendInput(''); }}
                  activeOpacity={0.6}
                >
                  <View style={styles.dragHandlePill} />
                </TouchableOpacity>

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
                {/* Drag Handle */}
                <TouchableOpacity
                  style={styles.dragHandleWrapper}
                  onPress={() => { Haptics.selectionAsync(); setSettingsVisible(false); }}
                  activeOpacity={0.6}
                >
                  <View style={styles.dragHandlePill} />
                </TouchableOpacity>

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
                        onValueChange={(v) => { setDarkMode(v); Haptics.selectionAsync(); }}
                        trackColor={{ false: '#e5d5c0', true: '#d97706' }}
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
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fcfaf2',
  },

  // Header
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ebd5b0',
    backgroundColor: '#fcfaf2',
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3eade',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ebd5b0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2d221a',
    letterSpacing: -0.5,
  },

  // Badge
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#fcfaf2',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
  },

  // Profile Banner
  profileBannerContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#fcfaf2',
  },
  profileBannerCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#ebd5b0',
    shadowColor: '#3e2723',
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
    borderColor: '#ebd5b0',
    overflow: 'hidden',
    marginRight: 16,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarLoading: {
    backgroundColor: '#f3eade',
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
    color: '#3e2723',
    marginBottom: 2,
  },
  profileUsername: {
    fontSize: 14,
    color: '#a38a7a', // slightly lighter
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
    backgroundColor: '#fcfaf2',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ebd5b0',
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
    color: '#3e2723',
  },
  statLabel: {
    fontSize: 10,
    color: '#8d6e63',
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
    color: '#8d6e63',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d97706',
    backgroundColor: '#fef3c7',
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
    borderColor: '#ebd5b0',
    backgroundColor: '#f3eade',
  },
  friendInfo: { flex: 1 },
  friendDisplayName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3e2723',
    marginBottom: 2,
  },
  friendUsername: {
    fontSize: 13,
    color: '#8d6e63',
  },
  separator: {
    height: 1,
    backgroundColor: '#f3eade',
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
    color: '#3e2723',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8d6e63',
  },
  centerLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#d97706',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },

  // Modal shared
  modalSafe: {
    flex: 1,
    backgroundColor: '#fcfaf2',
  },
  dragHandleWrapper: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#fcfaf2',
  },
  dragHandlePill: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#d5c9bc',
  },
  modalHeaderCentered: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: '#ebd5b0',
    backgroundColor: '#fcfaf2',
  },
  headerSaveBtn: {
    position: 'absolute',
    right: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  headerSaveBtnText: {
    color: '#d97706',
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
    borderBottomColor: '#ebd5b0',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#3e2723',
  },
  modalClose: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: '#f3eade',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ebd5b0',
  },
  modalCloseText: {
    color: '#d97706',
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
    backgroundColor: '#d97706',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  acceptBtnText: {
    color: '#fff',
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
    color: '#8d6e63',
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#d97706',
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
  },
  atSymbol: {
    fontSize: 17,
    fontWeight: '700',
    color: '#d97706',
    marginRight: 4,
  },
  addFriendInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 16,
    color: '#3e2723',
  },

  // Primary Button
  primaryBtn: {
    backgroundColor: '#d97706',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: '#fff',
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
    borderColor: '#ebd5b0',
    backgroundColor: '#f3eade',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#d97706',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fcfaf2',
  },
  changePhotoLabel: {
    fontSize: 14,
    color: '#d97706',
    fontWeight: '600',
  },
  settingsSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#a38a7a',
    letterSpacing: 1.5,
    paddingHorizontal: 20,
    paddingBottom: 8,
    paddingTop: 4,
  },
  settingsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ebd5b0',
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
    color: '#a38a7a',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  fieldInput: {
    fontSize: 16,
    color: '#3e2723',
    paddingVertical: 2,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: '#f3eade',
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
    color: '#3e2723',
    marginBottom: 2,
  },
  settingsRowSub: {
    fontSize: 12,
    color: '#8d6e63',
  },

  // Logout
  logoutBtn: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: '#ef4444',
    fontWeight: '700',
    fontSize: 16,
  },
});
