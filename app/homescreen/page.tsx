"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { logout, onAuthStateChange } from "@/lib/firebase/auth";
import { User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
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

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Search data from mapsearch.tsx
const COORDS: Record<string, {lat:number,lng:number}> = {
  "Alice Johnson": { lat: 40, lng: 111.94 },
  "Bob Smith":    { lat: 100,  lng: 100 },
  "Carlos Rivera":{ lat: 0,  lng: 0 },
  "Diana Park":   { lat: 33.44,  lng: -111.92 },
  "Eve Thompson": { lat: 33.415, lng: -111.941 },
};

const DATA = Object.keys(COORDS);

export default function Homescreen() {
  const [user, setUser] = useState<User | null>(null);
  const [activePopup, setActivePopup] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchCenter, setSearchCenter] = useState<{lat:number, lng:number} | null>(null);
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
  const [messagingView, setMessagingView] = useState<'conversations' | 'search' | 'groups' | 'chat'>('conversations');
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedFriendsForGroup, setSelectedFriendsForGroup] = useState<string[]>([]);
  const [directMessageInput, setDirectMessageInput] = useState('');

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

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [user]);

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
            >
              {/* Content area */}
              <div className="p-6 h-full">
                {/* Different content for each popup */}
                {activePopup === 0 && (
                  <div className="h-full flex flex-col">
                    <h2 className="text-2xl font-bold text-white mb-4">Search</h2>
                    <Searchbar onSelect={(loc) => setSearchCenter(loc)} />
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

      {/* Google Maps Background */}
      <div className="absolute inset-0 z-0">
        <APIProvider apiKey={'AIzaSyBt_ZhVFjm1l46fNDHf8B4v3NpwXHgeluU'}>
          <Map
            style={{width: '100%', height: '100%'}}
            defaultCenter={{lat: 33.425, lng: -111.9400}}
            defaultZoom={13}
            gestureHandling='greedy'
            disableDefaultUI
          />
          <MapController center={searchCenter} />
        </APIProvider>
      </div>
    </div>
  );
}

// MapController component from mapsearch.tsx
function MapController({center}:{center: {lat:number, lng:number} | null}){
  const map = useMap();
  useEffect(() => {
    if(!map || !center) return;
    map.panTo(center);
    map.setZoom(13);
  }, [map, center]);
  return null;
}

// Searchbar component from mapsearch.tsx
function Searchbar({onSelect}:{onSelect?: (loc:{lat:number,lng:number}) => void}) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return DATA.filter((name) => name.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="w-full max-w-md">
      <label htmlFor="search-input" className="sr-only">Search</label>
      <input
        id="search-input"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for a location"
        className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring"
      />

      <div className="mt-2">
        {query === "" ? (
          <div className="text-sm text-black text-opacity-60">Type to search</div>
        ) : results.length === 0 ? (
          <div className="text-sm text-black text-opacity-60">No results</div>
        ) : (
          <ul className="mt-2 space-y-2">
            {results.map((r) => (
              <li
                key={r}
                className="flex justify-between bg-white bg-opacity-20 p-2 rounded cursor-pointer hover:bg-opacity-30"
                onClick={() => onSelect && onSelect(COORDS[r])}
              >
                <span className="font-medium text-black">{r}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
