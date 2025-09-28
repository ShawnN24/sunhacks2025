"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { logout, onAuthStateChange } from "@/lib/firebase/auth";
import { User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import { Truculenta } from "next/font/google";
import { SideButtonBubble, BUTTON_CONFIGS } from "@/app/components/SideButton";

// Firebase services
import {
  createUserProfile,
  updateUserStatus,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
  listenToIncomingFriendRequests,
  getFriends,
  listenToFriends,
} from '@/lib/firebase/friends';
import {
  createGroup,
  getUserGroups,
  listenToUserGroups,
  deleteGroup,
} from '@/lib/firebase/groups';
import {
  sendDirectMessage,
  getDirectMessages,
  listenToDirectMessages,
  markDirectMessagesAsRead,
} from '@/lib/firebase/directMessages';
import {
  sendGroupMessage,
  getGroupMessages,
  listenToGroupMessages,
  markAllGroupMessagesAsRead,
} from '@/lib/firebase/groupMessages';
import {
  getUserConversations,
  listenToConversations,
  markConversationAsRead
} from '@/lib/firebase/conversations';
import {
  updateUserLocation,
  disableUserLocation,
  toggleLocationVisibility,
  listenToFriendsLocations,
  getLocationPreferences,
  FriendLocation
} from '@/lib/firebase/locations';
import { 
  ConversationList, 
  FriendSearch, 
  GroupCreation, 
  ChatView,
  Friend,
  DirectMessage,
  Group,
  GroupMessage,
  Conversation
} from "@/app/components/messages";
import FriendsMarkers from "@/app/components/FriendsMarkers";
import LocationSettings from "@/app/components/LocationSettings";
import monkeyMarkerUrl from '../images/beardot.png';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Place interface for Google Places API results
interface Place {
  name: string;
  lat: number;
  lng: number;
  address: string;
  place_id: string;
}

export default function Homescreen() {
  const [user, setUser] = useState<User | null>(null);
  const [activePopup, setActivePopup] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchCenter, setSearchCenter] = useState<{lat:number, lng:number} | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number, name: string, address: string} | null>(null);

  // Google Places API functions using server-side route
  const searchPlaces = async (query: string): Promise<Place[]> => {
    if (!query.trim()) return [];
    
    try {
      const response = await fetch(`/api/places?query=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data.error) {
        console.error('Places API error:', data.error);
        return [];
      }
      
      return data.places || [];
    } catch (error) {
      console.error('Error searching places:', error);
      return [];
    }
  };

  const getNearbyPlaces = async (lat: number, lng: number): Promise<Place[]> => {
    try {
      const response = await fetch(`/api/places?type=nearby&lat=${lat}&lng=${lng}`);
      const data = await response.json();
      
      if (data.error) {
        console.error('Places API error:', data.error);
        return [];
      }
      
      return data.places || [];
    } catch (error) {
      console.error('Error fetching nearby places:', error);
      return [];
    }
  };

  // Load nearby places on component mount
  useEffect(() => {
    const loadNearbyPlaces = async () => {
      const nearbyPlaces = await getNearbyPlaces(33.425, -111.9400); // Tempe, AZ
      setPlaces(nearbyPlaces);
    };
    loadNearbyPlaces();
  }, []);
  const [currentLocation, setCurrentLocation] = useState<{lat:number, lng:number} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Messaging states
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [conversationMessages, setConversationMessages] = useState<(DirectMessage | GroupMessage)[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<Friend[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<Friend[]>([]);
  const [messagingView, setMessagingView] = useState<'conversations' | 'search' | 'groups' | 'chat' | 'location-settings'>('conversations');
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedFriendsForGroup, setSelectedFriendsForGroup] = useState<string[]>([]);
  const [directMessageInput, setDirectMessageInput] = useState('');

  // Location tracking states
  const [friendsLocations, setFriendsLocations] = useState<FriendLocation[]>([]);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [isLocationVisible, setIsLocationVisible] = useState(true);
  const [locationWatchId, setLocationWatchId] = useState<number | null>(null);
  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (authUser: User | null) => {
      if (!authUser) {
        router.push('/');
      } else {
        setUser(authUser);
        
        // Initialize user profile in Firebase
        try {
          await createUserProfile(authUser.uid, {
            uid: authUser.uid,
            displayName: authUser.displayName || 'Unknown User',
            email: authUser.email || '',
            photoURL: authUser.photoURL || undefined,
            status: 'online'
          });
        } catch (error) {
          console.error('Error initializing user profile:', error);
        }
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Set up Firebase listeners when user is authenticated
  useEffect(() => {
    if (!user) return;

    const unsubscribers: (() => void)[] = [];

    // Listen to friends changes
    const unsubscribeFriends = listenToFriends(
      user.uid,
      (updatedFriends: Friend[]) => {
        setFriends(updatedFriends);
      },
      (error: Error) => {
        console.error('Friends listener error:', error);
      }
    );
    unsubscribers.push(unsubscribeFriends);

    // Listen to incoming friend requests
    const unsubscribeIncomingRequests = listenToIncomingFriendRequests(
      user.uid,
      (requests: Friend[]) => {
        setIncomingRequests(requests);
      },
      (error: Error) => {
        console.error('Incoming requests listener error:', error);
      }
    );
    unsubscribers.push(unsubscribeIncomingRequests);

    // Load outgoing friend requests (no real-time listener needed for outgoing)
    const loadOutgoingRequests = async () => {
      try {
        const outgoing = await getOutgoingFriendRequests(user.uid);
        setOutgoingRequests(outgoing);
      } catch (error) {
        console.error('Error loading outgoing requests:', error);
      }
    };
    loadOutgoingRequests();

    // Listen to groups changes
    const unsubscribeGroups = listenToUserGroups(
      user.uid,
      (updatedGroups: Group[]) => {
        setGroups(updatedGroups);
      },
      (error: Error) => {
        console.error('Groups listener error:', error);
      }
    );
    unsubscribers.push(unsubscribeGroups);

    // Listen to conversations changes
    const unsubscribeConversations = listenToConversations(
      user.uid,
      (updatedConversations: Conversation[]) => {
        setConversations(updatedConversations);
      },
      (error: Error) => {
        console.error('Conversations listener error:', error);
      }
    );
    unsubscribers.push(unsubscribeConversations);

    // Load location preferences
    const loadLocationPreferences = async () => {
      try {
        const preferences = await getLocationPreferences(user.uid);
        if (preferences) {
          setIsLocationEnabled(preferences.isLocationEnabled);
          setIsLocationVisible(preferences.isVisible);
        }
      } catch (error) {
        console.error('Error loading location preferences:', error);
      }
    };
    loadLocationPreferences();

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [user]);

  // Set up friends location listener
  useEffect(() => {
    if (!user || friends.length === 0) {
      setFriendsLocations([]);
      return;
    }

    const friendIds = friends.map(friend => friend.uid);
    const unsubscribe = listenToFriendsLocations(
      friendIds,
      (locations: FriendLocation[]) => {
        setFriendsLocations(locations);
      },
      (error: Error) => {
        console.error('Friends locations listener error:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user, friends]);

  // Set up location tracking
  useEffect(() => {
    if (!user || !isLocationEnabled || !isLocationVisible) {
      // Stop location tracking if disabled or not visible
      if (locationWatchId !== null) {
        navigator.geolocation.clearWatch(locationWatchId);
        setLocationWatchId(null);
      }
      
      // Disable location in Firebase if needed
      if (user && (!isLocationEnabled || !isLocationVisible)) {
        disableUserLocation(user.uid).catch(console.error);
      }
      
      return;
    }

    // Start location tracking
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          
          try {
            await updateUserLocation(
              user.uid,
              user.displayName || 'Unknown User',
              user.photoURL || undefined,
              latitude,
              longitude,
              accuracy || undefined,
              isLocationVisible
            );
            
            // Update local current location
            setCurrentLocation({ lat: latitude, lng: longitude });
          } catch (error) {
            console.error('Error updating location:', error);
          }
        },
        (error) => {
          console.error('Location tracking error:', error);
          // Disable location sharing on error
          setIsLocationEnabled(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 60000, // Increased timeout to 60 seconds
          maximumAge: 60000 // Cache position for 60 seconds
        }
      );

      setLocationWatchId(watchId);

      return () => {
        navigator.geolocation.clearWatch(watchId);
        setLocationWatchId(null);
      };
    }
  }, [user, isLocationEnabled, isLocationVisible]);

  // Set up message listener for active conversation
  useEffect(() => {
    if (!activeConversation || !user) return;

    let unsubscribeMessages: (() => void) | undefined;

    if (activeConversation.type === 'direct') {
      const otherUserId = activeConversation.participants.find(p => p !== user.uid);
      if (otherUserId) {
        unsubscribeMessages = listenToDirectMessages(
          user.uid,
          otherUserId,
          (messages: DirectMessage[]) => {
            setConversationMessages(messages);
          },
          (error: Error) => {
            console.error('Direct messages listener error:', error);
          }
        );
      }
    } else if (activeConversation.type === 'group') {
      const groupId = activeConversation.id.replace('group_', '');
      unsubscribeMessages = listenToGroupMessages(
        groupId,
        (messages: GroupMessage[]) => {
          setConversationMessages(messages);
        },
        (error: Error) => {
          console.error('Group messages listener error:', error);
        }
      );
    }

    return () => {
      unsubscribeMessages?.();
    };
  }, [activeConversation, user]);

  // Update user status on mount/unmount
  useEffect(() => {
    if (!user) return;

    updateUserStatus(user.uid, 'online');

    const handleBeforeUnload = () => {
      updateUserStatus(user.uid, 'offline');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      updateUserStatus(user.uid, 'offline');
    };
  }, [user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          history: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
      });

      const data = await response.json();
      console.log('API Response:', data);

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        console.error('API Error:', data.error, data.details);
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Helper function to get sender name by ID
  const getSenderName = (senderId: string): string => {
    const friend = friends.find(f => f.uid === senderId);
    return friend?.displayName || 'Unknown User';
  };

  // Messaging Functions
  const searchFriends = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    if (!user) return;

    console.log('Searching for users with query:', query, 'Current user ID:', user.uid);
    
    setIsLoading(true);
    try {
      const users = await searchUsers(query, user.uid);
      console.log('Search results:', users);
      setSearchResults(users);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addFriend = async (friendId: string) => {
    if (!user) return;
    
    try {
      await sendFriendRequest(user.uid, friendId);
      // Refresh outgoing requests to show the new request
      const outgoing = await getOutgoingFriendRequests(user.uid);
      setOutgoingRequests(outgoing);
    } catch (error) {
      console.error('Failed to send friend request:', error);
    }
  };

  const acceptFriend = async (friendId: string) => {
    if (!user) return;
    
    try {
      await acceptFriendRequest(user.uid, friendId);
      // The listeners will update friends and remove from incoming requests
    } catch (error) {
      console.error('Failed to accept friend request:', error);
    }
  };

  const rejectFriend = async (friendId: string) => {
    if (!user) return;
    
    try {
      await rejectFriendRequest(user.uid, friendId);
      // The listener will remove from incoming requests
    } catch (error) {
      console.error('Failed to reject friend request:', error);
    }
  };

  const cancelRequest = async (friendId: string) => {
    if (!user) return;
    
    try {
      await cancelFriendRequest(user.uid, friendId);
      // Refresh outgoing requests
      const outgoing = await getOutgoingFriendRequests(user.uid);
      setOutgoingRequests(outgoing);
    } catch (error) {
      console.error('Failed to cancel friend request:', error);
    }
  };

  const handleSendDirectMessage = async () => {
    if (!directMessageInput.trim() || !activeConversation || !user) return;

    const receiverId = activeConversation.participants.find(p => p !== user.uid);
    if (!receiverId) return;

    try {
      await sendDirectMessage(user.uid, receiverId, directMessageInput.trim());
      setDirectMessageInput('');
      // The real-time listener will update the conversation messages
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || selectedFriendsForGroup.length < 2 || !user) {
      if (selectedFriendsForGroup.length < 2) {
        alert('Groups must have at least 3 people (you + 2 friends). Please select at least 2 more friends.');
      }
      return;
    }

    try {
      const members = [user.uid, ...selectedFriendsForGroup];
      await createGroup(newGroupName.trim(), user.uid, members);
      
      setNewGroupName('');
      setSelectedFriendsForGroup([]);
      setMessagingView('conversations');
      // The real-time listener will update the groups list
    } catch (error) {
      console.error('Failed to create group:', error);
      alert('Failed to create group. Please try again.');
    }
  };

  const handleSendGroupMessage = async () => {
    if (!directMessageInput.trim() || !activeConversation || !user) return;

    try {
      // Extract group ID from conversation ID (format: "group_${groupId}")
      const groupId = activeConversation.id.replace('group_', '');
      await sendGroupMessage(groupId, user.uid, directMessageInput.trim());
      setDirectMessageInput('');
      // The real-time listener will update the conversation messages
    } catch (error) {
      console.error('Failed to send group message:', error);
    }
  };

  const openConversation = async (conversation: Conversation) => {
    setActiveConversation(conversation);
    setMessagingView('chat');
    
    // Mark messages as read when conversation is opened
    if (user && conversation.unreadCount > 0) {
      try {
        if (conversation.type === 'direct') {
          const otherUserId = conversation.participants.find(p => p !== user.uid);
          if (otherUserId) {
            // Mark direct messages from the other user as read
            await markDirectMessagesAsRead(otherUserId, user.uid);
          }
        } else if (conversation.type === 'group') {
          const groupId = conversation.id.replace('group_', '');
          // Mark all group messages as read for this user
          await markAllGroupMessagesAsRead(groupId, user.uid);
        }
        
        // Update local conversations state to immediately reflect the change
        setConversations(prev => 
          prev.map(conv => 
            conv.id === conversation.id 
              ? { ...conv, unreadCount: 0 }
              : conv
          )
        );
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    }
    
    // Load existing messages for the conversation
    try {
      if (conversation.type === 'direct' && user) {
        const otherUserId = conversation.participants.find(p => p !== user.uid);
        if (otherUserId) {
          const messages = await getDirectMessages(user.uid, otherUserId);
          setConversationMessages(messages);
        }
      } else if (conversation.type === 'group') {
        const groupId = conversation.id.replace('group_', '');
        const messages = await getGroupMessages(groupId);
        setConversationMessages(messages);
      }
    } catch (error) {
      console.error('Error loading conversation messages:', error);
      setConversationMessages([]);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!user) return;

    try {
      await deleteGroup(groupId, user.uid);
      // If the deleted group was the active conversation, go back to conversations
      if (activeConversation && activeConversation.id === `group_${groupId}`) {
        setActiveConversation(null);
        setMessagingView('conversations');
        setConversationMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete group:', error);
      alert('Failed to delete group. You can only delete groups you created.');
    }
  };

  const handleDirectMessageKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (activeConversation?.type === 'direct') {
        handleSendDirectMessage();
      } else {
        handleSendGroupMessage();
      }
    }
  };

  // Location functions
  const handleLocationToggle = async (enabled: boolean) => {
    setIsLocationEnabled(enabled);
    
    if (!enabled && user) {
      // Stop location tracking and disable in Firebase
      if (locationWatchId !== null) {
        navigator.geolocation.clearWatch(locationWatchId);
        setLocationWatchId(null);
      }
      await disableUserLocation(user.uid);
    }
  };

  const handleVisibilityToggle = async (visible: boolean) => {
    setIsLocationVisible(visible);
    
    if (user) {
      await toggleLocationVisibility(user.uid, visible);
    }
  };

  const handleFriendLocationClick = (friend: FriendLocation) => {
    // Find the friend in the friends list and open a direct conversation
    const friendData = friends.find(f => f.uid === friend.userId);
    if (friendData && user) {
      const conversationId = `direct_${[user.uid, friend.userId].sort().join('_')}`;
      const conversation: Conversation = {
        id: conversationId,
        type: 'direct',
        participants: [user.uid, friend.userId],
        lastMessage: undefined,
        unreadCount: 0,
        updatedAt: new Date()
      };
      
      // Switch to messages popup and open conversation
      setActivePopup(2);
      setActiveConversation(conversation);
      setMessagingView('chat');
    }
  };

  // Get current position and set search center + open search popup
  const handleLocateMe = () => {
    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentLocation(loc);
        // center map on current location; Search popup is not opened by default
      },
      (err) => {
        console.error('Geolocation error', err);
        let errorMessage = 'Unable to retrieve your location.';
        
        switch(err.code) {
          case 1: // PERMISSION_DENIED
            errorMessage = 'Location access denied. Please enable location permissions in your browser.';
            break;
          case 2: // POSITION_UNAVAILABLE
            errorMessage = 'Location information is unavailable. Please check your GPS/network connection.';
            break;
          case 3: // TIMEOUT
            errorMessage = 'Location request timed out. Please try again.';
            break;
        }
        
        alert(errorMessage);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 15000, // 15 second timeout for manual location requests
        maximumAge: 60000 // Accept cached position up to 1 minute old
      }
    );
  };

  return (
    <div className="relative w-screen h-screen bg-gray-100">
      {/* Left middle bubble menu using SideButton components */}
      <div className="absolute top-1/2 left-8 transform -translate-y-1/2 z-40">
        <div className="flex flex-col space-y-3">
          {[
            BUTTON_CONFIGS.SEARCH.icon,
            BUTTON_CONFIGS.AI_ASSISTANT.icon,
            BUTTON_CONFIGS.MESSAGES.icon,
            BUTTON_CONFIGS.LOGOUT.icon
          ].map((icon, i) => (
            <SideButtonBubble
              key={i}
              icon={icon}
              isActive={activePopup === i}
              isSpecial={i === 3}
              onClick={() => i === 3 ? handleLogout() : setActivePopup(activePopup === i ? null : i)}
            />
          ))}
        </div>
      </div>

      {/* Expanding Popup Windows */}
      <AnimatePresence>
        {activePopup !== null && activePopup !== 3 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30"
            style={{ pointerEvents: 'none' }}
          >
            {/* Expanding rectangle from bubble position */}
            <motion.div
              initial={{ 
                width: "48px", 
                height: "48px", 
                x: 32, // left-8 = 32px (bubble container position)
                y: `calc(50% - 24px + ${activePopup * 60 - 60}px)`, // Exact bubble position from middle
                borderRadius: "50%"
              }}
              animate={{ 
                width: "400px", 
                height: "100vh", 
                x: 104, // Position to the right of left bubbles (32px + 72px gap)
                y: 0, // Start from top of screen
                borderRadius: "12px"
              }}
              exit={{ 
                width: "48px", 
                height: "48px", 
                x: 32, // Return to bubble container position
                y: `calc(50% - 24px + ${activePopup * 60 - 60}px)`, // Return to exact bubble position
                borderRadius: "50%"
              }}
              transition={{ 
                type: "spring", 
                damping: 20, 
                stiffness: 300,
                duration: 0.4
              }}
              className="absolute overflow-hidden bg-[#00af64] shadow-2xl"
              style={{ pointerEvents: 'auto' }}
            >
              {/* Content area */}
              <div className="p-6 h-full">
                {/* Different content for each popup */}
                {activePopup === 0 && (
                  <div className="h-full flex flex-col">
                    <h2 className="text-2xl font-bold text-white mb-4">Search</h2>
                    
                    {/* Location Display Menu */}
                    {selectedLocation && (
                      <div className="mb-4 p-4 bg-white bg-opacity-20 rounded-lg">
                        <h3 className="text-lg font-semibold text-black mb-2">{selectedLocation.name}</h3>
                        <div className="text-sm text-black text-opacity-90">
                          <p className="mb-2">{selectedLocation.address}</p>
                        </div>
                        <div className="mt-3 flex space-x-2">
                          <button 
                            onClick={() => setSearchCenter(selectedLocation)}
                            className="px-3 py-1 bg-white bg-opacity-30 text-black rounded text-sm hover:bg-opacity-40 transition-colors"
                          >
                            Go to Location
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedLocation(null);
                              // Restore the previous search if available
                              if ((window as any).restoreSearch) {
                                (window as any).restoreSearch();
                              }
                            }}
                            className="px-3 py-1 bg-blue-500 bg-opacity-30 text-black rounded text-sm hover:bg-opacity-40 transition-colors"
                          >
                            ← Back to Search
                          </button>
                          <button 
                            onClick={() => setSelectedLocation(null)}
                            className="px-3 py-1 bg-red-500 bg-opacity-30 text-black rounded text-sm hover:bg-opacity-40 transition-colors"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <Searchbar 
                      onSelect={(place) => {
                        // If the search was cleared, the parent will call onSelect(null)
                        if (!place) return;
                        setSearchCenter({lat: place.lat, lng: place.lng});
                        // Set the selected location to show in the popup with actual place info
                        setSelectedLocation({
                          lat: place.lat,
                          lng: place.lng,
                          name: place.name,
                          address: place.address
                        });
                        
                        // Close any existing POI info window first
                        if ((window as any).closeCustomInfoWindow) {
                          (window as any).closeCustomInfoWindow();
                        }
                        
                        // Also create a custom POI info window for the search result
                        const placeDetails = {
                          name: place.name,
                          formatted_address: place.address,
                          rating: null,
                          types: []
                        };
                        
                        // Create custom info window (reuse the same function from MapController)
                        if ((window as any).createCustomInfoWindow) {
                          (window as any).createCustomInfoWindow(placeDetails, place.lat, place.lng);
                        }
                      }}
                      onBackToSearch={(restoreFunction) => {
                        // Store the restore function for use in the back button
                        (window as any).restoreSearch = restoreFunction;
                      }}
                      onClearMemory={(clearFunction) => {
                        // Store the clear function for use when clicking on map
                        (window as any).clearSearchMemory = clearFunction;
                      }}
                    />
                  </div>
                )}
                
                {activePopup === 1 && (
                  <div className="h-full flex flex-col">
                    <h2 className="text-2xl font-bold text-black mb-4">Chat with MApI</h2>
                    
                    {/* Messages Container */}
                    <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
                      {messages.length === 0 && (
                        <div className="text-black text-opacity-60 text-center py-8">
                          <p>Start a conversation with MApI!</p>
                          <p className="text-sm mt-2">Ask me anything about locations, directions, or places.</p>
                        </div>
                      )}
                      
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] p-3 rounded-lg ${
                              message.role === 'user'
                                ? 'bg-white bg-opacity-20 text-black'
                                : 'bg-white bg-opacity-10 text-black'
                            }`}
                          >
                            <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                            <p className="text-xs text-black text-opacity-50 mt-1">
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                      
                      {isLoading && (
                        <div className="flex justify-start">
                          <div className="bg-white bg-opacity-10 text-black p-3 rounded-lg">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-white bg-opacity-60 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-white bg-opacity-60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-2 h-2 bg-white bg-opacity-60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div ref={messagesEndRef} />
                    </div>
                    
                    {/* Input Area */}
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask MApI anything..."
                        className="flex-1 p-3 rounded-lg bg-white bg-opacity-20 text-black placeholder-white placeholder-opacity-60 focus:outline-none focus:bg-opacity-30"
                        disabled={isLoading}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!inputMessage.trim() || isLoading}
                        className="px-4 py-3 bg-white bg-opacity-20 text-black rounded-lg hover:bg-opacity-30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13"/>
                          <polygon points="22,2 15,22 11,13 2,9 22,2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
                
                {activePopup === 2 && (
                  <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-bold text-black">Messages</h2>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setMessagingView('search')}
                          className={`p-2 rounded-lg transition-colors relative ${
                            messagingView === 'search' 
                              ? 'bg-white bg-opacity-30' 
                              : 'bg-white bg-opacity-10 hover:bg-opacity-20'
                          }`}
                          title="Search Friends"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8"/>
                            <path d="m21 21-4.35-4.35"/>
                          </svg>
                          {incomingRequests.length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                              {incomingRequests.length}
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => setMessagingView('groups')}
                          className={`p-2 rounded-lg transition-colors ${
                            messagingView === 'groups' 
                              ? 'bg-white bg-opacity-30' 
                              : 'bg-white bg-opacity-10 hover:bg-opacity-20'
                          }`}
                          title="Create Group"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => setMessagingView('location-settings')}
                          className={`p-2 rounded-lg transition-colors relative ${
                            messagingView === 'location-settings' 
                              ? 'bg-white bg-opacity-30' 
                              : 'bg-white bg-opacity-10 hover:bg-opacity-20'
                          }`}
                          title="Location Settings"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                          </svg>
                          {isLocationEnabled && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></div>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Conversations View */}
                    {messagingView === 'conversations' && (
                      <ConversationList
                        conversations={conversations}
                        friends={friends}
                        groups={groups}
                        user={user}
                        onConversationClick={openConversation}
                        onDeleteGroup={handleDeleteGroup}
                      />
                    )}

                    {/* Search Friends View */}
                    {messagingView === 'search' && (
                      <FriendSearch
                        searchQuery={searchQuery}
                        searchResults={searchResults}
                        friends={friends}
                        incomingRequests={incomingRequests}
                        outgoingRequests={outgoingRequests}
                        isLoading={isLoading}
                        onSearchQueryChange={(query) => {
                          setSearchQuery(query);
                          searchFriends(query);
                        }}
                        onAddFriend={addFriend}
                        onAcceptFriend={acceptFriend}
                        onRejectFriend={rejectFriend}
                        onCancelRequest={cancelRequest}
                        onBack={() => setMessagingView('conversations')}
                      />
                    )}

                    {/* Create Group View */}
                    {messagingView === 'groups' && (
                      <GroupCreation
                        groupName={newGroupName}
                        selectedMembers={friends.filter(f => selectedFriendsForGroup.includes(f.uid))}
                        friends={friends}
                        onGroupNameChange={setNewGroupName}
                        onMemberToggle={(friend) => {
                          if (selectedFriendsForGroup.includes(friend.uid)) {
                            setSelectedFriendsForGroup(prev => prev.filter(id => id !== friend.uid));
                          } else {
                            setSelectedFriendsForGroup(prev => [...prev, friend.uid]);
                          }
                        }}
                        onCreateGroup={handleCreateGroup}
                        onBack={() => setMessagingView('conversations')}
                      />
                    )}

                    {/* Location Settings View */}
                    {messagingView === 'location-settings' && (
                      <LocationSettings
                        isLocationEnabled={isLocationEnabled}
                        isVisible={isLocationVisible}
                        onLocationToggle={handleLocationToggle}
                        onVisibilityToggle={handleVisibilityToggle}
                        onBack={() => setMessagingView('conversations')}
                      />
                    )}

                    {/* Chat View */}
                    {messagingView === 'chat' && activeConversation && (
                      <ChatView
                        conversation={{
                          type: activeConversation.type,
                          friend: activeConversation.type === 'direct' 
                            ? friends.find(f => activeConversation.participants.includes(f.uid))
                            : undefined,
                          group: activeConversation.type === 'group'
                            ? groups.find(g => activeConversation.participants.every(p => g.members.includes(p)))
                            : undefined
                        }}
                        messages={conversationMessages}
                        newMessage={directMessageInput}
                        currentUserId={user?.uid || ''}
                        getSenderName={getSenderName}
                        onNewMessageChange={setDirectMessageInput}
                        onSendMessage={activeConversation.type === 'direct' ? handleSendDirectMessage : handleSendGroupMessage}
                        onBack={() => setMessagingView('conversations')}
                      />
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating locate button (bottom-right) */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          aria-label="Locate me"
          onClick={handleLocateMe}
          className="w-12 h-12 rounded-full bg-[#0f9d63] text-white shadow-lg flex items-center justify-center hover:bg-[#0e8f57] transition-shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0f9d63]"
        >
          {/* higher-contrast target icon (white) */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" fill="white" />
            <path d="M12 2v2" stroke="white" />
            <path d="M12 20v2" stroke="white" />
            <path d="M2 12h2" stroke="white" />
            <path d="M20 12h2" stroke="white" />
          </svg>
        </button>
      </div>

      {/* Google Maps Background */}
      <div className="absolute inset-0 z-0">
        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!} libraries={['places']}>
          <Map
            style={{width: '100%', height: '100%'}}
            defaultCenter={{lat: 33.425, lng: -111.9400}}
            defaultZoom={13}
            gestureHandling='greedy'
            disableDefaultUI={true}
            clickableIcons={true}
            disableDoubleClickZoom={false}
            mapTypeControl={false}
            streetViewControl={false}
            fullscreenControl={false}
            zoomControl={true}
          />
          <MapController 
            center={searchCenter} 
            places={places}
            onLocationClick={(lat, lng, name, address) => {
              setSelectedLocation({lat, lng, name, address});
              // Clear search memory when clicking on map
              if ((window as any).clearSearchMemory) {
                (window as any).clearSearchMemory();
              }
              // Auto-open search popup when location is clicked
              if (activePopup !== 0) {
                setActivePopup(0);
              }
            }}
          />
          <Markers onMarkerClick={(loc) => { setSearchCenter(loc); setActivePopup(0); }} />
          <SearchMarker center={searchCenter} />
          <CurrentLocationMarker center={currentLocation} />
          <FriendsMarkers 
            friendsLocations={friendsLocations}
            currentUserLocation={currentLocation}
            onFriendClick={handleFriendLocationClick}
          />
        </APIProvider>
      </div>
      </div>
  );
}

// MapController component with click handling and enhanced zoom functionality
function MapController({center, places, onLocationClick}:{center: {lat:number, lng:number} | null, places?: Place[], onLocationClick?: (lat: number, lng: number, name: string, address: string) => void}){
  const map = useMap();
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const customInfoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  
  useEffect(() => {
    if(!map) return;
    
    const createCustomInfoWindow = (placeDetails: any, lat: number, lng: number) => {
      // Close existing info window
      if (customInfoWindowRef.current) {
        customInfoWindowRef.current.close();
        customInfoWindowRef.current = null;
      }
      
      // Create custom HTML content
      const content = `
        <div style="padding: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 200px; position: relative;">
          <button onclick="this.closest('.gm-style-iw-c').style.display='none'" 
                  style="position: absolute; top: 4px; right: 4px; background: #00af64; color: white; border: none; border-radius: 75%; width: 20px; height: 20px; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 1000; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
            x
          </button>
          <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 16px; font-weight: 700; padding-right: 24px;">${placeDetails.name || 'Unknown Location'}</h3>
          ${placeDetails.formatted_address ? `<p style="margin: 4px 0; color: #6b7280; font-size: 12px;">${placeDetails.formatted_address}</p>` : ''}
        </div>
      `;
      
      // Create new info window
      customInfoWindowRef.current = new google.maps.InfoWindow({
        content: content,
        position: { lat, lng },
        disableAutoPan: true,
        headerDisabled: true
      });
      
      customInfoWindowRef.current.open(map);
    };
    
    // Make the functions globally accessible for search results
    (window as any).createCustomInfoWindow = createCustomInfoWindow;
    (window as any).closeCustomInfoWindow = () => {
      if (customInfoWindowRef.current) {
        customInfoWindowRef.current.close();
        customInfoWindowRef.current = null;
      }
    };

    // Enable POI clicking but intercept for custom popup
    const enableMapInteractions = () => {
      map.setOptions({
        clickableIcons: true, // Enable POI clicking
        disableDoubleClickZoom: false,
        streetViewControl: false,
        fullscreenControl: false
      });
      
      // Intercept POI clicks and show custom info windows
      const originalAddListener = map.addListener;
      map.addListener = function(eventName: string, handler: Function) {
        if (eventName === 'click') {
          return originalAddListener.call(this, eventName, (event: any) => {
            // Check if click is on a POI by looking for place data
            if (event.placeId) {
              // This is a POI click - handle it with our custom logic
              handlePOIClick(event);
            } else {
              // Regular map click - use existing handler
              handler(event);
            }
          });
        }
        return originalAddListener.call(this, eventName, handler);
      };
    };
    
    // Handle POI clicks with custom logic
    const handlePOIClick = async (event: any) => {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      
      try {
        // Get POI details using the place ID
        const service = new google.maps.places.PlacesService(map);
        const detailsRequest = {
          placeId: event.placeId,
          fields: ['name', 'formatted_address', 'rating', 'types', 'vicinity']
        };
        
        const placeDetails = await new Promise<any>((resolve) => {
          service.getDetails(detailsRequest, (result, status) => {
            if (status === 'OK' && result) {
              resolve(result);
            } else {
              resolve(null);
            }
          });
        });
        
        if (placeDetails) {
          // Close any existing info window first
          if (customInfoWindowRef.current) {
            customInfoWindowRef.current.close();
            customInfoWindowRef.current = null;
          }
          
          // Show custom info window
          createCustomInfoWindow(placeDetails, lat, lng);
          
          // Also show information in the search popup
          const name = placeDetails.name || 'Unknown Location';
          const address = placeDetails.formatted_address || placeDetails.vicinity || '';
          onLocationClick?.(lat, lng, name, address);
        } else {
          // Close any existing info window first
          if (customInfoWindowRef.current) {
            customInfoWindowRef.current.close();
            customInfoWindowRef.current = null;
          }
          
          // Fallback for unknown locations
          const fallbackDetails = {
            name: 'Unknown Location',
            formatted_address: '',
            rating: null,
            types: []
          };
          createCustomInfoWindow(fallbackDetails, lat, lng);
          
          // Also show in search popup
          onLocationClick?.(lat, lng, 'Unknown Location', '');
        }
      } catch (error) {
        console.error('POI click error:', error);
        onLocationClick?.(lat, lng, 'Unknown Location', '');
      }
    };
    
    // Handle clicks on map labels and POIs - route to search popup
    const clickListener = map.addListener('click', async (event: any) => {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      
      // Try to get POI information using Places API nearby search
      try {
        const service = new google.maps.places.PlacesService(map);
        const request = {
          location: { lat, lng },
          radius: 50, // Small radius to catch nearby POIs
          type: 'establishment'
        };
        
        const placesResult = await new Promise<any>((resolve) => {
          service.nearbySearch(request, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              resolve(results[0]);
            } else {
              resolve(null);
            }
          });
        });
        
        if (placesResult) {
          // Close any existing info window first
          if (customInfoWindowRef.current) {
            customInfoWindowRef.current.close();
            customInfoWindowRef.current = null;
          }
          
          // Use POI information from Places API
          const name = placesResult.name || 'Unknown Location';
          const address = placesResult.vicinity || placesResult.formatted_address || '';
          
          // Get additional details if available
          if (placesResult.place_id) {
            const detailsRequest = {
              placeId: placesResult.place_id,
              fields: ['formatted_address', 'name', 'rating', 'types']
            };
            
            const placeDetails = await new Promise<any>((resolve) => {
              service.getDetails(detailsRequest, (result, status) => {
                if (status === 'OK' && result) {
                  resolve(result);
                } else {
                  resolve(null);
                }
              });
            });
            
            const fullAddress = placeDetails?.formatted_address || address;
            onLocationClick?.(lat, lng, name, fullAddress);
          } else {
            onLocationClick?.(lat, lng, name, address);
          }
        } else {
          // Close any existing info window first
          if (customInfoWindowRef.current) {
            customInfoWindowRef.current.close();
            customInfoWindowRef.current = null;
          }
          
          // Fallback to reverse geocoding for non-POI locations
          const geocoder = new google.maps.Geocoder();
          const result = await new Promise<any>((resolve) => {
            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
              if (status === 'OK' && results && results[0]) {
                resolve(results[0]);
              } else {
                resolve(null);
              }
            });
          });
          
          if (result) {
            const name = result.formatted_address || 'Unknown Location';
            const address = result.formatted_address || '';
            onLocationClick?.(lat, lng, name, address);
          } else {
            onLocationClick?.(lat, lng, 'Unknown Location', '');
          }
        }
      } catch (error) {
        console.error('Places API error:', error);
        onLocationClick?.(lat, lng, 'Unknown Location', '');
      }
    });
    
    // Apply the map interactions
    enableMapInteractions();
    
    return () => {
      google.maps.event.removeListener(clickListener);
    };
  }, [map, onLocationClick]);
  
  useEffect(() => {
    if(!map || !center) return;
    
    // Pan to the location
    map.panTo(center);
    
    // Zoom in more for better detail
    map.setZoom(16);
    
    // Remove previous marker
    if (marker) {
      marker.setMap(null);
    }
    
    // Add a green marker at the selected location to match POI styling
    const newMarker = new google.maps.Marker({
      position: center,
      map: map,
      title: "Selected Location",
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14" fill="#00af64" stroke="#ffffff" stroke-width="3"/>
            <circle cx="16" cy="16" r="6" fill="#ffffff"/>
            <path d="M12 8h8v16h-8z" fill="#00af64"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(32, 32),
        anchor: new google.maps.Point(16, 32)
      }
    });
    
    setMarker(newMarker);
    
    // Clean up marker when component unmounts or center changes
    return () => {
      if (newMarker) {
        newMarker.setMap(null);
      }
    };
  }, [map, center]);
  
  
  return null;
}

