import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  setDoc,
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { Friend } from '@/app/components/messages/types';

// Firestore collections
const USERS_COLLECTION = 'users';
const FRIENDS_COLLECTION = 'friends';

// User profile interface for Firestore
interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  status: 'online' | 'offline';
  lastSeen: Timestamp;
  createdAt: Timestamp;
}

// Friendship interface for Firestore
interface Friendship {
  userId: string;
  friendId: string;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: Timestamp;
  acceptedAt?: Timestamp;
}

/**
 * Create or update user profile in Firestore
 */
export async function createUserProfile(uid: string, userData: Partial<UserProfile>): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const now = serverTimestamp();
    
    await updateDoc(userRef, {
      ...userData,
      lastSeen: now,
      status: 'online'
    }).catch(async () => {
      // If document doesn't exist, create it with UID as document ID
      await setDoc(userRef, {
        uid,
        ...userData,
        lastSeen: now,
        status: 'online',
        createdAt: now
      });
    });
  } catch (error) {
    console.error('Error creating/updating user profile:', error);
    throw error;
  }
}

/**
 * Update user online status
 */
export async function updateUserStatus(uid: string, status: 'online' | 'offline'): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, {
      status,
      lastSeen: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    throw error;
  }
}

/**
 * Search for users by display name or email
 */
