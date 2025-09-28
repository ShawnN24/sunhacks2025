export interface Friend {
  id: string;
  uid: string;
  name?: string; // For backward compatibility
  displayName: string;
  email: string;
  avatar?: string; // For backward compatibility
  photoURL?: string;
  status: 'online' | 'offline';
  lastSeen: Date;
  isPending?: boolean; // For friend requests
  isOutgoing?: boolean; // For outgoing friend requests
}

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  read: boolean;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  members: string[];
  createdAt: Date;
  photoURL: string;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  content: string;
  timestamp: Date;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  participants: string[];
  lastMessage?: DirectMessage | GroupMessage;
  unreadCount: number;
  updatedAt: Date;
}

export type MessagingView = 'conversations' | 'search' | 'groups' | 'chat';

export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: Date;
  address?: string;
}

export interface UserLocation {
  userId: string;
  location: Location;
  lastUpdated: Date;
}

export interface TriangulationRequest {
  currentUserLocation: Location;
  friendLocations: UserLocation[];
  groupId?: string;
  conversationType: 'direct' | 'group';
}

export interface TriangulationResult {
  meetingPoint: Location;
  suggestions: string[]; // Activity suggestions
  estimatedTravelTime?: number;
  distance?: number;
  outlierFiltering?: {
    enabled: boolean;
    outliersRemoved: number;
    originalPointCount: number;
    filteredPointCount: number;
    outlierThreshold?: number;
  };
}

export interface MessagingState {
  friends: Friend[];
  groups: Group[];
  conversations: Conversation[];
  activeConversation: Conversation | null;
  conversationMessages: (DirectMessage | GroupMessage)[];
  searchQuery: string;
  searchResults: Friend[];
  messagingView: MessagingView;
  newGroupName: string;
  selectedFriendsForGroup: string[];
  directMessageInput: string;
  isLoading: boolean;
}