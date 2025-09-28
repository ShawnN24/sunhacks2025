"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface LocationSettingsProps {
  isLocationEnabled: boolean;
  isVisible: boolean;
  onLocationToggle: (enabled: boolean) => void;
  onVisibilityToggle: (visible: boolean) => void;
  onBack: () => void;
}

export default function LocationSettings({
  isLocationEnabled,
  isVisible,
  onLocationToggle,
  onVisibilityToggle,
  onBack
}: LocationSettingsProps) {
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');

  useEffect(() => {
    // Check current geolocation permission status
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setLocationPermission(result.state);
        
        result.addEventListener('change', () => {
          setLocationPermission(result.state);
        });
      });
    }
  }, []);

  const handleLocationToggle = async (enabled: boolean) => {
    if (enabled && locationPermission !== 'granted') {
      // Request permission first
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });
        });
        
        // Permission granted, enable location sharing
        onLocationToggle(true);
        setLocationPermission('granted');
      } catch (error) {
        // Permission denied or error occurred
        alert('Location permission is required to share your location with friends. Please enable location access in your browser settings.');
        setLocationPermission('denied');
        return;
      }
    } else {
      onLocationToggle(enabled);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-black text-opacity-80 hover:text-opacity-100 mb-4"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to Messages
        </button>
        
        <h2 className="text-2xl font-bold text-black mb-2">Location Settings</h2>
        <p className="text-black text-opacity-70 text-sm">
          Control how you share your location with friends
        </p>
      </div>

      <div className="space-y-6">
        {/* Location Sharing Toggle */}
        <div className="bg-white bg-opacity-10 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center mr-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-black">Share Location</h3>
                <p className="text-sm text-black text-opacity-60">
                  Allow friends to see your current location
                </p>
              </div>
            </div>
            
            <button
              onClick={() => handleLocationToggle(!isLocationEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isLocationEnabled ? 'bg-green-500' : 'bg-gray-400'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isLocationEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          {locationPermission === 'denied' && (
            <div className="bg-red-500 bg-opacity-20 border-l-4 border-red-500 p-3 rounded">
              <div className="flex items-start">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500 mr-2 mt-0.5 flex-shrink-0">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                <div>
                  <p className="text-sm font-medium text-red-800">Location Permission Denied</p>
                  <p className="text-xs text-red-700 mt-1">
                    Please enable location access in your browser settings to share your location.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Visibility Toggle */}
        <div className={`bg-white bg-opacity-10 rounded-lg p-4 transition-opacity ${
          isLocationEnabled ? 'opacity-100' : 'opacity-50'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-500 bg-opacity-20 rounded-lg flex items-center justify-center mr-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {isVisible ? (
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"/>
                  ) : (
                    <>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </>
                  )}
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-black">Visible to Friends</h3>
                <p className="text-sm text-black text-opacity-60">
                  {isVisible ? 'Friends can see you on the map' : 'You\'re hidden from friends'}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => onVisibilityToggle(!isVisible)}
              disabled={!isLocationEnabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isVisible && isLocationEnabled ? 'bg-green-500' : 'bg-gray-400'
              } ${!isLocationEnabled ? 'cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isVisible && isLocationEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          {!isLocationEnabled && (
            <p className="text-xs text-black text-opacity-50">
              Enable location sharing first to control visibility
            </p>
          )}
        </div>

        {/* Info Section */}
        <div className="bg-blue-500 bg-opacity-10 rounded-lg p-4">
          <div className="flex items-start">
            <div className="w-8 h-8 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9,12l2,2 4,-4"/>
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-black mb-2">Privacy & Security</h4>
              <ul className="text-sm text-black text-opacity-70 space-y-1">
                <li>• Only your friends can see your location</li>
                <li>• Location updates every 30 seconds when active</li>
                <li>• You can hide from friends while keeping location enabled</li>
                <li>• Location sharing stops when you close the app</li>
                <li>• Your location history is not stored</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Battery Notice */}
        {isLocationEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-yellow-500 bg-opacity-10 rounded-lg p-4"
          >
            <div className="flex items-start">
              <div className="w-8 h-8 bg-yellow-500 bg-opacity-20 rounded-lg flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="6" width="18" height="10" rx="2"/>
                  <line x1="22" y1="13" x2="22" y2="11"/>
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-black mb-1">Battery Usage</h4>
                <p className="text-sm text-black text-opacity-70">
                  Location sharing uses GPS and may impact battery life. The app is optimized to minimize power consumption.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}