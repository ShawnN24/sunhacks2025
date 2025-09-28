"use client";

import { motion } from "framer-motion";
import { DirectMessage, GroupMessage, Friend, Group, UserLocation } from "./types";
import TriangulationButton from "../TriangulationButton";
import { useState, useEffect } from "react";
import { getFriendsLocations, getGroupMembersLocations } from "@/lib/firebase/friends";
import { MockTriangulationService } from "@/lib/mockTriangulationService";

interface ChatViewProps {
  conversation: {
    type: 'direct' | 'group';
    friend?: Friend;
    group?: Group;
  };
  messages: (DirectMessage | GroupMessage)[];
  newMessage: string;
  currentUserId: string;
  getSenderName?: (senderId: string) => string;
  onNewMessageChange?: (message: string) => void;
  onSendMessage?: () => void;
  onSendMessageWithContent?: (message: string) => void;
  onBack?: () => void;
}

export default function ChatView({
  conversation,
  messages,
  newMessage,
  currentUserId,
  getSenderName,
  onNewMessageChange,
  onSendMessage,
  onSendMessageWithContent,
  onBack
}: ChatViewProps) {
  const handleSendToChat = (message: string) => {
    if (onNewMessageChange) {
      onNewMessageChange(message);
    }
  };

  const handleSendMessage = (message: string) => {
    // Close the triangulation panel first
    setShowTriangulation(false);
    // Use the direct send function if available, otherwise fall back to the old method
    if (onSendMessageWithContent) {
      onSendMessageWithContent(message);
    } else {
      // Fallback to the old method
      if (onNewMessageChange) {
        onNewMessageChange(message);
      }
      setTimeout(() => {
        if (onSendMessage) {
          onSendMessage();
        }
      }, 100);
    }
  };
  const [friendLocations, setFriendLocations] = useState<UserLocation[]>([]);
  const [showTriangulation, setShowTriangulation] = useState(false);

  // Load friend/group member locations using real Firebase data with real-time updates
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const setupLocationListener = async () => {
      try {
        if (conversation.type === 'direct' && conversation.friend) {
          // For direct messages, listen to the friend's location in real-time
          const { listenToFriendsLocations } = await import('@/lib/firebase/locations');
          
          unsubscribe = listenToFriendsLocations(
            [conversation.friend.uid],
            (locations) => {
              // Convert FriendLocation to UserLocation format
              const userLocations: UserLocation[] = locations.map(loc => ({
                userId: loc.userId,
                location: {
                  latitude: loc.latitude,
                  longitude: loc.longitude,
                  accuracy: loc.accuracy,
                  timestamp: loc.lastUpdated
                },
                lastUpdated: loc.lastUpdated
              }));
              
              setFriendLocations(userLocations);
            }
          );
        } else if (conversation.type === 'group' && conversation.group) {
          // For group messages, listen to all group member locations (excluding current user)
          const memberIds = conversation.group.members.filter(memberId => memberId !== currentUserId);
          
          if (memberIds.length > 0) {
            const { listenToFriendsLocations } = await import('@/lib/firebase/locations');
            
            unsubscribe = listenToFriendsLocations(
              memberIds,
              (locations) => {
                // Convert FriendLocation to UserLocation format
                const userLocations: UserLocation[] = locations.map(loc => ({
                  userId: loc.userId,
                  location: {
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    accuracy: loc.accuracy,
                    timestamp: loc.lastUpdated
                  },
                  lastUpdated: loc.lastUpdated
                }));
                
                setFriendLocations(userLocations);
              }
            );
          } else {
            setFriendLocations([]);
          }
        }
      } catch (error) {
        console.error('Error setting up real-time location listener:', error);
        // Fallback to mock data only if real data setup fails
        const { MockTriangulationService } = await import('@/lib/mockTriangulationService');
        
        if (conversation.type === 'direct' && conversation.friend) {
          const mockLocations = await MockTriangulationService.getMockFriendLocation(conversation.friend.uid);
          setFriendLocations(mockLocations);
        } else if (conversation.type === 'group') {
          const mockLocations = await MockTriangulationService.getRandomMockLocations(3);
          setFriendLocations(mockLocations);
        }
      }
    };

    setupLocationListener();

    // Cleanup function to unsubscribe from real-time updates
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [conversation, currentUserId]);
  return (
    <div className="flex flex-col h-full overflow-hidden rounded-lg">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 bg-white/20 backdrop-blur-sm border-b border-white/30 rounded-t-lg flex-shrink-0">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <button
            onClick={() => onBack?.()}
            className="flex items-center text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all flex-shrink-0"
            title="Back to conversations"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          {conversation.type === 'direct' && conversation.friend && (
            <>
              <img 
                src={conversation.friend.photoURL || 'https://via.placeholder.com/40'} 
                alt="Avatar" 
                className="w-10 h-10 rounded-full flex-shrink-0" 
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-white truncate">{conversation.friend.displayName}</h3>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${conversation.friend.status === 'online' ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                  <p className="text-sm text-white/60">
                    {conversation.friend.status === 'online' ? 'Online' : `Last seen ${conversation.friend.lastSeen.toLocaleDateString()}`}
                  </p>
                </div>
              </div>
            </>
          )}
          {conversation.type === 'group' && conversation.group && (
            <>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-white truncate">{conversation.group.name}</h3>
                <p className="text-sm text-white/60">
                  {conversation.group.members.length} members
                </p>
              </div>
            </>
          )}
        </div>
        
        {/* Triangulation Button */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowTriangulation(!showTriangulation)}
            className="p-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 rounded-lg transition-all shadow-lg"
            title="Find activities"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Triangulation Panel */}
      {showTriangulation && (
        <div className="px-4 py-3 bg-white/10 backdrop-blur-sm border-b border-white/20 flex-shrink-0">
          <TriangulationButton
            currentUserId={currentUserId}
            friendLocations={friendLocations}
            groupId={conversation.type === 'group' ? conversation.group?.id : undefined}
            conversationType={conversation.type}
            onSendToChat={handleSendToChat}
            onSendMessage={handleSendMessage}
            className="w-full"
          />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 pb-6 space-y-3 bg-gradient-to-b from-white/5 to-transparent scrollbar-hide min-h-0">
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex ${message.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[70%] backdrop-blur-sm p-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 ${
              message.senderId === currentUserId 
                ? 'bg-white/20 text-white border border-white/30' 
                : 'bg-white/10 text-white border border-white/20'
            }`}>
              {conversation.type === 'group' && message.senderId !== currentUserId && (
                <p className="text-xs text-white/60 mb-1">
                  {getSenderName?.(message.senderId) || 'Unknown User'}
                </p>
              )}
              <p className="text-white text-sm">{message.content}</p>
              <p className="text-xs text-white/60 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Message Input */}
      <div className="p-3 bg-white/10 backdrop-blur-sm flex-shrink-0 rounded-b-lg border-t border-white/20">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => onNewMessageChange?.(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 p-3 rounded-xl bg-white/20 backdrop-blur-sm text-white placeholder-white/60 focus:outline-none focus:bg-white/30 focus:ring-2 focus:ring-white/30 border border-white/30 focus:border-white/50 transition-all duration-200"
            onKeyPress={(e) => e.key === 'Enter' && onSendMessage?.()}
          />
          <button
            onClick={() => onSendMessage?.()}
            className="px-4 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 border border-white/30 hover:border-white/50 shadow-lg hover:shadow-xl"
            disabled={!newMessage.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}