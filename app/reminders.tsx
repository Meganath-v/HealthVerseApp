// screens/MedicineReminder.tsx - With List UI Like Emergency Conditions
import { FontAwesome5 } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { getAuth } from 'firebase/auth';
import {
  arrayUnion,
  doc,
  getDoc,
  getFirestore,
  updateDoc
} from 'firebase/firestore';

/* ───────────── Types ───────────── */
interface MedicineReminder {
  id: string;
  medicineName: string;
  dateTime: string;
  dosage?: string;
  frequency?: string;
  isActive: boolean;
  notificationId?: string;
  createdAt?: string;
}

export default function MedicineReminder() {
  const [reminders, setReminders] = useState<MedicineReminder[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [medicineName, setMedicineName] = useState('');
  const [dosage, setDosage] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingReminder, setEditingReminder] = useState<MedicineReminder | null>(null);

  useEffect(() => {
    setupNotifications();
    loadUserReminders();
  }, []);

  const loadUserReminders = async () => {
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
        const medicineReminders = userData.medicineReminders || [];
        setReminders(medicineReminders.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()));
      }
    } catch (error) {
      console.error('Error loading reminders:', error);
    }
  };

  const setupNotifications = async () => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission', 'Enable notifications to receive medicine reminders');
      return;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('medicine_reminders', {
        name: 'Medicine Reminders',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
      });
    }
  };

  const scheduleDailyNotification = async (reminder: Omit<MedicineReminder, 'id'>) => {
    const triggerTime = new Date(reminder.dateTime);
    
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '💊 Medicine Reminder',
          body: `Time to take ${reminder.medicineName}${reminder.dosage ? ` (${reminder.dosage})` : ''}`,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          android: {
            channelId: 'medicine_reminders',
            importance: Notifications.AndroidImportance.MAX,
            sound: 'default',
            vibrate: [0, 250, 250, 250],
            priority: Notifications.AndroidNotificationPriority.MAX,
          },
          ios: {
            sound: 'default',
            critical: true,
            interruptionLevel: 'critical',
          },
        },
        trigger: {
          hour: triggerTime.getHours(),
          minute: triggerTime.getMinutes(),
          repeats: true,
        },
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  };

  const saveReminderToFirestore = async (reminder: MedicineReminder) => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }

      const firestore = getFirestore();
      const userDocRef = doc(firestore, 'users', currentUser.uid);
      
      await updateDoc(userDocRef, {
        medicineReminders: arrayUnion(reminder)
      });
      
    } catch (error) {
      console.error('Error saving to Firestore:', error);
      throw error;
    }
  };

  const saveReminder = async () => {
    if (!medicineName.trim()) {
      Alert.alert('Missing Field', 'Please enter medicine name');
      return;
    }

    setLoading(true);
    try {
      if (editingReminder) {
        if (editingReminder.notificationId) {
          await Notifications.cancelScheduledNotificationAsync(editingReminder.notificationId);
        }

        const updatedReminder: MedicineReminder = {
          ...editingReminder,
          medicineName: medicineName.trim(),
          dosage: dosage.trim(),
          dateTime: selectedDate.toISOString(),
        };

        const notifId = await scheduleDailyNotification(updatedReminder);
        if (notifId) {
          updatedReminder.notificationId = notifId;
        }

        const updatedReminders = reminders.map(r => 
          r.id === editingReminder.id ? updatedReminder : r
        );
        setReminders(updatedReminders.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()));

        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (currentUser) {
          const firestore = getFirestore();
          const userDocRef = doc(firestore, 'users', currentUser.uid);
          await updateDoc(userDocRef, {
            medicineReminders: updatedReminders
          });
        }

        Alert.alert('Success', 'Medicine reminder updated!');
      } else {
        const newReminder: MedicineReminder = {
          id: Date.now().toString(),
          medicineName: medicineName.trim(),
          dosage: dosage.trim(),
          dateTime: selectedDate.toISOString(),
          frequency: 'Daily',
          isActive: true,
          createdAt: new Date().toISOString(),
        };

        const notifId = await scheduleDailyNotification(newReminder);
        if (notifId) {
          newReminder.notificationId = notifId;
        }

        await saveReminderToFirestore(newReminder);
        const updatedReminders = [newReminder, ...reminders];
        setReminders(updatedReminders.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()));

        Alert.alert('Success', 'Daily medicine reminder set!');
      }

      setModalVisible(false);
      setMedicineName('');
      setDosage('');
      setSelectedDate(new Date());
      setEditingReminder(null);
      
    } catch (error) {
      console.error('Error saving reminder:', error);
      Alert.alert('Error', 'Failed to save reminder');
    }
    setLoading(false);
  };

  const editReminder = (reminder: MedicineReminder) => {
    setEditingReminder(reminder);
    setMedicineName(reminder.medicineName);
    setDosage(reminder.dosage || '');
    setSelectedDate(new Date(reminder.dateTime));
    setModalVisible(true);
  };

  const toggleReminder = async (id: string) => {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;

    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const updatedReminder = { ...reminder, isActive: !reminder.isActive };

      if (!updatedReminder.isActive && reminder.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
        updatedReminder.notificationId = undefined;
      } else if (updatedReminder.isActive && !reminder.notificationId) {
        const notifId = await scheduleDailyNotification(updatedReminder);
        if (notifId) {
          updatedReminder.notificationId = notifId;
        }
      }

      const updatedReminders = reminders.map(r => 
        r.id === id ? updatedReminder : r
      );
      setReminders(updatedReminders);

      const firestore = getFirestore();
      const userDocRef = doc(firestore, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        medicineReminders: updatedReminders
      });

    } catch (error) {
      console.error('Error toggling reminder:', error);
      Alert.alert('Error', 'Failed to update reminder status');
    }
  };

  const deleteReminder = (id: string, notificationId?: string) =>
    Alert.alert('Delete Reminder', 'Are you sure you want to remove this reminder?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const auth = getAuth();
            const currentUser = auth.currentUser;
            
            if (!currentUser) return;

            if (notificationId) {
              await Notifications.cancelScheduledNotificationAsync(notificationId);
            }

            const updatedReminders = reminders.filter(r => r.id !== id);
            setReminders(updatedReminders);

            const firestore = getFirestore();
            const userDocRef = doc(firestore, 'users', currentUser.uid);
            await updateDoc(userDocRef, {
              medicineReminders: updatedReminders
            });
            
          } catch (error) {
            console.error('Error deleting reminder:', error);
            Alert.alert('Error', 'Failed to delete reminder.');
            loadUserReminders();
          }
        },
      },
    ]);

  const formatReminderTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? '#10b981' : '#94a3b8';
  };

  // ✅ MEDICINE REMINDER CARD - Similar to Emergency Condition Card
  const MedicineReminderCard = ({ reminder }: { reminder: MedicineReminder }) => (
    <TouchableOpacity
      style={[styles.reminderCard, { 
        borderLeftColor: getStatusColor(reminder.isActive),
        opacity: reminder.isActive ? 1 : 0.7 
      }]}
      onPress={() => editReminder(reminder)}
      disabled={loading}
    >
      <View style={[styles.reminderIcon, { 
        backgroundColor: getStatusColor(reminder.isActive) + '20' 
      }]}>
        <FontAwesome5 
          name="pills" 
          size={20} 
          color={getStatusColor(reminder.isActive)} 
        />
      </View>
      
      <View style={styles.reminderInfo}>
        <View style={styles.reminderHeader}>
          <Text style={styles.reminderName} numberOfLines={1}>
            {reminder.medicineName}
          </Text>
          <Text style={styles.reminderTime}>
            {formatReminderTime(reminder.dateTime)}
          </Text>
        </View>
        
        <View style={styles.reminderMeta}>
          {reminder.dosage && (
            <Text style={styles.reminderDosage}>{reminder.dosage}</Text>
          )}
          <Text style={styles.reminderFrequency}>
            {reminder.frequency || 'Daily'}
          </Text>
          <View style={[styles.statusBadge, { 
            backgroundColor: reminder.isActive ? '#10b98120' : '#94a3b820' 
          }]}>
            <Text style={[styles.statusText, { 
              color: getStatusColor(reminder.isActive) 
            }]}>
              {reminder.isActive ? 'Active' : 'Paused'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.reminderActions}>
        <TouchableOpacity
          style={[styles.actionButton, { 
            backgroundColor: reminder.isActive ? '#fbbf2420' : '#10b98120' 
          }]}
          onPress={(e) => {
            e.stopPropagation();
            toggleReminder(reminder.id);
          }}
        >
          <FontAwesome5 
            name={reminder.isActive ? 'pause' : 'play'} 
            size={14} 
            color={reminder.isActive ? '#f59e0b' : '#10b981'} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#ef444420' }]}
          onPress={(e) => {
            e.stopPropagation();
            deleteReminder(reminder.id, reminder.notificationId);
          }}
        >
          <FontAwesome5 name="trash" size={14} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 50 : 60 }]}>
        <View style={styles.headerRow}>
          <View style={[styles.userImg, styles.userImgPlaceholder]}>
            <FontAwesome5 name="pills" size={32} color="#ffffff" />
          </View>

          <View style={styles.greeting}>
            <Text style={styles.greetingLine}>Medicine Reminders</Text>
            <Text style={styles.userName}>Daily Medication</Text>
          </View>

          <TouchableOpacity 
            style={styles.signOutBtn} 
            onPress={() => {
              setEditingReminder(null);
              setMedicineName('');
              setDosage('');
              setSelectedDate(new Date());
              setModalVisible(true);
            }}
          >
            <FontAwesome5 name="plus" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Health tip */}
      <View style={styles.tipCard}>
        <View style={styles.tipIconWrap}>
          <FontAwesome5 name="bell" color="#f97316" size={24} />
        </View>
        <Text style={styles.tipText}>
          {reminders.length > 0 
            ? `You have ${reminders.filter(r => r.isActive).length} active reminder${reminders.filter(r => r.isActive).length !== 1 ? 's' : ''} out of ${reminders.length}`
            : "Set daily reminders for your medications"}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ✅ REMINDER LIST SECTION - Similar to Emergency Conditions */}
        <View style={styles.remindersSection}>
          <Text style={styles.sectionTitle}>Your Medicine Reminders</Text>
          <Text style={styles.sectionSubtitle}>
            Manage your daily medication schedule
          </Text>
          
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.loadingText}>Loading your reminders...</Text>
            </View>
          )}

          {reminders.length > 0 ? (
            reminders.map((reminder) => (
              <MedicineReminderCard key={reminder.id} reminder={reminder} />
            ))
          ) : !loading && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <FontAwesome5 name="pills" size={48} color="#cbd5e1" />
              </View>
              <Text style={styles.emptyTitle}>No Reminders Set</Text>
              <Text style={styles.emptySubtitle}>
                Tap the + button above to add your first medicine reminder
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => {
                  setEditingReminder(null);
                  setMedicineName('');
                  setDosage('');
                  setSelectedDate(new Date());
                  setModalVisible(true);
                }}
              >
                <FontAwesome5 name="plus" size={16} color="#2563EB" />
                <Text style={styles.emptyActionText}>Add First Reminder</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingReminder ? 'Edit' : 'Add'} Medicine Reminder
            </Text>
            <Text style={styles.modalSubtitle}>
              {editingReminder ? 'Update your' : 'Set up'} daily medication alert
            </Text>

            <TextInput
              placeholder="Medicine name (e.g., Aspirin, Vitamin D)"
              value={medicineName}
              onChangeText={setMedicineName}
              style={styles.modalInput}
              placeholderTextColor="#94A3B8"
            />

            <TextInput
              placeholder="Dosage (e.g., 500mg, 1 tablet)"
              value={dosage}
              onChangeText={setDosage}
              style={styles.modalInput}
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.importanceLabel}>Reminder Time:</Text>
            <TouchableOpacity 
              style={styles.timeButton} 
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.8}
            >
              <FontAwesome5 name="clock" size={16} color="#2563EB" />
              <Text style={styles.timeText}>
                {selectedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Text style={styles.dailyLabel}>Daily</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={saveReminder}
              disabled={loading}
              style={[styles.saveModalButton, loading && styles.saveModalButtonDisabled]}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <FontAwesome5 name="bell" size={16} color="#fff" />
                  <Text style={styles.saveModalButtonText}>
                    {editingReminder ? 'Update' : 'Set'} Reminder
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setModalVisible(false)}
              style={styles.cancelModalButton}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelModalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="time"
          display="default"
          onChange={(event, date) => {
            setShowTimePicker(Platform.OS === 'ios');
            if (date) {
              const newDate = new Date(selectedDate);
              newDate.setHours(date.getHours());
              newDate.setMinutes(date.getMinutes());
              setSelectedDate(newDate);
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 30 },

  // Header
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

  // Health tip
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

  // ✅ REMINDER LIST SECTION - Like Emergency Conditions
  remindersSection: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1E3A8A', marginBottom: 8 },
  sectionSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
  
  // ✅ REMINDER CARD - Like Emergency Condition Card
  reminderCard: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  reminderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  reminderInfo: { flex: 1 },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reminderName: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#1F2937', 
    flex: 1,
    marginRight: 8,
  },
  reminderTime: { 
    fontSize: 14, 
    color: '#2563EB', 
    fontWeight: '700',
  },
  reminderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  reminderDosage: { 
    fontSize: 12, 
    color: '#6B7280',
    fontWeight: '500',
  },
  reminderFrequency: { 
    fontSize: 12, 
    color: '#059669',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  // Reminder Actions
  reminderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Loading
  loadingContainer: { alignItems: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#6B7280', textAlign: 'center' },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  emptyActionText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 14,
  },

  // Modal styles
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
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.9)',
    gap: 8,
  },
  timeText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 18,
  },
  dailyLabel: {
    color: '#10b981',
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 8,
  },
  saveModalButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
  },
  saveModalButtonDisabled: {
    opacity: 0.6,
  },
  saveModalButtonText: {
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
