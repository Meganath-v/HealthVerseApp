// screens/FitnessTracker.tsx - CRASH-FREE PRODUCTION VERSION
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import * as Animatable from 'react-native-animatable';

// ✅ SAFE IMPORTS - Only core RN components initially
// Remove complex dependencies that cause crashes
// import { LineChart, ProgressChart } from 'react-native-chart-kit'; // Comment out initially
// import * as Location from 'expo-location'; // Comment out initially  
// import haversine from 'haversine'; // Comment out initially

// Firebase imports (keep these - they're safe)
import { getAuth } from 'firebase/auth';
import { arrayUnion, doc, getDoc, getFirestore, updateDoc } from 'firebase/firestore';

/* ────────────────────────────────────────── */
/*                 SAFE TYPES                 */
/* ────────────────────────────────────────── */

interface Exercise {
  id: string;
  name: string;
  category: 'Cardio' | 'Strength' | 'Flexibility' | 'Sports';
  muscle: string;
  requiresGPS?: boolean;
}

interface WorkoutSet {
  id: string;
  reps: number;
  weight: number;
  duration?: number;
  distance?: number;
  calories?: number;
}

interface Workout {
  id: string;
  date: string;
  exerciseId: string;
  exerciseName: string;
  sets: WorkoutSet[];
  totalDuration: number;
  totalDistance: number;
  caloriesBurned: number;
}

interface DailyStats {
  date: string;
  totalWorkouts: number;
  totalDuration: number;
  totalDistance: number;
  caloriesBurned: number;
  steps: number;
}

// Exercise library
const EXERCISE_LIBRARY: Exercise[] = [
  { id: '1', name: 'Push-ups', category: 'Strength', muscle: 'Chest, Arms' },
  { id: '2', name: 'Squats', category: 'Strength', muscle: 'Legs, Glutes' },
  { id: '3', name: 'Pull-ups', category: 'Strength', muscle: 'Back, Arms' },
  { id: '4', name: 'Plank', category: 'Strength', muscle: 'Core' },
  { id: '5', name: 'Dumbbell Press', category: 'Strength', muscle: 'Chest' },
  { id: '6', name: 'Deadlift', category: 'Strength', muscle: 'Back, Legs' },
  { id: '7', name: 'Yoga', category: 'Flexibility', muscle: 'Full Body' },
  { id: '8', name: 'Stretching', category: 'Flexibility', muscle: 'Full Body' },
];

const FITNESS_TIPS = [
  '💪 Consistency beats perfection - work out regularly',
  '🥤 Stay hydrated during your workouts',
  '😴 Rest days are crucial for muscle recovery',
  '🍎 Proper nutrition fuels your fitness goals',
  '📈 Track your progress to stay motivated',
  '🎯 Set realistic and achievable goals'
];

const { width } = Dimensions.get('window');

