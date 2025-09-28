'use client';

import React, { useState, useEffect } from 'react';
import TriangulationButton from './TriangulationButton';
import { TriangulationService } from '@/lib/triangulation';
import { Location, UserLocation, TriangulationResult } from './messages/types';
import { getFriendsLocations, getGroupMembersLocations } from '@/lib/firebase/friends';
import { MockTriangulationService } from '@/lib/mockTriangulationService';

interface TriangulationExampleProps {
  currentUserId: string;
  conversationType: 'direct' | 'group';
  friendId?: string;
  groupId?: string;
  testScenario?: 'outliers' | 'extreme_outlier';
  onSendToChat?: (message: string) => void;
  onSendMessage?: (message: string) => void;
}

export default function TriangulationExample({
  currentUserId,
  conversationType,
  friendId,
  groupId,
  testScenario,
  onSendToChat,
  onSendMessage
}: TriangulationExampleProps) {
  const [friendLocations, setFriendLocations] = useState<UserLocation[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [triangulationResult, setTriangulationResult] = useState<TriangulationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load friend/group member locations
  useEffect(() => {
    const loadLocations = async () => {
      setIsLoading(true);
      try {
        if (conversationType === 'direct' && friendId) {
          // For direct messages, get the friend's location
          // Use mock data for testing
          const locations = await MockTriangulationService.getMockFriendLocation(friendId);
          setFriendLocations(locations);
        } else if (conversationType === 'group' && groupId) {
          // For group messages, get all group member locations
          // Use mock data for testing
          let locations: UserLocation[];
          
          if (testScenario === 'outliers') {
            locations = await MockTriangulationService.getMockGroupLocationsWithOutliers();
          } else if (testScenario === 'extreme_outlier') {
            locations = await MockTriangulationService.getMockGroupLocationsWithExtremeOutlier();
          } else {
            locations = await MockTriangulationService.getGroupMembersLocations(groupId, currentUserId);
          }
          
          setFriendLocations(locations);
        }
      } catch (error) {
        console.error('Error loading friend locations:', error);
        // Fallback to mock data on error
        if (conversationType === 'direct') {
          const mockLocations = await MockTriangulationService.getMockFriendLocation('mock_friend');
          setFriendLocations(mockLocations);
        } else {
          const mockLocations = await MockTriangulationService.getRandomMockLocations(4);
          setFriendLocations(mockLocations);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadLocations();
  }, [currentUserId, conversationType, friendId, groupId]);

  // Get current user's location
  useEffect(() => {
    const getLocation = async () => {
      try {
        const location = await TriangulationService.getCurrentLocation();
        setCurrentLocation(location);
      } catch (error) {
        console.error('Error getting current location:', error);
      }
    };

    getLocation();
  }, []);

  const handleTriangulationResult = (result: TriangulationResult) => {
    setTriangulationResult(result);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        🎯 AI Activity Finder
      </h2>
      
      <div className="space-y-4">
        {/* Current Location Display */}
        {currentLocation && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-1">Your Location:</h3>
            <p className="text-sm text-blue-700">
              {TriangulationService.formatLocation(currentLocation)}
            </p>
            {currentLocation.accuracy && (
              <p className="text-xs text-blue-600">
                Accuracy: ±{Math.round(currentLocation.accuracy)}m
              </p>
            )}
          </div>
        )}

        {/* Friend Locations Display */}
        {friendLocations.length > 0 && (
          <div className="p-3 bg-green-50 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">
              {conversationType === 'direct' ? 'Friend Location:' : 'Group Member Locations:'}
            </h3>
            <div className="space-y-1">
              {friendLocations.map((friend, index) => (
                <div key={index} className="text-sm text-green-700">
                  <strong>User {index + 1}:</strong> {TriangulationService.formatLocation(friend.location)}
                  {friend.location.accuracy && (
                    <span className="text-xs text-green-600 ml-2">
                      (±{Math.round(friend.location.accuracy)}m)
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Triangulation Button */}
        <div className="border-t pt-4">
          <TriangulationButton
            currentUserId={currentUserId}
            friendLocations={friendLocations}
            groupId={groupId}
            conversationType={conversationType}
            onTriangulationResult={handleTriangulationResult}
            onSendToChat={onSendToChat}
            onSendMessage={onSendMessage}
            className="w-full"
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-4">
            <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-sm text-gray-600">Loading friend locations...</p>
          </div>
        )}

        {/* No Locations Available */}
        {!isLoading && friendLocations.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            <p>No friend locations available for activity planning.</p>
            <p className="text-sm mt-1">
              Make sure your friends have shared their locations.
            </p>
          </div>
        )}
      </div>

      {/* Usage Instructions */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-800 mb-2">How to use:</h3>
        <ol className="text-sm text-gray-700 space-y-1">
          <li>1. Make sure you and your friends have location services enabled</li>
          <li>2. Friends need to share their locations in the app</li>
          <li>3. Click "Find Activities" to get AI-powered activity suggestions</li>
          <li>4. The system will find the optimal central location for activities</li>
          <li>5. Get diverse activity suggestions and travel time estimates</li>
        </ol>
      </div>
    </div>
  );
}
