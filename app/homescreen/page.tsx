"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { logout, onAuthStateChange } from "@/lib/firebase/auth";
import { User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import { Truculenta } from "next/font/google";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Place interface for Google Places API results
interface Place {
  name: string;
  lat: number;
  lng: number;
  address: string;
  place_id: string;
}

export default function Homescreen() {
  const [user, setUser] = useState<User | null>(null);
  const [activePopup, setActivePopup] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchCenter, setSearchCenter] = useState<{lat:number, lng:number} | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number, name: string, address: string} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Google Places API functions using server-side route
  const searchPlaces = async (query: string): Promise<Place[]> => {
    if (!query.trim()) return [];
    
    try {
      const response = await fetch(`/api/places?query=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data.error) {
        console.error('Places API error:', data.error);
        return [];
      }
      
      return data.places || [];
    } catch (error) {
      console.error('Error searching places:', error);
      return [];
    }
  };

  const getNearbyPlaces = async (lat: number, lng: number): Promise<Place[]> => {
    try {
      const response = await fetch(`/api/places?type=nearby&lat=${lat}&lng=${lng}`);
      const data = await response.json();
      
      if (data.error) {
        console.error('Places API error:', data.error);
        return [];
      }
      
      return data.places || [];
    } catch (error) {
      console.error('Error fetching nearby places:', error);
      return [];
    }
  };

  // Load nearby places on component mount
  useEffect(() => {
    const loadNearbyPlaces = async () => {
      const nearbyPlaces = await getNearbyPlaces(33.425, -111.9400); // Tempe, AZ
      setPlaces(nearbyPlaces);
    };
    loadNearbyPlaces();
  }, []);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChange((authUser: User | null) => {
      if (!authUser) {
        router.push('/');
      } else {
        setUser(authUser);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          history: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
      });

      const data = await response.json();
      console.log('API Response:', data);

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        console.error('API Error:', data.error, data.details);
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="relative w-screen h-screen bg-gray-100">
      {/* Left middle 3 bubble menu */}
      <div className="absolute top-1/2 left-8 transform -translate-y-1/2 z-40">
        <div className="flex flex-col space-y-3">
          {[
            // Map pointer icon
            <svg key={0} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>,
            // AI letters
            <div key={1} className="font-bold text-lg leading-none">AI</div>,
            // Message box icon
            <svg key={2} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>,
            // Logout icon
            <svg key={3} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16,17 21,12 16,7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          ].map((icon, i) => (
            <div
              key={i}
              className={`w-12 h-12 rounded-full cursor-pointer transition-colors flex items-center justify-center ${
                activePopup === i 
                  ? 'bg-white shadow-lg text-[#00af64]' 
                  : i === 3
                  ? 'bg-red-500 hover:bg-red-600 text-white' // Special styling for logout
                  : 'bg-[#00af64] hover:bg-[#00c770] text-white'
              }`}
              onClick={() => i === 3 ? handleLogout() : setActivePopup(activePopup === i ? null : i)}
            >
              {icon}
            </div>
          ))}
        </div>
      </div>

      {/* Expanding Popup Windows */}
      <AnimatePresence>
        {activePopup !== null && activePopup !== 3 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30"
            style={{ pointerEvents: 'none' }}
          >
            {/* Expanding rectangle from bubble position */}
            <motion.div
              initial={{ 
                width: "48px", 
                height: "48px", 
                x: 32, // left-8 = 32px (bubble container position)
                y: `calc(50% - 24px + ${activePopup * 60 - 60}px)`, // Exact bubble position from middle
                borderRadius: "50%"
              }}
              animate={{ 
                width: "400px", 
                height: "100vh", 
                x: 104, // Position to the right of left bubbles (32px + 72px gap)
                y: 0, // Start from top of screen
                borderRadius: "12px"
              }}
              exit={{ 
                width: "48px", 
                height: "48px", 
                x: 32, // Return to bubble container position
                y: `calc(50% - 24px + ${activePopup * 60 - 60}px)`, // Return to exact bubble position
                borderRadius: "50%"
              }}
              transition={{ 
                type: "spring", 
                damping: 20, 
                stiffness: 300,
                duration: 0.4
              }}
              className="absolute overflow-hidden bg-[#00af64] shadow-2xl"
              style={{ pointerEvents: 'auto' }}
            >
              {/* Content area */}
              <div className="p-6 h-full">
                {/* Different content for each popup */}
                {activePopup === 0 && (
                  <div className="h-full flex flex-col">
                    <h2 className="text-2xl font-bold text-white mb-4">Search</h2>
                    
                    {/* Location Display Menu */}
                    {selectedLocation && (
                      <div className="mb-4 p-4 bg-white bg-opacity-20 rounded-lg">
                        <h3 className="text-lg font-semibold text-black mb-2">{selectedLocation.name}</h3>
                        <div className="text-sm text-black text-opacity-90">
                          <p className="mb-2">{selectedLocation.address}</p>
                        </div>
                        <div className="mt-3 flex space-x-2">
                          <button 
                            onClick={() => setSearchCenter(selectedLocation)}
                            className="px-3 py-1 bg-white bg-opacity-30 text-black rounded text-sm hover:bg-opacity-40 transition-colors"
                          >
                            Go to Location
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedLocation(null);
                              // Restore the previous search if available
                              if ((window as any).restoreSearch) {
                                (window as any).restoreSearch();
                              }
                            }}
                            className="px-3 py-1 bg-blue-500 bg-opacity-30 text-black rounded text-sm hover:bg-opacity-40 transition-colors"
                          >
                            ← Back to Search
                          </button>
                          <button 
                            onClick={() => setSelectedLocation(null)}
                            className="px-3 py-1 bg-red-500 bg-opacity-30 text-black rounded text-sm hover:bg-opacity-40 transition-colors"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <Searchbar 
                      onSelect={(place) => {
                        setSearchCenter({lat: place.lat, lng: place.lng});
                        // Set the selected location to show in the popup with actual place info
                        setSelectedLocation({
                          lat: place.lat,
                          lng: place.lng,
                          name: place.name,
                          address: place.address
                        });
                        
                        // Close any existing POI info window first
                        if ((window as any).closeCustomInfoWindow) {
                          (window as any).closeCustomInfoWindow();
                        }
                        
                        // Also create a custom POI info window for the search result
                        const placeDetails = {
                          name: place.name,
                          formatted_address: place.address,
                          rating: null,
                          types: []
                        };
                        
                        // Create custom info window (reuse the same function from MapController)
                        if ((window as any).createCustomInfoWindow) {
                          (window as any).createCustomInfoWindow(placeDetails, place.lat, place.lng);
                        }
                      }}
                      onBackToSearch={(restoreFunction) => {
                        // Store the restore function for use in the back button
                        (window as any).restoreSearch = restoreFunction;
                      }}
                      onClearMemory={(clearFunction) => {
                        // Store the clear function for use when clicking on map
                        (window as any).clearSearchMemory = clearFunction;
                      }}
                    />
                  </div>
                )}
                
                {activePopup === 1 && (
                  <div className="h-full flex flex-col">
                    <h2 className="text-2xl font-bold text-white mb-4">Chat with MApI</h2>
                    
                    {/* Messages Container */}
                    <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
                      {messages.length === 0 && (
                        <div className="text-white text-opacity-60 text-center py-8">
                          <p>Start a conversation with MApI!</p>
                          <p className="text-sm mt-2">Ask me anything about locations, directions, or places.</p>
                        </div>
                      )}
                      
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] p-3 rounded-lg ${
                              message.role === 'user'
                                ? 'bg-white bg-opacity-20 text-black'
                                : 'bg-white bg-opacity-10 text-black'
                            }`}
                          >
                            <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                            <p className="text-xs text-black text-opacity-50 mt-1">
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                      
                      {isLoading && (
                        <div className="flex justify-start">
                          <div className="bg-white bg-opacity-10 text-black p-3 rounded-lg">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-white bg-opacity-60 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-white bg-opacity-60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-2 h-2 bg-white bg-opacity-60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div ref={messagesEndRef} />
                    </div>
                    
                    {/* Input Area */}
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask MApI anything..."
                        className="flex-1 p-3 rounded-lg bg-white bg-opacity-20 text-black placeholder-white placeholder-opacity-60 focus:outline-none focus:bg-opacity-30"
                        disabled={isLoading}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!inputMessage.trim() || isLoading}
                        className="px-4 py-3 bg-white bg-opacity-20 text-black rounded-lg hover:bg-opacity-30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13"/>
                          <polygon points="22,2 15,22 11,13 2,9 22,2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
                
                {activePopup === 2 && (
                  <div className="h-full flex flex-col">
                    <h2 className="text-2xl font-bold text-white mb-4">DMs</h2>

                    </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Google Maps Background */}
      <div className="absolute inset-0 z-0">
        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!} libraries={['places']}>
          <Map
            style={{width: '100%', height: '100%'}}
            defaultCenter={{lat: 33.425, lng: -111.9400}}
            defaultZoom={13}
            gestureHandling='greedy'
            disableDefaultUI={true}
            clickableIcons={true}
            disableDoubleClickZoom={false}
            mapTypeControl={false}
            streetViewControl={false}
            fullscreenControl={false}
            zoomControl={true}
          />
          <MapController 
            center={searchCenter} 
            places={places}
            onLocationClick={(lat, lng, name, address) => {
              setSelectedLocation({lat, lng, name, address});
              // Clear search memory when clicking on map
              if ((window as any).clearSearchMemory) {
                (window as any).clearSearchMemory();
              }
              // Auto-open search popup when location is clicked
              if (activePopup !== 0) {
                setActivePopup(0);
              }
            }}
          />
        </APIProvider>
      </div>
    </div>
  );
}

// MapController component with click handling and enhanced zoom functionality
function MapController({center, places, onLocationClick}:{center: {lat:number, lng:number} | null, places: Place[], onLocationClick?: (lat: number, lng: number, name: string, address: string) => void}){
  const map = useMap();
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const customInfoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  
  useEffect(() => {
    if(!map) return;
    
    const createCustomInfoWindow = (placeDetails: any, lat: number, lng: number) => {
      // Close existing info window
      if (customInfoWindowRef.current) {
        customInfoWindowRef.current.close();
        customInfoWindowRef.current = null;
      }
      
      // Create custom HTML content
      const content = `
        <div style="padding: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 200px; position: relative;">
          <button onclick="this.closest('.gm-style-iw-c').style.display='none'" 
                  style="position: absolute; top: 4px; right: 4px; background: #00af64; color: white; border: none; border-radius: 75%; width: 20px; height: 20px; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 1000; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
            x
          </button>
          <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 16px; font-weight: 700; padding-right: 24px;">${placeDetails.name || 'Unknown Location'}</h3>
          ${placeDetails.formatted_address ? `<p style="margin: 4px 0; color: #6b7280; font-size: 12px;">${placeDetails.formatted_address}</p>` : ''}
        </div>
      `;
      
      // Create new info window
      customInfoWindowRef.current = new google.maps.InfoWindow({
        content: content,
        position: { lat, lng },
        disableAutoPan: true,
        headerDisabled: true
      });
      
      customInfoWindowRef.current.open(map);
    };
    
    // Make the functions globally accessible for search results
    (window as any).createCustomInfoWindow = createCustomInfoWindow;
    (window as any).closeCustomInfoWindow = () => {
      if (customInfoWindowRef.current) {
        customInfoWindowRef.current.close();
        customInfoWindowRef.current = null;
      }
    };

    // Enable POI clicking but intercept for custom popup
    const enableMapInteractions = () => {
      map.setOptions({
        clickableIcons: true, // Enable POI clicking
        disableDoubleClickZoom: false,
        streetViewControl: false,
        fullscreenControl: false
      });
      
      // Intercept POI clicks and show custom info windows
      const originalAddListener = map.addListener;
      map.addListener = function(eventName: string, handler: Function) {
        if (eventName === 'click') {
          return originalAddListener.call(this, eventName, (event: any) => {
            // Check if click is on a POI by looking for place data
            if (event.placeId) {
              // This is a POI click - handle it with our custom logic
              handlePOIClick(event);
            } else {
              // Regular map click - use existing handler
              handler(event);
            }
          });
        }
        return originalAddListener.call(this, eventName, handler);
      };
    };
    
    // Handle POI clicks with custom logic
    const handlePOIClick = async (event: any) => {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      
      try {
        // Get POI details using the place ID
        const service = new google.maps.places.PlacesService(map);
        const detailsRequest = {
          placeId: event.placeId,
          fields: ['name', 'formatted_address', 'rating', 'types', 'vicinity']
        };
        
        const placeDetails = await new Promise<any>((resolve) => {
          service.getDetails(detailsRequest, (result, status) => {
            if (status === 'OK' && result) {
              resolve(result);
            } else {
              resolve(null);
            }
          });
        });
        
        if (placeDetails) {
          // Close any existing info window first
          if (customInfoWindowRef.current) {
            customInfoWindowRef.current.close();
            customInfoWindowRef.current = null;
          }
          
          // Show custom info window
          createCustomInfoWindow(placeDetails, lat, lng);
          
          // Also show information in the search popup
          const name = placeDetails.name || 'Unknown Location';
          const address = placeDetails.formatted_address || placeDetails.vicinity || '';
          onLocationClick?.(lat, lng, name, address);
        } else {
          // Close any existing info window first
          if (customInfoWindowRef.current) {
            customInfoWindowRef.current.close();
            customInfoWindowRef.current = null;
          }
          
          // Fallback for unknown locations
          const fallbackDetails = {
            name: 'Unknown Location',
            formatted_address: '',
            rating: null,
            types: []
          };
          createCustomInfoWindow(fallbackDetails, lat, lng);
          
          // Also show in search popup
          onLocationClick?.(lat, lng, 'Unknown Location', '');
        }
      } catch (error) {
        console.error('POI click error:', error);
        onLocationClick?.(lat, lng, 'Unknown Location', '');
      }
    };
    
    // Handle clicks on map labels and POIs - route to search popup
    const clickListener = map.addListener('click', async (event: any) => {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      
      // Try to get POI information using Places API nearby search
      try {
        const service = new google.maps.places.PlacesService(map);
        const request = {
          location: { lat, lng },
          radius: 50, // Small radius to catch nearby POIs
          type: 'establishment'
        };
        
        const placesResult = await new Promise<any>((resolve) => {
          service.nearbySearch(request, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              resolve(results[0]);
            } else {
              resolve(null);
            }
          });
        });
        
        if (placesResult) {
          // Close any existing info window first
          if (customInfoWindowRef.current) {
            customInfoWindowRef.current.close();
            customInfoWindowRef.current = null;
          }
          
          // Use POI information from Places API
          const name = placesResult.name || 'Unknown Location';
          const address = placesResult.vicinity || placesResult.formatted_address || '';
          
          // Get additional details if available
          if (placesResult.place_id) {
            const detailsRequest = {
              placeId: placesResult.place_id,
              fields: ['formatted_address', 'name', 'rating', 'types']
            };
            
            const placeDetails = await new Promise<any>((resolve) => {
              service.getDetails(detailsRequest, (result, status) => {
                if (status === 'OK' && result) {
                  resolve(result);
                } else {
                  resolve(null);
                }
              });
            });
            
            const fullAddress = placeDetails?.formatted_address || address;
            onLocationClick?.(lat, lng, name, fullAddress);
          } else {
            onLocationClick?.(lat, lng, name, address);
          }
        } else {
          // Close any existing info window first
          if (customInfoWindowRef.current) {
            customInfoWindowRef.current.close();
            customInfoWindowRef.current = null;
          }
          
          // Fallback to reverse geocoding for non-POI locations
          const geocoder = new google.maps.Geocoder();
          const result = await new Promise<any>((resolve) => {
            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
              if (status === 'OK' && results && results[0]) {
                resolve(results[0]);
              } else {
                resolve(null);
              }
            });
          });
          
          if (result) {
            const name = result.formatted_address || 'Unknown Location';
            const address = result.formatted_address || '';
            onLocationClick?.(lat, lng, name, address);
          } else {
            onLocationClick?.(lat, lng, 'Unknown Location', '');
          }
        }
      } catch (error) {
        console.error('Places API error:', error);
        onLocationClick?.(lat, lng, 'Unknown Location', '');
      }
    });
    
    // Apply the map interactions
    enableMapInteractions();
    
    return () => {
      google.maps.event.removeListener(clickListener);
    };
  }, [map, onLocationClick]);
  
  useEffect(() => {
    if(!map || !center) return;
    
    // Pan to the location
    map.panTo(center);
    
    // Zoom in more for better detail
    map.setZoom(16);
    
    // Remove previous marker
    if (marker) {
      marker.setMap(null);
    }
    
    // Add a green marker at the selected location to match POI styling
    const newMarker = new google.maps.Marker({
      position: center,
      map: map,
      title: "Selected Location",
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14" fill="#00af64" stroke="#ffffff" stroke-width="3"/>
            <circle cx="16" cy="16" r="6" fill="#ffffff"/>
            <path d="M12 8h8v16h-8z" fill="#00af64"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(32, 32),
        anchor: new google.maps.Point(16, 32)
      }
    });
    
    setMarker(newMarker);
    
    // Clean up marker when component unmounts or center changes
    return () => {
      if (newMarker) {
        newMarker.setMap(null);
      }
    };
  }, [map, center]);
  
  
  return null;
}

