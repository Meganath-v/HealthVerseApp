// screens/PrescriptionArchive.tsx - Enhanced Version Following Dashboard Patterns
import { FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import ImageViewing from 'react-native-image-viewing';

// Firebase imports
import { getAuth } from 'firebase/auth';
import { arrayUnion, doc, getDoc, getFirestore, updateDoc } from 'firebase/firestore';

/* ────────────────────────────────────────── */
/*              Cloudinary config             */
/* ────────────────────────────────────────── */
const CLOUDINARY_UPLOAD_PRESET = 'prescription_upload';
const CLOUDINARY_CLOUD_NAME   = 'dph1vixgk';
const CLOUDINARY_API_URL      = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

/* ────────────────────────────────────────── */
/*                 Types & utils              */
/* ────────────────────────────────────────── */
type Severity = 'Important' | 'Regular' | 'Normal';

interface PhotoItem {
  id: string;
  uri: string;
  severity: Severity;
  hospital: string;
  uploadedAt: string;
}

const severityOptions: Record<Severity, { bg: string; chip: string }> = {
  Important: { bg: 'rgba(239,68,68,0.08)',  chip: '#ef4444' },
  Regular:   { bg: 'rgba(251,146,60,0.09)', chip: '#f59e0b' },
  Normal:    { bg: 'rgba(16,185,129,0.09)', chip: '#10b981' },
};

const PRESCRIPTION_TIPS = [
  '📋 Keep your prescriptions organized',
  '💊 Never share prescription medications',
  '📅 Check expiration dates regularly',
  '🔒 Store medications safely',
  '👨‍⚕️ Consult your doctor for any changes',
  '📱 Digital copies are always handy',
];

const niceDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

/* ────────────────────────────────────────── */
/*                Component body              */
/* ────────────────────────────────────────── */
export default function PrescriptionArchive() {
  const [images, setImages] = useState<PhotoItem[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | Severity>('All');
  const [modal, setModal] = useState(false);
  const [tempUri, setTempUri] = useState('');
  const [tempHospital, setHospital] = useState('');
  const [tempSeverity, setSeverity] = useState<Severity>('Normal');
  const [viewer, setViewer] = useState({ visible: false, index: 0 });
  const [loading, setLoading] = useState(false);
  const [tip, setTip] = useState('');

  /* ─────────────── Load user prescriptions ─────────────── */
  useEffect(() => {
    loadUserPrescriptions();
    setTip(PRESCRIPTION_TIPS[Math.floor(Math.random() * PRESCRIPTION_TIPS.length)]);
  }, []);

  const loadUserPrescriptions = async () => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        console.log('No authenticated user found');
        return;
      }

      const firestore = getFirestore();
      const userDocRef = doc(firestore, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const prescriptions = userData.prescriptions || [];
        setImages(prescriptions);
      }
    } catch (error) {
      console.error('Error loading prescriptions:', error);
    }
  };

  /* ─────────────── Image picker ─────────────── */
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to the media library.');
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!res.canceled && res.assets?.[0]?.uri) {
      setTempUri(res.assets[0].uri);
      setModal(true);
    }
  };

  /* ───────────── Cloudinary upload ───────────── */
  const uploadToCloudinary = async (uri: string) => {
    const form = new FormData();
    form.append('file', { uri, type: 'image/jpeg', name: `presc_${Date.now()}.jpg` } as any);
    form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const r = await fetch(CLOUDINARY_API_URL, { method: 'POST', body: form });
    if (!r.ok) throw new Error(await r.text());
    const data = await r.json();
    return data.secure_url as string;
  };

  /* ───────────── Save to Firestore ───────────── */
  const savePrescriptionToFirestore = async (prescription: PhotoItem) => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }

      const firestore = getFirestore();
      const userDocRef = doc(firestore, 'users', currentUser.uid);
      
      await updateDoc(userDocRef, {
        prescriptions: arrayUnion(prescription)
      });
      
    } catch (error) {
      console.error('Error saving to Firestore:', error);
      throw error;
    }
  };

  const handleUpload = async () => {
    if (!tempUri) return;
    setLoading(true);
    try {
      const url = await uploadToCloudinary(tempUri);
      
      const newPrescription: PhotoItem = {
        id: String(Date.now()),
        uri: url,
        hospital: tempHospital.trim() || 'Unknown',
        severity: tempSeverity,
        uploadedAt: new Date().toISOString(),
      };

      await savePrescriptionToFirestore(newPrescription);
      setImages(prev => [newPrescription, ...prev]);
      
      setModal(false);
      setHospital('');
      setSeverity('Normal');
      setTempUri('');
      
      Alert.alert('Success', 'Prescription uploaded successfully!');
    } catch (err: any) {
      Alert.alert('Upload error', err?.message ?? 'Something went wrong.');
    }
    setLoading(false);
  };

  /* ───────────── Image deletion ───────────── */
  const deleteImage = (id: string) =>
    Alert.alert('Delete', 'Remove this prescription?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const auth = getAuth();
            const currentUser = auth.currentUser;
            
            if (!currentUser) return;

            const updatedImages = images.filter(p => p.id !== id);
            setImages(updatedImages);

            const firestore = getFirestore();
            const userDocRef = doc(firestore, 'users', currentUser.uid);
            await updateDoc(userDocRef, {
              prescriptions: updatedImages
            });
            
          } catch (error) {
            console.error('Error deleting prescription:', error);
            Alert.alert('Error', 'Failed to delete prescription.');
            loadUserPrescriptions();
          }
        },
      },
    ]);

  /* ───────────── Derived lists ───────────── */
  const visible = images
    .filter(i => (filter === 'All' || i.severity === filter) &&
                 i.hospital.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt));

  const viewerImages = visible.map(i => ({ uri: i.uri }));

  /* ────────────────────────────────────────── */
  /*                  RENDER                    */
  /* ────────────────────────────────────────── */
  return (
    <LinearGradient colors={['#F0F6FF', '#BFDBFE']} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
      
      {/* ✅ Dashboard-style Header - EXACT MATCH */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 50 : 60 }]}>
        <View style={styles.headerRow}>
          {/* Prescription Icon (matching Dashboard userImg position) */}
          <View style={styles.prescriptionIconContainer}>
            <FontAwesome5 name="file-medical" size={32} color="#ffffff" />
            <View style={styles.onlineIndicator} />
          </View>

          {/* Title Section (matching Dashboard greeting position) */}
          <View style={styles.titleSection}>
            <Text style={styles.greetingLine}>Medical Records</Text>
            <Text style={styles.userName}>Prescription Archive</Text>
          </View>

          {/* Upload Button (matching Dashboard signOutBtn position) */}
          <TouchableOpacity 
            style={styles.headerUploadBtn} 
            onPress={pickImage}
            activeOpacity={0.8}
          >
            <FontAwesome5 name="plus" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ✅ Dashboard-style Tip Card - EXACT MATCH */}
      <View style={styles.tipCard}>
        <View style={styles.tipIconWrap}>
          <FontAwesome5 name="file-medical" color="#f97316" size={24} />
        </View>
        <View style={styles.tipContent}>
          <Text style={styles.tipTitle}>Prescription Tip</Text>
          <Text style={styles.tipText}>{tip}</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search hospital..."
          placeholderTextColor="#94a3b8"
          style={styles.searchInput}
        />
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {(['All', 'Important', 'Regular', 'Normal'] as const).map(val => (
          <TouchableOpacity
            key={val}
            onPress={() => setFilter(val)}
            style={[
              styles.filterChip,
              filter === val && styles.activeFilterChip,
            ]}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.filterText,
              filter === val && styles.activeFilterText
            ]}>
              {val}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Loading */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Uploading prescription...</Text>
        </View>
      )}

      {/* Prescription Grid */}
      <FlatList
        data={visible}
        numColumns={2}
        keyExtractor={i => i.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
        renderItem={({ item, index }) => (
          <Animatable.View 
            animation="fadeInUp" 
            delay={index * 50} 
            style={styles.prescriptionItem}
          >
            <TouchableOpacity
              style={[
                styles.prescriptionCard,
                { shadowColor: severityOptions[item.severity].chip }
              ]}
              onPress={() => setViewer({ visible: true, index })}
              activeOpacity={0.85}
            >
              <Image source={{ uri: item.uri }} style={styles.prescriptionImage} />
              
              <View style={styles.prescriptionInfo}>
                <Text style={styles.hospitalName} numberOfLines={1}>{item.hospital}</Text>
                <Text style={styles.prescriptionDate}>{niceDate(item.uploadedAt)}</Text>
                
                <View style={[
                  styles.severityBadge,
                  { backgroundColor: severityOptions[item.severity].chip },
                ]}>
                  <Text style={styles.severityText}>{item.severity}</Text>
                </View>
              </View>

              {/* Delete button */}
              <TouchableOpacity 
                style={styles.deleteButton} 
                onPress={() => deleteImage(item.id)}
                activeOpacity={0.8}
              >
                <FontAwesome5 name="times" size={14} color="#fff" />
              </TouchableOpacity>

              {/* Subtle arrow indicator like Dashboard */}
              <FontAwesome5 
                name="chevron-right" 
                size={12} 
                color="#9CA3AF" 
                style={styles.prescriptionArrow} 
              />
            </TouchableOpacity>
          </Animatable.View>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <FontAwesome5 name="file-medical" size={48} color="#CBD5E1" />
              </View>
              <Text style={styles.emptyText}>No prescriptions found</Text>
              <Text style={styles.emptySubtext}>Upload your first prescription using the + button above</Text>
            </View>
          ) : null
        }
      />

      {/* Upload Button */}
      <TouchableOpacity 
        style={styles.uploadButton} 
        onPress={pickImage} 
        activeOpacity={0.8}
      >
        <FontAwesome5 name="plus" size={18} color="#fff" />
        <Text style={styles.uploadButtonText}>Upload Prescription</Text>
      </TouchableOpacity>

      {/* Upload Modal */}
      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Prescription</Text>
            <Text style={styles.modalSubtitle}>Enter prescription details</Text>

            <TextInput
              value={tempHospital}
              onChangeText={setHospital}
              placeholder="Hospital or clinic name"
              placeholderTextColor="#94A3B8"
              style={styles.modalInput}
            />

            <Text style={styles.importanceLabel}>Importance Level:</Text>
            <View style={styles.severityOptions}>
              {(['Important', 'Regular', 'Normal'] as Severity[]).map(s => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setSeverity(s)}
                  style={[
                    styles.severityOption,
                    tempSeverity === s && { 
                      backgroundColor: severityOptions[s].chip,
                      borderColor: severityOptions[s].chip 
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.severityOptionText,
                    tempSeverity === s && { color: '#fff' }
                  ]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Modal Actions */}
            <TouchableOpacity
              onPress={handleUpload}
              disabled={loading}
              style={[styles.uploadModalButton, loading && styles.uploadModalButtonDisabled]}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <FontAwesome5 name="cloud-upload-alt" size={16} color="#fff" />
                  <Text style={styles.uploadModalButtonText}>Upload</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setModal(false)}
              style={styles.cancelModalButton}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelModalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Full-screen Image Viewer */}
      <ImageViewing
        images={viewerImages}
        imageIndex={viewer.index}
        visible={viewer.visible}
        onRequestClose={() => setViewer(v => ({ ...v, visible: false }))}
        backgroundColor="rgba(0,0,0,0.9)"
      />
    </LinearGradient>
  );
}

