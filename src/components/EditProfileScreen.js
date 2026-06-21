import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import * as Haptics from 'expo-haptics';
import { supabase } from '../utils/supabase';

export default function EditProfileScreen({ onBack, onSaveComplete }) {
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch current user and profile on mount
  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        if (user) {
          setUserId(user.id);
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', user.id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') { // PGRST116 is code for "no rows returned"
            throw profileError;
          }

          if (profile) {
            setUsername(profile.username || '');
            setAvatarUrl(profile.avatar_url || null);
          }
        }
      } catch (err) {
        console.error('Error loading profile:', err.message);
        Alert.alert('Error', 'Failed to load profile details.');
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const triggerHaptic = () => {
    Haptics.selectionAsync();
  };

  const handlePickImage = async () => {
    triggerHaptic();
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'We need camera roll permissions to select a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!username.trim()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      Alert.alert('Validation Error', 'Username cannot be empty.');
      return;
    }

    triggerHaptic();
    setSaving(true);

    try {
      let finalAvatarUrl = avatarUrl;

      // 1. If user selected a new image from their camera roll, upload it first
      if (selectedImageUri) {
        const fileExt = selectedImageUri.split('.').pop().toLowerCase() || 'jpg';
        const mimeType = fileExt === 'png' ? 'image/png' : 'image/jpeg';
        const fileName = `${userId}/${Date.now()}.${fileExt}`;

        // Read local file as Base64 string
        const base64 = await FileSystem.readAsStringAsync(selectedImageUri, {
          encoding: 'base64',
        });

        // Convert base64 to arrayBuffer for Supabase Upload compatibility
        const arrayBuffer = decode(base64);

        // Upload to Supabase 'avatars' storage bucket
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, arrayBuffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Avatar upload failed: ${uploadError.message}`);
        }

        // Retrieve public URL of the uploaded image
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        finalAvatarUrl = publicUrl;
      }

      // 2. Save profile updates (username, avatar_url) to profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username: username.trim(),
          avatar_url: finalAvatarUrl,
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      setAvatarUrl(finalAvatarUrl);
      setSelectedImageUri(null);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      Alert.alert('Success', 'Profile updated successfully!');
      
      if (onSaveComplete) {
        onSaveComplete({ username: username.trim(), avatar_url: finalAvatarUrl });
      }
    } catch (err) {
      console.error('Error saving profile:', err.message);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      Alert.alert('Save Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d97706" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const currentDisplayImage = selectedImageUri || avatarUrl;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
            {/* Header Row */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Edit Profile</Text>
              <View style={{ width: 60 }} /> {/* Spacer to align title */}
            </View>

            {/* Avatar Section */}
            <View style={styles.avatarSection}>
              <TouchableOpacity onPress={handlePickImage} style={styles.avatarContainer}>
                {currentDisplayImage ? (
                  <Image source={{ uri: currentDisplayImage }} style={styles.avatar} />
                ) : (
                  <View style={styles.placeholderAvatar}>
                    <Text style={styles.placeholderText}>
                      {username ? username.charAt(0).toUpperCase() : 'U'}
                    </Text>
                  </View>
                )}
                <View style={styles.editBadge}>
                  <Text style={styles.editBadgeText}>Edit</Text>
                </View>
              </TouchableOpacity>
              <Text style={styles.avatarInstructions}>Tap to change avatar</Text>
            </View>

            {/* Form Section */}
            <View style={styles.formCard}>
              <Text style={styles.inputLabel}>USERNAME</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter username"
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fcfaf2',
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fcfaf2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#d97706',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ebd5b0',
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f3eade',
    borderWidth: 1,
    borderColor: '#ebd5b0',
  },
  backButtonText: {
    color: '#d97706',
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3e2723',
    textAlign: 'center',
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: 32,
  },
  avatarContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: '#ebd5b0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#f3eade',
    shadowColor: '#3e2723',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 55,
  },
  placeholderAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 55,
    backgroundColor: '#f3eade',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#d97706',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#d97706',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: '#fcfaf2',
  },
  editBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  avatarInstructions: {
    marginTop: 12,
    fontSize: 14,
    color: '#8d6e63',
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#ebd5b0',
    shadowColor: '#3e2723',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#d97706',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ebd5b0',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#3e2723',
    backgroundColor: '#fcfaf2',
    marginBottom: 24,
  },
  saveButton: {
    backgroundColor: '#d97706',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
