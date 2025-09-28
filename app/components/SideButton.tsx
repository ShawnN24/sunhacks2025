"use client";

import { motion } from "framer-motion";
import { ReactNode, MouseEventHandler } from "react";

export interface SideButtonProps {
  id: number;
  icon: ReactNode;
  title: string;
  description: string;
  colorGradient: string;
  isActive: boolean;
  isSpecial?: boolean;
  specialColor?: string;
  onClick?: MouseEventHandler<HTMLDivElement>;
  animationDelay?: number;
}

export default function SideButton({
  id,
  icon,
  title,
  description,
  colorGradient,
  isActive,
  isSpecial = false,
  specialColor,
  onClick,
  animationDelay = 0
}: SideButtonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: animationDelay }}
      whileHover={{ x: 4 }}
      onClick={onClick}
      className={`flex items-center space-x-4 p-4 rounded-xl cursor-pointer transition-all hover:shadow-md ${
        isActive
          ? `bg-gradient-to-r ${colorGradient} text-white shadow-lg`
          : isSpecial && specialColor
          ? `${specialColor} text-white hover:shadow-lg`
          : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
      }`}
    >
      {/* Icon Container */}
      <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${
        isActive
          ? 'bg-white/20'
          : isSpecial
          ? 'bg-white/20'
          : `bg-gradient-to-r ${colorGradient} text-white`
      }`}>
        {icon}
      </div>

      {/* Text Content */}
      <div>
        <h3 className="font-semibold text-sm">{title}</h3>
        <p className={`text-xs ${
          isActive 
            ? 'text-white/80' 
            : isSpecial
            ? 'text-white/80'
            : 'text-slate-600'
        }`}>
          {description}
        </p>
      </div>
    </motion.div>
  );
}

// Predefined button configurations for common use cases
export const BUTTON_CONFIGS = {
  SEARCH: {
    title: "Search & Maps",
    description: "Find locations and directions",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    ),
    colorGradient: "from-blue-500 to-blue-600"
  },
  
  AI_ASSISTANT: {
    title: "MApI Assistant",
    description: "Chat with AI assistant",
    icon: <div className="font-bold text-lg leading-none">AI</div>,
    colorGradient: "from-green-500 to-green-600"
  },
  
  MESSAGES: {
    title: "Messages",
    description: "View your conversations",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    colorGradient: "from-purple-500 to-purple-600"
  },
  
  LOGOUT: {
    title: "Logout",
    description: "Sign out of your account",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16,17 21,12 16,7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
    ),
    colorGradient: "from-red-500 to-red-600",
    isSpecial: true,
    specialColor: "bg-red-50 hover:bg-red-100 text-red-600"
  }
};

// Bubble version of the button for the original bubble design
export function SideButtonBubble({
  icon,
  isActive,
  isSpecial = false,
  onClick
}: {
  icon: ReactNode;
  isActive: boolean;
  isSpecial?: boolean;
  onClick?: MouseEventHandler<HTMLDivElement>;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`w-12 h-12 rounded-full cursor-pointer transition-colors flex items-center justify-center ${
        isActive 
          ? 'bg-white shadow-lg text-[#00af64]' 
          : isSpecial
          ? 'bg-red-500 hover:bg-red-600 text-white'
          : 'bg-[#00af64] hover:bg-[#00c770] text-white'
      }`}
      onClick={onClick}
    >
      {icon}
    </motion.div>
  );
}