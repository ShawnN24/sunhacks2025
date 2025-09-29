import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/app/genkit';
import { TriangulationRequest, TriangulationResult, Location } from '@/app/components/messages/types';

// Helper function to calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Helper function to calculate the geographic center of multiple points
function calculateGeographicCenter(locations: Location[]): Location {
  if (locations.length === 0) {
    throw new Error('No locations provided');
  }
  
  if (locations.length === 1) {
    return locations[0];
  }
  
  let totalLat = 0;
  let totalLon = 0;
  
  locations.forEach(loc => {
    totalLat += loc.latitude;
    totalLon += loc.longitude;
  });
  
  return {
    latitude: totalLat / locations.length,
    longitude: totalLon / locations.length,
    timestamp: new Date()
  };
}

// Helper function to detect and filter outliers using mean with outlier filtering
function filterOutliers(locations: Location[], threshold: number = 1.5): {
  filteredLocations: Location[];
  outliersRemoved: number;
  originalCount: number;
  filteredCount: number;
} {
  if (locations.length <= 2) {
    // Not enough points to detect outliers
    return {
      filteredLocations: locations,
      outliersRemoved: 0,
      originalCount: locations.length,
      filteredCount: locations.length
    };
  }

  const originalCount = locations.length;
  
  // Calculate initial geographic center
  const center = calculateGeographicCenter(locations);
  
  // Calculate distances from each point to the center
  const distances = locations.map(loc => ({
    location: loc,
    distance: calculateDistance(center.latitude, center.longitude, loc.latitude, loc.longitude)
  }));
  
  // Sort by distance to find the farthest point
  distances.sort((a, b) => b.distance - a.distance);
  
  // Calculate mean and standard deviation of distances
  const meanDistance = distances.reduce((sum, d) => sum + d.distance, 0) / distances.length;
  const variance = distances.reduce((sum, d) => sum + Math.pow(d.distance - meanDistance, 2), 0) / distances.length;
  const stdDev = Math.sqrt(variance);
  
  // Find outliers (points beyond threshold * standard deviation from mean)
  const outlierThreshold = meanDistance + (threshold * stdDev);
  const outliers = distances.filter(d => d.distance > outlierThreshold);
  
  // If we found outliers, remove the farthest one and recalculate
  if (outliers.length > 0 && locations.length > 3) {
    // Remove the farthest outlier
    const filteredDistances = distances.filter(d => d.distance <= outlierThreshold);
    const filteredLocations = filteredDistances.map(d => d.location);
    
    // Recalculate center with filtered points
    const newCenter = calculateGeographicCenter(filteredLocations);
    
    return {
      filteredLocations,
      outliersRemoved: outliers.length,
      originalCount,
      filteredCount: filteredLocations.length
    };
  }
  
  // No outliers detected or not enough points to remove
  return {
    filteredLocations: locations,
    outliersRemoved: 0,
    originalCount,
    filteredCount: locations.length
  };
}

