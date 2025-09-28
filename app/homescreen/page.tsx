"use client";

// Minimal `google` declaration for runtime maps objects (avoid TS errors in this file)
declare const google: any;

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { logout, onAuthStateChange } from "@/lib/firebase/auth";
import { User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import monkeyMarkerUrl from './images/beardot.png';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Search data from mapsearch.tsx
const COORDS: Record<string, {lat:number,lng:number}> = {
  "Alice Johnson": { lat: 40, lng: 111.94 },
  "Bob Smith":    { lat: 100,  lng: 100 },
  "Carlos Rivera":{ lat: 0,  lng: 0 },
  "Diana Park":   { lat: 33.44,  lng: -111.92 },
  "Eve Thompson": { lat: 33.415, lng: -111.941 },
};

const DATA = Object.keys(COORDS);

export default function Homescreen() {
  const [user, setUser] = useState<User | null>(null);
  const [activePopup, setActivePopup] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchCenter, setSearchCenter] = useState<{lat:number, lng:number} | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{lat:number, lng:number} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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

  // Get current position and set search center + open search popup
  const handleLocateMe = () => {
    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentLocation(loc);
        // center map on current location; Search popup is not opened by default
      },
      (err) => {
        console.error('Geolocation error', err);
        alert('Unable to retrieve your location: ' + (err.message || err.code));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
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
            >
              {/* Content area */}
              <div className="p-6 h-full">
                {/* Different content for each popup */}
                {activePopup === 0 && (
                  <div className="h-full flex flex-col">
                    <h2 className="text-2xl font-bold text-white mb-4">Search</h2>
                    <Searchbar onSelect={(loc) => setSearchCenter(loc)} />
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

      {/* Floating locate button (bottom-right) */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          aria-label="Locate me"
          onClick={handleLocateMe}
          className="w-12 h-12 rounded-full bg-[#0f9d63] text-white shadow-lg flex items-center justify-center hover:bg-[#0e8f57] transition-shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0f9d63]"
        >
          {/* higher-contrast target icon (white) */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" fill="white" />
            <path d="M12 2v2" stroke="white" />
            <path d="M12 20v2" stroke="white" />
            <path d="M2 12h2" stroke="white" />
            <path d="M20 12h2" stroke="white" />
          </svg>
        </button>
      </div>

      {/* Google Maps Background */}
      <div className="absolute inset-0 z-0">
        <APIProvider apiKey={'AIzaSyBt_ZhVFjm1l46fNDHf8B4v3NpwXHgeluU'}>
          <Map
            style={{width: '100%', height: '100%'}}
            defaultCenter={{lat: 33.425, lng: -111.9400}}
            defaultZoom={13}
            gestureHandling='greedy'
            disableDefaultUI
          />
          <MapController center={searchCenter} />
          <Markers onMarkerClick={(loc) => { setSearchCenter(loc); setActivePopup(0); }} />
          <SearchMarker center={searchCenter} />
          <CurrentLocationMarker center={currentLocation} />
        </APIProvider>
      </div>
      </div>
  );
}

// MapController component from mapsearch.tsx
function MapController({center}:{center: {lat:number, lng:number} | null}){
  const map = useMap();
  useEffect(() => {
    if(!map || !center) return;
    map.panTo(center);
    map.setZoom(13);
  }, [map, center]);
  return null;
}

// Searchbar component from mapsearch.tsx
function Searchbar({onSelect}:{onSelect?: (loc:{lat:number,lng:number} | null) => void}) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return DATA.filter((name) => name.toLowerCase().includes(q));
  }, [query]);

  // If the query is cleared, notify parent to clear the selected search
  useEffect(() => {
    if (query.trim() === "") {
      onSelect && onSelect(null);
    }
  }, [query, onSelect]);

  return (
    <div className="w-full max-w-md">
      <label htmlFor="search-input" className="sr-only">Search</label>
      <input
        id="search-input"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for a location"
        className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring"
      />

      <div className="mt-2">
        {query === "" ? (
          <div className="text-sm text-black text-opacity-60">Type to search</div>
        ) : results.length === 0 ? (
          <div className="text-sm text-black text-opacity-60">No results</div>
        ) : (
          <ul className="mt-2 space-y-2">
            {results.map((r) => (
              <li
                key={r}
                className="flex justify-between bg-white bg-opacity-20 p-2 rounded cursor-pointer hover:bg-opacity-30"
                onClick={() => onSelect && onSelect(COORDS[r])}
              >
                <span className="font-medium text-black">{r}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// Markers component: creates google.maps.Marker for each entry in COORDS
function Markers({onMarkerClick}:{onMarkerClick?: (loc:{lat:number,lng:number}) => void}){
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const markers: google.maps.Marker[] = [];
    const infoWindow = new google.maps.InfoWindow();

    // Use entries so we have the name associated with each coordinate
    Object.entries(COORDS).forEach(([name, coord]) => {
      const marker = new google.maps.Marker({
        position: coord,
        map,
      });
      marker.addListener('click', () => {
        // Open a single InfoWindow for clicked marker
        infoWindow.setContent(`<div style="padding:6px 8px;font-weight:600;">${name}</div>`);
        infoWindow.open({ map, anchor: marker });
        map.panTo(coord);
        map.setZoom(13);
        onMarkerClick && onMarkerClick(coord);
      });
      markers.push(marker);
    });

    // Close infoWindow and remove markers on cleanup
    return () => {
      infoWindow.close();
      markers.forEach(m => m.setMap(null));
    };
  }, [map, onMarkerClick]);

  return null;
}

// SearchMarker: single marker representing the current search result
function SearchMarker({center}:{center: {lat:number,lng:number} | null}){
  const map = useMap();
  useEffect(() => {
    if (!map) return;

    let marker: google.maps.Marker | null = null;

    if (center) {
      // SVG pin for search marker (green)
      const svg = `
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>
          <path fill='%2300af64' d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z'/>
          <circle cx='12' cy='9' r='2.5' fill='white'/>
        </svg>`;
      const url = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);

      marker = new google.maps.Marker({
        position: center,
        map,
        title: 'Search result',
        // icon,
        animation: google.maps.Animation.BOUNCE,
      });
      // stop bouncing after a short duration so it doesn't bounce forever
      setTimeout(() => {
        try { marker && marker.setAnimation(null); } catch (e) {}
      }, 1200);
      map.panTo(center);
      map.setZoom(13);
    }

    return () => {
      if (marker) {
        marker.setMap(null);
        marker = null;
      }
    };
  }, [map, center]);

  return null;
}

// CurrentLocationMarker: renders the user's location as a character of their choice
function CurrentLocationMarker({center}:{center: {lat:number,lng:number} | null}){
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    let advMarker: any = null;
    let fallbackMarker: google.maps.Marker | null = null;

    if (center) {
      // create an img element to use as the AdvancedMarkerElement content
  const img = document.createElement('img');
  const monkeyUrl = typeof monkeyMarkerUrl === 'string' ? monkeyMarkerUrl : (monkeyMarkerUrl as any).src || '';
  img.src = monkeyUrl;
      img.alt = 'You are here';
      // style so the image is bottom-center anchored (tip at location)
      img.style.width = '40px';
      img.style.height = '40px';
      img.style.transform = 'translate(-50%, -100%)';

      // Use AdvancedMarkerElement when available (Maps JS advanced markers)
      if (google && google.maps && (google.maps as any).marker && (google.maps as any).marker.AdvancedMarkerElement) {
        advMarker = new (google.maps as any).marker.AdvancedMarkerElement({
          map,
          position: center,
          content: img,
          title: 'Your location',
        });
      } else {
        // Fallback to a regular marker using the PNG as icon
        const icon = {
          url: typeof monkeyMarkerUrl === 'string' ? monkeyMarkerUrl : (monkeyMarkerUrl as any).src || '',
          scaledSize: new google.maps.Size(40, 40),
          anchor: new google.maps.Point(20, 40),
        } as any;
        fallbackMarker = new google.maps.Marker({
          position: center,
          map,
          title: 'Your location',
          icon,
        });
      }

      try { map.panTo(center); } catch (e) {}
    }

    return () => {
      try {
        if (advMarker && typeof advMarker.setMap === 'function') advMarker.setMap(null);
      } catch (e) {}
      if (fallbackMarker) {
        fallbackMarker.setMap(null);
        fallbackMarker = null;
      }
    };
  }, [map, center]);

  return null;
}
