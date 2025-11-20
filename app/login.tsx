// screens/LoginScreen.tsx
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
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

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  User,
} from 'firebase/auth';
import { auth } from '../firebaseConfig';

export default function LoginScreen() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);   // button spinner
  const [checking, setChecking] = useState(true);    // session-check spinner

  /* ───────────── Check for persisted Firebase session ───────────── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        router.replace('./dashboard');               // user already signed in
      } else {
        setChecking(false);                          // show login form
      }
    });
    return unsub;
  }, []);

  /* ───────────── Handle manual login ───────────── */
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await AsyncStorage.setItem('userUID', cred.user.uid); // optional
      router.replace('./dashboard');
    } catch (err: any) {
      Alert.alert('Login Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ───────────── Initial loading spinner ───────────── */
  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  /* ───────────── Login UI ───────────── */
  return (
    <LinearGradient colors={['#F0F6FF', '#BFDBFE']} style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0F6FF" />
      <View style={styles.inner}>
        <View style={styles.card}>
          {/* Logo */}
          <View style={styles.logoCircle}>
            <FontAwesome5 name="heartbeat" size={32} color="#ffffff" />
          </View>

          {/* App title */}
          <Text style={styles.appTitle}>HealthVerse</Text>
          <Text style={styles.tagline}>Your Smart Healthcare Assistant</Text>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.heading}>Welcome Back</Text>

            <TextInput
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />

            <TextInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />

            {/* Login button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.82}
              style={[styles.button, loading && styles.buttonDisabled]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <FontAwesome5 name="sign-in-alt" size={18} color="#fff" />
                  <Text style={styles.buttonText}>Login</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Links */}
            <View style={styles.linksWrapper}>
              <TouchableOpacity onPress={() => router.push('./signup')}>
                <Text style={styles.link}>
                  Don&apos;t have an account? <Text style={styles.linkBold}>Sign up</Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push('./forgot-password')}>
                <Text style={styles.forgot}>Forgot Password?</Text>
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

/* ─────────────────────────── styles (unchanged) ─────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 24,
    padding: 32,
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
    backgroundColor: '#2563EB',
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
    color: '#1E3A8A',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#64748B',
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
    marginBottom: 24,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    backgroundColor: 'rgba(239,246,255,0.9)',
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
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16, marginLeft: 8 },
  linksWrapper: { marginTop: 24, gap: 12, alignItems: 'center' },
  link: { color: '#2563EB', fontSize: 16, fontWeight: '500', textAlign: 'center' },
  linkBold: { fontWeight: '700' },
  forgot: { color: '#3B82F6', fontSize: 16, fontWeight: '500' },
  footer: { marginTop: 32, textAlign: 'center', color: '#94A3AF', fontSize: 14 },
});