/* ────────────────────────────────────────── */
/*          Enhanced Styles Matching Dashboard */
/* ────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  /* ✅ Header - EXACT COPY from Dashboard */
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
  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  
  /* Enhanced Icon Container */
  prescriptionIconContainer: { 
    width: 74, 
    height: 74, 
    borderRadius: 37, 
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    position: 'relative',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10b981',
    borderWidth: 3,
    borderColor: '#2563EB',
  },
  
  titleSection: { marginLeft: 20, flex: 1 },
  greetingLine: { fontSize: 18, color: 'rgba(255,255,255,0.9)', marginBottom: 4 },
  userName: { fontSize: 28, color: '#fff', fontWeight: 'bold' },
  headerUploadBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  /* ✅ Tip Card - EXACT COPY from Dashboard */
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
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 12,
    color: '#7c2d12',
    fontWeight: '600',
    marginBottom: 4,
    opacity: 0.8,
  },
  tipText: { 
    color: '#7c2d12', 
    fontWeight: '700', 
    fontSize: 16,
    lineHeight: 22,
  },

  /* Search */
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchInput: {
    borderBottomWidth: 2,
    borderBottomColor: '#2563EB',
    paddingVertical: 12,
    fontSize: 16,
    color: '#1E3A8A',
  },
  
  /* Filters */
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2563EB',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  activeFilterChip: {
    backgroundColor: '#2563EB',
  },
  filterText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 14,
  },
  activeFilterText: {
    color: '#fff',
  },
  
  /* Enhanced Loading */
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  
  /* List */
  list: {
    flex: 1,
    paddingHorizontal: 14,
  },
  listContent: {
    paddingBottom: 100,
  },
  
  /* Enhanced Prescription Items */
  prescriptionItem: {
    flex: 1,
    margin: 6,
  },
  prescriptionCard: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    elevation: 8,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    position: 'relative',
  },
  prescriptionImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f3f4f6',
  },
  prescriptionInfo: {
    padding: 12,
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  prescriptionDate: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  severityText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  prescriptionArrow: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    opacity: 0.5,
  },
  
  /* Enhanced Empty State */
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  /* Enhanced Upload Button */
  uploadButton: {
    flexDirection: 'row',
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    elevation: 8,
    shadowColor: '#2563EB',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  
  /* Enhanced Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563EB',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalInput: {
    borderBottomWidth: 2,
    borderBottomColor: '#2563EB',
    paddingVertical: 12,
    fontSize: 16,
    color: '#1E3A8A',
    marginBottom: 20,
  },
  importanceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
    marginBottom: 12,
  },
  severityOptions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  severityOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  severityOptionText: {
    fontWeight: '600',
    color: '#374151',
  },
  uploadModalButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
  },
  uploadModalButtonDisabled: {
    opacity: 0.6,
  },
  uploadModalButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  cancelModalButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelModalButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
});