// Searchbar component with Google Places API
function Searchbar({onSelect, onBackToSearch, onClearMemory}:{onSelect?: (place: Place) => void, onBackToSearch?: (restoreFunction: () => void) => void, onClearMemory?: (clearFunction: () => void) => void}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [previousQuery, setPreviousQuery] = useState("");
  const [previousResults, setPreviousResults] = useState<Place[]>([]);

  // Function to restore previous search
  const restorePreviousSearch = useCallback(() => {
    setQuery(previousQuery);
    setResults(previousResults);
  }, [previousQuery, previousResults]);

  // Function to clear search memory
  const clearSearchMemory = useCallback(() => {
    setPreviousQuery("");
    setPreviousResults([]);
  }, []);

  // Expose restore function to parent
  useEffect(() => {
    if (onBackToSearch) {
      onBackToSearch(restorePreviousSearch);
    }
  }, [onBackToSearch, restorePreviousSearch]);

  // Expose clear function to parent
  useEffect(() => {
    if (onClearMemory) {
      onClearMemory(clearSearchMemory);
    }
  }, [onClearMemory, clearSearchMemory]);

  // Debounced search function
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (query.trim()) {
        setIsSearching(true);
        try {
          const response = await fetch(`/api/places?query=${encodeURIComponent(query)}`);
          const data = await response.json();
          
          if (data.error) {
            console.error('Search error:', data.error);
            setResults([]);
          } else {
            setResults(data.places || []);
          }
        } catch (error) {
          console.error('Search error:', error);
          setResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setResults([]);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [query]);

  return (
    <div className="w-full h-full flex flex-col">
      <label htmlFor="search-input" className="sr-only">Search</label>
      <input
        id="search-input"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for a location"
        className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring mb-4"
      />

      <div className="flex-1 overflow-hidden">
        {query === "" ? (
          <div className="text-sm text-black text-opacity-60 h-full flex items-center justify-center">Type to search for places</div>
        ) : isSearching ? (
          <div className="text-sm text-black text-opacity-60 h-full flex items-center justify-center">Searching...</div>
        ) : results.length === 0 ? (
          <div className="text-sm text-black text-opacity-60 h-full flex items-center justify-center">No results found</div>
        ) : (
          <ul className="h-full overflow-y-auto space-y-2 pr-2">
            {results.map((place) => (
              <li
                key={place.place_id}
                className="flex flex-col bg-white bg-opacity-20 p-3 rounded cursor-pointer hover:bg-opacity-30 transition-all duration-200"
                onClick={() => {
                  // Save current search state before clearing
                  setPreviousQuery(query);
                  setPreviousResults(results);
                  
                  onSelect && onSelect(place);
                  // Clear search results and query after selection
                  setQuery("");
                  setResults([]);
                }}
              >
                <span className="font-medium text-black">{place.name}</span>
                <span className="text-xs text-black text-opacity-70">{place.address}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
