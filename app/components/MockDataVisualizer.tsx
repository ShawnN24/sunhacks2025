'use client';

import React from 'react';
import { mockFriendsLocations, mockGroupLocations, mockCurrentUserLocation } from '@/lib/mockData';
import { TriangulationService } from '@/lib/triangulation';

export default function MockDataVisualizer() {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        📍 Mock Location Data
      </h3>
      
      {/* Current User Location */}
      <div className="mb-6">
        <h4 className="font-medium text-blue-800 mb-2">Your Location:</h4>
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="font-medium text-blue-800">You</span>
          </div>
          <p className="text-sm text-blue-700">
            {TriangulationService.formatLocation(mockCurrentUserLocation)}
          </p>
          <p className="text-xs text-blue-600">
            {mockCurrentUserLocation.address}
          </p>
        </div>
      </div>

      {/* Friends Locations */}
      <div className="mb-6">
        <h4 className="font-medium text-green-800 mb-2">Friends Locations:</h4>
        <div className="space-y-2">
          {mockFriendsLocations.map((friend, index) => (
            <div key={index} className="bg-green-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium text-green-800">Friend {index + 1}</span>
              </div>
              <p className="text-sm text-green-700">
                {TriangulationService.formatLocation(friend.location)}
              </p>
              <p className="text-xs text-green-600">
                {friend.location.address}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Group Members Locations */}
      <div>
        <h4 className="font-medium text-purple-800 mb-2">Group Members Locations:</h4>
        <div className="space-y-2">
          {mockGroupLocations.map((member, index) => (
            <div key={index} className="bg-purple-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="font-medium text-purple-800">Member {index + 1}</span>
              </div>
              <p className="text-sm text-purple-700">
                {TriangulationService.formatLocation(member.location)}
              </p>
              <p className="text-xs text-purple-600">
                {member.location.address}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Distance Information */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-800 mb-2">Distance Analysis:</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Max Distance (Friends):</p>
            <p className="font-medium text-gray-800">
              {Math.max(...mockFriendsLocations.map(friend => 
                TriangulationService.calculateDistance(mockCurrentUserLocation, friend.location)
              )).toFixed(2)} km
            </p>
          </div>
          <div>
            <p className="text-gray-600">Max Distance (Group):</p>
            <p className="font-medium text-gray-800">
              {Math.max(...mockGroupLocations.map(member => 
                TriangulationService.calculateDistance(mockCurrentUserLocation, member.location)
              )).toFixed(2)} km
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
