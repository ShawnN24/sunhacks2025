import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  Timestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../firebase';
import { Group } from '@/app/components/messages/types';

// Firestore collections
const GROUPS_COLLECTION = 'groups';

// Group interface for Firestore
interface GroupData {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  members: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  photoURL: string;
}

/**
 * Create a new group
 */
export async function createGroup(
  name: string, 
  createdBy: string, 
  members: string[], 
  description?: string,
  photoURL?: string
): Promise<string> {
  try {
    const groupData: Omit<GroupData, 'id'> = {
      name: name.trim(),
      description: description?.trim() || '',
      createdBy,
      members: [createdBy, ...members.filter(m => m !== createdBy)], // Ensure creator is included
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
      photoURL: photoURL || ''
    };
    
    const docRef = await addDoc(collection(db, GROUPS_COLLECTION), groupData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating group:', error);
    throw error;
  }
}

/**
 * Get group by ID
 */
export async function getGroup(groupId: string): Promise<Group | null> {
  try {
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    const groupSnap = await getDoc(groupRef);
    
    if (!groupSnap.exists()) {
      return null;
    }
    
    const data = groupSnap.data() as GroupData;
    return {
      id: groupSnap.id,
      name: data.name,
      description: data.description,
      createdBy: data.createdBy,
      members: data.members,
      createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
      photoURL: data.photoURL
    };
  } catch (error) {
    console.error('Error getting group:', error);
    throw error;
  }
}

/**
 * Get all groups where user is a member
 */
export async function getUserGroups(userId: string): Promise<Group[]> {
  try {
    const groupsRef = collection(db, GROUPS_COLLECTION);
    const groupsQuery = query(
      groupsRef,
      where('members', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );
    
    const groupsSnapshot = await getDocs(groupsQuery);
    const groups: Group[] = [];
    
    groupsSnapshot.forEach((doc) => {
      const data = doc.data() as GroupData;
      groups.push({
        id: doc.id,
        name: data.name,
        description: data.description,
        createdBy: data.createdBy,
        members: data.members,
        createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
        photoURL: data.photoURL
      });
    });
    
    return groups;
  } catch (error) {
    console.error('Error getting user groups:', error);
    throw error;
  }
}

/**
 * Update group information
 */
export async function updateGroup(
  groupId: string,
  updates: {
    name?: string;
    description?: string;
    photoURL?: string;
  }
): Promise<void> {
  try {
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    const updateData: any = {
      updatedAt: serverTimestamp()
    };
    
    if (updates.name !== undefined) {
      updateData.name = updates.name.trim();
    }
    
    if (updates.description !== undefined) {
      updateData.description = updates.description?.trim() || '';
    }
    
    if (updates.photoURL !== undefined) {
      updateData.photoURL = updates.photoURL || '';
    }
    
    await updateDoc(groupRef, updateData);
  } catch (error) {
    console.error('Error updating group:', error);
    throw error;
  }
}

/**
 * Add member to group
 */
export async function addGroupMember(groupId: string, userId: string): Promise<void> {
  try {
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    await updateDoc(groupRef, {
      members: arrayUnion(userId),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error adding group member:', error);
    throw error;
  }
}

/**
 * Remove member from group
 */
export async function removeGroupMember(groupId: string, userId: string): Promise<void> {
  try {
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    await updateDoc(groupRef, {
      members: arrayRemove(userId),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error removing group member:', error);
    throw error;
  }
}

/**
 * Leave group (remove self from members)
 */
export async function leaveGroup(groupId: string, userId: string): Promise<void> {
  try {
    await removeGroupMember(groupId, userId);
  } catch (error) {
    console.error('Error leaving group:', error);
    throw error;
  }
}

/**
 * Delete group (only creator can delete)
 */
export async function deleteGroup(groupId: string, userId: string): Promise<void> {
  try {
    // First check if user is the creator
    const group = await getGroup(groupId);
    if (!group) {
      throw new Error('Group not found');
    }
    
    if (group.createdBy !== userId) {
      throw new Error('Only the group creator can delete the group');
    }
    
    // Delete the group
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    await deleteDoc(groupRef);
  } catch (error) {
    console.error('Error deleting group:', error);
    throw error;
  }
}

/**
 * Check if user is group member
 */
export async function isGroupMember(groupId: string, userId: string): Promise<boolean> {
  try {
    const group = await getGroup(groupId);
    if (!group) {
      return false;
    }
    
    return group.members.includes(userId);
  } catch (error) {
    console.error('Error checking group membership:', error);
    throw error;
  }
}

/**
 * Get group members count
 */
export async function getGroupMembersCount(groupId: string): Promise<number> {
  try {
    const group = await getGroup(groupId);
    if (!group) {
      return 0;
    }
    
    return group.members.length;
  } catch (error) {
    console.error('Error getting group members count:', error);
    throw error;
  }
}

/**
 * Listen to user's groups in real-time
 */
export function listenToUserGroups(
  userId: string,
  callback: (groups: Group[]) => void,
  onError?: (error: Error) => void
): () => void {
  const groupsRef = collection(db, GROUPS_COLLECTION);
  const groupsQuery = query(
    groupsRef,
    where('members', 'array-contains', userId),
    orderBy('updatedAt', 'desc')
  );
  
  return onSnapshot(
    groupsQuery,
    (snapshot) => {
      try {
        const groups: Group[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data() as GroupData;
          groups.push({
            id: doc.id,
            name: data.name,
            description: data.description,
            createdBy: data.createdBy,
            members: data.members,
            createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
            photoURL: data.photoURL
          });
        });
        
        callback(groups);
      } catch (error) {
        console.error('Error in groups listener:', error);
        onError?.(error as Error);
      }
    },
    (error) => {
      console.error('Groups listener error:', error);
      onError?.(error);
    }
  );
}

/**
 * Listen to specific group changes in real-time
 */
export function listenToGroup(
  groupId: string,
  callback: (group: Group | null) => void,
  onError?: (error: Error) => void
): () => void {
  const groupRef = doc(db, GROUPS_COLLECTION, groupId);
  
  return onSnapshot(
    groupRef,
    (snapshot) => {
      try {
        if (!snapshot.exists()) {
          callback(null);
          return;
        }
        
        const data = snapshot.data() as GroupData;
        const group: Group = {
          id: snapshot.id,
          name: data.name,
          description: data.description,
          createdBy: data.createdBy,
          members: data.members,
          createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
          photoURL: data.photoURL
        };
        
        callback(group);
      } catch (error) {
        console.error('Error in group listener:', error);
        onError?.(error as Error);
      }
    },
    (error) => {
      console.error('Group listener error:', error);
      onError?.(error);
    }
  );
}