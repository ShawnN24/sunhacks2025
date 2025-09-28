'use client'
import React, {useState, useMemo, useEffect} from 'react';
import {APIProvider, Map, useMap} from '@vis.gl/react-google-maps';

export default function Home() {
  const [center, setCenter] = useState<{lat:number, lng:number} | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="p-8">
        <h2 className="text-lg font-semibold">Google Maps API key not found</h2>
        <p className="mt-2 text-sm text-gray-600">Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your <code>.env.local</code> and restart the dev server.</p>
      </div>
    );
  }
  return (
      <div>
        <div className="p-8 pb-20 gap-16">
          <Searchbar onSelect={(loc) => setCenter(loc)} />
          <div id="app" className="w-full h-[600px]">
            <APIProvider apiKey={apiKey}>
              <Map
                style={{width: 'calc(100vw - 48px)', height: '100vh'}}
                defaultCenter={{lat:33.425, lng: -111.9400}}
                defaultZoom={13}
                gestureHandling='greedy'
                disableDefaultUI
                />
                <MapController center = {center} />
            </APIProvider>
          </div>
        </div>
      </div>
  );
}

function MapController({center}:{center: {lat:number, lng:number} | null}){
  const map = useMap();
  useEffect(() => {
    if(!map || !center) return;
    map.panTo(center);
    map.setZoom(13);
  }, [map, center]);
  return null;
}

const COORDS: Record<string, {lat:number,lng:number}> = {
  "Alice Johnson": { lat: 40, lng: 111.94 },
  "Bob Smith":    { lat: 100,  lng: 100 },
  "Carlos Rivera":{ lat: 0,  lng: 0 },
  "Diana Park":   { lat: 33.44,  lng: -111.92 },
  "Eve Thompson": { lat: 33.415, lng: -111.941 },
};

const DATA = Object.keys(COORDS);

function Searchbar({onSelect}:{onSelect?: (loc:{lat:number,lng:number}) => void}) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return DATA.filter((name) => name.toLowerCase().includes(q));
  }, [query]);

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
          <div className="text-sm text-gray-500">Type to search</div>
        ) : results.length === 0 ? (
          <div className="text-sm text-gray-500">No results</div>
        ) : (
          <ul className="mt-2 space-y-2">
            {results.map((r) => (
              <li
                key={r}
                className="flex justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded cursor-pointer"
                onClick={() => onSelect && onSelect(COORDS[r])}
              >
                <span className="font-medium">{r}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}