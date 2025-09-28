import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { Conversation, DirectMessage, GroupMessage } from '@/app/components/messages/types';
import { getLastDirectMessage, getUnreadDirectMessageCount } from './directMessages';
import { getLastGroupMessage, getUnreadGroupMessageCount } from './groupMessages';
import { getFriends } from './friends';
import { getUserGroups } from './groups';

// Firestore collections
const CONVERSATIONS_COLLECTION = 'conversations';

// Conversation interface for Firestore
interface ConversationData {
  id: string;
  type: 'direct' | 'group';
  participants: string[];
  lastMessage?: {
    content: string;
    timestamp: Timestamp;
    senderId: string;
  };
  unreadCount: number;
  updatedAt: Timestamp;
  userId: string; // The user who owns this conversation record
}

/**
 * Create or update a conversation
 */
export async function createOrUpdateConversation(
  userId: string,
  type: 'direct' | 'group',
  participants: string[],
  lastMessage?: DirectMessage | GroupMessage
): Promise<string> {
  try {
    // Check if conversation already exists
    const conversationsRef = collection(db, CONVERSATIONS_COLLECTION);
    const existingQuery = query(
      conversationsRef,
      where('userId', '==', userId),
      where('type', '==', type),
      where('participants', '==', participants.sort()) // Sort for consistency
    );
    
    const existingSnapshot = await getDocs(existingQuery);
    
    const conversationData: Omit<ConversationData, 'id'> = {
      type,
      participants: participants.sort(),
      lastMessage: lastMessage ? {
        content: lastMessage.content,
        timestamp: serverTimestamp() as Timestamp,
        senderId: lastMessage.senderId
      } : undefined,
      unreadCount: 0, // Will be calculated separately
      updatedAt: serverTimestamp() as Timestamp,
      userId
    };
    
    if (!existingSnapshot.empty) {
      // Update existing conversation
      const existingDoc = existingSnapshot.docs[0];
      await updateDoc(existingDoc.ref, conversationData);
      return existingDoc.id;
    } else {
      // Create new conversation
      const docRef = await addDoc(conversationsRef, conversationData);
      return docRef.id;
    }
  } catch (error) {
    console.error('Error creating/updating conversation:', error);
    throw error;
  }
}

/**
 * Get all conversations for a user
 */
export async function getUserConversations(userId: string): Promise<Conversation[]> {
  try {
    // Get conversations from friends and groups
    const [friends, groups] = await Promise.all([
      getFriends(userId),
      getUserGroups(userId)
    ]);
    
    const conversations: Conversation[] = [];
    
    // Create conversations for friends (direct messages)
    for (const friend of friends) {
      const lastMessage = await getLastDirectMessage(userId, friend.uid);
      const unreadCount = await getUnreadDirectMessageCount(friend.uid, userId); // Messages from friend to user
      
      if (lastMessage || unreadCount > 0) { // Only include if there are messages or unread count
        const conversationId = `direct_${[userId, friend.uid].sort().join('_')}`;
        conversations.push({
          id: conversationId,
          type: 'direct',
          participants: [userId, friend.uid],
          lastMessage: lastMessage || undefined,
          unreadCount,
          updatedAt: lastMessage?.timestamp || new Date()
        });
      }
    }
    
    // Create conversations for groups
    for (const group of groups) {
      const lastMessage = await getLastGroupMessage(group.id);
      const unreadCount = await getUnreadGroupMessageCount(group.id, userId);
      
      const conversationId = `group_${group.id}`;
      conversations.push({
        id: conversationId,
        type: 'group',
        participants: group.members,
        lastMessage: lastMessage || undefined,
        unreadCount,
        updatedAt: lastMessage?.timestamp || group.createdAt
      });
    }
    
    // Sort by most recent activity
    return conversations.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  } catch (error) {
    console.error('Error getting user conversations:', error);
    throw error;
  }
}

/**
 * Update conversation's last message
 */
export async function updateConversationLastMessage(
  userId: string,
  type: 'direct' | 'group',
  participants: string[],
  lastMessage: DirectMessage | GroupMessage
): Promise<void> {
  try {
    await createOrUpdateConversation(userId, type, participants, lastMessage);
  } catch (error) {
    console.error('Error updating conversation last message:', error);
    throw error;
  }
}

/**
 * Update conversation unread count
 */