// Helper function to find the optimal meeting point using Gemini AI
async function findOptimalMeetingPoint(
  currentUserLocation: Location,
  friendLocations: Location[],
  conversationType: 'direct' | 'group'
): Promise<{ meetingPoint: Location; suggestions: string[] }> {
  try {
    // Create a context string for Gemini
    const allLocations = [currentUserLocation, ...friendLocations];
    const locationContext = allLocations.map((loc, index) => 
      `Location ${index + 1}: ${loc.latitude}, ${loc.longitude}${loc.address ? ` (${loc.address})` : ''}`
    ).join('\n');
    
    const prompt = `You are a local activity expert helping ${conversationType === 'direct' ? 'two friends' : 'a group of friends'} discover exciting activities in their area.

Current locations:
${locationContext}

Please analyze these locations and provide:
1. The optimal central meeting point (latitude, longitude) for activities
2. 6-8 specific, real activities and venues near that center point, including:
   - Popular restaurants with specific names and cuisine types
   - Entertainment venues (arcades, bowling alleys, escape rooms, etc.)
   - Outdoor activities (parks, hiking trails, sports facilities)
   - Cultural attractions (museums, galleries, theaters, historic sites)
   - Shopping and leisure (malls, markets, bookstores, cafes)
   - Nightlife options (bars, clubs, live music venues)
3. Brief reasoning for why this location and these activities work well for the group

Focus on real, specific venues and activities that exist in the area. Make suggestions diverse and appealing to different interests.

IMPORTANT: Keep activity descriptions concise while including key details like venue name, activity type, address, and one distinguishing feature.

Respond in JSON format:
{
  "meetingPoint": {
    "latitude": number,
    "longitude": number
  },
  "suggestions": [
    "Restaurant: [Name] - [Cuisine] ([key feature]) | [Address]",
    "Entertainment: [Name] - [Activity] ([group appeal]) | [Address]",
    "Outdoor: [Name] - [Activity] ([amenity]) | [Address]",
    "Cultural: [Name] - [Type] ([highlight]) | [Address]",
    "Shopping: [Name] - [Type] ([feature]) | [Address]",
    "Nightlife: [Name] - [Type] ([atmosphere]) | [Address]"
  ],
  "reasoning": "Brief explanation of why this location and activities work well for the group"
}`;

    const result = await ai.generate({
      prompt: prompt
    });

    // Parse the JSON response - handle various AI response formats
    let jsonText = result.text.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.includes('```json')) {
      const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
      }
    } else if (jsonText.includes('```')) {
      const codeMatch = jsonText.match(/```\s*([\s\S]*?)\s*```/);
      if (codeMatch) {
        jsonText = codeMatch[1].trim();
      }
    }
    
    // Remove any remaining markdown formatting
    jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    
    console.log('Raw AI response:', result.text);
    console.log('Cleaned JSON text:', jsonText);
    
    let response;
    try {
      response = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Failed to parse JSON:', jsonText);
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parsing error';
      throw new Error(`Failed to parse AI response as JSON: ${errorMessage}`);
    }
    
    return {
      meetingPoint: response.meetingPoint,
      suggestions: response.suggestions || []
    };
  } catch (error) {
    console.error('Error getting AI suggestions:', error);
    // Fallback to geographic center if AI fails
    const center = calculateGeographicCenter([currentUserLocation, ...friendLocations]);
    return {
      meetingPoint: center,
      suggestions: [
        "Restaurant: Local dining - Nearby cafes & restaurants | Check local listings",
        "Entertainment: Bowling/Arcades - Group fun activities | Check local listings",
        "Outdoor: Parks & trails - Fresh air & exercise | Check local listings",
        "Cultural: Museums & galleries - Art & history | Check local listings",
        "Shopping: Malls & markets - Browse & discover | Check local listings",
        "Nightlife: Bars & clubs - Evening socializing | Check local listings"
      ]
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: TriangulationRequest = await request.json();
    
    if (!body.currentUserLocation || !body.friendLocations || body.friendLocations.length === 0) {
      return NextResponse.json({ 
        error: 'Current user location and friend locations are required' 
      }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not found in environment variables');
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    console.log('Triangulating meeting point for:', {
      userLocation: body.currentUserLocation,
      friendCount: body.friendLocations.length,
      conversationType: body.conversationType
    });

    // Extract just the location data for processing
    const friendLocations = body.friendLocations.map(friend => friend.location);
    const allLocations = [body.currentUserLocation, ...friendLocations];
    
    // Apply outlier filtering for groups with 4+ people
    let filteredLocations = allLocations;
    let outlierFiltering = {
      enabled: false,
      outliersRemoved: 0,
      originalPointCount: allLocations.length,
      filteredPointCount: allLocations.length,
      outlierThreshold: 1.5
    };
    
    if (allLocations.length >= 4) {
      console.log('🔍 Applying outlier filtering for group with', allLocations.length, 'locations');
      const outlierResult = filterOutliers(allLocations, 1.5);
      filteredLocations = outlierResult.filteredLocations;
      outlierFiltering = {
        enabled: true,
        outliersRemoved: outlierResult.outliersRemoved,
        originalPointCount: outlierResult.originalCount,
        filteredPointCount: outlierResult.filteredCount,
        outlierThreshold: 1.5
      };
      
      if (outlierResult.outliersRemoved > 0) {
        console.log(`🚫 Removed ${outlierResult.outliersRemoved} outlier(s) from triangulation`);
      }
    }
    
    // Find optimal meeting point using Gemini AI with filtered locations
    const { meetingPoint, suggestions } = await findOptimalMeetingPoint(
      body.currentUserLocation,
      filteredLocations.filter(loc => loc !== body.currentUserLocation),
      body.conversationType
    );

    // Calculate additional metrics using filtered locations
    const maxDistance = Math.max(
      ...filteredLocations.map(loc => 
        calculateDistance(
          meetingPoint.latitude, 
          meetingPoint.longitude, 
          loc.latitude, 
          loc.longitude
        )
      )
    );

    const result: TriangulationResult = {
      meetingPoint: {
        ...meetingPoint,
        timestamp: new Date()
      },
      suggestions,
      distance: Math.round(maxDistance * 100) / 100, // Round to 2 decimal places
      estimatedTravelTime: Math.round(maxDistance * 2), // Rough estimate: 2 minutes per km
      outlierFiltering
    };

    console.log('Triangulation result:', result);

    return NextResponse.json({ 
      success: true,
      result 
    });

  } catch (error) {
    console.error('Triangulation API error:', error);
    
    return NextResponse.json({ 
      error: `Failed to triangulate meeting point: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