export default function FitnessTracker() {
  // ✅ SAFE STATE - Simple state management
  const [activeTab, setActiveTab] = useState<'dashboard' | 'workouts' | 'exercises' | 'progress'>('dashboard');
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>(EXERCISE_LIBRARY);
  const [currentWorkout, setCurrentWorkout] = useState<Workout | null>(null);
  
  // Modal states
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  
  // Form states
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseCategory, setNewExerciseCategory] = useState<Exercise['category']>('Strength');
  const [newExerciseMuscle, setNewExerciseMuscle] = useState('');
  const [workoutReps, setWorkoutReps] = useState('');
  const [workoutWeight, setWorkoutWeight] = useState('');
  
  const [dailyStats, setDailyStats] = useState<DailyStats>({
    date: new Date().toDateString(),
    totalWorkouts: 0,
    totalDuration: 0,
    totalDistance: 0,
    caloriesBurned: 0,
    steps: 8452,
  });

  const [loading, setLoading] = useState(false);
  const [tip, setTip] = useState('');
  
  // ✅ SAFE REFS - Simple number refs only
  const mountedRef = useRef(true);

  // ✅ SAFE EFFECTS - Wrap in try-catch
  useEffect(() => {
    try {
      loadUserData();
      setTip(FITNESS_TIPS[Math.floor(Math.random() * FITNESS_TIPS.length)]);
      
      // ✅ Android back handler
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        return false; // Let default behavior handle it
      });

      return () => {
        mountedRef.current = false;
        backHandler.remove();
      };
    } catch (error) {
      console.error('Error in useEffect:', error);
    }
  }, []);

  // ✅ SAFE ASYNC FUNCTIONS
  const loadUserData = useCallback(async () => {
    if (!mountedRef.current) return;
    
    try {
      setLoading(true);
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        setLoading(false);
        return;
      }

      const firestore = getFirestore();
      const userDocRef = doc(firestore, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists() && mountedRef.current) {
        const userData = userDoc.data();
        setWorkouts(userData.workouts || []);
        setExercises([...EXERCISE_LIBRARY, ...(userData.customExercises || [])]);
        updateDailyStats(userData.workouts || []);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const updateDailyStats = useCallback((workoutData: Workout[]) => {
    try {
      const today = new Date().toDateString();
      const todayWorkouts = workoutData.filter(w => {
        try {
          return new Date(w.date).toDateString() === today;
        } catch {
          return false;
        }
      });
      
      const totalDuration = todayWorkouts.reduce((sum, w) => sum + (w.totalDuration || 0), 0);
      const totalDistance = todayWorkouts.reduce((sum, w) => sum + (w.totalDistance || 0), 0);
      const totalCalories = todayWorkouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
      
      const stats: DailyStats = {
        date: today,
        totalWorkouts: todayWorkouts.length,
        totalDuration: totalDuration,
        totalDistance: totalDistance,
        caloriesBurned: totalCalories,
        steps: dailyStats.steps || 8452,
      };
      
      if (mountedRef.current) {
        setDailyStats(stats);
      }
    } catch (error) {
      console.error('Error updating daily stats:', error);
    }
  }, [dailyStats.steps]);

  // ✅ SAFE WORKOUT FUNCTIONS
  const startRegularWorkout = useCallback((exercise: Exercise) => {
    try {
      const newWorkout: Workout = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        sets: [],
        totalDuration: 0,
        totalDistance: 0,
        caloriesBurned: 0
      };
      
      setCurrentWorkout(newWorkout);
      setSelectedExercise(exercise);
      setShowWorkoutModal(true);
    } catch (error) {
      console.error('Error starting workout:', error);
      Alert.alert('Error', 'Failed to start workout');
    }
  }, []);

  const addSet = useCallback(() => {
    if (!currentWorkout || !selectedExercise) return;

    try {
      const reps = parseInt(workoutReps) || 0;
      const weight = parseFloat(workoutWeight) || 0;
      
      if (reps <= 0 || weight <= 0) {
        Alert.alert('Error', 'Please enter valid reps and weight');
        return;
      }

      const newSet: WorkoutSet = {
        id: Date.now().toString(),
        reps: reps,
        weight: weight,
        calories: Math.round((reps * weight) / 10)
      };

      const updatedWorkout = {
        ...currentWorkout,
        sets: [...currentWorkout.sets, newSet],
        caloriesBurned: currentWorkout.caloriesBurned + (newSet.calories || 0)
      };

      setCurrentWorkout(updatedWorkout);
      setWorkoutReps('');
      setWorkoutWeight('');
    } catch (error) {
      console.error('Error adding set:', error);
      Alert.alert('Error', 'Failed to add set');
    }
  }, [currentWorkout, selectedExercise, workoutReps, workoutWeight]);

  const finishWorkout = useCallback(async () => {
    if (!currentWorkout || currentWorkout.sets.length === 0) {
      Alert.alert('Error', 'Add at least one set to finish workout');
      return;
    }

    try {
      setLoading(true);
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        const firestore = getFirestore();
        const userDocRef = doc(firestore, 'users', currentUser.uid);
        
        await updateDoc(userDocRef, {
          workouts: arrayUnion(currentWorkout)
        });
      }
      
      if (mountedRef.current) {
        const updatedWorkouts = [...workouts, currentWorkout];
        setWorkouts(updatedWorkouts);
        updateDailyStats(updatedWorkouts);
        
        setCurrentWorkout(null);
        setSelectedExercise(null);
        setShowWorkoutModal(false);
        
        Alert.alert('Congratulations!', `Workout completed! You burned ${currentWorkout.caloriesBurned || 0} calories.`);
      }
    } catch (error) {
      console.error('Error saving workout:', error);
      Alert.alert('Error', 'Failed to save workout');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [currentWorkout, workouts, updateDailyStats]);

  const addCustomExercise = useCallback(async () => {
    try {
      if (!newExerciseName.trim() || !newExerciseMuscle.trim()) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }

      setLoading(true);
      const newExercise: Exercise = {
        id: Date.now().toString(),
        name: newExerciseName.trim(),
        category: newExerciseCategory,
        muscle: newExerciseMuscle.trim()
      };

      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        const firestore = getFirestore();
        const userDocRef = doc(firestore, 'users', currentUser.uid);
        
        await updateDoc(userDocRef, {
          customExercises: arrayUnion(newExercise)
        });
      }
      
      if (mountedRef.current) {
        setExercises(prev => [...prev, newExercise]);
        setNewExerciseName('');
        setNewExerciseMuscle('');
        setShowAddExerciseModal(false);
        
        Alert.alert('Success', 'Exercise added successfully!');
      }
    } catch (error) {
      console.error('Error adding exercise:', error);
      Alert.alert('Error', 'Failed to add exercise');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [newExerciseName, newExerciseCategory, newExerciseMuscle]);

  // ✅ SAFE HELPER FUNCTIONS
  const formatTime = useCallback((seconds: number): string => {
    const safeSeconds = seconds || 0;
    const mins = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // ✅ SAFE RENDER FUNCTIONS
  const renderDashboard = () => (
    <ScrollView 
      showsVerticalScrollIndicator={false} 
      style={styles.tabContent}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Daily Stats Cards */}
      <View style={styles.statsContainer}>
        <Animatable.View animation="fadeInLeft" style={[styles.statCard, { backgroundColor: '#3b82f6' }]}>
          <FontAwesome5 name="dumbbell" size={24} color="#fff" />
          <Text style={styles.statNumber}>{dailyStats.totalWorkouts || 0}</Text>
          <Text style={styles.statLabel}>Workouts</Text>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" delay={100} style={[styles.statCard, { backgroundColor: '#ef4444' }]}>
          <FontAwesome5 name="fire" size={24} color="#fff" />
          <Text style={styles.statNumber}>{dailyStats.caloriesBurned || 0}</Text>
          <Text style={styles.statLabel}>Calories</Text>
        </Animatable.View>

        <Animatable.View animation="fadeInRight" delay={200} style={[styles.statCard, { backgroundColor: '#10b981' }]}>
          <FontAwesome5 name="walking" size={24} color="#fff" />
          <Text style={styles.statNumber}>{(dailyStats.steps || 0).toLocaleString()}</Text>
          <Text style={styles.statLabel}>Steps</Text>
        </Animatable.View>
      </View>

      {/* Quick Actions */}
      <Animatable.View animation="slideInUp" delay={300} style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => setActiveTab('exercises')}
          activeOpacity={0.8}
        >
          <FontAwesome5 name="play" size={20} color="#fff" />
          <Text style={styles.quickActionText}>Start Workout</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.quickActionButton, { backgroundColor: '#10b981' }]}
          onPress={() => setShowAddExerciseModal(true)}
          activeOpacity={0.8}
        >
          <FontAwesome5 name="plus" size={20} color="#fff" />
          <Text style={styles.quickActionText}>Add Exercise</Text>
        </TouchableOpacity>
      </Animatable.View>

      {/* Recent Workouts Preview */}
      <Animatable.View animation="slideInUp" delay={400} style={styles.recentWorkoutsContainer}>
        <Text style={styles.sectionTitle}>Recent Workouts</Text>
        
        {workouts.length === 0 ? (
          <View style={styles.emptyState}>
            <FontAwesome5 name="dumbbell" size={32} color="#9CA3AF" />
            <Text style={styles.emptyText}>No workouts yet</Text>
            <Text style={styles.emptySubtext}>Start your fitness journey today!</Text>
          </View>
        ) : (
          workouts.slice(-3).reverse().map((workout, index) => (
            <View key={workout.id} style={styles.recentWorkoutItem}>
              <View style={styles.workoutIcon}>
                <FontAwesome5 name="dumbbell" size={16} color="#3b82f6" />
              </View>
              <View style={styles.workoutDetails}>
                <Text style={styles.workoutName}>{workout.exerciseName}</Text>
                <Text style={styles.workoutSummary}>
                  {workout.sets.length} sets • {workout.caloriesBurned} cal
                </Text>
              </View>
              <Text style={styles.workoutDate}>
                {new Date(workout.date).toLocaleDateString()}
              </Text>
            </View>
          ))
        )}
      </Animatable.View>
    </ScrollView>
  );

  const renderWorkouts = () => (
    <ScrollView 
      showsVerticalScrollIndicator={false} 
      style={styles.tabContent}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <Text style={styles.sectionTitle}>All Workouts</Text>
      
      {workouts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome5 name="dumbbell" size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>No workouts yet</Text>
          <Text style={styles.emptySubtext}>Start your first workout from the exercises tab</Text>
        </View>
      ) : (
        workouts.slice().reverse().map((workout, index) => (
          <Animatable.View
            key={workout.id}
            animation="fadeInUp"
            delay={index * 50}
            style={styles.workoutCard}
          >
            <View style={styles.workoutHeader}>
              <Text style={styles.workoutName}>{workout.exerciseName}</Text>
              <Text style={styles.workoutDate}>
                {new Date(workout.date).toLocaleDateString()}
              </Text>
            </View>
            
            <View style={styles.workoutStats}>
              <View style={styles.workoutStat}>
                <FontAwesome5 name="list" size={14} color="#64748B" />
                <Text style={styles.workoutStatText}>{workout.sets.length} sets</Text>
              </View>
              
              <View style={styles.workoutStat}>
                <FontAwesome5 name="fire" size={14} color="#64748B" />
                <Text style={styles.workoutStatText}>{workout.caloriesBurned || 0} cal</Text>
              </View>
            </View>

            <View style={styles.setsContainer}>
              {workout.sets.map((set, setIndex) => (
                <View key={set.id} style={styles.setItem}>
                  <Text style={styles.setNumber}>Set {setIndex + 1}</Text>
                  <Text style={styles.setText}>{set.reps} reps × {set.weight}kg</Text>
                </View>
              ))}
            </View>
          </Animatable.View>
        ))
      )}
    </ScrollView>
  );

  const renderExercises = () => (
    <ScrollView 
      showsVerticalScrollIndicator={false} 
      style={styles.tabContent}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Exercise Library</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddExerciseModal(true)}
          activeOpacity={0.8}
        >
          <FontAwesome5 name="plus" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Group exercises by category */}
      {Object.entries(
        exercises.reduce((acc, exercise) => {
          if (!acc[exercise.category]) acc[exercise.category] = [];
          acc[exercise.category].push(exercise);
          return acc;
        }, {} as Record<string, Exercise[]>)
      ).map(([category, categoryExercises]) => (
        <View key={category} style={styles.categorySection}>
          <Text style={styles.categoryTitle}>{category}</Text>
          
          {categoryExercises.map((exercise, index) => (
            <Animatable.View
              key={exercise.id}
              animation="fadeInUp"
              delay={index * 50}
              style={styles.exerciseCard}
            >
              <TouchableOpacity
                onPress={() => startRegularWorkout(exercise)}
                style={styles.exerciseContent}
                activeOpacity={0.8}
              >
                <View style={styles.exerciseIcon}>
                  <FontAwesome5 
                    name={exercise.category === 'Strength' ? 'dumbbell' : 'leaf'} 
                    size={20} 
                    color="#fff" 
                  />
                </View>
                
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseMuscle}>{exercise.muscle}</Text>
                </View>
                
                <FontAwesome5 name="chevron-right" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </Animatable.View>
          ))}
        </View>
      ))}
    </ScrollView>
  );

  const renderProgress = () => (
    <ScrollView 
      showsVerticalScrollIndicator={false} 
      style={styles.tabContent}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <Text style={styles.sectionTitle}>Progress Summary</Text>
      
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>All Time Stats</Text>
        
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{workouts.length}</Text>
            <Text style={styles.summaryLabel}>Total Workouts</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>
              {Math.floor(workouts.reduce((sum, w) => sum + (w.totalDuration || 0), 0) / 60)}m
            </Text>
            <Text style={styles.summaryLabel}>Total Time</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>
              {workouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0)}
            </Text>
            <Text style={styles.summaryLabel}>Calories Burned</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>
              {workouts.reduce((sum, w) => sum + w.sets.length, 0)}
            </Text>
            <Text style={styles.summaryLabel}>Total Sets</Text>
          </View>
        </View>
      </View>

      {/* Personal Records */}
      <View style={styles.recordsContainer}>
        <Text style={styles.recordsTitle}>Personal Records</Text>
        <View style={styles.recordItem}>
          <Text style={styles.recordLabel}>Longest Workout</Text>
          <Text style={styles.recordValue}>
            {Math.max(...workouts.map(w => w.sets.length), 0)} sets
          </Text>
        </View>
        <View style={styles.recordItem}>
          <Text style={styles.recordLabel}>Most Calories Burned</Text>
          <Text style={styles.recordValue}>
            {Math.max(...workouts.map(w => w.caloriesBurned), 0)} cal
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  // ✅ SAFE MAIN RENDER
  return (
    <LinearGradient colors={['#F0F6FF', '#BFDBFE']} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 50 : 60 }]}>
        <View style={styles.headerRow}>
          <View style={styles.iconContainer}>
            <FontAwesome5 name="dumbbell" size={32} color="#ffffff" />
            <View style={styles.onlineIndicator} />
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.greetingLine}>Fitness Tracker</Text>
            <Text style={styles.userName}>Stay Strong</Text>
          </View>

          <TouchableOpacity 
            style={styles.headerActionBtn} 
            onPress={() => setTip(FITNESS_TIPS[Math.floor(Math.random() * FITNESS_TIPS.length)])}
            activeOpacity={0.8}
          >
            <FontAwesome5 name="refresh" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tip Card */}
      <View style={styles.tipCard}>
        <View style={styles.tipIconWrap}>
          <FontAwesome5 name="lightbulb" color="#f97316" size={24} />
        </View>
        <View style={styles.tipContent}>
          <Text style={styles.tipTitle}>Fitness Tip</Text>
          <Text style={styles.tipText}>{tip}</Text>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        {[
          { key: 'dashboard', icon: 'tachometer-alt', label: 'Dashboard' },
          { key: 'workouts', icon: 'list-alt', label: 'Workouts' },
          { key: 'exercises', icon: 'dumbbell', label: 'Exercises' },
          { key: 'progress', icon: 'chart-line', label: 'Progress' }
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabItem, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key as any)}
            activeOpacity={0.8}
          >
            <FontAwesome5 
              name={tab.icon} 
              size={18} 
              color={activeTab === tab.key ? '#2563EB' : '#64748B'} 
            />
            <Text style={[
              styles.tabLabel,
              activeTab === tab.key && styles.activeTabLabel
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}

      {/* Tab Content */}
      <View style={styles.contentContainer}>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'workouts' && renderWorkouts()}
        {activeTab === 'exercises' && renderExercises()}
        {activeTab === 'progress' && renderProgress()}
      </View>

      {/* Add Exercise Modal */}
      <Modal visible={showAddExerciseModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Custom Exercise</Text>
            
            <TextInput
              value={newExerciseName}
              onChangeText={setNewExerciseName}
              placeholder="Exercise name"
              style={styles.modalInput}
              maxLength={50}
            />
            
            <TextInput
              value={newExerciseMuscle}
              onChangeText={setNewExerciseMuscle}
              placeholder="Target muscle groups"
              style={styles.modalInput}
              maxLength={50}
            />

            <Text style={styles.categoryLabel}>Category:</Text>
            <View style={styles.categoryOptions}>
              {(['Strength', 'Cardio', 'Flexibility', 'Sports'] as const).map(category => (
                <TouchableOpacity
                  key={category}
                  onPress={() => setNewExerciseCategory(category)}
                  style={[
                    styles.categoryOption,
                    newExerciseCategory === category && { 
                      backgroundColor: '#2563EB',
                      borderColor: '#2563EB'
                    }
                  ]}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.categoryOptionText,
                    newExerciseCategory === category && { color: '#fff' }
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={addCustomExercise}
              style={styles.modalAddButton}
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <FontAwesome5 name="plus" size={16} color="#fff" />
                  <Text style={styles.modalAddButtonText}>Add Exercise</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => {
                setShowAddExerciseModal(false);
                setNewExerciseName('');
                setNewExerciseMuscle('');
              }}
              style={styles.modalCancelButton}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Workout Modal */}
      <Modal visible={showWorkoutModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedExercise?.name} Workout
            </Text>
            
            <TextInput
              value={workoutReps}
              onChangeText={setWorkoutReps}
              placeholder="Repetitions"
              keyboardType="numeric"
              style={styles.modalInput}
              maxLength={3}
            />
            
            <TextInput
              value={workoutWeight}
              onChangeText={setWorkoutWeight}
              placeholder="Weight (kg)"
              keyboardType="numeric"
              style={styles.modalInput}
              maxLength={6}
            />

            <TouchableOpacity
              onPress={addSet}
              style={styles.modalAddButton}
              activeOpacity={0.8}
            >
              <FontAwesome5 name="plus" size={16} color="#fff" />
              <Text style={styles.modalAddButtonText}>Add Set</Text>
            </TouchableOpacity>

            {/* Current Sets */}
            {currentWorkout && currentWorkout.sets.length > 0 && (
              <View style={styles.currentSets}>
                <Text style={styles.currentSetsTitle}>Current Sets:</Text>
                {currentWorkout.sets.map((set, index) => (
                  <Text key={set.id} style={styles.currentSetItem}>
                    Set {index + 1}: {set.reps} reps × {set.weight}kg
                  </Text>
                ))}
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={finishWorkout}
                style={[styles.modalAddButton, { backgroundColor: '#10b981' }]}
                activeOpacity={0.8}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <FontAwesome5 name="check" size={16} color="#fff" />
                    <Text style={styles.modalAddButtonText}>Finish Workout</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => {
                  setCurrentWorkout(null);
                  setSelectedExercise(null);
                  setShowWorkoutModal(false);
                  setWorkoutReps('');
                  setWorkoutWeight('');
                }}
                style={styles.modalCancelButton}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

/* ────────────────────────────────────────── */
/*              CRASH-SAFE STYLES             */
/* ────────────────────────────────────────── */
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
  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  iconContainer: { 
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
  headerActionBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  // Tip Card
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
  tipContent: { flex: 1 },
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

  // Tab Navigation
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.9)',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
    elevation: 4,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#2563EB',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  tabLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 4,
  },
  activeTabLabel: {
    color: '#2563EB',
    fontWeight: '600',
  },

  // Content
  contentContainer: { flex: 1 },
  tabContent: { flex: 1, paddingHorizontal: 20 },

  // Loading
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },

  // Stats Cards
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    textAlign: 'center',
  },

  // Quick Actions
  quickActionsContainer: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
  },
  quickActionButton: {
    flexDirection: 'row',
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 2,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Recent Workouts
  recentWorkoutsContainer: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
  },
  recentWorkoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  workoutIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(37,99,235,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  workoutDetails: { flex: 1 },
  workoutName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  workoutSummary: {
    fontSize: 14,
    color: '#64748B',
  },
  workoutDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },

  // Empty states
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#2563EB',
    borderRadius: 20,
    padding: 10,
    elevation: 2,
  },

  // Workout Cards
  workoutCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#2563EB',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  workoutStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(37,99,235,0.05)',
    borderRadius: 8,
  },
  workoutStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workoutStatText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 6,
    fontWeight: '500',
  },
  setsContainer: {
    gap: 4,
  },
  setItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  setNumber: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  setText: {
    fontSize: 14,
    color: '#64748B',
  },

  // Exercise Categories
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 12,
  },

  // Exercise Cards
  exerciseCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
  },
  exerciseContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  exerciseIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  exerciseMuscle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },

  // Progress & Summary
  summaryContainer: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(37,99,235,0.05)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },

  // Records
  recordsContainer: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
  },
  recordsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 16,
  },
  recordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  recordLabel: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  recordValue: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '600',
  },

  // Modals
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
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563EB',
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
  categoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
    marginBottom: 12,
  },
  categoryOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  categoryOption: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  categoryOptionText: {
    fontWeight: '600',
    color: '#374151',
  },
  modalAddButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
  },
  modalAddButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  modalCancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalCancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
  currentSets: {
    backgroundColor: 'rgba(37,99,235,0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  currentSetsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
    marginBottom: 8,
  },
  currentSetItem: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  modalActions: {
    gap: 12,
  },
});
