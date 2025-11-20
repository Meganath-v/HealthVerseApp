// screens/SymptomChecker.tsx - Disease Prediction Based on Symptoms
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
    View
} from 'react-native';
import * as Animatable from 'react-native-animatable';

// Firebase imports (if needed for saving consultation history)

/* ────────────────────────────────────────── */
/*                 Types & data               */
/* ────────────────────────────────────────── */

interface Symptom {
  id: string;
  name: string;
  category: string;
}

interface Disease {
  name: string;
  description: string;
  severity: 'Mild' | 'Moderate' | 'Severe';
  category: 'Infectious' | 'Chronic' | 'Acute' | 'Genetic';
  commonSymptoms: string[];
  recommendations: string[];
  prevalentIn: string[];
}

interface ConsultationResult {
  id: string;
  selectedSymptoms: string[];
  predictedDiseases: Disease[];
  timestamp: string;
  recommendations: string[];
}

// Comprehensive Indian disease database with symptoms
const INDIAN_DISEASES: Disease[] = [
  {
    name: 'Malaria',
    description: 'Mosquito-borne infectious disease common in tropical regions of India',
    severity: 'Severe',
    category: 'Infectious',
    commonSymptoms: ['fever', 'chills', 'headache', 'nausea', 'vomiting', 'body_ache', 'fatigue'],
    recommendations: ['Immediate medical attention', 'Blood test for confirmation', 'Antimalarial medication'],
    prevalentIn: ['West Bengal', 'Odisha', 'Jharkhand', 'Chhattisgarh', 'Madhya Pradesh']
  },
  {
    name: 'Dengue Fever',
    description: 'Viral infection transmitted by Aedes mosquitoes, common during monsoons',
    severity: 'Severe',
    category: 'Infectious',
    commonSymptoms: ['high_fever', 'severe_headache', 'body_ache', 'rash', 'nausea', 'vomiting'],
    recommendations: ['Immediate hospitalization if severe', 'Platelet count monitoring', 'Adequate fluid intake'],
    prevalentIn: ['Delhi', 'Kerala', 'Tamil Nadu', 'Punjab', 'Haryana']
  },
  {
    name: 'Tuberculosis (TB)',
    description: 'Bacterial infection primarily affecting lungs, highly prevalent in India',
    severity: 'Severe',
    category: 'Infectious',
    commonSymptoms: ['persistent_cough', 'fever', 'night_sweats', 'weight_loss', 'chest_pain', 'fatigue'],
    recommendations: ['DOTS therapy', 'Sputum test', 'Chest X-ray', 'Complete isolation initially'],
    prevalentIn: ['All states', 'Higher in urban slums', 'Maharashtra', 'Uttar Pradesh']
  },
  {
    name: 'Typhoid',
    description: 'Bacterial infection caused by Salmonella typhi, common due to poor sanitation',
    severity: 'Moderate',
    category: 'Infectious',
    commonSymptoms: ['prolonged_fever', 'headache', 'abdominal_pain', 'diarrhea', 'rose_spots', 'weakness'],
    recommendations: ['Antibiotic treatment', 'Widal test', 'Complete rest', 'Proper hygiene'],
    prevalentIn: ['Bihar', 'West Bengal', 'Uttar Pradesh', 'Delhi', 'Rajasthan']
  },
  {
    name: 'Diabetes Mellitus',
    description: 'Metabolic disorder with high blood sugar levels, epidemic in India',
    severity: 'Moderate',
    category: 'Chronic',
    commonSymptoms: ['frequent_urination', 'excessive_thirst', 'unexplained_weight_loss', 'fatigue', 'blurred_vision'],
    recommendations: ['Blood sugar monitoring', 'Dietary changes', 'Regular exercise', 'Medication compliance'],
    prevalentIn: ['Kerala', 'Tamil Nadu', 'Punjab', 'Goa', 'Delhi']
  },
  {
    name: 'Hypertension',
    description: 'High blood pressure, silent killer affecting millions in India',
    severity: 'Moderate',
    category: 'Chronic',
    commonSymptoms: ['headache', 'dizziness', 'chest_pain', 'shortness_of_breath', 'nosebleeds'],
    recommendations: ['Regular BP monitoring', 'Low sodium diet', 'Weight management', 'Stress reduction'],
    prevalentIn: ['Kerala', 'Punjab', 'Tamil Nadu', 'Delhi', 'Maharashtra']
  },
  {
    name: 'Jaundice (Hepatitis)',
    description: 'Liver condition causing yellowing of skin and eyes',
    severity: 'Moderate',
    category: 'Infectious',
    commonSymptoms: ['yellow_skin', 'yellow_eyes', 'dark_urine', 'pale_stool', 'abdominal_pain', 'fatigue'],
    recommendations: ['Liver function tests', 'Rest and hydration', 'Avoid alcohol', 'Vaccination for Hepatitis B'],
    prevalentIn: ['West Bengal', 'Bihar', 'Assam', 'Uttar Pradesh', 'Delhi']
  },
  {
    name: 'Chikungunya',
    description: 'Viral disease transmitted by mosquitoes causing severe joint pain',
    severity: 'Moderate',
    category: 'Infectious',
    commonSymptoms: ['fever', 'severe_joint_pain', 'muscle_pain', 'headache', 'rash', 'fatigue'],
    recommendations: ['Pain management', 'Adequate rest', 'Physiotherapy', 'Mosquito control measures'],
    prevalentIn: ['Karnataka', 'Maharashtra', 'Rajasthan', 'Delhi', 'Andhra Pradesh']
  },
  {
    name: 'Gastroenteritis',
    description: 'Stomach flu causing inflammation of digestive tract',
    severity: 'Mild',
    category: 'Infectious',
    commonSymptoms: ['diarrhea', 'vomiting', 'abdominal_cramps', 'nausea', 'fever', 'dehydration'],
    recommendations: ['Oral rehydration therapy', 'BRAT diet', 'Avoid dairy products', 'Probiotics'],
    prevalentIn: ['All states during monsoon', 'Higher in areas with poor sanitation']
  },
  {
    name: 'Common Cold',
    description: 'Viral respiratory infection affecting upper respiratory tract',
    severity: 'Mild',
    category: 'Infectious',
    commonSymptoms: ['runny_nose', 'sneezing', 'cough', 'sore_throat', 'mild_fever', 'body_ache'],
    recommendations: ['Rest and fluids', 'Steam inhalation', 'Warm saltwater gargling', 'Vitamin C'],
    prevalentIn: ['All states', 'More common during winter months']
  }
];

