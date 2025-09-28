import { UserLocation, Location } from '@/app/components/messages/types';
import { 
  mockFriendsLocations, 
  mockGroupLocations, 
  mockSingleFriendLocation,
  generateMockFriendLocations,
  mockGroupLocationsWithOutliers,
  mockGroupLocationsWithExtremeOutlier
} from './mockData';

// Mock service that simulates Firebase functions for testing
export class MockTriangulationService {
  private static useMockData = true; // Set to false to use real Firebase

  /**
   * Mock version of getFriendsLocations
   */
  static async getFriendsLocations(userId: string): Promise<UserLocation[]> {
    if (!this.useMockData) {
      // Import and use real Firebase function
      const { getFriendsLocations } = await import('./firebase/friends');
      return getFriendsLocations(userId);
    }

    // Return mock data
    console.log('🔧 Using mock friends locations for testing');
    return mockFriendsLocations;
  }

  /**
   * Mock version of getGroupMembersLocations
   */
  static async getGroupMembersLocations(groupId: string, currentUserId: string): Promise<UserLocation[]> {
    if (!this.useMockData) {
      // Import and use real Firebase function
      const { getGroupMembersLocations } = await import('./firebase/friends');
      return getGroupMembersLocations(groupId, currentUserId);
    }

    // Return mock data
    console.log('🔧 Using mock group member locations for testing');
    return mockGroupLocations;
  }

  /**
   * Mock version of getUserLocation
   */
  static async getUserLocation(userId: string): Promise<Location | null> {
    if (!this.useMockData) {
      // Import and use real Firebase function
      const { getUserLocation } = await import('./firebase/friends');
      return getUserLocation(userId);
    }

    // Return mock current user location
    console.log('🔧 Using mock current user location for testing');
    return {
      latitude: 33.4942,
      longitude: -111.9211,
      accuracy: 12,
      address: "Scottsdale, AZ",
      timestamp: new Date()
    };
  }

  /**
   * Get mock data for a specific friend (1-on-1 DM)
   */
  static async getMockFriendLocation(friendId: string): Promise<UserLocation[]> {
    console.log('🔧 Using mock single friend location for testing');
    return [mockSingleFriendLocation];
  }

  /**
   * Generate random mock locations for testing
   */
  static async getRandomMockLocations(count: number = 3): Promise<UserLocation[]> {
    console.log(`🔧 Generating ${count} random mock locations for testing`);
    return generateMockFriendLocations(count);
  }

  /**
   * Toggle between mock and real data
   */
  static setUseMockData(useMock: boolean) {
    this.useMockData = useMock;
    console.log(`🔧 Mock data ${useMock ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if currently using mock data
   */
  static isUsingMockData(): boolean {
    return this.useMockData;
  }

  /**
   * Get mock group locations with outliers for testing outlier filtering
   */
  static async getMockGroupLocationsWithOutliers(): Promise<UserLocation[]> {
    console.log('🔧 Using mock group locations with outliers for testing');
    return mockGroupLocationsWithOutliers;
  }

  /**
   * Get mock group locations with extreme outlier for testing outlier filtering
   */
  static async getMockGroupLocationsWithExtremeOutlier(): Promise<UserLocation[]> {
    console.log('🔧 Using mock group locations with extreme outlier for testing');
    return mockGroupLocationsWithExtremeOutlier;
  }
}
