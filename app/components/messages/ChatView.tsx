"use client";

import { motion } from "framer-motion";
import { DirectMessage, GroupMessage, Friend, Group } from "./types";

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
  onBack
}: ChatViewProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 bg-white bg-opacity-10 rounded-t-lg">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onBack?.()}
            className="flex items-center text-black text-opacity-80 hover:text-opacity-100 hover:bg-white hover:bg-opacity-10 p-2 rounded-lg transition-all"
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
                className="w-10 h-10 rounded-full" 
              />
              <div>
                <h3 className="font-medium text-black">{conversation.friend.displayName}</h3>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${conversation.friend.status === 'online' ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                  <p className="text-sm text-black text-opacity-60">
                    {conversation.friend.status === 'online' ? 'Online' : `Last seen ${conversation.friend.lastSeen.toLocaleDateString()}`}
                  </p>
                </div>
              </div>
            </>
          )}
          {conversation.type === 'group' && conversation.group && (
            <>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-black">{conversation.group.name}</h3>
                <p className="text-sm text-black text-opacity-60">
                  {conversation.group.members.length} members
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex ${message.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[70%] ${
              message.senderId === currentUserId 
                ? 'bg-blue-500 text-black' 
                : 'bg-white bg-opacity-20 text-black'
            } p-3 rounded-lg`}>
              {conversation.type === 'group' && message.senderId !== currentUserId && (
                <p className="text-xs text-black text-opacity-60 mb-1">
                  {getSenderName?.(message.senderId) || 'Unknown User'}
                </p>
              )}
              <p>{message.content}</p>
              <p className="text-xs text-black text-opacity-60 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Message Input */}
      <div className="p-4 bg-white bg-opacity-10">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => onNewMessageChange?.(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 p-3 rounded-lg bg-white bg-opacity-20 text-black placeholder-white placeholder-opacity-60 focus:outline-none focus:bg-opacity-30"
            onKeyPress={(e) => e.key === 'Enter' && onSendMessage?.()}
          />
          <button
            onClick={() => onSendMessage?.()}
            className="px-6 py-3 bg-blue-500 text-black rounded-lg hover:bg-blue-600 disabled:opacity-50"
            disabled={!newMessage.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}