// screens/Dashboard.tsx
import { FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';

const DASHBOARD_FEATURES = [
 // { label: 'Disease Detection', icon: 'microscope',     route: '/disease-detection', color: '#3b82f6' },
  { label: 'Emergency Locator', icon: 'ambulance',      route: '/emergency-locator', color: '#ef4444' },
  { label: 'Prescriptions',     icon: 'file-medical',   route: '/prescriptions',      color: '#10b981' },
  { label: 'Reminders',         icon: 'bell',           route: '/reminders',          color: '#f59e0b' },
//  { label: 'Health Analyzer',   icon: 'heartbeat',      route: '/risk-analyzer',      color: '#ec4899' },
  { label: 'Chatbot',           icon: 'comments',       route: '/chatbot',            color: '#8b5cf6' },
  { label: 'Symptom Checker',   icon: 'stethoscope',    route: '/symptom-checker',    color: '#06b6d4' },
  { label: 'Appointments',      icon: 'calendar-check', route: '/appointments',       color: '#84cc16' },
//  { label: 'Health Records',    icon: 'folder-open',    route: '/records',            color: '#f97316' },
  { label: 'Fitness Tracker',   icon: 'running',        route: '/fitness',            color: '#14b8a6' },
];

const HEALTH_TIPS = [
  '💧 Drink plenty of water today',
  '🧘 Remember to take breaks and stretch!',
  '🌱 Mental health matters: Breathe deeply',
  '🥗 Eat a balanced meal for energy',
  '😊 Laughter is great medicine',
  '🌟 Fresh air boosts your mood',
];

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

/* ────────────────────────────────────────── */
/*                 Component                  */
/* ────────────────────────────────────────── */
export default function Dashboard() {
  const [userData, setUserData] = useState<{ fullName:string; imageURL:string }|null>(null);
  const [tip, setTip]           = useState('');
  const [loading, setLoading]   = useState(true);

  /* Listen for auth changes and load profile */
  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('./login');                 // no session → back to login
        return;
      }

      try {
        const snap = await getDoc(doc(getFirestore(), 'users', user.uid));
        if (snap.exists()) setUserData(snap.data() as any);
      } finally {
        setLoading(false);
      }
    });

    setTip(HEALTH_TIPS[Math.floor(Math.random() * HEALTH_TIPS.length)]);
    return unsubscribe;
  }, []);

  /* Sign-out */
  const handleSignOut = () =>
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try { await signOut(getAuth()); }
          catch { Alert.alert('Error', 'Failed to sign out'); }
        },
      },
    ]);

  /* Loader */
  if (loading || !userData) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  /* UI */
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 50 : 60 }]}>
        <View style={styles.headerRow}>
          {userData.imageURL ? (
            <Image source={{ uri: userData.imageURL }} style={styles.userImg} />
          ) : (
            <View style={[styles.userImg, styles.userImgPlaceholder]}>
              <FontAwesome5 name="user" size={32} color="#ffffff" />
            </View>
          )}

          <View style={styles.greeting}>
            <Text style={styles.greetingLine}>{getGreeting()},</Text>
            <Text style={styles.userName}>{userData.fullName || 'User'}</Text>
          </View>

          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <FontAwesome5 name="sign-out-alt" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Health tip */}
      <View style={styles.tipCard}>
        <View style={styles.tipIconWrap}>
          <FontAwesome5 name="lightbulb" color="#f97316" size={24} />
        </View>
        <Text style={styles.tipText}>{tip}</Text>
      </View>

      {/* Features grid */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.featuresWrapper}>
        <View style={styles.featuresGrid}>
          {DASHBOARD_FEATURES.map((f) => (
            <TouchableOpacity
              key={f.label}
              activeOpacity={0.85}
              style={[styles.featureCard, { shadowColor: f.color }]}
              onPress={() => router.push(f.route)}
            >
              <View style={[styles.featureIconWrap, { backgroundColor: `${f.color}20` }]}>
                <FontAwesome5 name={f.icon as any} size={28} color={f.color} />
              </View>
              <Text style={styles.featureLabel}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

/* ────────────────────────────────────────── */
/*                 StyleSheet                 */
/* ────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1 },

  /* Loader */
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#667eea',
  },

  /* Header */
  header: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: '#667eea',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 10,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  userImg: { width: 74, height: 74, borderRadius: 37, backgroundColor: '#2563EB' },
  userImgPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  greeting: { marginLeft: 20, flex: 1 },
  greetingLine: { fontSize: 18, color: 'rgba(255,255,255,0.9)', marginBottom: 4 },
  userName: { fontSize: 28, color: '#fff', fontWeight: 'bold' },
  signOutBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  /* Health tip */
  tipCard: {
    marginHorizontal: 20,
    marginTop: -15,
    marginBottom: 20,
    backgroundColor: '#fcb69f',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#fcb69f',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 15,
    elevation: 8,
  },
  tipIconWrap: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  tipText: { flex: 1, color: '#7c2d12', fontWeight: '700', fontSize: 16 },

  /* Features grid */
  featuresWrapper: { paddingHorizontal: 15, paddingBottom: 50 },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  featureCard: {
    width: '47%',
    backgroundColor: '#ffffff',
    marginBottom: 20,
    borderRadius: 24,
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 12,
    elevation: 8,
  },
  featureIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureLabel: { fontSize: 15, color: '#1f2937', fontWeight: '700', textAlign: 'center' },
});
