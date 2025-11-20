// screens/ForgotPasswordScreen.tsx
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient'; // expo install expo-linear-gradient
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StatusBar,
    StyleSheet, 
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebaseConfig';

export default function ForgotPasswordScreen() {
  const [email, setEmail]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert('Success', 'Password reset email sent');
      router.replace('/');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#F0F6FF', '#BFDBFE']} style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0F6FF" />
      <View style={styles.inner}>
        {/* Card */}
        <View style={styles.card}>
          {/* Logo */}
          <View style={styles.logoCircle}>
            <FontAwesome5 name="heartbeat" size={32} color="#ffffff" />
          </View>

          {/* Titles */}
          <Text style={styles.appTitle}>HealthVerse</Text>
          <Text style={styles.tagline}>Your Smart Healthcare Assistant</Text>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.heading}>Reset Password</Text>

            <Text style={styles.description}>
              Enter your email address and we&#39;ll send you a link to reset your password.
            </Text>

            <TextInput
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />

            {/* Button */}
            <TouchableOpacity
              onPress={handleResetPassword}
              disabled={loading}
              activeOpacity={0.82}
              style={[styles.button, loading && styles.buttonDisabled]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <FontAwesome5 name="paper-plane" size={18} color="#fff" />
                  <Text style={styles.buttonText}>Send Reset Link</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Links */}
            <View style={styles.linkWrapper}>
              <TouchableOpacity onPress={() => router.replace('./login')}>
                <Text style={styles.link}>
                  Remember your password? <Text style={styles.linkBold}>Login</Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push('./signup')}>
                <Text style={styles.altLink}>Need an account? Sign up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>Secure • Private • Trusted</Text>
      </View>
    </LinearGradient>
  );
}

/* ---------------------------------------------------- */
/*                     StyleSheet                       */
/* ---------------------------------------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,                 // px-6
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 24,
    padding: 32,                           // p-8
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563EB',            // blue-600
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1E3A8A',                      // blue-800
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#64748B',                      // slate-500
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 32,
  },
  form: { width: '100%' },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E3A8A',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    color: '#475569',                      // slate-600
    textAlign: 'center',
    marginBottom: 24,
    fontSize: 16,
    lineHeight: 22,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#BFDBFE',                // blue-200
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
    backgroundColor: 'rgba(239,246,255,0.9)', // blue-50
    color: '#1E3A8A',
    fontSize: 16,
    fontWeight: '500',
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  linkWrapper: {
    marginTop: 24,
    gap: 12,
    alignItems: 'center',
  },
  link: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  linkBold: { fontWeight: '700' },
  altLink: {
    color: '#3B82F6',                      // blue-500
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  footer: {
    marginTop: 32,
    textAlign: 'center',
    color: '#94A3AF',                      // slate-400
    fontSize: 14,
  },
});
