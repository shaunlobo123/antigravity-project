import React, { forwardRef, useMemo, useState, useCallback, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Keyboard } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetTextInput,
  BottomSheetFlatList
} from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CommentsModal = forwardRef(({ comments, onAddComment, onDismiss, currentUsername = 'your_triumphs' }, ref) => {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [commentInputText, setCommentInputText] = useState('');
  const insets = useSafeAreaInsets();
  const inputRef = useRef(null);

  // Snap points: 80% static size
  const snapPoints = useMemo(() => ['80%'], []);

  // Custom Backdrop with BlurView
  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      >
        <BlurView
          style={StyleSheet.absoluteFill}
          tint="dark"
          intensity={40}
        />
      </BottomSheetBackdrop>
    ),
    []
  );

  const handleAddComment = () => {
    if (!commentInputText.trim()) return;
    Haptics.selectionAsync();
    onAddComment(commentInputText.trim());
    setCommentInputText('');
    inputRef.current?.blur();
    Keyboard.dismiss();
  };

  const formatCommentTime = (timeStr) => {
    if (!timeStr) return '';
    if (timeStr === 'Just now') return 'Just now';

    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return timeStr;

    const diffMs = Date.now() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);

    if (diffSecs < 60) {
      return 'Just now';
    }

    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) {
      return `${diffMins} ${diffMins === 1 ? 'min' : 'mins'}`;
    }

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'}`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
  };

  const renderItem = useCallback(({ item }) => (
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
        <Text style={styles.commentTimeText}>{formatCommentTime(item.time)}</Text>
      </View>
    </View>
  ), []);

  const renderEmptyComponent = useCallback(() => (
    <View style={styles.emptyCommentsBox}>
      <Text style={styles.emptyCommentsEmoji}>🌱</Text>
      <Text style={styles.emptyCommentsText}>No thoughts shared yet</Text>
      <Text style={styles.emptyCommentsSubtext}>Encourage their focus with a kind word.</Text>
    </View>
  ), []);

  const hasText = commentInputText.trim().length > 0;

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enableDynamicSizing={false}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
      topInset={insets.top + 20}
      onDismiss={onDismiss}
      onChange={(index) => {
        if (index === -1) {
          Keyboard.dismiss();
        }
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Comments</Text>
        </View>

        <BottomSheetFlatList
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmptyComponent}
          style={{ flex: 1 }}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />

        <View style={styles.inputContainer}>
          {/* Profile avatar next to input */}
          <View style={styles.inputAvatar}>
            <Text style={styles.inputAvatarText}>
              {currentUsername.slice(0, 2).toUpperCase()}
            </Text>
          </View>

          <BottomSheetTextInput
            ref={inputRef}
            style={styles.textInput}
            placeholder="Add a comment..."
            placeholderTextColor="#a89a8c"
            value={commentInputText}
            onChangeText={setCommentInputText}
            multiline
          />

          <TouchableOpacity
            style={[styles.postButton, !hasText && styles.postButtonDisabled]}
            onPress={handleAddComment}
            disabled={!hasText}
          >
            <Text style={[styles.postButtonText, !hasText && styles.postButtonDisabledText]}>Post</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </BottomSheetModal>
  );
});
CommentsModal.displayName = 'CommentsModal';

export default CommentsModal;

const getStyles = (colors) => StyleSheet.create({
  sheetBackground: {
    backgroundColor: colors.card, // Warm ivory background to match app
    borderRadius: 32,
  },
  handleIndicator: {
    width: 36,
    backgroundColor: colors.isDark ? '#4d3a2b' : '#e6dbcd',
    marginTop: 8,
  },
  headerContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
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
    backgroundColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.accentDark,
  },
  commentContentBlock: {
    flex: 1,
    marginTop: 2,
  },
  commentInlineBody: {
    fontSize: 14,
    lineHeight: 19,
    color: colors.text,
  },
  commentUsername: {
    fontWeight: '700',
    color: colors.text,
  },
  commentBodyText: {
    color: colors.textMedium,
  },
  commentTimeText: {
    fontSize: 11,
    color: colors.textMuted,
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
    color: colors.text,
    marginBottom: 4,
  },
  emptyCommentsSubtext: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.card,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputAvatarText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.accentDark,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 10,
    paddingBottom: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 14,
    color: colors.textMedium,
    minHeight: 44,
    maxHeight: 100,
  },
  postButton: {
    marginLeft: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.accent,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postButtonDisabled: {
    backgroundColor: 'transparent',
  },
  postButtonText: {
    color: colors.bg,
    fontWeight: '800',
    fontSize: 14,
  },
  postButtonDisabledText: {
    color: colors.cardBorder,
  },
});
