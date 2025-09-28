"use client";

import { motion } from "framer-motion";
import { Friend } from "./types";

interface GroupCreationProps {
  groupName: string;
  selectedMembers: Friend[];
  friends: Friend[];
  onGroupNameChange?: (name: string) => void;
  onMemberToggle?: (friend: Friend) => void;
  onCreateGroup?: () => void;
  onBack?: () => void;
}

export default function GroupCreation({
  groupName,
  selectedMembers,
  friends,
  onGroupNameChange,
  onMemberToggle,
  onCreateGroup,
  onBack
}: GroupCreationProps) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="mb-4">
        <button
          onClick={() => onBack?.()}
          className="flex items-center text-white text-opacity-80 hover:text-opacity-100 mb-3"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to Conversations
        </button>
        <input
          type="text"
          value={groupName}
          onChange={(e) => onGroupNameChange?.(e.target.value)}
          placeholder="Group name..."
          className="w-full p-3 rounded-lg bg-gradient-to-r from-emerald-500/20 to-teal-600/20 backdrop-blur-sm border border-white/30 text-white placeholder-white placeholder-opacity-60 focus:outline-none focus:from-emerald-500/30 focus:to-teal-600/30 mb-4"
        />
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {selectedMembers.map((member) => (
              <span key={member.id} className="flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-emerald-500/30 to-teal-600/30 text-white text-sm rounded-full border border-white/30">
                <img src={member.photoURL || 'https://via.placeholder.com/20'} alt="" className="w-5 h-5 rounded-full" />
                <span>{member.displayName}</span>
                <button
                  onClick={() => onMemberToggle?.(member)}
                  className="text-white text-opacity-80 hover:text-opacity-100"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-medium">Add Friends</h3>
          <button
            onClick={() => onCreateGroup?.()}
            disabled={!groupName.trim() || selectedMembers.length < 2}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
            title={selectedMembers.length < 2 ? 'Groups need at least 3 people (you + 2 friends)' : 'Create group'}
          >
            Create Group
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-2">
        {friends.map((friend, index) => (
          <motion.div
            key={friend.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 via-green-600/20 to-teal-600/20 backdrop-blur-sm border border-white/30 shadow-lg hover:shadow-xl hover:from-emerald-500/30 hover:via-green-600/30 hover:to-teal-600/30 transition-all duration-200"
          >
            <div className="flex items-center space-x-3">
              <img src={friend.photoURL || 'https://via.placeholder.com/40'} alt="Avatar" className="w-10 h-10 rounded-full" />
              <div>
                <p className="font-medium text-white">{friend.displayName}</p>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${friend.status === 'online' ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                  <p className="text-sm text-white text-opacity-60">{friend.status === 'online' ? 'Online' : 'Offline'}</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => onMemberToggle?.(friend)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                selectedMembers.some(m => m.id === friend.id)
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700'
              }`}
            >
              {selectedMembers.some(m => m.id === friend.id) ? 'Remove' : 'Add'}
            </button>
          </motion.div>
        ))}
        
        {friends.length === 0 && (
          <div className="text-center text-white text-opacity-60 py-8">
            <svg className="w-12 h-12 mx-auto mb-4 text-white text-opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p>Add some friends first to create a group</p>
          </div>
        )}
      </div>
    </div>
  );
}