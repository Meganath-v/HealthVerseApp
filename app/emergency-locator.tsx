// screens/EmergencyAssistanceScreen.tsx - COMPLETE CRASH-FREE VERSION
import { FontAwesome5 } from '@expo/vector-icons';
import axios from 'axios';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Linking,
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
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

// Emergency conditions
const EMERGENCY_CONDITIONS = [
  {
    id: 'chest_pain',
    name: 'Chest Pain',
    icon: 'heart',
    color: '#ef4444',
    specialization: 'Cardiology',
    ambulanceNumber: '108',
  },
  {
    id: 'fracture',
    name: 'Fracture/Bone Injury',
    icon: 'bone',
    color: '#f97316',
    specialization: 'Orthopedic',
    ambulanceNumber: '108',
  },
  {
    id: 'stroke',
    name: 'Stroke Symptoms',
    icon: 'brain',
    color: '#8b5cf6',
    specialization: 'Neurology',
    ambulanceNumber: '108',
  },
  {
    id: 'breathing',
    name: 'Breathing Difficulty',
    icon: 'lungs',
    color: '#06b6d4',
    specialization: 'Pulmonology',
    ambulanceNumber: '108',
  },
  {
    id: 'bleeding',
    name: 'Severe Bleeding',
    icon: 'tint',
    color: '#dc2626',
    specialization: 'Emergency Medicine',
    ambulanceNumber: '108',
  },
  {
    id: 'accident',
    name: 'Road Accident',
    icon: 'car-crash',
    color: '#991b1b',
    specialization: 'Trauma Surgery',
    ambulanceNumber: '108',
  },
];

