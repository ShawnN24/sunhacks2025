import { UserLocation, Location } from '@/app/components/messages/types';

// Mock locations around different areas for testing
const mockLocations: Location[] = [
  // Downtown Phoenix area
  {
    latitude: 33.4484,
    longitude: -112.0740,
    accuracy: 10,
    address: "Downtown Phoenix, AZ",
    timestamp: new Date()
  },
  // Tempe area (ASU)
  {
    latitude: 33.4255,
    longitude: -111.9404,
    accuracy: 15,
    address: "Tempe, AZ (ASU Campus)",
    timestamp: new Date()
  },
  // Scottsdale area
  {
    latitude: 33.4942,
    longitude: -111.9211,
    accuracy: 12,
    address: "Scottsdale, AZ",
    timestamp: new Date()
  },
  // Mesa area
  {
    latitude: 33.4152,
    longitude: -111.8315,
    accuracy: 8,
    address: "Mesa, AZ",
    timestamp: new Date()
  },
  // Glendale area
  {
    latitude: 33.5387,
    longitude: -112.1860,
    accuracy: 20,
    address: "Glendale, AZ",
    timestamp: new Date()
  },
  // Chandler area
  {
    latitude: 33.3062,
    longitude: -111.8412,
    accuracy: 18,
    address: "Chandler, AZ",
    timestamp: new Date()
  }
];

// Mock friend data with locations
export const mockFriendsLocations: UserLocation[] = [
  {
    userId: 'friend1',
    location: mockLocations[0], // Downtown Phoenix
    lastUpdated: new Date()
  },
  {
    userId: 'friend2', 
    location: mockLocations[1], // Tempe
    lastUpdated: new Date()
  },
  {
    userId: 'friend3',
    location: mockLocations[2], // Scottsdale
    lastUpdated: new Date()
  }
];

// Mock group member locations (for group chats)
export const mockGroupLocations: UserLocation[] = [
  {
    userId: 'member1',
    location: mockLocations[0], // Downtown Phoenix
    lastUpdated: new Date()
  },
  {
    userId: 'member2',
    location: mockLocations[1], // Tempe
    lastUpdated: new Date()
  },
  {
    userId: 'member3',
    location: mockLocations[2], // Scottsdale
    lastUpdated: new Date()
  },
  {
    userId: 'member4',
    location: mockLocations[3], // Mesa
    lastUpdated: new Date()
  }
];

// Mock single friend location (for 1-on-1 DMs)
export const mockSingleFriendLocation: UserLocation = {
  userId: 'friend_sarah',
  location: {
    latitude: 33.4255,
    longitude: -111.9404,
    accuracy: 15,
    address: "Tempe, AZ (ASU Campus)",
    timestamp: new Date()
  },
  lastUpdated: new Date()
};

// Mock current user location (you can change this to test different scenarios)
export const mockCurrentUserLocation: Location = {
  latitude: 33.4942,
  longitude: -111.9211,
  accuracy: 12,
  address: "Scottsdale, AZ",
  timestamp: new Date()
};

// Function to get random mock location
export function getRandomMockLocation(): Location {
  const randomIndex = Math.floor(Math.random() * mockLocations.length);
  return {
    ...mockLocations[randomIndex],
    timestamp: new Date()
  };
}

// Function to generate mock friend locations for testing
export function generateMockFriendLocations(count: number = 3): UserLocation[] {
  const locations: UserLocation[] = [];
  
  for (let i = 0; i < count; i++) {
    const randomLocation = getRandomMockLocation();
    locations.push({
      userId: `mock_friend_${i + 1}`,
      location: randomLocation,
      lastUpdated: new Date()
    });
  }
  
  return locations;
}

// Function to simulate location updates (for testing real-time features)
export function simulateLocationUpdate(userId: string): UserLocation {
  const randomLocation = getRandomMockLocation();
  return {
    userId,
    location: randomLocation,
    lastUpdated: new Date()
  };
}

// Mock data with outliers for testing outlier filtering
export const mockGroupLocationsWithOutliers: UserLocation[] = [
  {
    userId: 'member1',
    location: {
      latitude: 33.4484,
      longitude: -112.0740,
      accuracy: 10,
      address: "Downtown Phoenix, AZ",
      timestamp: new Date()
    },
    lastUpdated: new Date()
  },
  {
    userId: 'member2',
    location: {
      latitude: 33.4255,
      longitude: -111.9404,
      accuracy: 15,
      address: "Tempe, AZ (ASU Campus)",
      timestamp: new Date()
    },
    lastUpdated: new Date()
  },
  {
    userId: 'member3',
    location: {
      latitude: 33.4942,
      longitude: -111.9211,
      accuracy: 12,
      address: "Scottsdale, AZ",
      timestamp: new Date()
    },
    lastUpdated: new Date()
  },
  {
    userId: 'member4',
    location: {
      latitude: 33.4152,
      longitude: -111.8315,
      accuracy: 8,
      address: "Mesa, AZ",
      timestamp: new Date()
    },
    lastUpdated: new Date()
  },
  // This is the outlier - someone in Tucson (much farther away)
  {
    userId: 'outlier_member',
    location: {
      latitude: 32.2226,
      longitude: -110.9747,
      accuracy: 25,
      address: "Tucson, AZ (OUTLIER - 100+ miles away)",
      timestamp: new Date()
    },
    lastUpdated: new Date()
  }
];

// Mock data with extreme outlier (someone in California)
export const mockGroupLocationsWithExtremeOutlier: UserLocation[] = [
  {
    userId: 'member1',
    location: {
      latitude: 33.4484,
      longitude: -112.0740,
      accuracy: 10,
      address: "Downtown Phoenix, AZ",
      timestamp: new Date()
    },
    lastUpdated: new Date()
  },
  {
    userId: 'member2',
    location: {
      latitude: 33.4255,
      longitude: -111.9404,
      accuracy: 15,
      address: "Tempe, AZ (ASU Campus)",
      timestamp: new Date()
    },
    lastUpdated: new Date()
  },
  {
    userId: 'member3',
    location: {
      latitude: 33.4942,
      longitude: -111.9211,
      accuracy: 12,
      address: "Scottsdale, AZ",
      timestamp: new Date()
    },
    lastUpdated: new Date()
  },
  // Extreme outlier - someone in Los Angeles (300+ miles away)
  {
    userId: 'extreme_outlier',
    location: {
      latitude: 34.0522,
      longitude: -118.2437,
      accuracy: 50,
      address: "Los Angeles, CA (EXTREME OUTLIER - 300+ miles away)",
      timestamp: new Date()
    },
    lastUpdated: new Date()
  }
];
