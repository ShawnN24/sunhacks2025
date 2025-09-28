import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const type = searchParams.get('type') || 'textsearch';

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
  }

  try {
    let url: string;
    
    if (type === 'nearby' && lat && lng) {
      // Nearby search
      url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=5000&key=${apiKey}`;
    } else if (query) {
      // Text search
      url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
    } else {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return NextResponse.json({ error: data.error_message || 'Places API error' }, { status: 400 });
    }

    const places = data.results?.map((place: any) => ({
      name: place.name,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      address: place.formatted_address || place.vicinity,
      place_id: place.place_id,
      rating: place.rating,
      types: place.types
    })) || [];

    return NextResponse.json({ places });

  } catch (error) {
    console.error('Places API error:', error);
    return NextResponse.json({ error: 'Failed to fetch places' }, { status: 500 });
  }
}
