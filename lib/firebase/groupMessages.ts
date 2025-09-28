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
import { GroupMessage } from '@/app/components/messages/types';

// Firestore collections
const GROUP_MESSAGES_COLLECTION = 'groupMessages';
const GROUP_READ_STATUS_COLLECTION = 'groupReadStatus';

// Group message interface for Firestore
interface GroupMessageData {
  id: string;
  groupId: string;
  senderId: string;
  content: string;
  timestamp: Timestamp;
  edited?: boolean;
  editedAt?: Timestamp;
}

// Read status interface for group messages
interface GroupReadStatus {
  messageId: string;
  groupId: string;
  userId: string;
  readAt: Timestamp;
}

/**
 * Send a group message
 */
export async function sendGroupMessage(
  groupId: string,
  senderId: string,
  content: string
): Promise<string> {
  try {
    const messageData: Omit<GroupMessageData, 'id'> = {
      groupId,
      senderId,
      content: content.trim(),
      timestamp: serverTimestamp() as Timestamp
    };
    
    const docRef = await addDoc(collection(db, GROUP_MESSAGES_COLLECTION), messageData);
    return docRef.id;
  } catch (error) {
    console.error('Error sending group message:', error);
    throw error;
  }
}

/**
 * Get group messages
 */
export async function getGroupMessages(
  groupId: string,
  limitCount: number = 50
): Promise<GroupMessage[]> {
  try {
    const messagesRef = collection(db, GROUP_MESSAGES_COLLECTION);
    const messagesQuery = query(
      messagesRef,
      where('groupId', '==', groupId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    const messagesSnapshot = await getDocs(messagesQuery);
    const messages: GroupMessage[] = [];
    
    messagesSnapshot.forEach((doc) => {
      const data = doc.data() as GroupMessageData;
      messages.push({
        id: doc.id,
        groupId: data.groupId,
        senderId: data.senderId,
        content: data.content,
        timestamp: data.timestamp ? data.timestamp.toDate() : new Date()
      });
    });
    
    // Sort messages by timestamp (oldest first for chat display)
    return messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  } catch (error) {
    console.error('Error getting group messages:', error);
    throw error;
  }
}

/**
 * Mark group message as read by user
 */
export async function markGroupMessageAsRead(
  messageId: string,
  groupId: string,
  userId: string
): Promise<void> {
  try {
    const readStatusData: GroupReadStatus = {
      messageId,
      groupId,
      userId,
      readAt: serverTimestamp() as Timestamp
    };
    
    await addDoc(collection(db, GROUP_READ_STATUS_COLLECTION), readStatusData);
  } catch (error) {
    console.error('Error marking group message as read:', error);
    throw error;
  }
}

/**
 * Mark all group messages as read by user
 */
export async function markAllGroupMessagesAsRead(
  groupId: string,
  userId: string
): Promise<void> {
  try {
    // Get all unread messages for this user in this group
    const messagesRef = collection(db, GROUP_MESSAGES_COLLECTION);
    const messagesQuery = query(
      messagesRef,
      where('groupId', '==', groupId),
      orderBy('timestamp', 'desc')
    );
    
    const messagesSnapshot = await getDocs(messagesQuery);
    const readStatusRef = collection(db, GROUP_READ_STATUS_COLLECTION);
    
    // Get existing read statuses for this user and group
    const existingReadQuery = query(
      readStatusRef,
      where('groupId', '==', groupId),
      where('userId', '==', userId)
    );
    
    const existingReadSnapshot = await getDocs(existingReadQuery);
    const readMessageIds = new Set(
      existingReadSnapshot.docs.map(doc => doc.data().messageId)
    );
    
    // Mark unread messages as read
    const markAsReadPromises: Promise<any>[] = [];
    
    messagesSnapshot.forEach((doc) => {
      const data = doc.data() as GroupMessageData;
      // Don't mark own messages as read and skip already read messages
      if (data.senderId !== userId && !readMessageIds.has(doc.id)) {
        const readStatusData: GroupReadStatus = {
          messageId: doc.id,
          groupId,
          userId,
          readAt: serverTimestamp() as Timestamp
        };
        markAsReadPromises.push(addDoc(readStatusRef, readStatusData));
      }
    });
    
    await Promise.all(markAsReadPromises);
  } catch (error) {
    console.error('Error marking all group messages as read:', error);
    throw error;
  }
}

/**
 * Get unread message count for user in group
 */
export async function getUnreadGroupMessageCount(
  groupId: string,
  userId: string
): Promise<number> {
  try {
    // Get all messages in the group (no compound query needed)
    const messagesRef = collection(db, GROUP_MESSAGES_COLLECTION);
    const messagesQuery = query(
      messagesRef,
      where('groupId', '==', groupId)
    );
    
    const messagesSnapshot = await getDocs(messagesQuery);
    
    // Get read statuses for this user
    const readStatusRef = collection(db, GROUP_READ_STATUS_COLLECTION);
    const readStatusQuery = query(
      readStatusRef,
      where('groupId', '==', groupId),
      where('userId', '==', userId)
    );
    
    const readStatusSnapshot = await getDocs(readStatusQuery);
    const readMessageIds = new Set(
      readStatusSnapshot.docs.map(doc => doc.data().messageId)
    );
    
    // Count unread messages (exclude own messages on client side)
    let unreadCount = 0;
    messagesSnapshot.forEach((doc) => {
      const messageData = doc.data() as GroupMessageData;
      // Skip messages sent by the current user
      if (messageData.senderId === userId) {
        return;
      }
      
      if (!readMessageIds.has(doc.id)) {
        unreadCount++;
      }
    });
    
    return unreadCount;
  } catch (error) {
    console.error('Error getting unread group message count:', error);
    throw error;
  }
}

/**
 * Get the last message in a group
 */
export async function getLastGroupMessage(groupId: string): Promise<GroupMessage | null> {
  try {
    const messagesRef = collection(db, GROUP_MESSAGES_COLLECTION);
    const lastMessageQuery = query(
      messagesRef,
      where('groupId', '==', groupId),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    
    const lastMessageSnapshot = await getDocs(lastMessageQuery);
    
    if (lastMessageSnapshot.empty) {
      return null;
    }
    
    const doc = lastMessageSnapshot.docs[0];
    const data = doc.data() as GroupMessageData;
    
    return {
      id: doc.id,
      groupId: data.groupId,
      senderId: data.senderId,
      content: data.content,
      timestamp: data.timestamp ? data.timestamp.toDate() : new Date()
    };
  } catch (error) {
    console.error('Error getting last group message:', error);
    throw error;
  }
}

/**
 * Edit a group message
 */
export async function editGroupMessage(
  messageId: string,
  newContent: string,
  userId: string
): Promise<void> {
  try {
    const messageRef = doc(db, GROUP_MESSAGES_COLLECTION, messageId);
    await updateDoc(messageRef, {
      content: newContent.trim(),
      edited: true,
      editedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error editing group message:', error);
    throw error;
  }
}

/**
 * Delete a group message
 */
export async function deleteGroupMessage(messageId: string, userId: string): Promise<void> {
  try {
    const messageRef = doc(db, GROUP_MESSAGES_COLLECTION, messageId);
    await updateDoc(messageRef, {
      content: '[Message deleted]',
      edited: true,
      editedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error deleting group message:', error);
    throw error;
  }
}

/**
 * Get message read status (who has read the message)
 */
export async function getMessageReadStatus(
  messageId: string,
  groupId: string
): Promise<GroupReadStatus[]> {
  try {
    const readStatusRef = collection(db, GROUP_READ_STATUS_COLLECTION);
    const readStatusQuery = query(
      readStatusRef,
      where('messageId', '==', messageId),
      where('groupId', '==', groupId)
    );
    
    const readStatusSnapshot = await getDocs(readStatusQuery);
    const readStatuses: GroupReadStatus[] = [];
    
    readStatusSnapshot.forEach((doc) => {
      const data = doc.data() as GroupReadStatus;
      readStatuses.push({
        messageId: data.messageId,
        groupId: data.groupId,
        userId: data.userId,
        readAt: data.readAt
      });
    });
    
    return readStatuses;
  } catch (error) {
    console.error('Error getting message read status:', error);
    throw error;
  }
}

/**
 * Listen to group messages in real-time
 */
export function listenToGroupMessages(
  groupId: string,
  callback: (messages: GroupMessage[]) => void,
  onError?: (error: Error) => void,
  limitCount: number = 50
): () => void {
  const messagesRef = collection(db, GROUP_MESSAGES_COLLECTION);
  const messagesQuery = query(
    messagesRef,
    where('groupId', '==', groupId),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );
  
  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      try {
        const messages: GroupMessage[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data() as GroupMessageData;
          messages.push({
            id: doc.id,
            groupId: data.groupId,
            senderId: data.senderId,
            content: data.content,
            timestamp: data.timestamp ? data.timestamp.toDate() : new Date()
          });
        });
        
        // Sort messages by timestamp (oldest first for chat display)
        const sortedMessages = messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        callback(sortedMessages);
      } catch (error) {
        console.error('Error in group messages listener:', error);
        onError?.(error as Error);
      }
    },
    (error) => {
      console.error('Group messages listener error:', error);
      onError?.(error);
    }
  );
}

/**
 * Listen to unread count changes for a user in a group
 */
export function listenToGroupUnreadCount(
  groupId: string,
  userId: string,
  callback: (unreadCount: number) => void,
  onError?: (error: Error) => void
): () => void {
  // Listen to both messages and read status changes
  const messagesRef = collection(db, GROUP_MESSAGES_COLLECTION);
  const messagesQuery = query(
    messagesRef,
    where('groupId', '==', groupId)
  );
  
  const readStatusRef = collection(db, GROUP_READ_STATUS_COLLECTION);
  const readStatusQuery = query(
    readStatusRef,
    where('groupId', '==', groupId),
    where('userId', '==', userId)
  );
  
  let messages: GroupMessageData[] = [];
  let readStatuses: GroupReadStatus[] = [];
  
  const calculateUnreadCount = () => {
    const readMessageIds = new Set(readStatuses.map(status => status.messageId));
    const unreadCount = messages.filter(msg => 
      msg.senderId !== userId && !readMessageIds.has(msg.id)
    ).length;
    callback(unreadCount);
  };
  
  const unsubscribeMessages = onSnapshot(
    messagesQuery,
    (snapshot) => {
      try {
        messages = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as GroupMessageData;
          messages.push({ ...data, id: doc.id });
        });
        calculateUnreadCount();
      } catch (error) {
        console.error('Error in group messages unread listener:', error);
        onError?.(error as Error);
      }
    },
    (error) => {
      console.error('Group messages unread listener error:', error);
      onError?.(error);
    }
  );
  
  const unsubscribeReadStatus = onSnapshot(
    readStatusQuery,
    (snapshot) => {
      try {
        readStatuses = [];
        snapshot.forEach((doc) => {
          readStatuses.push(doc.data() as GroupReadStatus);
        });
        calculateUnreadCount();
      } catch (error) {
        console.error('Error in read status listener:', error);
        onError?.(error as Error);
      }
    },
    (error) => {
      console.error('Read status listener error:', error);
      onError?.(error);
    }
  );
  
  // Return combined unsubscribe function
  return () => {
    unsubscribeMessages();
    unsubscribeReadStatus();
  };
}