import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp,
  Timestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';

// Firestore collections
const USER_LOCATIONS_COLLECTION = 'userLocations';

// User location interface for Firestore
interface UserLocationData {
  userId: string;
  displayName: string;
  photoURL?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  lastUpdated: Timestamp;
  isLocationEnabled: boolean;
  isVisible: boolean; // Whether user wants to be visible to friends
}

// Friend location interface for the app
export interface FriendLocation {
  userId: string;
  displayName: string;
  photoURL?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  lastUpdated: Date;
  isOnline: boolean;
}

/**
 * Update user's current location
 */
export async function updateUserLocation(
  userId: string,
  displayName: string,
  photoURL: string | undefined,
  latitude: number,
  longitude: number,
  accuracy?: number,
  isVisible: boolean = true
): Promise<void> {
  try {
    const locationData: UserLocationData = {
      userId,
      displayName,
      photoURL,
      latitude,
      longitude,
      accuracy,
      lastUpdated: serverTimestamp() as Timestamp,
      isLocationEnabled: true,
      isVisible
    };
    
    const docRef = doc(db, USER_LOCATIONS_COLLECTION, userId);
    await setDoc(docRef, locationData, { merge: true });
  } catch (error) {
    console.error('Error updating user location:', error);
    throw error;
  }
}

/**
 * Disable location sharing for user
 */
export async function disableUserLocation(userId: string): Promise<void> {
  try {
    const docRef = doc(db, USER_LOCATIONS_COLLECTION, userId);
    
    // Check if document exists before updating
    const locationsRef = collection(db, USER_LOCATIONS_COLLECTION);
    const existingQuery = query(locationsRef, where('userId', '==', userId));
    const existingSnapshot = await getDocs(existingQuery);
    
    if (!existingSnapshot.empty) {
      // Document exists, update it
      await updateDoc(docRef, {
        isLocationEnabled: false,
        isVisible: false,
        lastUpdated: serverTimestamp()
      });
    }
    // If document doesn't exist, that's fine - user location is already disabled
  } catch (error) {
    console.error('Error disabling user location:', error);
    // Don't throw error - this is not critical
  }
}

/**
 * Toggle location visibility (user can still share but choose to be invisible)
 */
export async function toggleLocationVisibility(
  userId: string,
  isVisible: boolean
): Promise<void> {
  try {
    // Check if document exists before updating
    const locationsRef = collection(db, USER_LOCATIONS_COLLECTION);
    const existingQuery = query(locationsRef, where('userId', '==', userId));
    const existingSnapshot = await getDocs(existingQuery);
    
    if (!existingSnapshot.empty) {
      // Document exists, update it
      const docRef = doc(db, USER_LOCATIONS_COLLECTION, userId);
      await updateDoc(docRef, {
        isVisible,
        lastUpdated: serverTimestamp()
      });
    } else if (isVisible) {
      // If user wants to be visible but no document exists, we can't do much
      // The location will be created when they enable location sharing
      console.log('Cannot set visibility - location sharing not enabled');
    }
  } catch (error) {
    console.error('Error toggling location visibility:', error);
    // Don't throw error - this is not critical
  }
}

/**
 * Get locations of user's friends
 */
export async function getFriendsLocations(friendIds: string[]): Promise<FriendLocation[]> {
  if (friendIds.length === 0) return [];
  
  try {
    const locationsRef = collection(db, USER_LOCATIONS_COLLECTION);
    const locationsQuery = query(
      locationsRef,
      where('userId', 'in', friendIds),
      where('isLocationEnabled', '==', true),
      where('isVisible', '==', true)
    );
    
    const snapshot = await getDocs(locationsQuery);
    const friendsLocations: FriendLocation[] = [];
    
    // Consider a friend online if their location was updated within the last 5 minutes
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    
    snapshot.forEach((doc) => {
      const data = doc.data() as UserLocationData;
      const lastUpdated = data.lastUpdated ? data.lastUpdated.toDate() : new Date(0);
      const isOnline = lastUpdated.getTime() > fiveMinutesAgo;
      
      friendsLocations.push({
        userId: data.userId,
        displayName: data.displayName,
        photoURL: data.photoURL,
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy,
        lastUpdated,
        isOnline
      });
    });
    
    return friendsLocations;
  } catch (error) {
    console.error('Error getting friends locations:', error);
    throw error;
  }
}

/**
 * Listen to friends' location updates in real-time
 */