// Searchbar component with Google Places API
function Searchbar({onSelect, onBackToSearch, onClearMemory}:{onSelect?: (place: Place | null) => void, onBackToSearch?: (restoreFunction: () => void) => void, onClearMemory?: (clearFunction: () => void) => void}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [previousQuery, setPreviousQuery] = useState("");
  const [previousResults, setPreviousResults] = useState<Place[]>([]);

  // Function to restore previous search
  const restorePreviousSearch = useCallback(() => {
    setQuery(previousQuery);
    setResults(previousResults);
  }, [previousQuery, previousResults]);

  // Function to clear search memory
  const clearSearchMemory = useCallback(() => {
    setPreviousQuery("");
    setPreviousResults([]);
  }, []);

  // Expose restore function to parent
  useEffect(() => {
    if (onBackToSearch) {
      onBackToSearch(restorePreviousSearch);
    }
  }, [onBackToSearch, restorePreviousSearch]);

  // Expose clear function to parent
  useEffect(() => {
    if (onClearMemory) {
      onClearMemory(clearSearchMemory);
    }
  }, [onClearMemory, clearSearchMemory]);

  // Debounced search function
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (query.trim()) {
        setIsSearching(true);
        try {
          const response = await fetch(`/api/places?query=${encodeURIComponent(query)}`);
          const data = await response.json();
          
          if (data.error) {
            console.error('Search error:', data.error);
            setResults([]);
          } else {
            setResults(data.places || []);
          }
        } catch (error) {
          console.error('Search error:', error);
          setResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setResults([]);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [query]);

  // If the query is cleared, notify parent to clear the selected search
  useEffect(() => {
    if (query.trim() === "") {
      onSelect && onSelect(null);
    }
  }, [query, onSelect]);

  return (
    <div className="w-full h-full flex flex-col">
      <label htmlFor="search-input" className="sr-only">Search</label>
      <input
        id="search-input"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for a location"
        className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring mb-4"
      />

      <div className="flex-1 overflow-hidden">
        {query === "" ? (
          <div className="text-sm text-black text-opacity-60 h-full flex items-center justify-center">Type to search for places</div>
        ) : isSearching ? (
          <div className="text-sm text-black text-opacity-60 h-full flex items-center justify-center">Searching...</div>
        ) : results.length === 0 ? (
          <div className="text-sm text-black text-opacity-60 h-full flex items-center justify-center">No results found</div>
        ) : (
          <ul className="h-full overflow-y-auto space-y-2 pr-2">
            {results.map((place) => (
              <li
                key={place.place_id}
                className="flex flex-col bg-white bg-opacity-20 p-3 rounded cursor-pointer hover:bg-opacity-30 transition-all duration-200"
                onClick={() => {
                  // Save current search state before clearing
                  setPreviousQuery(query);
                  setPreviousResults(results);
                  
                  onSelect && onSelect(place);
                  // Clear search results and query after selection
                  setQuery("");
                  setResults([]);
                }}
              >
                <span className="font-medium text-black">{place.name}</span>
                <span className="text-xs text-black text-opacity-70">{place.address}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Markers({onMarkerClick}:{onMarkerClick?: (loc:{lat:number,lng:number}) => void}){
  const map = useMap();

  useEffect(() => {
    if (!map) return;

  const markers: google.maps.Marker[] = [];
  const infoWindows: google.maps.InfoWindow[] = [];
  let activeInfoWindow: google.maps.InfoWindow | null = null;

    const clearAll = () => {
      markers.forEach(m => m.setMap(null));
      markers.length = 0;
      infoWindows.forEach(iw => iw.close());
      infoWindows.length = 0;
      activeInfoWindow = null;
    };

    const makeContent = (p: google.maps.places.PlaceResult | any) => {
      const parts: string[] = [];
      if (p.name) parts.push(`<div style="font-weight:700;margin-bottom:6px">${p.name}</div>`);
      const address = p.formatted_address || p.vicinity || p.address;
      if (address) parts.push(`<div style="font-size:13px;color:#374151">${address}</div>`);
      if (p.formatted_phone_number || p.international_phone_number) parts.push(`<div style="font-size:12px;color:#374151;margin-top:6px">📞 ${p.formatted_phone_number || p.international_phone_number}</div>`);
      if (p.website) parts.push(`<div style="font-size:12px;margin-top:6px"><a href="${p.website}" target="_blank" rel="noopener">Website</a></div>`);
      if (p.rating) parts.push(`<div style="margin-top:6px;font-size:12px;color:#f59e0b">⭐ ${p.rating} ${p.user_ratings_total ? `(${p.user_ratings_total})` : ''}</div>`);
      if (p.price_level !== undefined) parts.push(`<div style="font-size:12px;color:#6b7280">Price level: ${p.price_level}</div>`);
      if (p.opening_hours && typeof p.opening_hours === 'object') {
        const openNow = p.opening_hours.open_now ? 'Open now' : 'Closed';
        parts.push(`<div style="font-size:12px;color:#10b981">${openNow}</div>`);
        if (Array.isArray(p.opening_hours.weekday_text) && p.opening_hours.weekday_text.length) {
          parts.push(`<div style="margin-top:6px;font-size:11px;color:#6b7280">${p.opening_hours.weekday_text.slice(0,7).map((s:string)=>`<div>${s}</div>`).join('')}</div>`);
        }
      }
      if (p.place_id) parts.push(`<div style="margin-top:6px;font-size:11px"><a href="https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${p.place_id}" target="_blank" rel="noopener">Open in Google Maps</a></div>`);
      return `<div style="max-width:320px;padding:8px">${parts.join('')}</div>`;
    };

    // When a user clicks a non-POI spot, just place a single marker and try to reverse-geocode
    const showNearby = (lat: number, lng: number) => {
      const loc = new google.maps.LatLng(lat, lng);
      // create a single marker at the clicked location
      const m = new google.maps.Marker({ position: { lat, lng }, map });
      markers.push(m);

      const iw = new google.maps.InfoWindow({ content: `<div style="padding:6px">Looking up address...</div>`, position: { lat, lng } });
      infoWindows.push(iw);
      if (activeInfoWindow) activeInfoWindow.close();
      iw.open(map, m);
      activeInfoWindow = iw;

      // Try reverse geocoding to show an address if available
      try {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
          if (status === 'OK' && results && results[0]) {
            try {
              const addr = results[0].formatted_address;
              iw.setContent(`<div style="max-width:320px;padding:8px"><div style="font-weight:700;margin-bottom:6px">${addr}</div><div style="font-size:12px;color:#6b7280">Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}</div></div>`);
            } catch (e) { /* ignore content errors */ }
          } else {
            try { iw.setContent(`<div style="padding:6px">${lat.toFixed(5)}, ${lng.toFixed(5)}</div>`); } catch (e) {}
          }
        });
      } catch (e) {
        try { iw.setContent(`<div style="padding:6px">${lat.toFixed(5)}, ${lng.toFixed(5)}</div>`); } catch (e) {}
      }

      onMarkerClick && onMarkerClick({ lat, lng });
    };

    const handleClick = (ev: any) => {
      clearAll();
      const lat = ev.latLng?.lat?.() ?? (ev.latLng?.lat || 0);
      const lng = ev.latLng?.lng?.() ?? (ev.latLng?.lng || 0);
      if (ev.placeId) {
        if (typeof ev.stop === 'function') ev.stop();
        const service = new google.maps.places.PlacesService(map);
        service.getDetails({ placeId: ev.placeId, fields: ['name','formatted_address','rating','vicinity','geometry'] } as any, (result: google.maps.places.PlaceResult | null, status: google.maps.places.PlacesServiceStatus) => {
          if (status === 'OK' && result) {
            const pos = (result.geometry?.location as any) || { lat, lng };
            const m = new google.maps.Marker({ position: pos as any, map });
            markers.push(m);
            const iw = new google.maps.InfoWindow({ content: makeContent(result), position: pos as any });
            infoWindows.push(iw);
            if (activeInfoWindow) activeInfoWindow.close();
            iw.open(map, m);
            activeInfoWindow = iw;
            const latVal = typeof pos.lat === 'function' ? pos.lat() : pos.lat;
            const lngVal = typeof pos.lng === 'function' ? pos.lng() : pos.lng;
            onMarkerClick && onMarkerClick({ lat: latVal ?? lat, lng: lngVal ?? lng });
            return;
          }
          showNearby(lat, lng);
        });
        return;
      }
      showNearby(lat, lng);
    };

    const listener = map.addListener('click', handleClick);
    return () => { try { (listener as any)?.remove?.(); } catch (e) { try { google.maps.event.removeListener(listener); } catch(e){} } clearAll(); };
  }, [map, onMarkerClick]);

  return null;
}

// SearchMarker: single marker representing the current search result
function SearchMarker({center}:{center: {lat:number,lng:number} | null}){
  const map = useMap();
  useEffect(() => {
    if (!map) return;

    let marker: google.maps.Marker | null = null;

    if (center) {
      // SVG pin for search marker (green)
      const svg = `
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>
          <path fill='%2300af64' d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z'/>
          <circle cx='12' cy='9' r='2.5' fill='white'/>
        </svg>`;
      const url = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);

      marker = new google.maps.Marker({
        position: center,
        map,
        title: 'Search result',
        icon: { url, scaledSize: new google.maps.Size(32,32), anchor: new google.maps.Point(16,32) } as any,
        animation: google.maps.Animation.BOUNCE,
      });
      // stop bouncing after a short duration so it doesn't bounce forever
      setTimeout(() => {
        try { marker && marker.setAnimation(null); } catch (e) {}
      }, 1200);
      map.panTo(center);
      map.setZoom(13);
    }

    return () => {
      if (marker) {
        marker.setMap(null);
        marker = null;
      }
    };
  }, [map, center]);

  return null;
}

// CurrentLocationMarker: renders the user's location as a character of their choice
function CurrentLocationMarker({center}:{center: {lat:number,lng:number} | null}){
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    let advMarker: any = null;
    let fallbackMarker: google.maps.Marker | null = null;

    if (center) {
      // create an img element to use as the AdvancedMarkerElement content
  const img = document.createElement('img');
  const monkeyUrl = typeof monkeyMarkerUrl === 'string' ? monkeyMarkerUrl : (monkeyMarkerUrl as any).src || '';
  img.src = monkeyUrl;
      img.alt = 'You are here';
      // style so the image is bottom-center anchored (tip at location)
      img.style.width = '40px';
      img.style.height = '40px';
      img.style.transform = 'translate(-50%, -100%)';

      // Use AdvancedMarkerElement when available (Maps JS advanced markers)
      if (google && google.maps && (google.maps as any).marker && (google.maps as any).marker.AdvancedMarkerElement) {
        advMarker = new (google.maps as any).marker.AdvancedMarkerElement({
          map,
          position: center,
          content: img,
          title: 'Your location',
        });
      } else {
        // Fallback to a regular marker using the PNG as icon
        const icon = {
          url: typeof monkeyMarkerUrl === 'string' ? monkeyMarkerUrl : (monkeyMarkerUrl as any).src || '',
          scaledSize: new google.maps.Size(40, 40),
          anchor: new google.maps.Point(20, 40),
        } as any;
        fallbackMarker = new google.maps.Marker({
          position: center,
          map,
          title: 'Your location',
          icon,
        });
      }

      try { map.panTo(center); } catch (e) {}
    }

    return () => {
      try {
        if (advMarker && typeof advMarker.setMap === 'function') advMarker.setMap(null);
      } catch (e) {}
      if (fallbackMarker) {
        fallbackMarker.setMap(null);
        fallbackMarker = null;
      }
    };
  }, [map, center]);

  return null;
}