// Comprehensive symptom database
const ALL_SYMPTOMS: Symptom[] = [
  { id: 'fever', name: 'Fever', category: 'General' },
  { id: 'high_fever', name: 'High Fever (>102°F)', category: 'General' },
  { id: 'prolonged_fever', name: 'Prolonged Fever', category: 'General' },
  { id: 'mild_fever', name: 'Mild Fever', category: 'General' },
  { id: 'chills', name: 'Chills', category: 'General' },
  { id: 'headache', name: 'Headache', category: 'Neurological' },
  { id: 'severe_headache', name: 'Severe Headache', category: 'Neurological' },
  { id: 'body_ache', name: 'Body Ache', category: 'Musculoskeletal' },
  { id: 'muscle_pain', name: 'Muscle Pain', category: 'Musculoskeletal' },
  { id: 'joint_pain', name: 'Joint Pain', category: 'Musculoskeletal' },
  { id: 'severe_joint_pain', name: 'Severe Joint Pain', category: 'Musculoskeletal' },
  { id: 'fatigue', name: 'Fatigue/Weakness', category: 'General' },
  { id: 'weakness', name: 'General Weakness', category: 'General' },
  { id: 'nausea', name: 'Nausea', category: 'Gastrointestinal' },
  { id: 'vomiting', name: 'Vomiting', category: 'Gastrointestinal' },
  { id: 'diarrhea', name: 'Diarrhea', category: 'Gastrointestinal' },
  { id: 'abdominal_pain', name: 'Abdominal Pain', category: 'Gastrointestinal' },
  { id: 'abdominal_cramps', name: 'Abdominal Cramps', category: 'Gastrointestinal' },
  { id: 'persistent_cough', name: 'Persistent Cough', category: 'Respiratory' },
  { id: 'cough', name: 'Cough', category: 'Respiratory' },
  { id: 'chest_pain', name: 'Chest Pain', category: 'Respiratory' },
  { id: 'shortness_of_breath', name: 'Shortness of Breath', category: 'Respiratory' },
  { id: 'sore_throat', name: 'Sore Throat', category: 'Respiratory' },
  { id: 'runny_nose', name: 'Runny Nose', category: 'Respiratory' },
  { id: 'sneezing', name: 'Sneezing', category: 'Respiratory' },
  { id: 'night_sweats', name: 'Night Sweats', category: 'General' },
  { id: 'weight_loss', name: 'Unexplained Weight Loss', category: 'General' },
  { id: 'unexplained_weight_loss', name: 'Unexplained Weight Loss', category: 'General' },
  { id: 'frequent_urination', name: 'Frequent Urination', category: 'Urological' },
  { id: 'excessive_thirst', name: 'Excessive Thirst', category: 'General' },
  { id: 'blurred_vision', name: 'Blurred Vision', category: 'Neurological' },
  { id: 'dizziness', name: 'Dizziness', category: 'Neurological' },
  { id: 'rash', name: 'Skin Rash', category: 'Dermatological' },
  { id: 'yellow_skin', name: 'Yellowing of Skin', category: 'Dermatological' },
  { id: 'yellow_eyes', name: 'Yellowing of Eyes', category: 'Dermatological' },
  { id: 'dark_urine', name: 'Dark Colored Urine', category: 'Urological' },
  { id: 'pale_stool', name: 'Pale Colored Stool', category: 'Gastrointestinal' },
  { id: 'rose_spots', name: 'Rose Colored Spots', category: 'Dermatological' },
  { id: 'dehydration', name: 'Signs of Dehydration', category: 'General' },
  { id: 'nosebleeds', name: 'Frequent Nosebleeds', category: 'General' }
];

