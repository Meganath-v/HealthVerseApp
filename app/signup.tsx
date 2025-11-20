// screens/SignupScreen.tsx
import { FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, firestore } from '../firebaseConfig';

/* ────────────────────────────────────────── */
/*              Cloudinary config             */
/* ────────────────────────────────────────── */
const CLOUDINARY_UPLOAD_PRESET = 'profile_avatar'; // Create this preset in your Cloudinary dashboard
const CLOUDINARY_CLOUD_NAME   = 'dow95fpbj';
const CLOUDINARY_API_URL      = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

const SignupScreen = () => {
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [fullName, setFullName]   = useState('');
  const [avatarUri, setAvatarUri] = useState('');
  const [loading, setLoading]     = useState(false);
  const [uploading, setUploading] = useState(false);

  /* ─────────────── Image picker for avatar ─────────────── */
  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to the media library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Square aspect ratio for profile pictures
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  /* ───────────── Upload avatar to Cloudinary ───────────── */
  const uploadAvatarToCloudinary = async (uri: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', {
      uri: uri,
      type: 'image/jpeg',
      name: `avatar_${Date.now()}.jpg`,
    } as any);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'profile_avatars'); // Optional: organize in folders

    const response = await fetch(CLOUDINARY_API_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error('Avatar upload failed: ' + errorText);
    }

    const data = await response.json();
    return data.secure_url;
  };

  /* ───────────── Handle signup with avatar ───────────── */
  const handleSignup = async () => {
    if (!email || !password || !fullName) {
      Alert.alert('Missing Fields', 'Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      let imageURL = 'https://via.placeholder.com/150/667eea/ffffff?text=' + fullName.charAt(0).toUpperCase();

      // Upload avatar if selected
      if (avatarUri) {
        setUploading(true);
        imageURL = await uploadAvatarToCloudinary(avatarUri);
        setUploading(false);
      }

      // Step 1: Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Step 2: Save user profile to Firestore
      await setDoc(doc(firestore, 'users', uid), {
        uid,
        email,
        fullName,
        imageURL,
        prescriptions: [], // Initialize empty prescriptions array
        createdAt: new Date().toISOString(),
      });

      Alert.alert('Success', 'Account created successfully!');
      router.replace('./dashboard');
    } catch (error: any) {
      Alert.alert('Signup Failed', error.message || 'Something went wrong');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#F0F6FF', '#BFDBFE']}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F0F6FF" />
      <View style={styles.inner}>
        <View style={styles.card}>
          {/* Logo */}
          <View style={styles.logoCircle}>
            <FontAwesome5 name="heartbeat" size={32} color="#ffffff" />
          </View>

          {/* App Title */}
          <Text style={styles.appTitle}>HealthVerse</Text>
          <Text style={styles.tagline}>Your Smart Healthcare Assistant</Text>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.heading}>Create Account</Text>

            {/* Avatar Upload Section */}
            <View style={styles.avatarSection}>
              <TouchableOpacity onPress={pickAvatar} style={styles.avatarContainer}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <FontAwesome5 name="camera" size={24} color="#94A3B8" />
                  </View>
                )}
                {uploading && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator color="#2563EB" size="small" />
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.avatarLabel}>Tap to add profile picture</Text>
            </View>

            <TextInput
              placeholder="Full Name"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />

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

            {/* Sign-up button */}
            <TouchableOpacity
              onPress={handleSignup}
              disabled={loading || uploading}
              activeOpacity={0.82}
              style={[styles.button, (loading || uploading) && styles.buttonDisabled]}
            >
              {loading ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.buttonText}>
                    {uploading ? 'Uploading...' : 'Creating Account...'}
                  </Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <FontAwesome5 name="user-plus" size={18} color="#fff" />
                  <Text style={styles.buttonText}>Create Account</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Link to login */}
            <View style={styles.linkWrapper}>
              <TouchableOpacity onPress={() => router.push('./login')}>
                <Text style={styles.link}>
                  Already have an account? <Text style={styles.linkBold}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>Secure • Private • Trusted</Text>
      </View>
    </LinearGradient>
  );
};

export default SignupScreen;

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
    paddingHorizontal: 24,
  },
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
  form: {
    width: '100%',
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E3A8A',
    textAlign: 'center',
    marginBottom: 24,
  },
  /* Avatar styles */
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    borderWidth: 3,
    borderColor: '#2563EB',
    marginBottom: 8,
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  avatarLabel: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  linkWrapper: {
    marginTop: 24,
    alignItems: 'center',
  },
  link: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  linkBold: {
    fontWeight: '700',
  },
  footer: {
    marginTop: 32,
    textAlign: 'center',
    color: '#94A3AF',
    fontSize: 14,
  },
});
