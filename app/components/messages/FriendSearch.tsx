"use client";

import { motion } from "framer-motion";
import { Friend } from "./types";
import { useState } from "react";

interface FriendSearchProps {
  searchQuery: string;
  searchResults: Friend[];
  friends: Friend[];
  incomingRequests: Friend[];
  outgoingRequests: Friend[];
  isLoading: boolean;
  onSearchQueryChange?: (query: string) => void;
  onAddFriend?: (friendId: string) => void;
  onAcceptFriend?: (friendId: string) => void;
  onRejectFriend?: (friendId: string) => void;
  onCancelRequest?: (friendId: string) => void;
  onBack?: () => void;
}

type TabType = 'search' | 'incoming' | 'outgoing';

export default function FriendSearch({
  searchQuery,
  searchResults,
  friends,
  incomingRequests = [],
  outgoingRequests = [],
  isLoading,
  onSearchQueryChange,
  onAddFriend,
  onAcceptFriend,
  onRejectFriend,
  onCancelRequest,
  onBack
}: FriendSearchProps) {
  const [activeTab, setActiveTab] = useState<TabType>('search');

  const renderUserCard = (user: Friend, index: number, type: 'search' | 'incoming' | 'outgoing') => (
    <motion.div
      key={user.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center justify-between p-3 rounded-lg bg-white bg-opacity-10"
    >
      <div className="flex items-center space-x-3">
        <img 
          src={user.photoURL || user.avatar || 'https://via.placeholder.com/40'} 
          alt="Avatar" 
          className="w-10 h-10 rounded-full" 
        />
        <div>
          <p className="font-medium text-black">{user.displayName || user.name}</p>
          <p className="text-sm text-black text-opacity-60">{user.email}</p>
          {user.status && (
            <p className="text-xs text-black text-opacity-50 capitalize">{user.status}</p>
          )}
        </div>
      </div>
      
      <div className="flex gap-2">
        {type === 'search' && (
          <button
            onClick={() => onAddFriend?.(user.id)}
            className="px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            disabled={friends.some(f => f.id === user.id) || outgoingRequests.some(r => r.id === user.id)}
          >
            {friends.some(f => f.id === user.id) ? 'Friends' : 
             outgoingRequests.some(r => r.id === user.id) ? 'Requested' : 'Add Friend'}
          </button>
        )}
        
        {type === 'incoming' && (
          <>
            <button
              onClick={() => onAcceptFriend?.(user.id)}
              className="px-3 py-1 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
            >
              Accept
            </button>
            <button
              onClick={() => onRejectFriend?.(user.id)}
              className="px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
            >
              Reject
            </button>
          </>
        )}
        
        {type === 'outgoing' && (
          <button
            onClick={() => onCancelRequest?.(user.id)}
            className="px-3 py-1 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </motion.div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'search':
        return (
          <div className="space-y-2">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            ) : (
              searchResults.map((result, index) => renderUserCard(result, index, 'search'))
            )}
            
            {searchQuery && searchResults.length === 0 && !isLoading && (
              <div className="text-center text-black text-opacity-60 py-8">
                <svg className="w-12 h-12 mx-auto mb-4 text-black text-opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p>No users found matching "{searchQuery}"</p>
              </div>
            )}
            
            {!searchQuery && (
              <div className="text-center text-black text-opacity-60 py-8">
                <svg className="w-12 h-12 mx-auto mb-4 text-black text-opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p>Start typing to search for friends</p>
              </div>
            )}
          </div>
        );

      case 'incoming':
        return (
          <div className="space-y-2">
            {incomingRequests.map((request, index) => renderUserCard(request, index, 'incoming'))}
            
            {incomingRequests.length === 0 && (
              <div className="text-center text-black text-opacity-60 py-8">
                <svg className="w-12 h-12 mx-auto mb-4 text-black text-opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p>No incoming friend requests</p>
              </div>
            )}
          </div>
        );

      case 'outgoing':
        return (
          <div className="space-y-2">
            {outgoingRequests.map((request, index) => renderUserCard(request, index, 'outgoing'))}
            
            {outgoingRequests.length === 0 && (
              <div className="text-center text-black text-opacity-60 py-8">
                <svg className="w-12 h-12 mx-auto mb-4 text-black text-opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p>No outgoing friend requests</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="mb-4">
        <button
          onClick={() => onBack?.()}
          className="flex items-center text-black text-opacity-80 hover:text-opacity-100 mb-3"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to Conversations
        </button>

        {/* Tabs */}
        <div className="flex space-x-1 mb-4">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
              activeTab === 'search' 
                ? 'bg-white bg-opacity-30 text-black font-medium' 
                : 'bg-white bg-opacity-10 text-black text-opacity-70 hover:bg-opacity-20'
            }`}
          >
            Search Users
          </button>
          <button
            onClick={() => setActiveTab('incoming')}
            className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors relative ${
              activeTab === 'incoming' 
                ? 'bg-white bg-opacity-30 text-black font-medium' 
                : 'bg-white bg-opacity-10 text-black text-opacity-70 hover:bg-opacity-20'
            }`}
          >
            Incoming
            {incomingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {incomingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('outgoing')}
            className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors relative ${
              activeTab === 'outgoing' 
                ? 'bg-white bg-opacity-30 text-black font-medium' 
                : 'bg-white bg-opacity-10 text-black text-opacity-70 hover:bg-opacity-20'
            }`}
          >
            Outgoing
            {outgoingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {outgoingRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Search input - only show on search tab */}
        {activeTab === 'search' && (
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange?.(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full p-3 rounded-lg bg-white bg-opacity-20 text-black placeholder-white placeholder-opacity-60 focus:outline-none focus:bg-opacity-30"
          />
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {renderTabContent()}
      </div>
    </div>
  );
}