const HEALTH_TIPS = [
  '🩺 Regular health checkups can prevent serious conditions',
  '💧 Stay hydrated - drink 8-10 glasses of water daily',
  '🦟 Use mosquito repellents during monsoon season',
  '🧼 Wash hands frequently to prevent infections',
  '🥗 Maintain a balanced diet rich in vitamins',
  '🏃‍♂️ Regular exercise boosts immunity naturally'
];

const severityColors = {
  Mild: '#10b981',
  Moderate: '#f59e0b', 
  Severe: '#ef4444',
  Chronic: '#8b5cf6'
};

export default function SymptomChecker() {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [predictedDiseases, setPredictedDiseases] = useState<Disease[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tip, setTip] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDisease, setSelectedDisease] = useState<Disease | null>(null);

  useEffect(() => {
    setTip(HEALTH_TIPS[Math.floor(Math.random() * HEALTH_TIPS.length)]);
  }, []);

  const categories = ['All', ...Array.from(new Set(ALL_SYMPTOMS.map(s => s.category)))];

  const filteredSymptoms = ALL_SYMPTOMS.filter(symptom => {
    const matchesCategory = activeCategory === 'All' || symptom.category === activeCategory;
    const matchesSearch = symptom.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleSymptom = (symptomId: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(symptomId) 
        ? prev.filter(id => id !== symptomId)
        : [...prev, symptomId]
    );
  };

  const predictDiseases = () => {
    if (selectedSymptoms.length === 0) {
      Alert.alert('Select Symptoms', 'Please select at least one symptom to get predictions.');
      return;
    }

    setLoading(true);

    // Simulate API call delay
    setTimeout(() => {
      const predictions = INDIAN_DISEASES
        .map(disease => {
          const matchingSymptoms = disease.commonSymptoms.filter(symptom => 
            selectedSymptoms.includes(symptom)
          );
          const matchPercentage = (matchingSymptoms.length / selectedSymptoms.length) * 100;
          
          return {
            ...disease,
            matchPercentage,
            matchingSymptoms
          };
        })
        .filter(disease => disease.matchPercentage > 30) // Show diseases with >30% match
        .sort((a, b) => b.matchPercentage - a.matchPercentage)
        .slice(0, 5); // Top 5 predictions

      setPredictedDiseases(predictions as Disease[]);
      setShowResults(true);
      setLoading(false);
    }, 1500);
  };

  const clearSelection = () => {
    setSelectedSymptoms([]);
    setPredictedDiseases([]);
    setShowResults(false);
  };

  const showDiseaseDetails = (disease: Disease) => {
    setSelectedDisease(disease);
    setShowDetailsModal(true);
  };

  return (
    <LinearGradient colors={['#F0F6FF', '#BFDBFE']} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
      
      {/* Header - Matching PrescriptionArchive design */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 50 : 60 }]}>
        <View style={styles.headerRow}>
          <View style={styles.symptomIconContainer}>
            <FontAwesome5 name="user-md" size={32} color="#ffffff" />
            <View style={styles.onlineIndicator} />
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.greetingLine}>AI Health Assistant</Text>
            <Text style={styles.userName}>Symptom Checker</Text>
          </View>

          <TouchableOpacity 
            style={styles.headerActionBtn} 
            onPress={clearSelection}
            activeOpacity={0.8}
          >
            <FontAwesome5 name="refresh" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tip Card - Matching design */}
      <View style={styles.tipCard}>
        <View style={styles.tipIconWrap}>
          <FontAwesome5 name="user-md" color="#f97316" size={24} />
        </View>
        <View style={styles.tipContent}>
          <Text style={styles.tipTitle}>Health Tip</Text>
          <Text style={styles.tipText}>{tip}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search symptoms..."
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
          />
        </View>

        {/* Category Filter */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContainer}
        >
          {categories.map(category => (
            <TouchableOpacity
              key={category}
              onPress={() => setActiveCategory(category)}
              style={[
                styles.categoryChip,
                activeCategory === category && styles.activeCategoryChip
              ]}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.categoryText,
                activeCategory === category && styles.activeCategoryText
              ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Selected Symptoms Count */}
        <View style={styles.selectionCount}>
          <Text style={styles.selectionText}>
            {selectedSymptoms.length} symptom(s) selected
          </Text>
          {selectedSymptoms.length > 0 && (
            <TouchableOpacity onPress={clearSelection} activeOpacity={0.8}>
              <Text style={styles.clearText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Symptoms Grid */}
        <View style={styles.symptomsGrid}>
          {filteredSymptoms.map((symptom, index) => (
            <Animatable.View 
              key={symptom.id}
              animation="fadeInUp"
              delay={index * 50}
              style={styles.symptomItemWrapper}
            >
              <TouchableOpacity
                onPress={() => toggleSymptom(symptom.id)}
                style={[
                  styles.symptomItem,
                  selectedSymptoms.includes(symptom.id) && styles.selectedSymptom
                ]}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.symptomText,
                  selectedSymptoms.includes(symptom.id) && styles.selectedSymptomText
                ]}>
                  {symptom.name}
                </Text>
                {selectedSymptoms.includes(symptom.id) && (
                  <FontAwesome5 name="check" size={16} color="#fff" style={styles.checkIcon} />
                )}
              </TouchableOpacity>
            </Animatable.View>
          ))}
        </View>

        {/* Check Button */}
        <TouchableOpacity
          onPress={predictDiseases}
          disabled={loading || selectedSymptoms.length === 0}
          style={[
            styles.checkButton,
            (loading || selectedSymptoms.length === 0) && styles.checkButtonDisabled
          ]}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <FontAwesome5 name="stethoscope" size={18} color="#fff" />
              <Text style={styles.checkButtonText}>Check Symptoms</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Results Section */}
        {showResults && predictedDiseases.length > 0 && (
          <Animatable.View animation="slideInUp" style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>Possible Conditions</Text>
            <Text style={styles.resultsSubtitle}>
              Based on selected symptoms. Please consult a doctor for proper diagnosis.
            </Text>

            {predictedDiseases.map((disease, index) => (
              <Animatable.View
                key={disease.name}
                animation="fadeInUp"
                delay={index * 100}
                style={styles.diseaseCard}
              >
                <TouchableOpacity
                  onPress={() => showDiseaseDetails(disease)}
                  activeOpacity={0.8}
                >
                  <View style={styles.diseaseHeader}>
                    <View style={styles.diseaseInfo}>
                      <Text style={styles.diseaseName}>{disease.name}</Text>
                      <View style={[
                        styles.severityBadge,
                        { backgroundColor: severityColors[disease.severity] }
                      ]}>
                        <Text style={styles.severityText}>{disease.severity}</Text>
                      </View>
                    </View>
                    <View style={styles.matchContainer}>
                      <Text style={styles.matchPercentage}>
                        {Math.round((disease as any).matchPercentage)}% match
                      </Text>
                      <FontAwesome5 name="chevron-right" size={12} color="#9CA3AF" />
                    </View>
                  </View>
                  
                  <Text style={styles.diseaseDescription} numberOfLines={2}>
                    {disease.description}
                  </Text>
                  
                  <Text style={styles.categoryLabel}>{disease.category} Disease</Text>
                </TouchableOpacity>
              </Animatable.View>
            ))}

            {/* Disclaimer */}
            <View style={styles.disclaimer}>
              <FontAwesome5 name="exclamation-triangle" size={16} color="#f59e0b" />
              <Text style={styles.disclaimerText}>
                This is for informational purposes only. Always consult qualified healthcare professionals for proper medical diagnosis and treatment.
              </Text>
            </View>
          </Animatable.View>
        )}
      </ScrollView>

      {/* Disease Details Modal */}
      <Modal visible={showDetailsModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedDisease && (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{selectedDisease.name}</Text>
                    <TouchableOpacity 
                      onPress={() => setShowDetailsModal(false)}
                      style={styles.closeButton}
                      activeOpacity={0.8}
                    >
                      <FontAwesome5 name="times" size={20} color="#64748B" />
                    </TouchableOpacity>
                  </View>

                  <View style={[
                    styles.modalSeverityBadge,
                    { backgroundColor: severityColors[selectedDisease.severity] }
                  ]}>
                    <Text style={styles.modalSeverityText}>{selectedDisease.severity}</Text>
                  </View>

                  <Text style={styles.modalDescription}>{selectedDisease.description}</Text>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Common Symptoms</Text>
                    <View style={styles.symptomsList}>
                      {selectedDisease.commonSymptoms.map(symptomId => {
                        const symptom = ALL_SYMPTOMS.find(s => s.id === symptomId);
                        return symptom ? (
                          <View key={symptomId} style={styles.modalSymptomItem}>
                            <FontAwesome5 name="circle" size={6} color="#2563EB" />
                            <Text style={styles.modalSymptomText}>{symptom.name}</Text>
                          </View>
                        ) : null;
                      })}
                    </View>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Recommendations</Text>
                    {selectedDisease.recommendations.map((rec, index) => (
                      <View key={index} style={styles.recommendationItem}>
                        <FontAwesome5 name="check-circle" size={16} color="#10b981" />
                        <Text style={styles.recommendationText}>{rec}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Prevalent Areas</Text>
                    <Text style={styles.prevalentText}>
                      {selectedDisease.prevalentIn.join(', ')}
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

/* ────────────────────────────────────────── */
/*                   Styles                   */
/* ────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header - Copied from PrescriptionArchive
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
  symptomIconContainer: { 
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

  // Tip Card - Copied from PrescriptionArchive
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

  content: { flex: 1 },

  // Search
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

  // Categories
  categoryScroll: { marginBottom: 15 },
  categoryContainer: {
    paddingHorizontal: 20,
    paddingRight: 40,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2563EB',
    backgroundColor: 'rgba(255,255,255,0.9)',
    marginRight: 8,
  },
  activeCategoryChip: { backgroundColor: '#2563EB' },
  categoryText: { color: '#2563EB', fontWeight: '600', fontSize: 14 },
  activeCategoryText: { color: '#fff' },

  // Selection count
  selectionCount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  selectionText: { fontSize: 16, color: '#64748B', fontWeight: '500' },
  clearText: { color: '#ef4444', fontSize: 14, fontWeight: '600' },

  // Symptoms grid
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  symptomItemWrapper: { width: '50%', padding: 5 },
  symptomItem: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 50,
    justifyContent: 'center',
    position: 'relative',
  },
  selectedSymptom: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  symptomText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    textAlign: 'center',
  },
  selectedSymptomText: { color: '#fff' },
  checkIcon: {
    position: 'absolute',
    top: 4,
    right: 8,
  },

  // Check button
  checkButton: {
    flexDirection: 'row',
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 30,
    elevation: 8,
    shadowColor: '#2563EB',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  checkButtonDisabled: { opacity: 0.5 },
  checkButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },

  // Results
  resultsSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 8,
  },
  resultsSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
    lineHeight: 20,
  },

  // Disease cards
  diseaseCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.1)',
    elevation: 3,
    shadowColor: '#2563EB',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  diseaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  diseaseInfo: {
    flex: 1,
    marginRight: 10,
  },
  diseaseName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 6,
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
  matchContainer: { alignItems: 'flex-end' },
  matchPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
    marginBottom: 4,
  },
  diseaseDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  // Disclaimer
  disclaimer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  disclaimerText: {
    fontSize: 14,
    color: '#92400e',
    flex: 1,
    marginLeft: 12,
    lineHeight: 20,
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E3A8A',
    flex: 1,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  modalSeverityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
  },
  modalSeverityText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  modalDescription: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 24,
    marginBottom: 24,
  },
  modalSection: { marginBottom: 24 },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2563EB',
    marginBottom: 12,
  },
  symptomsList: { gap: 8 },
  modalSymptomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  modalSymptomText: {
    fontSize: 15,
    color: '#374151',
    marginLeft: 12,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
    marginLeft: 12,
    lineHeight: 22,
  },
  prevalentText: {
    fontSize: 15,
    color: '#64748B',
    lineHeight: 22,
  },
});