export async function updateConversationUnreadCount(
  userId: string,
  conversationId: string,
  unreadCount: number
): Promise<void> {
  try {
    const conversationsRef = collection(db, CONVERSATIONS_COLLECTION);
    const conversationQuery = query(
      conversationsRef,
      where('userId', '==', userId)
    );
    
    const conversationSnapshot = await getDocs(conversationQuery);
    
    conversationSnapshot.forEach(async (doc) => {
      const data = doc.data() as ConversationData;
      
      // Find the matching conversation by generating the same ID format
      let matchesConversation = false;
      
      if (data.type === 'direct') {
        const generatedId = `direct_${data.participants.sort().join('_')}`;
        matchesConversation = generatedId === conversationId;
      } else if (data.type === 'group') {
        const groupId = data.participants.find(p => p !== userId) || data.participants[0];
        const generatedId = `group_${groupId}`;
        matchesConversation = generatedId === conversationId;
      }
      
      if (matchesConversation) {
        await updateDoc(doc.ref, {
          unreadCount,
          updatedAt: serverTimestamp()
        });
      }
    });
  } catch (error) {
    console.error('Error updating conversation unread count:', error);
    throw error;
  }
}

/**
 * Mark conversation as read (set unread count to 0)
 */
export async function markConversationAsRead(
  userId: string,
  conversationId: string
): Promise<void> {
  try {
    await updateConversationUnreadCount(userId, conversationId, 0);
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    throw error;
  }
}

/**
 * Delete a conversation
 */
export async function deleteConversation(
  userId: string,
  conversationId: string
): Promise<void> {
  try {
    const conversationsRef = collection(db, CONVERSATIONS_COLLECTION);
    const conversationQuery = query(
      conversationsRef,
      where('userId', '==', userId)
    );
    
    const conversationSnapshot = await getDocs(conversationQuery);
    
    conversationSnapshot.forEach(async (doc) => {
      const data = doc.data() as ConversationData;
      
      // Find the matching conversation by generating the same ID format
      let matchesConversation = false;
      
      if (data.type === 'direct') {
        const generatedId = `direct_${data.participants.sort().join('_')}`;
        matchesConversation = generatedId === conversationId;
      } else if (data.type === 'group') {
        const groupId = data.participants.find(p => p !== userId) || data.participants[0];
        const generatedId = `group_${groupId}`;
        matchesConversation = generatedId === conversationId;
      }
      
      if (matchesConversation) {
        await deleteDoc(doc.ref);
      }
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    throw error;
  }
}

/**
 * Get conversation by ID
 */
export async function getConversation(
  userId: string,
  conversationId: string
): Promise<Conversation | null> {
  try {
    const conversations = await getUserConversations(userId);
    return conversations.find(conv => conv.id === conversationId) || null;
  } catch (error) {
    console.error('Error getting conversation:', error);
    throw error;
  }
}

/**
 * Listen to conversations changes in real-time
 */
export function listenToConversations(
  userId: string,
  callback: (conversations: Conversation[]) => void,
  onError?: (error: Error) => void
): () => void {
  // We'll use a combination of listeners for friends, groups, and messages
  // to rebuild conversations list when anything changes
  
  let isInitialized = false;
  const refreshConversations = async () => {
    try {
      const conversations = await getUserConversations(userId);
      callback(conversations);
    } catch (error) {
      console.error('Error refreshing conversations:', error);
      onError?.(error as Error);
    }
  };
  
  // Listen to friends changes
  const { listenToFriends } = require('./friends');
  const unsubscribeFriends = listenToFriends(
    userId,
    () => {
      if (isInitialized) refreshConversations();
    },
    onError
  );
  
  // Listen to groups changes
  const { listenToUserGroups } = require('./groups');
  const unsubscribeGroups = listenToUserGroups(
    userId,
    () => {
      if (isInitialized) refreshConversations();
    },
    onError
  );
  
  // Initial load
  refreshConversations().then(() => {
    isInitialized = true;
  });
  
  // Set up periodic refresh for message updates
  const refreshInterval = setInterval(refreshConversations, 5000); // Refresh every 5 seconds
  
  // Return combined unsubscribe function
  return () => {
    unsubscribeFriends();
    unsubscribeGroups();
    clearInterval(refreshInterval);
  };
}

/**
 * Get total unread messages count for user
 */
export async function getTotalUnreadCount(userId: string): Promise<number> {
  try {
    const conversations = await getUserConversations(userId);
    return conversations.reduce((total, conv) => total + conv.unreadCount, 0);
  } catch (error) {
    console.error('Error getting total unread count:', error);
    throw error;
  }
}

/**
 * Search conversations by participant name or last message content
 */
export async function searchConversations(
  userId: string,
  searchQuery: string
): Promise<Conversation[]> {
  try {
    const conversations = await getUserConversations(userId);
    const searchLower = searchQuery.toLowerCase();
    
    return conversations.filter(conv => {
      // Search in last message content
      if (conv.lastMessage?.content.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // For direct conversations, we'd need to search in friend names
      // For group conversations, we'd need to search in group names
      // This would require additional data fetching
      
      return false;
    });
  } catch (error) {
    console.error('Error searching conversations:', error);
    throw error;
  }
}