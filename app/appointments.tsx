// screens/Appointments.tsx - Enhanced with Reschedule Feature
import { FontAwesome5 } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import * as Animatable from 'react-native-animatable';

import { getAuth } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  updateDoc,
  where
} from 'firebase/firestore';

/* ───────────── Notification Setup for Receiving Only ───────────── */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/* ───────────── Types ───────────── */
interface Hospital {
  id: string;
  name: string;
  addedAt: string;
  isActive: boolean;
}

interface Appointment {
  id: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  hospitalName: string;
  appointmentDate: string;
  appointmentTime: string;
  reason: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
  userId: string;
  rescheduledFrom?: {
    date: string;
    time: string;
    rescheduledAt: string;
  };
}

const TIME_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'
];

/* ───────────── Setup Notifications (Receive Only) ───────────── */
const setupNotifications = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission Required', 'Enable notifications to receive appointment updates from doctors');
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('appointment_updates', {
      name: 'Appointment Updates',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563EB',
    });
  }
};

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [appointmentToReschedule, setAppointmentToReschedule] = useState<Appointment | null>(null);
  
  // Form data
  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [reason, setReason] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Reschedule form data
  const [rescheduleDate, setRescheduleDate] = useState(new Date());
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [showRescheduleDatePicker, setShowRescheduleDatePicker] = useState(false);

  useEffect(() => {
    setupNotifications();
    loadUserAppointments();
    loadUserData();
    loadAvailableHospitals();
  }, []);

  const loadUserData = async () => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        const firestore = getFirestore();
        const userDocRef = doc(firestore, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setPatientName(userData.fullName || '');
          setPatientEmail(currentUser.email || '');
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadAvailableHospitals = async () => {
    try {
      const firestore = getFirestore();
      const hospitalsRef = collection(firestore, 'hospitals');
      const querySnapshot = await getDocs(hospitalsRef);
      
      const hospitalsList: Hospital[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.isActive) {
          hospitalsList.push({
            id: doc.id,
            name: data.name,
            addedAt: data.addedAt,
            isActive: data.isActive
          });
        }
      });

      hospitalsList.sort((a, b) => a.name.localeCompare(b.name));
      setHospitals(hospitalsList);
    } catch (error) {
      console.error('Error loading hospitals:', error);
    }
  };

  const loadUserAppointments = async () => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) return;

      const firestore = getFirestore();
      const appointmentsRef = collection(firestore, 'appointments');
      const q = query(appointmentsRef, where('userId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      const userAppointments: Appointment[] = [];
      querySnapshot.forEach((doc) => {
        userAppointments.push({ id: doc.id, ...doc.data() } as Appointment);
      });

      setAppointments(userAppointments.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (error) {
      console.error('Error loading appointments:', error);
    }
  };

  const bookAppointment = async () => {
    if (!selectedHospital || !patientName || !patientEmail || !selectedTime || !reason) {
      Alert.alert('Missing Fields', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        Alert.alert('Error', 'Please log in to book appointment');
        return;
      }

      const appointmentData: Omit<Appointment, 'id'> = {
        patientName: patientName.trim(),
        patientEmail: patientEmail.trim(),
        patientPhone: patientPhone.trim(),
        hospitalName: selectedHospital.name,
        appointmentDate: selectedDate.toISOString().split('T')[0],
        appointmentTime: selectedTime,
        reason: reason.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
        userId: currentUser.uid,
      };

      const firestore = getFirestore();
      const docRef = await addDoc(collection(firestore, 'appointments'), appointmentData);
      
      setAppointments(prev => [
        { id: docRef.id, ...appointmentData },
        ...prev
      ]);

      // Reset form
      setModalVisible(false);
      setSelectedHospital(null);
      setSelectedTime('');
      setReason('');
      setPatientPhone('');
      
      Alert.alert('Success', 'Appointment booked successfully! You will receive notifications when the doctor updates your appointment status.');
    } catch (error) {
      console.error('Error booking appointment:', error);
      Alert.alert('Error', 'Failed to book appointment');
    }
    setLoading(false);
  };

  // NEW: Reschedule Appointment Function
  const initiateReschedule = (appointment: Appointment) => {
    setAppointmentToReschedule(appointment);
    setRescheduleDate(new Date(appointment.appointmentDate));
    setRescheduleTime(appointment.appointmentTime);
    setRescheduleModalVisible(true);
  };

  const performReschedule = async () => {
    if (!appointmentToReschedule || !rescheduleTime) {
      Alert.alert('Missing Information', 'Please select a new date and time');
      return;
    }

    // Check if the new date/time is different from current
    const newDateStr = rescheduleDate.toISOString().split('T')[0];
    if (newDateStr === appointmentToReschedule.appointmentDate && rescheduleTime === appointmentToReschedule.appointmentTime) {
      Alert.alert('No Changes', 'Please select a different date or time');
      return;
    }

    // Check if new date is not in the past
    const today = new Date().toISOString().split('T')[0];
    if (newDateStr < today) {
      Alert.alert('Invalid Date', 'Please select a future date');
      return;
    }

    setRescheduleLoading(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        Alert.alert('Error', 'Please log in to reschedule appointment');
        return;
      }

      const db = getFirestore();
      const appointmentRef = doc(db, 'appointments', appointmentToReschedule.id);

      // Store original appointment details for history
      const originalDate = appointmentToReschedule.appointmentDate;
      const originalTime = appointmentToReschedule.appointmentTime;

      // Update appointment with new date/time and reschedule history
      await updateDoc(appointmentRef, {
        appointmentDate: newDateStr,
        appointmentTime: rescheduleTime,
        status: 'pending', // Reset to pending when rescheduled
        rescheduledFrom: {
          date: originalDate,
          time: originalTime,
          rescheduledAt: new Date().toISOString(),
        },
        lastModified: new Date().toISOString(),
      });

      // Update local state
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentToReschedule.id 
            ? { 
                ...apt, 
                appointmentDate: newDateStr,
                appointmentTime: rescheduleTime,
                status: 'pending' as const,
                rescheduledFrom: {
                  date: originalDate,
                  time: originalTime,
                  rescheduledAt: new Date().toISOString(),
                }
              }
            : apt
        )
      );

      // Close modal and reset
      setRescheduleModalVisible(false);
      setAppointmentToReschedule(null);
      setRescheduleTime('');

      Alert.alert(
        'Appointment Rescheduled', 
        `Your appointment has been rescheduled to ${rescheduleDate.toDateString()} at ${rescheduleTime}. The doctor will be notified about the change.`
      );

    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      Alert.alert('Error', 'Failed to reschedule appointment. Please try again.');
    }
    setRescheduleLoading(false);
  };

  // Mobile app can only cancel appointments (not confirm/complete)
  const cancelAppointment = (appointmentId: string) => {
    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => performCancelAppointment(appointmentId)
        }
      ]
    );
  };

  const performCancelAppointment = async (appointmentId: string) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        Alert.alert('Error', 'Please log in to cancel appointment');
        return;
      }

      const db = getFirestore();
      const appointmentRef = doc(db, 'appointments', appointmentId);

      // Check if document exists and user owns it
      const docSnap = await getDoc(appointmentRef);
      if (!docSnap.exists()) {
        Alert.alert('Error', 'Appointment not found');
        return;
      }

      const appointmentData = docSnap.data();
      if (appointmentData.userId !== user.uid) {
        Alert.alert('Error', 'You can only cancel your own appointments');
        return;
      }

      // Only allow cancellation if appointment is pending or confirmed
      if (appointmentData.status === 'completed' || appointmentData.status === 'cancelled') {
        Alert.alert('Cannot Cancel', 'This appointment cannot be cancelled as it is already ' + appointmentData.status);
        return;
      }

      // Update appointment status to cancelled
      await updateDoc(appointmentRef, {
        status: 'cancelled',
        cancelledBy: 'patient',
        cancelledAt: new Date().toISOString(),
      });

      // Update local state
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, status: 'cancelled' as const }
            : apt
        )
      );

      Alert.alert('Success', 'Appointment cancelled successfully');

    } catch (error) {
      console.error('Error cancelling appointment:', error);
      Alert.alert('Error', 'Failed to cancel appointment. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#10b981';
      case 'completed': return '#6366f1';
      case 'cancelled': return '#ef4444';
      default: return '#f59e0b';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return 'check-circle';
      case 'completed': return 'flag-checkered';
      case 'cancelled': return 'times-circle';
      default: return 'clock';
    }
  };

  const AppointmentCard = ({ item, index }: { item: Appointment; index: number }) => (
    <Animatable.View 
      animation="fadeInUp" 
      delay={index * 100} 
      style={styles.appointmentCard}
    >
      <View style={styles.appointmentContent}>
        <View style={styles.appointmentIconContainer}>
          <FontAwesome5 name="hospital" size={20} color="#2563EB" />
        </View>
        
        <View style={styles.appointmentDetails}>
          <Text style={styles.hospitalName} numberOfLines={1}>{item.hospitalName}</Text>
          <Text style={styles.appointmentDateTime}>
            {new Date(item.appointmentDate).toLocaleDateString()} at {item.appointmentTime}
          </Text>
          <Text style={styles.appointmentReason} numberOfLines={1}>{item.reason}</Text>
          
          {/* Show reschedule history if available */}
          {item.rescheduledFrom && (
            <View style={styles.rescheduleHistoryContainer}>
              <FontAwesome5 name="history" size={10} color="#8B5CF6" />
              <Text style={styles.rescheduleHistoryText}>
                Rescheduled from {new Date(item.rescheduledFrom.date).toLocaleDateString()} at {item.rescheduledFrom.time}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <FontAwesome5 
              name={getStatusIcon(item.status)} 
              size={10} 
              color="#fff" 
              style={{ marginRight: 4 }} 
            />
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      {/* Action buttons - show for pending and confirmed appointments */}
      {(item.status === 'pending' || item.status === 'confirmed') && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.rescheduleButton}
            onPress={() => initiateReschedule(item)}
          >
            <FontAwesome5 name="calendar-alt" size={14} color="#8B5CF6" />
            <Text style={styles.rescheduleButtonText}>Reschedule</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => cancelAppointment(item.id)}
          >
            <FontAwesome5 name="times" size={14} color="#ef4444" />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      <FontAwesome5 
        name="chevron-right" 
        size={12} 
        color="#9CA3AF" 
        style={styles.appointmentArrow} 
      />
    </Animatable.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 50 : 60 }]}>
        <View style={styles.headerRow}>
          <View style={[styles.userImg, styles.userImgPlaceholder]}>
            <FontAwesome5 name="calendar-check" size={32} color="#ffffff" />
          </View>

          <View style={styles.greeting}>
            <Text style={styles.greetingLine}>Book Appointments</Text>
            <Text style={styles.userName}>Hospital Services</Text>
          </View>

          <TouchableOpacity 
            style={styles.signOutBtn} 
            onPress={() => setModalVisible(true)}
          >
            <FontAwesome5 name="plus" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tip Card */}
      <View style={styles.tipCard}>
        <View style={styles.tipIconWrap}>
          <FontAwesome5 name="bell" color="#f97316" size={24} />
        </View>
        <Text style={styles.tipText}>
          {appointments.length > 0 
            ? `You have ${appointments.length} appointment${appointments.length !== 1 ? 's' : ''} • You can reschedule or cancel anytime`
            : "Book appointments and receive real-time updates from doctors"}
        </Text>
      </View>

      {/* Appointments List */}
      <FlatList
        data={appointments}
        renderItem={({ item, index }) => <AppointmentCard item={item} index={index} />}
        keyExtractor={item => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <FontAwesome5 name="calendar-times" size={48} color="#CBD5E1" />
            </View>
            <Text style={styles.emptyText}>No appointments yet</Text>
            <Text style={styles.emptySubtext}>Book your first appointment using the + button above</Text>
          </View>
        }
      />

      {/* Bottom Add Button */}
      <TouchableOpacity 
        style={styles.addButton} 
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <FontAwesome5 name="plus" size={18} color="#fff" />
        <Text style={styles.addButtonText}>Book New Appointment</Text>
      </TouchableOpacity>

      {/* Booking Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Book Appointment</Text>
              <Text style={styles.modalSubtitle}>Select hospital and appointment details</Text>

              <Text style={styles.fieldLabel}>Select Hospital:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedHospital?.id || ''}
                  onValueChange={(itemValue) => {
                    const hospital = hospitals.find(h => h.id === itemValue);
                    setSelectedHospital(hospital || null);
                  }}
                  style={styles.picker}
                >
                  <Picker.Item label="Choose a hospital..." value="" />
                  {hospitals.map(hospital => (
                    <Picker.Item 
                      key={hospital.id} 
                      label={hospital.name} 
                      value={hospital.id} 
                    />
                  ))}
                </Picker>
              </View>

              {hospitals.length === 0 && (
                <Text style={styles.noHospitalsText}>
                  No hospitals available. Hospitals will appear here when doctors register.
                </Text>
              )}

              <TextInput
                placeholder="Your full name"
                value={patientName}
                onChangeText={setPatientName}
                style={styles.modalInput}
                placeholderTextColor="#94A3B8"
              />

              <TextInput
                placeholder="Your email"
                value={patientEmail}
                onChangeText={setPatientEmail}
                style={styles.modalInput}
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
              />

              <TextInput
                placeholder="Your phone number"
                value={patientPhone}
                onChangeText={setPatientPhone}
                style={styles.modalInput}
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
              />

              <Text style={styles.fieldLabel}>Appointment Date:</Text>
              <TouchableOpacity 
                style={styles.dateButton} 
                onPress={() => setShowDatePicker(true)}
              >
                <FontAwesome5 name="calendar" size={16} color="#2563EB" />
                <Text style={styles.dateText}>
                  {selectedDate.toDateString()}
                </Text>
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>Appointment Time:</Text>
              <View style={styles.timeSlotsContainer}>
                {TIME_SLOTS.map(time => (
                  <TouchableOpacity
                    key={time}
                    style={[
                      styles.timeSlot,
                      selectedTime === time && styles.selectedTimeSlot
                    ]}
                    onPress={() => setSelectedTime(time)}
                  >
                    <Text style={[
                      styles.timeSlotText,
                      selectedTime === time && styles.selectedTimeSlotText
                    ]}>
                      {time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                placeholder="Reason for appointment"
                value={reason}
                onChangeText={setReason}
                style={[styles.modalInput, styles.reasonInput]}
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                onPress={bookAppointment}
                disabled={loading || hospitals.length === 0}
                style={[styles.bookButton, (loading || hospitals.length === 0) && styles.bookButtonDisabled]}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <FontAwesome5 name="calendar-plus" size={16} color="#fff" />
                    <Text style={styles.bookButtonText}>Book Appointment</Text>
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
          </ScrollView>
        </View>
      </Modal>

      {/* NEW: Reschedule Modal */}
      <Modal visible={rescheduleModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Reschedule Appointment</Text>
              <Text style={styles.modalSubtitle}>
                {appointmentToReschedule?.hospitalName}
              </Text>

              {appointmentToReschedule && (
                <View style={styles.currentAppointmentInfo}>
                  <Text style={styles.currentAppointmentLabel}>Current Appointment:</Text>
                  <Text style={styles.currentAppointmentText}>
                    {new Date(appointmentToReschedule.appointmentDate).toDateString()} at {appointmentToReschedule.appointmentTime}
                  </Text>
                </View>
              )}

              <Text style={styles.fieldLabel}>New Date:</Text>
              <TouchableOpacity 
                style={styles.dateButton} 
                onPress={() => setShowRescheduleDatePicker(true)}
              >
                <FontAwesome5 name="calendar" size={16} color="#8B5CF6" />
                <Text style={[styles.dateText, { color: '#8B5CF6' }]}>
                  {rescheduleDate.toDateString()}
                </Text>
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>New Time:</Text>
              <View style={styles.timeSlotsContainer}>
                {TIME_SLOTS.map(time => (
                  <TouchableOpacity
                    key={time}
                    style={[
                      styles.timeSlot,
                      rescheduleTime === time && styles.selectedRescheduleTimeSlot
                    ]}
                    onPress={() => setRescheduleTime(time)}
                  >
                    <Text style={[
                      styles.timeSlotText,
                      rescheduleTime === time && styles.selectedRescheduleTimeSlotText
                    ]}>
                      {time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                onPress={performReschedule}
                disabled={rescheduleLoading}
                style={[styles.rescheduleSubmitButton, rescheduleLoading && styles.bookButtonDisabled]}
                activeOpacity={0.8}
              >
                {rescheduleLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <FontAwesome5 name="calendar-check" size={16} color="#fff" />
                    <Text style={styles.rescheduleSubmitButtonText}>Confirm Reschedule</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => {
                  setRescheduleModalVisible(false);
                  setAppointmentToReschedule(null);
                  setRescheduleTime('');
                }}
                style={styles.cancelModalButton}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Date Picker for Booking */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={(event, date) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (date) setSelectedDate(date);
          }}
        />
      )}

      {/* Date Picker for Rescheduling */}
      {showRescheduleDatePicker && (
        <DateTimePicker
          value={rescheduleDate}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={(event, date) => {
            setShowRescheduleDatePicker(Platform.OS === 'ios');
            if (date) setRescheduleDate(date);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  // Header styles
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

  // Tip card
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

  // List styles
  list: { flex: 1, paddingHorizontal: 20 },
  listContent: { paddingBottom: 100 },
  
  // Appointment cards
  appointmentCard: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    elevation: 8,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    shadowColor: '#2563EB',
    position: 'relative',
    marginBottom: 12,
  },
  appointmentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  appointmentIconContainer: {
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  appointmentDetails: { flex: 1 },
  hospitalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  appointmentDateTime: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  appointmentReason: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 10,
  },
  appointmentArrow: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    opacity: 0.5,
  },

  // NEW: Reschedule history
  rescheduleHistoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  rescheduleHistoryText: {
    fontSize: 10,
    color: '#8B5CF6',
    marginLeft: 4,
    fontStyle: 'italic',
  },

  // Enhanced action container for both reschedule and cancel buttons
  actionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  rescheduleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  rescheduleButtonText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  cancelButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },

  // Empty state
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

  // Add button
  addButton: {
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
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },

  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
  },
  modalScrollContent: {
    padding: 20,
    justifyContent: 'center',
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
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
    marginBottom: 8,
    marginTop: 12,
  },
  modalInput: {
    borderBottomWidth: 2,
    borderBottomColor: '#2563EB',
    paddingVertical: 12,
    fontSize: 16,
    color: '#1E3A8A',
    marginBottom: 16,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginBottom: 16,
  },
  picker: {
    height: 50,
  },
  noHospitalsText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  dateText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '600',
  },
  timeSlotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  timeSlot: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  selectedTimeSlot: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  timeSlotText: {
    fontSize: 14,
    color: '#6B7280',
  },
  selectedTimeSlotText: {
    color: '#fff',
    fontWeight: '600',
  },
  bookButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
  },
  bookButtonDisabled: {
    opacity: 0.6,
  },
  bookButtonText: {
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

  // NEW: Reschedule modal specific styles
  currentAppointmentInfo: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  currentAppointmentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  currentAppointmentText: {
    fontSize: 16,
    color: '#1F2937',
  },
  selectedRescheduleTimeSlot: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  selectedRescheduleTimeSlotText: {
    color: '#fff',
    fontWeight: '600',
  },
  rescheduleSubmitButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
  },
  rescheduleSubmitButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
});
