import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  Timestamp,
  limit
} from 'firebase/firestore';
import { db } from '../firebase';
import { DirectMessage } from '@/app/components/messages/types';

// Firestore collections
const DIRECT_MESSAGES_COLLECTION = 'directMessages';

// Direct message interface for Firestore
interface DirectMessageData {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Timestamp;
  read: boolean;
  edited?: boolean;
  editedAt?: Timestamp;
}

/**
 * Generate conversation ID from two user IDs (consistent regardless of order)
 */
function generateConversationId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('_');
}

/**
 * Send a direct message
 */
export async function sendDirectMessage(
  senderId: string,
  receiverId: string,
  content: string
): Promise<string> {
  try {
    const messageData: Omit<DirectMessageData, 'id'> = {
      senderId,
      receiverId,
      content: content.trim(),
      timestamp: serverTimestamp() as Timestamp,
      read: false
    };
    
    const docRef = await addDoc(collection(db, DIRECT_MESSAGES_COLLECTION), messageData);
    return docRef.id;
  } catch (error) {
    console.error('Error sending direct message:', error);
    throw error;
  }
}

/**
 * Get direct messages between two users
 */
export async function getDirectMessages(
  userId1: string,
  userId2: string,
  limitCount: number = 50
): Promise<DirectMessage[]> {
  try {
    const messagesRef = collection(db, DIRECT_MESSAGES_COLLECTION);
    
    // Get messages in both directions
    const query1 = query(
      messagesRef,
      where('senderId', '==', userId1),
      where('receiverId', '==', userId2),
      orderBy('timestamp', 'desc'),
      limit(limitCount / 2)
    );
    
    const query2 = query(
      messagesRef,
      where('senderId', '==', userId2),
      where('receiverId', '==', userId1),
      orderBy('timestamp', 'desc'),
      limit(limitCount / 2)
    );
    
    const [snapshot1, snapshot2] = await Promise.all([
      getDocs(query1),
      getDocs(query2)
    ]);
    
    const messages: DirectMessage[] = [];
    
    snapshot1.forEach((doc) => {
      const data = doc.data() as DirectMessageData;
      messages.push({
        id: doc.id,
        senderId: data.senderId,
        receiverId: data.receiverId,
        content: data.content,
        timestamp: data.timestamp ? data.timestamp.toDate() : new Date(),
        read: data.read
      });
    });
    
    snapshot2.forEach((doc) => {
      const data = doc.data() as DirectMessageData;
      messages.push({
        id: doc.id,
        senderId: data.senderId,
        receiverId: data.receiverId,
        content: data.content,
        timestamp: data.timestamp ? data.timestamp.toDate() : new Date(),
        read: data.read
      });
    });
    
    // Sort messages by timestamp (oldest first for chat display)
    return messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  } catch (error) {
    console.error('Error getting direct messages:', error);
    throw error;
  }
}

/**
 * Mark messages as read
 */
