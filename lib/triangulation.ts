import { TriangulationRequest, TriangulationResult, Location, UserLocation } from '@/app/components/messages/types';

/**
 * Client-side utility for making triangulation requests
 */
export class TriangulationService {
  /**
   * Find meeting point for 1-on-1 DM
   */
  static async findMeetingPointForDM(
    currentUserLocation: Location,
    friendLocation: Location
  ): Promise<TriangulationResult> {
    const request: TriangulationRequest = {
      currentUserLocation,
      friendLocations: [{
        userId: 'friend',
        location: friendLocation,
        lastUpdated: new Date()
      }],
      conversationType: 'direct'
    };

    return this.makeTriangulationRequest(request);
  }

  /**
   * Find meeting point for group DM
   */
  static async findMeetingPointForGroup(
    currentUserLocation: Location,
    groupMemberLocations: UserLocation[],
    groupId: string
  ): Promise<TriangulationResult> {
    const request: TriangulationRequest = {
      currentUserLocation,
      friendLocations: groupMemberLocations,
      groupId,
      conversationType: 'group'
    };

    return this.makeTriangulationRequest(request);
  }

  /**
   * Make the actual API request to triangulate endpoint
   */
  private static async makeTriangulationRequest(
    request: TriangulationRequest
  ): Promise<TriangulationResult> {
    try {
      const response = await fetch('/api/triangulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to triangulate meeting point');
      }

      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('Triangulation request failed:', error);
      throw error;
    }
  }

  /**
   * Get user's current location using browser geolocation API
   */
  static async getCurrentLocation(): Promise<Location> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp)
          });
        },
        (error) => {
          reject(new Error(`Geolocation error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  /**
   * Format location for display
   */
  static formatLocation(location: Location): string {
    return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
  }

  /**
   * Calculate distance between two locations in kilometers
   */
  static calculateDistance(loc1: Location, loc2: Location): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (loc2.latitude - loc1.latitude) * Math.PI / 180;
    const dLon = (loc2.longitude - loc1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(loc1.latitude * Math.PI / 180) * Math.cos(loc2.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}
