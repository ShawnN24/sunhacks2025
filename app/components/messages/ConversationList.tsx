"use client";

import { motion } from "framer-motion";
import { User } from "firebase/auth";
import { Conversation, Friend, Group } from "./types";

interface ConversationListProps {
  conversations: Conversation[];
  friends: Friend[];
  groups: Group[];
  user: User | null;
  onConversationClick?: (conversation: Conversation) => void;
  onDeleteGroup?: (groupId: string) => void;
}

export default function ConversationList({
  conversations,
  friends,
  groups,
  user,
  onConversationClick,
  onDeleteGroup
}: ConversationListProps) {
  
  // Create a unified list of all friends and groups as conversations
  const allConversations = [
    // Add all friends as direct conversations
    ...friends.map(friend => {
      const conversationId = `direct_${[user?.uid, friend.uid].sort().join('_')}`;
      const existingConversation = conversations.find(c => c.id === conversationId);
      
      return {
        id: conversationId,
        type: 'direct' as const,
        participants: [user?.uid || '', friend.uid],
        lastMessage: existingConversation?.lastMessage,
        unreadCount: existingConversation?.unreadCount || 0,
        updatedAt: existingConversation?.updatedAt || new Date(),
        // Add friend info for easy access
        friend: friend
      };
    }),
    
    // Add all groups as group conversations
    ...groups.map(group => {
      const conversationId = `group_${group.id}`;
      const existingConversation = conversations.find(c => c.id === conversationId);
      
      return {
        id: conversationId,
        type: 'group' as const,
        participants: group.members,
        lastMessage: existingConversation?.lastMessage,
        unreadCount: existingConversation?.unreadCount || 0,
        updatedAt: existingConversation?.updatedAt || group.createdAt,
        // Add group info for easy access
        group: group
      };
    })
  ].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()); // Sort by most recent activity

  if (allConversations.length === 0) {
    return (
      <div className="text-black text-opacity-60 text-center py-8">
        <svg className="w-16 h-16 mx-auto mb-4 text-black text-opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p>No conversations yet</p>
        <p className="text-sm mt-2">Search for friends to start messaging!</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-2">
      {allConversations.map((conversation, index) => {
        const isGroup = conversation.type === 'group';
        const group = isGroup ? (conversation as any).group : null;
        const friend = !isGroup ? (conversation as any).friend : null;
        
        return (
          <motion.div
            key={conversation.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group flex items-center space-x-3 p-3 rounded-lg bg-white bg-opacity-10 hover:bg-opacity-20 cursor-pointer transition-colors relative"
          >
            <div 
              className="flex items-center space-x-3 flex-1 min-w-0"
              onClick={() => onConversationClick?.(conversation)}
            >
              <div className="relative">
                {isGroup ? (
                  // Group icon
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                ) : (
                  // Friend avatar with online status
                  <>
                    <img
                      src={friend?.photoURL || 'https://via.placeholder.com/40'}
                      alt="Avatar"
                      className="w-10 h-10 rounded-full"
                    />
                    {friend?.status === 'online' && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                    )}
                  </>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-black truncate">
                    {isGroup ? group?.name || 'Group Chat' : friend?.displayName || 'Unknown User'}
                  </p>
                  {conversation.unreadCount > 0 && (
                    <span className="bg-red-500 text-black text-xs px-2 py-1 rounded-full">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>
                <p className="text-sm text-black text-opacity-60 truncate">
                  {conversation.lastMessage?.content || (isGroup ? 'No messages yet' : 'Start a conversation')}
                </p>
              </div>
            </div>
            
            {/* Delete button for groups (only show if user is group creator) */}
            {isGroup && group && group.createdBy === user?.uid && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteGroup?.(group.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:text-red-700 hover:bg-red-100 hover:bg-opacity-20 rounded-lg transition-all"
                title="Delete group"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18"/>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                  <line x1="10" y1="11" x2="10" y2="17"/>
                  <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
              </button>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}