export function listenToFriendsLocations(
  friendIds: string[],
  callback: (locations: FriendLocation[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (friendIds.length === 0) {
    callback([]);
    return () => {};
  }
  
  const locationsRef = collection(db, USER_LOCATIONS_COLLECTION);
  const locationsQuery = query(
    locationsRef,
    where('userId', 'in', friendIds.slice(0, 10)), // Firestore 'in' query limit is 10
    where('isLocationEnabled', '==', true),
    where('isVisible', '==', true)
  );
  
  const unsubscribe = onSnapshot(
    locationsQuery,
    (snapshot) => {
      try {
        const friendsLocations: FriendLocation[] = [];
        
        // Consider a friend online if their location was updated within the last 5 minutes
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        
        snapshot.forEach((doc) => {
          const data = doc.data() as UserLocationData;
          const lastUpdated = data.lastUpdated ? data.lastUpdated.toDate() : new Date(0);
          const isOnline = lastUpdated.getTime() > fiveMinutesAgo;
          
          friendsLocations.push({
            userId: data.userId,
            displayName: data.displayName,
            photoURL: data.photoURL,
            latitude: data.latitude,
            longitude: data.longitude,
            accuracy: data.accuracy,
            lastUpdated,
            isOnline
          });
        });
        
        callback(friendsLocations);
      } catch (error) {
        console.error('Error in friends locations listener:', error);
        onError?.(error as Error);
      }
    },
    (error) => {
      console.error('Friends locations listener error:', error);
      onError?.(error);
    }
  );
  
  // If there are more than 10 friends, we need additional listeners
  if (friendIds.length > 10) {
    const additionalUnsubscribers: (() => void)[] = [];
    
    // Create additional queries for remaining friends
    for (let i = 10; i < friendIds.length; i += 10) {
      const batch = friendIds.slice(i, i + 10);
      const additionalQuery = query(
        locationsRef,
        where('userId', 'in', batch),
        where('isLocationEnabled', '==', true),
        where('isVisible', '==', true)
      );
      
      const additionalUnsubscribe = onSnapshot(
        additionalQuery,
        (snapshot) => {
          // This will trigger the main callback to re-fetch all locations
          // A bit inefficient but ensures we get all friend locations
          getFriendsLocations(friendIds).then(callback).catch((error) => {
            console.error('Error getting all friends locations:', error);
            onError?.(error as Error);
          });
        },
        (error) => {
          console.error('Additional friends locations listener error:', error);
          onError?.(error);
        }
      );
      
      additionalUnsubscribers.push(additionalUnsubscribe);
    }
    
    // Return combined unsubscribe function
    return () => {
      unsubscribe();
      additionalUnsubscribers.forEach(unsub => unsub());
    };
  }
  
  return unsubscribe;
}

/**
 * Remove user location when they go offline or disable location sharing
 */
export async function removeUserLocation(userId: string): Promise<void> {
  try {
    const docRef = doc(db, USER_LOCATIONS_COLLECTION, userId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error removing user location:', error);
    throw error;
  }
}

/**
 * Get user's location sharing preferences
 */
export async function getLocationPreferences(userId: string): Promise<{
  isLocationEnabled: boolean;
  isVisible: boolean;
} | null> {
  try {
    const docRef = doc(db, USER_LOCATIONS_COLLECTION, userId);
    const snapshot = await getDocs(query(collection(db, USER_LOCATIONS_COLLECTION), where('userId', '==', userId)));
    
    if (!snapshot.empty) {
      const data = snapshot.docs[0].data() as UserLocationData;
      return {
        isLocationEnabled: data.isLocationEnabled,
        isVisible: data.isVisible
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting location preferences:', error);
    throw error;
  }
}

/**
 * Calculate distance between two coordinates (in meters)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

/**
 * Format distance for display
 */
export function formatDistance(distanceInMeters: number): string {
  if (distanceInMeters < 1000) {
    return `${Math.round(distanceInMeters)}m away`;
  } else if (distanceInMeters < 10000) {
    return `${(distanceInMeters / 1000).toFixed(1)}km away`;
  } else {
    return `${Math.round(distanceInMeters / 1000)}km away`;
  }
}

/**
 * Get time since last location update
 */
export function getTimeSinceUpdate(lastUpdated: Date): string {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInMinutes < 24 * 60) {
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diffInMinutes / (24 * 60));
    return `${days}d ago`;
  }
}