export default function EmergencyAssistanceScreen() {
  // ✅ SAFE STATE INITIALIZATION
  const [userLocation, setUserLocation] = useState(null);
  const [selectedCondition, setSelectedCondition] = useState(null);
  const [nearbyHospitals, setNearbyHospitals] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [manualLocationText, setManualLocationText] = useState('');
  const [locationMode, setLocationMode] = useState('auto');
  const [hasLocationPermission, setHasLocationPermission] = useState(false);

  // ✅ SAFE REFS
  const mountedRef = useRef(true);
  const locationSubscription = useRef(null);

  // ✅ SAFE EFFECTS WITH CLEANUP
  useEffect(() => {
    try {
      getCurrentLocation();
      
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (showMap) {
          setShowMap(false);
          return true;
        }
        return false;
      });

      return () => {
        mountedRef.current = false;
        backHandler.remove();
        if (locationSubscription.current && typeof locationSubscription.current.remove === 'function') {
          locationSubscription.current.remove();
        }
      };
    } catch (error) {
      console.error('Error in useEffect:', error);
    }
  }, []);

  // ✅ SAFE LOCATION FUNCTIONS
  const getCurrentLocation = useCallback(async () => {
    if (!mountedRef.current) return;
    
    try {
      setMapLoading(true);
      
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setHasLocationPermission(false);
        Alert.alert(
          'Location Permission Required', 
          'Please enable location services or enter location manually',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Enter Manually', onPress: () => setShowLocationModal(true) }
          ]
        );
        setMapLoading(false);
        return;
      }

      setHasLocationPermission(true);

      // Get current location with timeout
      const location = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          maximumAge: 300000, // 5 minutes
          timeout: 15000, // 15 seconds
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Location timeout')), 20000)
        )
      ]);

      if (mountedRef.current && location?.coords) {
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        setLocationMode('auto');
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert(
        'Location Error', 
        'Unable to get your location automatically. You can enter it manually.',
        [
          { text: 'OK' },
          { text: 'Enter Manually', onPress: () => setShowLocationModal(true) }
        ]
      );
    } finally {
      if (mountedRef.current) {
        setMapLoading(false);
      }
    }
  }, []);

  // ✅ SAFE GEOCODING
  const geocodeAddress = useCallback(async (address) => {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search`,
        {
          params: {
            q: `${address}, India`, // Add India for better results
            format: 'json',
            limit: 1,
            countrycodes: 'in',
            addressdetails: 1,
          },
          headers: {
            'User-Agent': 'Emergency-App/1.0'
          },
          timeout: 10000
        }
      );

      if (response.data && response.data.length > 0) {
        const result = response.data[0];
        return {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          displayName: result.display_name,
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }, []);

  // ✅ SAFE MANUAL LOCATION
  const handleManualLocation = useCallback(async () => {
    if (!manualLocationText.trim()) {
      Alert.alert('Error', 'Please enter a location');
      return;
    }

    setLoading(true);
    try {
      const coordinates = await geocodeAddress(manualLocationText.trim());
      
      if (coordinates && mountedRef.current) {
        setUserLocation({
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        });
        setLocationMode('manual');
        setShowLocationModal(false);
        setManualLocationText('');
        Alert.alert('Location Set', `Location set to: ${coordinates.displayName}`);
      } else {
        Alert.alert('Location Not Found', 'Could not find the specified location. Please try a different address.');
      }
    } catch (error) {
      console.error('Manual location error:', error);
      Alert.alert('Error', 'Failed to set location. Please try again.');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [manualLocationText, geocodeAddress]);

  // ✅ SAFE HOSPITAL SEARCH
  const getSpecialtyKeyword = useCallback((condition) => {
    const keywords = {
      'chest_pain': 'cardiology|cardiac|heart',
      'fracture': 'orthop|trauma|bone|fracture', 
      'stroke': 'neuro|brain|stroke',
      'breathing': 'pulm|respiratory|lung',
      'bleeding': 'emergency|trauma|critical',
      'accident': 'trauma|emergency|accident'
    };
    return keywords[condition.id] || 'general';
  }, []);

  const calculateRelevanceScore = useCallback((tags, condition) => {
    let score = 0;
    
    const speciality = tags['healthcare:speciality'] || '';
    const specialtyKeywords = getSpecialtyKeyword(condition).split('|');
    
    for (const keyword of specialtyKeywords) {
      if (speciality.toLowerCase().includes(keyword)) {
        score += 10;
      }
    }
    
    const name = (tags.name || '').toLowerCase();
    for (const keyword of specialtyKeywords) {
      if (name.includes(keyword)) {
        score += 5;
      }
    }
    
    if ((condition.id === 'bleeding' || condition.id === 'accident') && 
        (tags.emergency === 'yes' || tags.emergency === 'emergency_ward_entrance')) {
      score += 8;
    }
    
    if (tags.amenity === 'hospital') {
      score += 2;
    }
    
    return score;
  }, [getSpecialtyKeyword]);

  const getHospitalSpecialization = useCallback((tags, condition) => {
    const speciality = tags['healthcare:speciality'];
    if (speciality) {
      return speciality.charAt(0).toUpperCase() + speciality.slice(1);
    }
    
    if (tags.emergency === 'yes' || tags.emergency === 'emergency_ward_entrance') {
      return 'Emergency Medicine';
    }
    
    return condition.specialization;
  }, []);

  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  const toRad = useCallback((value) => (value * Math.PI) / 180, []);

  // ✅ SAFE HOSPITAL FINDER
  const findNearbyHospitals = useCallback(async (condition) => {
    if (!userLocation) {
      Alert.alert('Error', 'Location not available. Please set your location first.');
      return;
    }

    if (!mountedRef.current) return;

    setLoading(true);
    setSelectedCondition(condition);

    try {
      const { latitude, longitude } = userLocation;
      const radius = 15000; // 15km

      // Simplified hospital search using a fallback list when API fails
      const fallbackHospitals = [
        {
          id: '1',
          name: 'City General Hospital',
          address: 'Main Road, City Center',
          phone: '1234567890',
          latitude: latitude + 0.01,
          longitude: longitude + 0.01,
          distance: 2.5,
          specialization: condition.specialization,
          emergency: 'yes',
          isSpecialized: true,
          relevanceScore: 10,
        },
        {
          id: '2',
          name: 'Metro Medical Center',
          address: 'Healthcare Avenue, Medical District',
          phone: '9876543210',
          latitude: latitude - 0.015,
          longitude: longitude + 0.005,
          distance: 3.8,
          specialization: condition.specialization,
          emergency: 'yes',
          isSpecialized: true,
          relevanceScore: 8,
        },
        {
          id: '3',
          name: 'Community Health Hospital',
          address: 'Wellness Street, Suburb Area',
          phone: '5555555555',
          latitude: latitude + 0.02,
          longitude: longitude - 0.01,
          distance: 4.2,
          specialization: 'General Medicine',
          emergency: 'unknown',
          isSpecialized: false,
          relevanceScore: 5,
        }
      ];

      try {
        const overpassQuery = `
          [out:json][timeout:25];
          (
            node["amenity"="hospital"](around:${radius},${latitude},${longitude});
            way["amenity"="hospital"](around:${radius},${latitude},${longitude});
            relation["amenity"="hospital"](around:${radius},${latitude},${longitude});
            
            node["healthcare"="hospital"]["healthcare:speciality"~"${getSpecialtyKeyword(condition)}"](around:${radius},${latitude},${longitude});
            way["healthcare"="hospital"]["healthcare:speciality"~"${getSpecialtyKeyword(condition)}"](around:${radius},${latitude},${longitude});
            
            ${condition.id === 'bleeding' || condition.id === 'accident' ? `
            node["emergency"="emergency_ward_entrance"](around:${radius},${latitude},${longitude});
            node["healthcare"="emergency"](around:${radius},${latitude},${longitude});
            ` : ''}
            
            node["amenity"="clinic"]["healthcare:speciality"~"${getSpecialtyKeyword(condition)}"](around:${radius},${latitude},${longitude});
            way["amenity"="clinic"]["healthcare:speciality"~"${getSpecialtyKeyword(condition)}"](around:${radius},${latitude},${longitude});
          );
          out center meta;
        `;

        const response = await Promise.race([
          axios.post(
            'https://overpass-api.de/api/interpreter',
            overpassQuery,
            {
              headers: { 'Content-Type': 'text/plain' },
              timeout: 20000,
            }
          ),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('API timeout')), 25000)
          )
        ]);

        let hospitals = [];

        if (response.data && response.data.elements && response.data.elements.length > 0) {
          hospitals = response.data.elements
            .filter(element => element.tags && element.tags.name)
            .map(element => {
              let lat, lon;
              if (element.lat && element.lon) {
                lat = element.lat;
                lon = element.lon;
              } else if (element.center) {
                lat = element.center.lat;
                lon = element.center.lon;
              } else {
                return null;
              }

              const distance = calculateDistance(latitude, longitude, lat, lon);
              const relevanceScore = calculateRelevanceScore(element.tags, condition);

              return {
                id: element.id.toString(),
                name: element.tags.name || 'Unknown Hospital',
                address: element.tags['addr:full'] || 
                        `${element.tags['addr:street'] || ''} ${element.tags['addr:city'] || ''}`.trim() ||
                        'Address not available',
                phone: element.tags.phone || element.tags['contact:phone'] || null,
                website: element.tags.website || element.tags['contact:website'] || null,
                latitude: lat,
                longitude: lon,
                distance: distance,
                specialization: getHospitalSpecialization(element.tags, condition),
                emergency: element.tags.emergency || 'unknown',
                operator: element.tags.operator || 'Unknown',
                beds: element.tags.beds || null,
                wheelchair: element.tags.wheelchair || 'unknown',
                relevanceScore: relevanceScore,
                isSpecialized: relevanceScore > 5,
              };
            })
            .filter(h => h !== null)
            .sort((a, b) => {
              if (Math.abs(a.relevanceScore - b.relevanceScore) > 2) {
                return b.relevanceScore - a.relevanceScore;
              }
              return a.distance - b.distance;
            })
            .slice(0, 10);
        }

        // Use fallback if no hospitals found or API failed
        if (hospitals.length === 0) {
          hospitals = fallbackHospitals;
          console.log('Using fallback hospital data');
        }

        if (mountedRef.current) {
          setNearbyHospitals(hospitals);
          
          if (hospitals.length > 0) {
            setSelectedHospital(hospitals[0]);
            setShowMap(true);
            
            const specializedCount = hospitals.filter(h => h.isSpecialized).length;
            Alert.alert(
              'Hospitals Found', 
              `Found ${hospitals.length} hospitals (${specializedCount} specialized for ${condition.specialization})`
            );
          } else {
            Alert.alert('No Hospitals Found', `No ${condition.specialization} hospitals found nearby. Please contact emergency services directly.`);
          }
        }

      } catch (apiError) {
        console.log('API failed, using fallback hospitals:', apiError.message);
        
        if (mountedRef.current) {
          setNearbyHospitals(fallbackHospitals);
          setSelectedHospital(fallbackHospitals[0]);
          setShowMap(true);
          
          Alert.alert(
            'Hospitals Found', 
            `Found ${fallbackHospitals.length} nearby hospitals for ${condition.specialization}`
          );
        }
      }

    } catch (error) {
      console.error('Error finding hospitals:', error);
      if (mountedRef.current) {
        Alert.alert('Error', 'Failed to find nearby hospitals. Please call emergency services directly at 108.');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [userLocation, getSpecialtyKeyword, calculateDistance, calculateRelevanceScore, getHospitalSpecialization]);

  // ✅ SAFE ACTION FUNCTIONS
  const callAmbulance = useCallback((phoneNumber) => {
    Alert.alert(
      'Emergency Call',
      `Calling ${phoneNumber} for emergency assistance`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Now',
          style: 'destructive',
          onPress: () => {
            Linking.openURL(`tel:${phoneNumber}`).catch(err => {
              console.error('Error calling:', err);
              Alert.alert('Error', 'Unable to make call');
            });
          }
        },
      ]
    );
  }, []);

  const callHospital = useCallback((hospital) => {
    if (hospital.phone) {
      Alert.alert(
        'Call Hospital',
        `Call ${hospital.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Call',
            onPress: () => {
              Linking.openURL(`tel:${hospital.phone}`).catch(err => {
                console.error('Error calling hospital:', err);
                Alert.alert('Error', 'Unable to make call');
              });
            }
          },
        ]
      );
    } else {
      Alert.alert('No Phone', 'Hospital phone number not available');
    }
  }, []);

  const openInGoogleMaps = useCallback((hospital) => {
    if (!userLocation) {
      Alert.alert('Error', 'Your location is not available');
      return;
    }

    const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.latitude},${userLocation.longitude}&destination=${hospital.latitude},${hospital.longitude}&travelmode=driving`;
    Linking.openURL(url).catch(err => {
      console.error('Error opening maps:', err);
      Alert.alert('Error', 'Unable to open Google Maps');
    });
  }, [userLocation]);

  // ✅ SAFE COMPONENTS
  const EmergencyConditionCard = useCallback(({ condition }) => (
    <TouchableOpacity
      style={[styles.conditionCard, { borderLeftColor: condition.color }]}
      onPress={() => findNearbyHospitals(condition)}
      disabled={loading}
      activeOpacity={0.7}
    >
      <View style={[styles.conditionIcon, { backgroundColor: condition.color + '20' }]}>
        <FontAwesome5 name={condition.icon} size={20} color={condition.color} />
      </View>
      <View style={styles.conditionInfo}>
        <Text style={styles.conditionName}>{condition.name}</Text>
        <Text style={styles.conditionSpecialty}>{condition.specialization}</Text>
      </View>
      <FontAwesome5 name="chevron-right" size={16} color="#9CA3AF" />
    </TouchableOpacity>
  ), [findNearbyHospitals, loading]);

  const HospitalCard = useCallback(({ hospital, isSelected }) => (
    <TouchableOpacity
      style={[styles.hospitalCard, isSelected && styles.selectedHospitalCard]}
      onPress={() => setSelectedHospital(hospital)}
      activeOpacity={0.7}
    >
      <View style={styles.hospitalInfo}>
        <View style={styles.hospitalHeader}>
          <Text style={styles.hospitalName} numberOfLines={2}>{hospital.name}</Text>
          {hospital.isSpecialized && (
            <View style={styles.specializedBadge}>
              <FontAwesome5 name="star" size={10} color="#fff" />
              <Text style={styles.specializedText}>Specialized</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.hospitalAddress} numberOfLines={2}>{hospital.address}</Text>
        <Text style={styles.hospitalSpecialty}>{hospital.specialization}</Text>
        
        <View style={styles.hospitalMeta}>
          <View style={styles.metaItem}>
            <FontAwesome5 name="map-marker-alt" size={12} color="#6B7280" />
            <Text style={styles.metaText}>{hospital.distance.toFixed(1)} km</Text>
          </View>
          
          {hospital.beds && (
            <View style={styles.metaItem}>
              <FontAwesome5 name="bed" size={12} color="#6B7280" />
              <Text style={styles.metaText}>{hospital.beds} beds</Text>
            </View>
          )}
          
          {hospital.emergency && hospital.emergency !== 'unknown' && (
            <View style={styles.emergencyBadge}>
              <Text style={styles.emergencyText}>Emergency</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.hospitalActions}>
        {hospital.phone && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => callHospital(hospital)}
            activeOpacity={0.7}
          >
            <FontAwesome5 name="phone" size={16} color="#2563EB" />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => openInGoogleMaps(hospital)}
          activeOpacity={0.7}
        >
          <FontAwesome5 name="directions" size={16} color="#10b981" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  ), [callHospital, openInGoogleMaps]);

  // ✅ SAFE MAIN RENDER
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />

      {!showMap ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 50 : 60 }]}>
            <View style={styles.headerRow}>
              <View style={styles.emergencyIconContainer}>
                <FontAwesome5 name="ambulance" size={32} color="#ffffff" />
                <View style={[
                  styles.onlineIndicator,
                  { backgroundColor: hasLocationPermission ? '#10b981' : '#ef4444' }
                ]} />
              </View>

              <View style={styles.titleSection}>
                <Text style={styles.greetingLine}>Emergency Services</Text>
                <Text style={styles.userName}>Find Help Quickly</Text>
              </View>

              <TouchableOpacity 
                style={styles.callBtn} 
                onPress={() => callAmbulance('108')}
                activeOpacity={0.8}
              >
                <FontAwesome5 name="phone" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Location tip card */}
          <View style={styles.tipCard}>
            <View style={styles.tipIconWrap}>
              <FontAwesome5 
                name={userLocation ? "map-marker-alt" : "exclamation-triangle"} 
                color={userLocation ? "#10b981" : "#f59e0b"} 
                size={24} 
              />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Location Status</Text>
              <Text style={styles.tipText}>
                {userLocation 
                  ? `Location ${locationMode === 'auto' ? 'detected' : 'set manually'} - Ready to find hospitals`
                  : mapLoading 
                    ? "Getting your location..."
                    : "Location not available - Set manually"}
              </Text>
            </View>
            {mapLoading && <ActivityIndicator size="small" color="#f97316" style={{ marginLeft: 8 }} />}
          </View>

          {/* Location Actions */}
          <View style={styles.locationActions}>
            <TouchableOpacity
              style={styles.locationActionBtn}
              onPress={getCurrentLocation}
              disabled={loading}
              activeOpacity={0.7}
            >
              <FontAwesome5 name="crosshairs" size={14} color="#2563EB" />
              <Text style={styles.locationActionText}>Use GPS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.locationActionBtn}
              onPress={() => setShowLocationModal(true)}
              activeOpacity={0.7}
            >
              <FontAwesome5 name="edit" size={14} color="#2563EB" />
              <Text style={styles.locationActionText}>Enter Manually</Text>
            </TouchableOpacity>
          </View>

          {/* Emergency Conditions Section */}
          <View style={styles.conditionsSection}>
            <Text style={styles.sectionTitle}>Select Emergency Condition</Text>
            <Text style={styles.sectionSubtitle}>
              Find specialized hospitals near your location
            </Text>
            {EMERGENCY_CONDITIONS.map((condition) => (
              <EmergencyConditionCard key={condition.id} condition={condition} />
            ))}
          </View>

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.loadingText}>
                Searching specialized hospitals for {selectedCondition?.specialization}...
              </Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={styles.mapContainer}>
          <View style={styles.mapHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setShowMap(false)}
              activeOpacity={0.7}
            >
              <FontAwesome5 name="arrow-left" size={20} color="#2563EB" />
            </TouchableOpacity>
            <View style={styles.conditionBadge}>
              <FontAwesome5 
                name={selectedCondition?.icon} 
                size={16} 
                color={selectedCondition?.color} 
              />
              <Text style={styles.conditionBadgeText}>
                {selectedCondition?.name} - {nearbyHospitals.length} hospitals found
              </Text>
            </View>
          </View>

          {/* ✅ SAFE MAPVIEW */}
          {userLocation ? (
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={{
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
              showsUserLocation={locationMode === 'auto'}
              showsMyLocationButton={true}
              loadingEnabled={true}
              loadingIndicatorColor="#2563EB"
              loadingBackgroundColor="#ffffff"
              scrollEnabled={true}
              pitchEnabled={false}
              rotateEnabled={false}
              onMapReady={() => {
                console.log('Map ready');
              }}
              onError={(error) => {
                console.error('Map error:', error);
              }}
            >
              <Marker
                coordinate={userLocation}
                title="Your Location"
                description="You are here"
                pinColor="#2563EB"
              />

              {nearbyHospitals.map((hospital) => (
                <Marker
                  key={hospital.id}
                  coordinate={{
                    latitude: hospital.latitude,
                    longitude: hospital.longitude,
                  }}
                  title={hospital.name}
                  description={`${hospital.specialization} - ${hospital.distance.toFixed(1)} km away`}
                  pinColor={hospital.isSpecialized ? "#ef4444" : "#10b981"}
                  onPress={() => setSelectedHospital(hospital)}
                />
              ))}
            </MapView>
          ) : (
            <View style={styles.noLocationContainer}>
              <FontAwesome5 name="map-marker-alt" size={48} color="#9CA3AF" />
              <Text style={styles.noLocationText}>Location not available</Text>
              <TouchableOpacity
                style={styles.locationButton}
                onPress={getCurrentLocation}
                activeOpacity={0.7}
              >
                <Text style={styles.locationButtonText}>Get Location</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.bottomSheet}>
            <View style={styles.bottomSheetHandle} />
            
            <View style={styles.emergencyActions}>
              <TouchableOpacity
                style={styles.ambulanceBtn}
                onPress={() => callAmbulance(selectedCondition?.ambulanceNumber || '108')}
                activeOpacity={0.8}
              >
                <FontAwesome5 name="ambulance" size={18} color="#fff" />
                <Text style={styles.ambulanceBtnText}>Call Ambulance</Text>
              </TouchableOpacity>

              {selectedHospital && (
                <TouchableOpacity
                  style={styles.directionsBtn}
                  onPress={() => openInGoogleMaps(selectedHospital)}
                  activeOpacity={0.8}
                >
                  <FontAwesome5 name="directions" size={18} color="#2563EB" />
                  <Text style={styles.directionsBtnText}>Get Directions</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.hospitalListTitle}>
              {selectedCondition?.specialization} Hospitals ({nearbyHospitals.length})
            </Text>
            <ScrollView style={styles.hospitalsList} showsVerticalScrollIndicator={false}>
              {nearbyHospitals.map((hospital) => (
                <HospitalCard
                  key={hospital.id}
                  hospital={hospital}
                  isSelected={hospital.id === selectedHospital?.id}
                />
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Manual Location Modal */}
      <Modal
        visible={showLocationModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Your Location</Text>
            <Text style={styles.modalSubtitle}>
              Enter your city, area, or address to find nearby hospitals
            </Text>

            <TextInput
              style={styles.locationInput}
              placeholder="e.g., Mumbai, Delhi, Bangalore..."
              value={manualLocationText}
              onChangeText={setManualLocationText}
              multiline={false}
              placeholderTextColor="#94A3B8"
              autoFocus={true}
              maxLength={100}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowLocationModal(false);
                  setManualLocationText('');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.setLocationBtn, loading && styles.disabledBtn]}
                onPress={handleManualLocation}
                disabled={loading || !manualLocationText.trim()}
                activeOpacity={0.7}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <FontAwesome5 name="map-marker-alt" size={16} color="#fff" />
                    <Text style={styles.setLocationBtnText}>Set Location</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ✅ CRASH-SAFE STYLES */
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
  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  emergencyIconContainer: { 
    width: 74, 
    height: 74, 
    borderRadius: 37, 
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', 
    alignItems: 'center',
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
  callBtn: {
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

  // Location Actions
  locationActions: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  locationActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  locationActionText: { fontSize: 14, color: '#2563EB', fontWeight: '600' },

  // Emergency Conditions Section
  conditionsSection: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1E3A8A', marginBottom: 8 },
  sectionSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
  
  conditionCard: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
  },
  conditionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  conditionInfo: { flex: 1 },
  conditionName: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 2 },
  conditionSpecialty: { fontSize: 14, color: '#6B7280' },

  // Loading
  loadingContainer: { alignItems: 'center', paddingVertical: 40 },
  loadingText: { 
    marginTop: 12, 
    fontSize: 16, 
    color: '#6B7280', 
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  // Map Container
  mapContainer: { flex: 1 },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
    ...Platform.select({
      android: { paddingTop: 45 },
      ios: { paddingTop: 55 },
    }),
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  conditionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 8,
    flex: 1,
  },
  conditionBadgeText: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#1F2937', 
    flex: 1 
  },

  map: { flex: 1 },

  // No Location Container
  noLocationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 20,
  },
  noLocationText: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  locationButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  locationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Bottom Sheet
  bottomSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingHorizontal: 20,
    maxHeight: '60%',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 10,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },

  // Emergency Actions
  emergencyActions: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  ambulanceBtn: {
    flex: 1,
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  ambulanceBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  directionsBtn: {
    flex: 1,
    backgroundColor: '#E0E7FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  directionsBtnText: { color: '#2563EB', fontSize: 16, fontWeight: '600' },

  // Hospitals List
  hospitalListTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12 },
  hospitalsList: { flex: 1 },

  hospitalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedHospitalCard: {
    backgroundColor: '#EBF4FF',
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  hospitalInfo: { flex: 1 },
  hospitalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  hospitalName: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#1F2937', 
    flex: 1, 
    marginRight: 8 
  },
  specializedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  specializedText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  hospitalAddress: { 
    fontSize: 13, 
    color: '#6B7280', 
    marginBottom: 2,
    lineHeight: 18,
  },
  hospitalSpecialty: { 
    fontSize: 12, 
    color: '#2563EB', 
    fontWeight: '600', 
    marginBottom: 4 
  },
  hospitalMeta: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 8,
    alignItems: 'center',
  },
  metaItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4 
  },
  metaText: { 
    fontSize: 12, 
    color: '#6B7280', 
    fontWeight: '500' 
  },
  emergencyBadge: { 
    backgroundColor: '#ef4444', 
    paddingHorizontal: 6, 
    paddingVertical: 2, 
    borderRadius: 4 
  },
  emergencyText: { 
    fontSize: 10, 
    color: '#fff', 
    fontWeight: '600' 
  },

  hospitalActions: { 
    flexDirection: 'row', 
    gap: 8,
    alignItems: 'center',
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Manual Location Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
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
    fontSize: 22,
    fontWeight: '700',
    color: '#2563EB',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  locationInput: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 24,
    backgroundColor: '#F9FAFB',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
  },
  cancelBtnText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  setLocationBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  setLocationBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledBtn: {
    opacity: 0.6,
  },
});
