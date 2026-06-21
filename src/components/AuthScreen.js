import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/useAuth';

export default function AuthScreen() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' }); // type: 'error' | 'success'

  const { login, signUp, actionLoading } = useAuth();

  const isSignUp = mode === 'signup';

  const clearFeedback = () => setFeedback({ type: '', message: '' });

  const handleToggleMode = () => {
    Haptics.selectionAsync();
    clearFeedback();
    setMode(prev => prev === 'login' ? 'signup' : 'login');
  };

  const handleSubmit = async () => {
    Haptics.selectionAsync();
    clearFeedback();

    if (!email.trim() || !password.trim()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setFeedback({ type: 'error', message: 'Please enter your email and password.' });
      return;
    }

    if (isSignUp && !username.trim()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setFeedback({ type: 'error', message: 'Please enter a username to continue.' });
      return;
    }

    try {
      if (isSignUp) {
        await signUp(email.trim(), password, { username: username.trim() });
        setFeedback({
          type: 'success',
          message: 'Account created! Check your email to confirm, then log in.',
        });
      } else {
        await login(email.trim(), password);
        // On success, the useAuth hook updates the session and App.js redirects automatically
      }
    } catch (err) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setFeedback({ type: 'error', message: err.message });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            {/* Logo / Title Block */}
            <View style={styles.logoBlock}>
              <Text style={styles.logoEmoji}>🌱</Text>
              <Text style={styles.appName}>OneGoodThing</Text>
              <Text style={styles.tagline}>
                {isSignUp
                  ? 'Start your daily triumph.'
                  : 'Welcome back, Champion.'}
              </Text>
            </View>

            {/* Form Card */}
            <View style={styles.card}>
              {/* Mode Toggle Pill */}
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleButton, !isSignUp && styles.toggleButtonActive]}
                  onPress={() => { if (isSignUp) handleToggleMode(); }}
                >
                  <Text style={[styles.toggleText, !isSignUp && styles.toggleTextActive]}>
                    Log In
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleButton, isSignUp && styles.toggleButtonActive]}
                  onPress={() => { if (!isSignUp) handleToggleMode(); }}
                >
                  <Text style={[styles.toggleText, isSignUp && styles.toggleTextActive]}>
                    Sign Up
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Username field (Sign Up only) */}
              {isSignUp && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>USERNAME</Text>
                  <TextInput
                    id="auth-username"
                    style={styles.input}
                    placeholder="e.g. daily_champion"
                    placeholderTextColor="#bba98e"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              )}

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>EMAIL</Text>
                <TextInput
                  id="auth-email"
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor="#bba98e"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PASSWORD</Text>
                <TextInput
                  id="auth-password"
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#bba98e"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              {/* Feedback Banner */}
              {feedback.message !== '' && (
                <View style={[
                  styles.feedbackBanner,
                  feedback.type === 'error' ? styles.feedbackError : styles.feedbackSuccess
                ]}>
                  <Text style={styles.feedbackText}>{feedback.message}</Text>
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                id="auth-submit"
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {isSignUp ? 'Create Account' : 'Log In'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Footer Toggle Hint */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              </Text>
              <TouchableOpacity onPress={handleToggleMode}>
                <Text style={styles.footerLink}>
                  {isSignUp ? 'Log In' : 'Sign Up'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logoBlock: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoEmoji: {
    fontSize: 56,
    marginBottom: 10,
  },
  appName: {
    fontSize: 30,
    fontWeight: '800',
    color: '#3e2723',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    color: '#8d6e63',
    marginTop: 6,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#ebd5b0',
    shadowColor: '#3e2723',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#f3eade',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#d97706',
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8d6e63',
  },
  toggleTextActive: {
    color: '#fff',
  },
  inputGroup: {
    marginBottom: 16,
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
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#3e2723',
    backgroundColor: '#fcfaf2',
  },
  feedbackBanner: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  feedbackError: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  feedbackSuccess: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
  },
  feedbackText: {
    fontSize: 13,
    color: '#3e2723',
    lineHeight: 19,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#d97706',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#8d6e63',
  },
  footerLink: {
    fontSize: 14,
    color: '#d97706',
    fontWeight: '700',
  },
});
