'use client';

import React, { useState } from 'react';
import { TriangulationService } from '@/lib/triangulation';
import { Location, UserLocation, TriangulationResult } from '@/app/components/messages/types';

interface TriangulationButtonProps {
  currentUserId: string;
  friendLocations?: UserLocation[];
  groupId?: string;
  conversationType: 'direct' | 'group';
  onTriangulationResult?: (result: TriangulationResult) => void;
  onSendToChat?: (message: string) => void;
  onSendMessage?: (message: string) => void;
  className?: string;
}

export default function TriangulationButton({
  currentUserId,
  friendLocations = [],
  groupId,
  conversationType,
  onTriangulationResult,
  onSendToChat,
  onSendMessage,
  className = ''
}: TriangulationButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TriangulationResult | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<number>>(new Set());

  const handleTriangulate = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // Get current user's location
      const currentLocation = await TriangulationService.getCurrentLocation();
      
      let triangulationResult: TriangulationResult;
      
      if (conversationType === 'direct' && friendLocations.length === 1) {
        // 1-on-1 DM triangulation
        triangulationResult = await TriangulationService.findMeetingPointForDM(
          currentLocation,
          friendLocations[0].location
        );
      } else if (conversationType === 'group' && groupId) {
        // Group DM triangulation
        triangulationResult = await TriangulationService.findMeetingPointForGroup(
          currentLocation,
          friendLocations,
          groupId
        );
      } else {
        throw new Error('Invalid triangulation parameters');
      }

      setResult(triangulationResult);
      onTriangulationResult?.(triangulationResult);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to find meeting point';
      setError(errorMessage);
      console.error('Triangulation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const hasFriendLocations = friendLocations.length > 0;
  const canTriangulate = hasFriendLocations && !isLoading;

  return (
    <div className={`triangulation-container ${className}`}>
      <button
        onClick={handleTriangulate}
        disabled={!canTriangulate}
        className={`
          px-4 py-2 rounded-lg font-medium transition-colors
          ${canTriangulate 
            ? 'bg-blue-500 hover:bg-blue-600 text-white' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }
          ${isLoading ? 'animate-pulse' : ''}
        `}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Finding activities...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            🎯 Find Activities
          </span>
        )}
      </button>

      {error && (
        <div className="mt-2 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg max-h-96 overflow-hidden">
          {result.suggestions && result.suggestions.length > 0 && (
            <div className="mt-3">
              <strong className="text-green-800">Activities Found by Gemini AI:</strong>
              <div 
                className="mt-2 h-64 overflow-y-auto border border-green-200 rounded-lg bg-white bg-opacity-30" 
                style={{ 
                  scrollbarWidth: 'thin', 
                  scrollbarColor: '#86efac transparent',
                  WebkitOverflowScrolling: 'touch'
                }}
              >
                <div className="p-3 space-y-2">
                {result.suggestions.map((suggestion, index) => {
                  // Parse the suggestion to extract category, details, and address
                  const [category, ...details] = suggestion.split(':');
                  const fullDescription = details.join(':').trim();
                  
                  // Split by | to separate main description from address
                  const [mainDescription, address] = fullDescription.split('|');
                  const cleanDescription = mainDescription?.trim() || fullDescription;
                  const cleanAddress = address?.trim() || '';
                  
                  // Make description more concise while keeping key descriptors
                  const truncateDescription = (text: string, maxLength: number = 80) => {
                    if (text.length <= maxLength) return text;
                    
                    // Try to break at a natural point (comma, period, or space)
                    const truncated = text.substring(0, maxLength);
                    const lastComma = truncated.lastIndexOf(',');
                    const lastPeriod = truncated.lastIndexOf('.');
                    const lastSpace = truncated.lastIndexOf(' ');
                    
                    const breakPoint = Math.max(lastComma, lastPeriod, lastSpace);
                    return breakPoint > maxLength * 0.6 ? 
                      truncated.substring(0, breakPoint) + '...' : 
                      truncated + '...';
                  };
                  
                  const conciseDescription = truncateDescription(cleanDescription);
                  const isTruncated = cleanDescription.length > 80;
                  const isExpanded = expandedDescriptions.has(index);
                  
                  const handleSendToChat = () => {
                    const message = `${category.trim()}: ${cleanDescription}${cleanAddress ? ` | ${cleanAddress}` : ''}`;
                    
                    // Use the handleSendMessage function which will set the message content and send it
                    if (onSendMessage) {
                      onSendMessage(message);
                    } else if (onSendToChat) {
                      // Fallback to just populating the chat input
                      onSendToChat(message);
                    }
                  };

                  return (
                    <div key={index} className="bg-white bg-opacity-50 rounded-lg p-3 border border-green-200">
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <div className="font-medium text-green-800 text-sm">
                            {category.trim()}
                          </div>
                          <div className="text-green-700 text-sm mt-1">
                            {isExpanded ? cleanDescription : conciseDescription}
                            {isTruncated && (
                              <button
                                onClick={() => {
                                  const newExpanded = new Set(expandedDescriptions);
                                  if (isExpanded) {
                                    newExpanded.delete(index);
                                  } else {
                                    newExpanded.add(index);
                                  }
                                  setExpandedDescriptions(newExpanded);
                                }}
                                className="ml-2 text-blue-600 hover:text-blue-800 text-xs underline"
                              >
                                {isExpanded ? 'Show less' : 'Show more'}
                              </button>
                            )}
                          </div>
                          {cleanAddress && (
                            <div className="text-green-600 text-xs mt-1 font-mono">
                              📍 {cleanAddress}
                            </div>
                          )}
                          {onSendToChat && (
                            <button
                              onClick={handleSendToChat}
                              className="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                            >
                              Send to Chat
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setResult(null)}
              className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {!hasFriendLocations && (
        <div className="mt-2 text-sm text-gray-500">
          {conversationType === 'direct' 
            ? 'Friend location not available' 
            : 'Group member locations not available'
          }
        </div>
      )}
    </div>
  );
}
