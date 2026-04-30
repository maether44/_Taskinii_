import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import AuthLayout from '../components/AuthLayout';
import Input from '../components/register/Input';
import Button from '../components/register/Button';
import { Mail, Lock, LogIn } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { handleError } from '../lib/errorHandler';

const SignIn = () => {
  const navigation = useNavigation();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const [loading, setLoading] = useState(false);

  // ── Forgot Password state ──────────────────────────────────────────────────
  const [fpVisible, setFpVisible] = useState(false);
  const [fpEmail, setFpEmail] = useState('');
  const [fpSending, setFpSending] = useState(false);

  const onSubmit = async (data) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    setLoading(false);
    if (error) {
      handleError(error, 'SignIn', { title: 'Sign In Error' });
    }
    // Navigation handled automatically by AuthContext
  };

  const sendResetEmail = async () => {
    const trimmed = fpEmail.trim();
    if (!trimmed || !trimmed.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    setFpSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed);
      if (error) throw error;
      setFpVisible(false);
      setFpEmail('');
      Alert.alert('Email sent ✉️', 'Check your inbox for a password reset link.');
    } catch (err) {
      handleError(err, 'SignIn.resetPassword', {
        fallbackMessage: 'Could not send reset email.',
      });
    } finally {
      setFpSending(false);
    }
  };

  return (
    <AuthLayout>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome Back!</Text>
        <Text style={styles.subtitle}>Sign in to continue your fitness journey</Text>
      </View>

      <View style={styles.form}>
        <Controller
          control={control}
          rules={{ required: 'Email is required' }}
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Email"
              placeholder="Enter your email"
              onBlur={onBlur}
              autoCapitalize="none"
              onChangeText={onChange}
              value={value}
              icon={Mail}
              error={errors.email?.message}
            />
          )}
          name="email"
        />

        <Controller
          control={control}
          rules={{ required: 'Password is required' }}
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Password"
              placeholder="Enter your password"
              onBlur={onBlur}
              onChangeText={onChange}
              autoCapitalize="none"
              value={value}
              secureTextEntry
              icon={Lock}
              error={errors.password?.message}
            />
          )}
          name="password"
        />

        {/* ── Forgot Password trigger ── */}
        <TouchableOpacity
          style={styles.forgotPassword}
          onPress={() => {
            setFpEmail('');
            setFpVisible(true);
          }}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>

        <Button
          title={loading ? 'Signing In...' : 'Sign In'}
          onPress={handleSubmit(onSubmit)}
          icon={LogIn}
          disabled={loading}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Pressable onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.link}>Sign Up</Text>
          </Pressable>
        </View>
      </View>

      {/* ════════════════════════════════════════════════════════════════════
          MODAL — Forgot Password
      ════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={fpVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !fpSending && setFpVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.modalBackdrop}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalKeyboardWrap}
            >
              <TouchableWithoutFeedback>
                <View style={styles.modalCard}>
                  <View style={styles.modalHandle} />

                  <Text style={styles.modalTitle}>Reset Password</Text>
                  <Text style={styles.modalSubtitle}>
                    Enter your email and we'll send you a reset link.
                  </Text>

                  <Text style={styles.modalLabel}>Email</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={fpEmail}
                    onChangeText={setFpEmail}
                    placeholder="your@email.com"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />

                  <View style={styles.modalActions}>
                    <Pressable
                      style={[styles.modalBtn, styles.modalBtnSecondary]}
                      onPress={() => !fpSending && setFpVisible(false)}
                    >
                      <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.modalBtn,
                        styles.modalBtnPrimary,
                        fpSending && styles.modalBtnDisabled,
                      ]}
                      onPress={sendResetEmail}
                      disabled={fpSending}
                    >
                      {fpSending ? (
                        <ActivityIndicator color="#161230" size="small" />
                      ) : (
                        <Text style={styles.modalBtnPrimaryText}>Send Link</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    fontFamily: 'Outfit-Bold',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Outfit-Regular',
  },
  form: {
    width: '100%',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#A38DF2',
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
  },
  link: {
    color: '#CDF27E',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Outfit-Bold',
  },

  // ── Modal ────────────────────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalKeyboardWrap: {
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#161230',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderColor: '#1E1A35',
  },
  modalHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#6B5F8A',
    opacity: 0.45,
    marginBottom: 20,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
    fontFamily: 'Outfit-Bold',
  },
  modalSubtitle: {
    color: '#6B5F8A',
    fontSize: 13,
    marginBottom: 20,
    fontFamily: 'Outfit-Regular',
  },
  modalLabel: {
    color: '#6B5F8A',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    fontFamily: 'Outfit-Medium',
  },
  modalInput: {
    backgroundColor: '#0F0B1E',
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1E1A35',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: 'Outfit-Regular',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnPrimary: {
    backgroundColor: '#7C5CFC',
  },
  modalBtnSecondary: {
    backgroundColor: '#0F0B1E',
    borderWidth: 1,
    borderColor: '#1E1A35',
  },
  modalBtnPrimaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'Outfit-Bold',
  },
  modalBtnSecondaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Outfit-Medium',
  },
  modalBtnDisabled: {
    opacity: 0.7,
  },
});

export default SignIn;
