"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { FriendLocation, calculateDistance, formatDistance, getTimeSinceUpdate } from '@/lib/firebase/locations';

interface FriendsMarkersProps {
  friendsLocations: FriendLocation[];
  currentUserLocation?: { lat: number; lng: number } | null;
  onFriendClick?: (friend: FriendLocation) => void;
}

export default function FriendsMarkers({ 
  friendsLocations, 
  currentUserLocation, 
  onFriendClick 
}: FriendsMarkersProps) {
  const map = useMap();
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const infoWindowsRef = useRef<Map<string, google.maps.InfoWindow>>(new Map());
  const [activeInfoWindow, setActiveInfoWindow] = useState<string | null>(null);
  const friendsLocationsRef = useRef(friendsLocations);
  const onFriendClickRef = useRef(onFriendClick);

  // Keep refs up to date
  useEffect(() => {
    friendsLocationsRef.current = friendsLocations;
    onFriendClickRef.current = onFriendClick;
  }, [friendsLocations, onFriendClick]);

  // Stable functions that don't change on every render
  const sendMessageToFriend = useCallback((friendId: string) => {
    const friend = friendsLocationsRef.current.find(f => f.userId === friendId);
    if (friend && onFriendClickRef.current) {
      onFriendClickRef.current(friend);
    }
    // Close info window
    const activeWindow = infoWindowsRef.current.get(activeInfoWindow || '');
    if (activeWindow) {
      activeWindow.close();
      setActiveInfoWindow(null);
    }
  }, [activeInfoWindow]);

  const openDirectionsToFriend = useCallback((lat: number, lng: number, name: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${name}`;
    window.open(url, '_blank');
  }, []);

  // Set up global functions once
  useEffect(() => {
    (window as any).sendMessageToFriend = sendMessageToFriend;
    (window as any).openDirectionsToFriend = openDirectionsToFriend;

    return () => {
      delete (window as any).sendMessageToFriend;
      delete (window as any).openDirectionsToFriend;
    };
  }, [sendMessageToFriend, openDirectionsToFriend]);

  useEffect(() => {
    if (!map) return;

    // Clear existing markers and info windows
    markersRef.current.forEach((marker) => {
      marker.setMap(null);
    });
    infoWindowsRef.current.forEach((infoWindow) => {
      infoWindow.close();
    });
    markersRef.current.clear();
    infoWindowsRef.current.clear();
    setActiveInfoWindow(null);

    // Create markers for each friend
    friendsLocations.forEach((friend) => {
      const position = { lat: friend.latitude, lng: friend.longitude };
      
      // Create custom marker using HTML element (like ConversationList - no CORS issues!)
      const createMarkerElement = (friend: FriendLocation, isOnline: boolean = true) => {
        const markerDiv = document.createElement('div');
        markerDiv.innerHTML = `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
            <!-- Profile image with status ring -->
            <div style="
              position: relative;
              width: 50px;
              height: 50px;
              border: 4px solid ${isOnline ? '#10B981' : '#6B7280'};
              border-radius: 50%;
              background: white;
              padding: 2px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            ">
              <img
                src="${friend.photoURL || 'https://via.placeholder.com/40'}"
                alt="${friend.displayName}"
                style="
                  width: 100%;
                  height: 100%;
                  border-radius: 50%;
                  object-fit: cover;
                "
                onerror="this.src='https://ui-avatars.io/api/?name=${encodeURIComponent(friend.displayName)}&background=00af64&color=fff&size=40'"
              />
              <!-- Online indicator dot -->
              ${isOnline ? `
                <div style="
                  position: absolute;
                  bottom: 2px;
                  right: 2px;
                  width: 12px;
                  height: 12px;
                  background: #10B981;
                  border: 2px solid white;
                  border-radius: 50%;
                "></div>
              ` : ''}
            </div>
            <!-- Map pointer -->
            <div style="
              width: 0;
              height: 0;
              border-left: 8px solid transparent;
              border-right: 8px solid transparent;
              border-top: 12px solid ${isOnline ? '#10B981' : '#6B7280'};
              margin-top: -2px;
            "></div>
          </div>
        `;
        return markerDiv;
      };

      // Create custom marker with proxied profile image (no CORS issues!)
      const createMarkerIcon = (friend: FriendLocation, isOnline: boolean = true) => {
        const size = 50;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = size;
        canvas.height = size + 12;

        if (!ctx) return '';

        const drawBase = () => {
          // Clear canvas
          ctx.clearRect(0, 0, size, size + 12);

          // Draw outer ring (status indicator)
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2 - 2, 0, 2 * Math.PI);
          ctx.strokeStyle = isOnline ? '#10B981' : '#6B7280';
          ctx.lineWidth = 4;
          ctx.stroke();

          // Draw white background circle
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2 - 6, 0, 2 * Math.PI);
          ctx.fillStyle = 'white';
          ctx.fill();

          // Draw pointer
          ctx.beginPath();
          ctx.moveTo(size / 2 - 6, size);
          ctx.lineTo(size / 2, size + 12);
          ctx.lineTo(size / 2 + 6, size);
          ctx.closePath();
          ctx.fillStyle = isOnline ? '#10B981' : '#6B7280';
          ctx.fill();
        };

        const drawInitials = () => {
          // Draw initials circle
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2 - 8, 0, 2 * Math.PI);
          ctx.fillStyle = '#00af64';
          ctx.fill();
          
          // Draw initials text
          const initials = friend.displayName
            .split(' ')
            .map(name => name.charAt(0))
            .join('')
            .substring(0, 2)
            .toUpperCase();

          ctx.fillStyle = 'white';
          ctx.font = 'bold 14px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(initials, size / 2, size / 2);
        };

        const drawProfileImage = (img: HTMLImageElement) => {
          ctx.save();
          
          // Create circular clipping path
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2 - 8, 0, 2 * Math.PI);
          ctx.clip();
          
          // Draw the profile image
          ctx.drawImage(img, 8, 8, size - 16, size - 16);
          ctx.restore();
        };

        // Draw base elements
        drawBase();

        // Try to load profile image if available
        if (friend.photoURL) {
          const img = new Image();
          
          img.onload = () => {
            // Redraw base first
            drawBase();
            drawProfileImage(img);
            
            // Update marker icon
            const marker = markersRef.current.get(friend.userId);
            if (marker) {
              marker.setIcon({
                url: canvas.toDataURL(),
                scaledSize: new google.maps.Size(size, size + 12),
                anchor: new google.maps.Point(size / 2, size + 12)
              });
            }
          };

          img.onerror = () => {
            console.warn('Failed to load profile image for', friend.displayName, '- using initials');
            drawBase();
            drawInitials();
            
            const marker = markersRef.current.get(friend.userId);
            if (marker) {
              marker.setIcon({
                url: canvas.toDataURL(),
                scaledSize: new google.maps.Size(size, size + 12),
                anchor: new google.maps.Point(size / 2, size + 12)
              });
            }
          };

          // Use the proxy to avoid CORS issues
          img.src = `/api/proxy-image?url=${encodeURIComponent(friend.photoURL)}`;
          
          // Return initial state with initials while image loads
          drawInitials();
          return canvas.toDataURL();
        } else {
          // No photo URL, use initials directly
          drawInitials();
          return canvas.toDataURL();
        }
      };

      // Create marker
      const marker = new google.maps.Marker({
        position,
        map,
        title: `${friend.displayName} - ${friend.isOnline ? 'Online' : 'Offline'}`,
        icon: {
          url: createMarkerIcon(friend, friend.isOnline),
          scaledSize: new google.maps.Size(50, 62),
          anchor: new google.maps.Point(25, 62)
        },
        zIndex: friend.isOnline ? 1000 : 500 // Online friends appear on top
      });

      // Calculate distance if current location is available
      let distanceText = '';
      if (currentUserLocation) {
        const distance = calculateDistance(
          currentUserLocation.lat,
          currentUserLocation.lng,
          friend.latitude,
          friend.longitude
        );
        distanceText = formatDistance(distance);
      }

      // Create info window content
      const infoWindowContent = `
        <div style="padding: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 280px;">
          <div style="display: flex; align-items: center; margin-bottom: 12px;">
            <img 
              src="${friend.photoURL || `https://ui-avatars.io/api/?name=${encodeURIComponent(friend.displayName)}&background=00af64&color=fff&size=40`}" 
              alt="${friend.displayName}"
              style="width: 40px; height: 40px; border-radius: 50%; margin-right: 12px; border: 2px solid ${friend.isOnline ? '#10B981' : '#6B7280'};"
              onerror="this.src='https://ui-avatars.io/api/?name=${encodeURIComponent(friend.displayName)}&background=00af64&color=fff&size=40'"
            />
            <div>
              <h3 style="margin: 0; color: #1f2937; font-size: 16px; font-weight: 600;">${friend.displayName}</h3>
              <div style="display: flex; align-items: center; margin-top: 4px;">
                <div style="width: 8px; height: 8px; border-radius: 50%; background-color: ${friend.isOnline ? '#10B981' : '#6B7280'}; margin-right: 6px;"></div>
                <span style="font-size: 12px; color: ${friend.isOnline ? '#10B981' : '#6B7280'}; font-weight: 500;">
                  ${friend.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 8px;">
            ${distanceText ? `<div style="margin-bottom: 6px; font-size: 13px; color: #6b7280; display: flex; align-items: center;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              ${distanceText}
            </div>` : ''}
            
            <div style="font-size: 12px; color: #9ca3af; display: flex; align-items: center;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
              Updated ${getTimeSinceUpdate(friend.lastUpdated)}
            </div>
            
            ${friend.accuracy ? `<div style="font-size: 11px; color: #d1d5db; margin-top: 4px;">
              Accuracy: ±${Math.round(friend.accuracy)}m
            </div>` : ''}
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 8px;">
            <button 
              onclick="window.sendMessageToFriend && window.sendMessageToFriend('${friend.userId}')"
              style="background: #00af64; color: white; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; cursor: pointer; margin-right: 8px; transition: background-color 0.2s;"
              onmouseover="this.style.backgroundColor='#0e8f57'"
              onmouseout="this.style.backgroundColor='#00af64'"
            >
              💬 Message
            </button>
            <button 
              onclick="window.openDirectionsToFriend && window.openDirectionsToFriend(${friend.latitude}, ${friend.longitude}, '${friend.displayName}')"
              style="background: #3b82f6; color: white; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; cursor: pointer; transition: background-color 0.2s;"
              onmouseover="this.style.backgroundColor='#2563eb'"
              onmouseout="this.style.backgroundColor='#3b82f6'"
            >
              🧭 Directions
            </button>
          </div>
        </div>
      `;

      // Create info window
      const infoWindow = new google.maps.InfoWindow({
        content: infoWindowContent,
        disableAutoPan: false
      });

      // Add click listener to marker
      marker.addListener('click', () => {
        // Close any active info window
        if (activeInfoWindow) {
          const activeWindow = infoWindowsRef.current.get(activeInfoWindow);
          activeWindow?.close();
        }

        // Open this info window
        infoWindow.open(map, marker);
        setActiveInfoWindow(friend.userId);
        
        // Call callback if provided
        onFriendClick?.(friend);
      });

      // Add listener for info window close
      infoWindow.addListener('closeclick', () => {
        setActiveInfoWindow(null);
      });

      // Store marker and info window
      markersRef.current.set(friend.userId, marker);
      infoWindowsRef.current.set(friend.userId, infoWindow);
    });

    // Cleanup function
    return () => {
      markersRef.current.forEach((marker) => {
        google.maps.event.clearInstanceListeners(marker);
        marker.setMap(null);
      });
      infoWindowsRef.current.forEach((infoWindow) => {
        google.maps.event.clearInstanceListeners(infoWindow);
        infoWindow.close();
      });
      markersRef.current.clear();
      infoWindowsRef.current.clear();
      setActiveInfoWindow(null);
    };
  }, [map, friendsLocations, currentUserLocation]);

  return null;
}