export async function searchUsers(searchQuery: string, currentUserId: string): Promise<Friend[]> {
  try {
    if (!searchQuery.trim()) {
      return [];
    }
    
    console.log('Firebase searchUsers called with:', { searchQuery, currentUserId });
    
    const usersRef = collection(db, USERS_COLLECTION);
    const snapshot = await getDocs(usersRef);
    
    console.log('Total users in database:', snapshot.size);
    
    const users: Friend[] = [];
    const searchLower = searchQuery.toLowerCase();
    
    snapshot.forEach((doc) => {
      const data = doc.data() as UserProfile;
      
      console.log('Checking user:', { id: doc.id, data });
      
      // Skip current user
      if (data.uid === currentUserId) {
        console.log('Skipping current user');
        return;
      }
      
      // Check if search query matches displayName or email (case-insensitive)
      const displayName = (data.displayName || '').toLowerCase();
      const email = (data.email || '').toLowerCase();
      
      if (displayName.includes(searchLower) || email.includes(searchLower)) {
        console.log('Match found:', data);
        users.push({
          id: doc.id,
          uid: data.uid,
          displayName: data.displayName || data.email || 'Unknown User',
          email: data.email || '',
          photoURL: data.photoURL,
          status: data.status || 'offline',
          lastSeen: data.lastSeen?.toDate() || new Date()
        });
      }
    });
    
    console.log('Final search results:', users);
    return users;
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
}

/**
 * Send friend request
 */
export async function sendFriendRequest(userId: string, friendId: string): Promise<void> {
  try {
    // Check if friendship already exists
    const friendsRef = collection(db, FRIENDS_COLLECTION);
    const existingQuery = query(
      friendsRef,
      where('userId', '==', userId),
      where('friendId', '==', friendId)
    );
    
    const existingSnapshot = await getDocs(existingQuery);
    if (!existingSnapshot.empty) {
      throw new Error('Friend request already sent or friendship already exists');
    }
    
    // Create friend request
    await addDoc(friendsRef, {
      userId,
      friendId,
      status: 'pending',
      createdAt: serverTimestamp()
    } as Friendship);
    
  } catch (error) {
    console.error('Error sending friend request:', error);
    throw error;
  }
}

/**
 * Accept friend request
 */
export async function acceptFriendRequest(userId: string, friendId: string): Promise<void> {
  try {
    const friendsRef = collection(db, FRIENDS_COLLECTION);
    
    // Find the pending request
    const requestQuery = query(
      friendsRef,
      where('userId', '==', friendId),
      where('friendId', '==', userId),
      where('status', '==', 'pending')
    );
    
    const requestSnapshot = await getDocs(requestQuery);
    if (requestSnapshot.empty) {
      throw new Error('No pending friend request found');
    }
    
    // Update the request to accepted
    const requestDoc = requestSnapshot.docs[0];
    await updateDoc(requestDoc.ref, {
      status: 'accepted',
      acceptedAt: serverTimestamp()
    });
    
    // Create reciprocal friendship
    await addDoc(friendsRef, {
      userId,
      friendId,
      status: 'accepted',
      createdAt: serverTimestamp(),
      acceptedAt: serverTimestamp()
    } as Friendship);
    
  } catch (error) {
    console.error('Error accepting friend request:', error);
    throw error;
  }
}

/**
 * Get user's friends list
 */
export async function getFriends(userId: string): Promise<Friend[]> {
  try {
    const friendsRef = collection(db, FRIENDS_COLLECTION);
    const friendsQuery = query(
      friendsRef,
      where('userId', '==', userId),
      where('status', '==', 'accepted')
    );
    
    const friendsSnapshot = await getDocs(friendsQuery);
    const friendIds = friendsSnapshot.docs.map(doc => doc.data().friendId);
    
    if (friendIds.length === 0) {
      return [];
    }
    
    // Get friend profiles
    const usersRef = collection(db, USERS_COLLECTION);
    const friends: Friend[] = [];
    
    // Firestore 'in' queries are limited to 10 items, so we need to batch
    for (let i = 0; i < friendIds.length; i += 10) {
      const batch = friendIds.slice(i, i + 10);
      const usersQuery = query(usersRef, where('uid', 'in', batch));
      const usersSnapshot = await getDocs(usersQuery);
      
      usersSnapshot.forEach((doc) => {
        const data = doc.data() as UserProfile;
        friends.push({
          id: doc.id,
          uid: data.uid,
          displayName: data.displayName,
          email: data.email,
          photoURL: data.photoURL,
          status: data.status,
          lastSeen: data.lastSeen ? data.lastSeen.toDate() : new Date()
        });
      });
    }
    
    return friends;
  } catch (error) {
    console.error('Error getting friends:', error);
    throw error;
  }
}

/**
 * Remove friend
 */
export async function removeFriend(userId: string, friendId: string): Promise<void> {
  try {
    const friendsRef = collection(db, FRIENDS_COLLECTION);
    
    // Remove both directions of the friendship
    const queries = [
      query(friendsRef, where('userId', '==', userId), where('friendId', '==', friendId)),
      query(friendsRef, where('userId', '==', friendId), where('friendId', '==', userId))
    ];
    
    const [query1Snapshot, query2Snapshot] = await Promise.all([
      getDocs(queries[0]),
      getDocs(queries[1])
    ]);
    
    const deletePromises: Promise<void>[] = [];
    
    query1Snapshot.forEach((doc) => {
      deletePromises.push(deleteDoc(doc.ref));
    });
    
    query2Snapshot.forEach((doc) => {
      deletePromises.push(deleteDoc(doc.ref));
    });
    
    await Promise.all(deletePromises);
    
  } catch (error) {
    console.error('Error removing friend:', error);
    throw error;
  }
}

/**
 * Listen to friends list changes in real-time
 */
export function listenToFriends(
  userId: string,
  callback: (friends: Friend[]) => void,
  onError?: (error: Error) => void
): () => void {
  const friendsRef = collection(db, FRIENDS_COLLECTION);
  const friendsQuery = query(
    friendsRef,
    where('userId', '==', userId),
    where('status', '==', 'accepted')
  );
  
  return onSnapshot(
    friendsQuery,
    async (snapshot) => {
      try {
        const friendIds = snapshot.docs.map(doc => doc.data().friendId);
        
        if (friendIds.length === 0) {
          callback([]);
          return;
        }
        
        // Get friend profiles
        const usersRef = collection(db, USERS_COLLECTION);
        const friends: Friend[] = [];
        
        // Batch the queries for 'in' limitation
        for (let i = 0; i < friendIds.length; i += 10) {
          const batch = friendIds.slice(i, i + 10);
          const usersQuery = query(usersRef, where('uid', 'in', batch));
          const usersSnapshot = await getDocs(usersQuery);
          
          usersSnapshot.forEach((doc) => {
            const data = doc.data() as UserProfile;
            friends.push({
              id: doc.id,
              uid: data.uid,
              displayName: data.displayName,
              email: data.email,
              photoURL: data.photoURL,
              status: data.status,
              lastSeen: data.lastSeen ? data.lastSeen.toDate() : new Date()
            });
          });
        }
        
        callback(friends);
      } catch (error) {
        console.error('Error in friends listener:', error);
        onError?.(error as Error);
      }
    },
    (error) => {
      console.error('Friends listener error:', error);
      onError?.(error);
    }
  );
}

/**
 * Get incoming friend requests (requests sent TO the user)
 */
export async function getIncomingFriendRequests(userId: string): Promise<Friend[]> {
  try {
    const friendsRef = collection(db, FRIENDS_COLLECTION);
    const requestsQuery = query(
      friendsRef,
      where('friendId', '==', userId),
      where('status', '==', 'pending')
      // Removed orderBy to avoid composite index requirement
    );
    
    const requestsSnapshot = await getDocs(requestsQuery);
    const senderIds = requestsSnapshot.docs.map(doc => doc.data().userId);
    
    if (senderIds.length === 0) {
      return [];
    }
    
    // Get sender profiles
    const usersRef = collection(db, USERS_COLLECTION);
    const requests: Friend[] = [];
    
    for (const senderId of senderIds) {
      const userDoc = await getDoc(doc(usersRef, senderId));
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        requests.push({
          id: senderId,
          uid: userData.uid,
          name: userData.displayName,
          displayName: userData.displayName,
          email: userData.email,
          avatar: userData.photoURL || undefined,
          photoURL: userData.photoURL || undefined,
          status: userData.status,
          lastSeen: userData.lastSeen?.toDate() || new Date(),
          isPending: true // Mark as pending request
        });
      }
    }
    
    return requests;
  } catch (error) {
    console.error('Error getting incoming friend requests:', error);
    throw error;
  }
}