export async function markDirectMessagesAsRead(
  senderId: string,
  receiverId: string
): Promise<void> {
  try {
    const messagesRef = collection(db, DIRECT_MESSAGES_COLLECTION);
    const unreadQuery = query(
      messagesRef,
      where('senderId', '==', senderId),
      where('receiverId', '==', receiverId),
      where('read', '==', false)
    );
    
    const unreadSnapshot = await getDocs(unreadQuery);
    const updatePromises: Promise<void>[] = [];
    
    unreadSnapshot.forEach((doc) => {
      updatePromises.push(updateDoc(doc.ref, { read: true }));
    });
    
    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
}

/**
 * Get unread message count between two users
 */
export async function getUnreadDirectMessageCount(
  senderId: string,
  receiverId: string
): Promise<number> {
  try {
    const messagesRef = collection(db, DIRECT_MESSAGES_COLLECTION);
    const unreadQuery = query(
      messagesRef,
      where('senderId', '==', senderId),
      where('receiverId', '==', receiverId),
      where('read', '==', false)
    );
    
    const unreadSnapshot = await getDocs(unreadQuery);
    return unreadSnapshot.size;
  } catch (error) {
    console.error('Error getting unread message count:', error);
    throw error;
  }
}

/**
 * Get the last message between two users
 */
export async function getLastDirectMessage(
  userId1: string,
  userId2: string
): Promise<DirectMessage | null> {
  try {
    const messagesRef = collection(db, DIRECT_MESSAGES_COLLECTION);
    
    // Get the most recent message in both directions
    const query1 = query(
      messagesRef,
      where('senderId', '==', userId1),
      where('receiverId', '==', userId2),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    
    const query2 = query(
      messagesRef,
      where('senderId', '==', userId2),
      where('receiverId', '==', userId1),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    
    const [snapshot1, snapshot2] = await Promise.all([
      getDocs(query1),
      getDocs(query2)
    ]);
    
    const messages: DirectMessage[] = [];
    
    if (!snapshot1.empty) {
      const doc = snapshot1.docs[0];
      const data = doc.data() as DirectMessageData;
      messages.push({
        id: doc.id,
        senderId: data.senderId,
        receiverId: data.receiverId,
        content: data.content,
        timestamp: data.timestamp ? data.timestamp.toDate() : new Date(),
        read: data.read
      });
    }
    
    if (!snapshot2.empty) {
      const doc = snapshot2.docs[0];
      const data = doc.data() as DirectMessageData;
      messages.push({
        id: doc.id,
        senderId: data.senderId,
        receiverId: data.receiverId,
        content: data.content,
        timestamp: data.timestamp ? data.timestamp.toDate() : new Date(),
        read: data.read
      });
    }
    
    if (messages.length === 0) {
      return null;
    }
    
    // Return the most recent message
    return messages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
  } catch (error) {
    console.error('Error getting last direct message:', error);
    throw error;
  }
}

/**
 * Edit a direct message
 */
export async function editDirectMessage(
  messageId: string,
  newContent: string,
  userId: string
): Promise<void> {
  try {
    const messageRef = doc(db, DIRECT_MESSAGES_COLLECTION, messageId);
    await updateDoc(messageRef, {
      content: newContent.trim(),
      edited: true,
      editedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error editing direct message:', error);
    throw error;
  }
}

/**
 * Delete a direct message
 */
export async function deleteDirectMessage(messageId: string, userId: string): Promise<void> {
  try {
    const messageRef = doc(db, DIRECT_MESSAGES_COLLECTION, messageId);
    await updateDoc(messageRef, {
      content: '[Message deleted]',
      edited: true,
      editedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error deleting direct message:', error);
    throw error;
  }
}

/**
 * Listen to direct messages between two users in real-time
 */
export function listenToDirectMessages(
  userId1: string,
  userId2: string,
  callback: (messages: DirectMessage[]) => void,
  onError?: (error: Error) => void,
  limitCount: number = 50
): () => void {
  const messagesRef = collection(db, DIRECT_MESSAGES_COLLECTION);
  
  // Create queries for both directions
  const query1 = query(
    messagesRef,
    where('senderId', '==', userId1),
    where('receiverId', '==', userId2),
    orderBy('timestamp', 'desc'),
    limit(limitCount / 2)
  );
  
  const query2 = query(
    messagesRef,
    where('senderId', '==', userId2),
    where('receiverId', '==', userId1),
    orderBy('timestamp', 'desc'),
    limit(limitCount / 2)
  );
  
  let messages1: DirectMessage[] = [];
  let messages2: DirectMessage[] = [];
  
  const processMessages = () => {
    const allMessages = [...messages1, ...messages2]
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    callback(allMessages);
  };
  
  const unsubscribe1 = onSnapshot(
    query1,
    (snapshot) => {
      try {
        messages1 = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as DirectMessageData;
          messages1.push({
            id: doc.id,
            senderId: data.senderId,
            receiverId: data.receiverId,
            content: data.content,
            timestamp: data.timestamp ? data.timestamp.toDate() : new Date(),
            read: data.read
          });
        });
        processMessages();
      } catch (error) {
        console.error('Error in direct messages listener 1:', error);
        onError?.(error as Error);
      }
    },
    (error) => {
      console.error('Direct messages listener 1 error:', error);
      onError?.(error);
    }
  );
  
  const unsubscribe2 = onSnapshot(
    query2,
    (snapshot) => {
      try {
        messages2 = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as DirectMessageData;
          messages2.push({
            id: doc.id,
            senderId: data.senderId,
            receiverId: data.receiverId,
            content: data.content,
            timestamp: data.timestamp ? data.timestamp.toDate() : new Date(),
            read: data.read
          });
        });
        processMessages();
      } catch (error) {
        console.error('Error in direct messages listener 2:', error);
        onError?.(error as Error);
      }
    },
    (error) => {
      console.error('Direct messages listener 2 error:', error);
      onError?.(error);
    }
  );
  
  // Return unsubscribe function for both listeners
  return () => {
    unsubscribe1();
    unsubscribe2();
  };
}