/**
 * Get outgoing friend requests (requests sent BY the user)
 */
export async function getOutgoingFriendRequests(userId: string): Promise<Friend[]> {
  try {
    const friendsRef = collection(db, FRIENDS_COLLECTION);
    const requestsQuery = query(
      friendsRef,
      where('userId', '==', userId),
      where('status', '==', 'pending')
      // Removed orderBy to avoid composite index requirement
    );
    
    const requestsSnapshot = await getDocs(requestsQuery);
    const recipientIds = requestsSnapshot.docs.map(doc => doc.data().friendId);
    
    if (recipientIds.length === 0) {
      return [];
    }
    
    // Get recipient profiles
    const usersRef = collection(db, USERS_COLLECTION);
    const requests: Friend[] = [];
    
    for (const recipientId of recipientIds) {
      const userDoc = await getDoc(doc(usersRef, recipientId));
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        requests.push({
          id: recipientId,
          uid: userData.uid,
          name: userData.displayName,
          displayName: userData.displayName,
          email: userData.email,
          avatar: userData.photoURL || undefined,
          photoURL: userData.photoURL || undefined,
          status: userData.status,
          lastSeen: userData.lastSeen?.toDate() || new Date(),
          isPending: true, // Mark as pending request
          isOutgoing: true // Mark as outgoing request
        });
      }
    }
    
    return requests;
  } catch (error) {
    console.error('Error getting outgoing friend requests:', error);
    throw error;
  }
}

/**
 * Reject friend request
 */
export async function rejectFriendRequest(userId: string, friendId: string): Promise<void> {
  try {
    const friendsRef = collection(db, FRIENDS_COLLECTION);
    
    // Find the pending request
    const requestQuery = query(
      friendsRef,
      where('userId', '==', friendId),
      where('friendId', '==', userId),
      where('status', '==', 'pending')
    );
    
    const requestSnapshot = await getDocs(requestQuery);
    if (requestSnapshot.empty) {
      throw new Error('No pending friend request found');
    }
    
    // Delete the request
    const requestDoc = requestSnapshot.docs[0];
    await deleteDoc(requestDoc.ref);
    
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    throw error;
  }
}

/**
 * Cancel outgoing friend request
 */
export async function cancelFriendRequest(userId: string, friendId: string): Promise<void> {
  try {
    const friendsRef = collection(db, FRIENDS_COLLECTION);
    
    // Find the pending request
    const requestQuery = query(
      friendsRef,
      where('userId', '==', userId),
      where('friendId', '==', friendId),
      where('status', '==', 'pending')
    );
    
    const requestSnapshot = await getDocs(requestQuery);
    if (requestSnapshot.empty) {
      throw new Error('No pending friend request found');
    }
    
    // Delete the request
    const requestDoc = requestSnapshot.docs[0];
    await deleteDoc(requestDoc.ref);
    
  } catch (error) {
    console.error('Error canceling friend request:', error);
    throw error;
  }
}

/**
 * Listen to incoming friend requests in real-time
 */
export function listenToIncomingFriendRequests(
  userId: string,
  callback: (requests: Friend[]) => void,
  onError?: (error: Error) => void
) {
  const friendsRef = collection(db, FRIENDS_COLLECTION);
  const requestsQuery = query(
    friendsRef,
    where('friendId', '==', userId),
    where('status', '==', 'pending')
    // Removed orderBy to avoid composite index requirement
  );
  
  return onSnapshot(
    requestsQuery,
    async (snapshot) => {
      try {
        const senderIds = snapshot.docs.map(doc => doc.data().userId);
        const requests: Friend[] = [];
        
        if (senderIds.length > 0) {
          const usersRef = collection(db, USERS_COLLECTION);
          
          for (const senderId of senderIds) {
            const userDoc = await getDoc(doc(usersRef, senderId));
            if (userDoc.exists()) {
              const userData = userDoc.data() as UserProfile;
              requests.push({
                id: senderId,
                uid: userData.uid,
                name: userData.displayName,
                displayName: userData.displayName,
                email: userData.email,
                avatar: userData.photoURL || undefined,
                photoURL: userData.photoURL || undefined,
                status: userData.status,
                lastSeen: userData.lastSeen?.toDate() || new Date(),
                isPending: true
              });
            }
          }
        }
        
        callback(requests);
      } catch (error) {
        console.error('Error in incoming friend requests listener:', error);
        onError?.(error as Error);
      }
    },
    (error) => {
      console.error('Incoming friend requests listener error:', error);
      onError?.(error);
    }
  );
}