# 📍 Triangulation Feature Documentation

## Overview

The triangulation feature uses Gemini AI to find optimal meeting points between you and your friends in both 1-on-1 DMs and group chats. It intelligently analyzes locations and suggests central meeting points with venue recommendations.

## Features

### 🎯 Core Functionality
- **1-on-1 DM Triangulation**: Find meeting points between you and one friend
- **Group DM Triangulation**: Find meeting points for multiple group members
- **AI-Powered Suggestions**: Gemini AI analyzes locations and suggests optimal venues
- **Distance Calculations**: Shows maximum distance and estimated travel time
- **Google Maps Integration**: Direct links to open meeting points in Google Maps

### 🧠 AI Intelligence
- **Smart Location Analysis**: Considers geographic distribution of all participants
- **Venue Recommendations**: Suggests restaurants, cafes, parks, and other meeting spots
- **Context-Aware**: Different suggestions for 2-person vs group meetings
- **Fallback Logic**: Falls back to geographic center if AI fails

## Architecture

### API Endpoint
```
POST /api/triangulate
```

**Request Body:**
```typescript
{
  currentUserLocation: Location;
  friendLocations: UserLocation[];
  groupId?: string;
  conversationType: 'direct' | 'group';
}
```

**Response:**
```typescript
{
  success: boolean;
  result: {
    meetingPoint: Location;
    suggestions: string[];
    distance?: number;
    estimatedTravelTime?: number;
  };
}
```

### Data Types

```typescript
interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: Date;
  address?: string;
}

interface UserLocation {
  userId: string;
  location: Location;
  lastUpdated: Date;
}

interface TriangulationResult {
  meetingPoint: Location;
  suggestions: string[];
  estimatedTravelTime?: number;
  distance?: number;
}
```

## Usage Examples

### 1. Basic Triangulation Button

```tsx
import TriangulationButton from '@/app/components/TriangulationButton';

<TriangulationButton
  currentUserId={currentUserId}
  friendLocations={friendLocations}
  conversationType="direct"
  onTriangulationResult={(result) => {
    console.log('Meeting point:', result.meetingPoint);
    console.log('Suggestions:', result.suggestions);
  }}
/>
```

### 2. Group Chat Integration

```tsx
<TriangulationButton
  currentUserId={currentUserId}
  friendLocations={groupMemberLocations}
  groupId={groupId}
  conversationType="group"
/>
```

### 3. Programmatic Usage

```typescript
import { TriangulationService } from '@/lib/triangulation';

// Get current location
const currentLocation = await TriangulationService.getCurrentLocation();

// Find meeting point for 1-on-1
const result = await TriangulationService.findMeetingPointForDM(
  currentLocation,
  friendLocation
);

// Find meeting point for group
const groupResult = await TriangulationService.findMeetingPointForGroup(
  currentLocation,
  groupMemberLocations,
  groupId
);
```

## Firebase Integration

### Location Storage
User locations are stored in the `users` collection with the following structure:

```typescript
{
  uid: string;
  displayName: string;
  email: string;
  // ... other user fields
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
    lastUpdated: Timestamp;
  };
}
```

### Available Functions

```typescript
// Update user location
await updateUserLocation(uid, location);

// Get user location
const location = await getUserLocation(uid);

// Get friends' locations
const friendLocations = await getFriendsLocations(userId);

// Get group members' locations
const groupLocations = await getGroupMembersLocations(groupId, currentUserId);
```

## Components

### TriangulationButton
Main component for triggering triangulation with a user-friendly interface.

**Props:**
- `currentUserId: string` - Current user's ID
- `friendLocations: UserLocation[]` - Array of friend/group member locations
- `groupId?: string` - Group ID (for group chats)
- `conversationType: 'direct' | 'group'` - Type of conversation
- `onTriangulationResult?: (result: TriangulationResult) => void` - Callback for results
- `className?: string` - Additional CSS classes

### TriangulationExample
Standalone example component showing how to use the triangulation feature.

### ChatView Integration
The ChatView component has been enhanced with triangulation functionality:
- Location pin button in the chat header
- Expandable triangulation panel
- Automatic location loading for friends/group members

## Error Handling

The system includes comprehensive error handling:

1. **Location Permission Denied**: Shows user-friendly error message
2. **No Friend Locations**: Displays appropriate message when friends haven't shared locations
3. **API Failures**: Falls back to geographic center calculation
4. **Network Issues**: Retry mechanisms and clear error messages

## Security Considerations

- **Location Privacy**: Locations are only shared with friends/groups
- **Permission-Based**: Users must explicitly share locations
- **Data Retention**: Consider implementing location data expiration
- **API Key Security**: Gemini API key stored in environment variables

## Performance Optimizations

- **Caching**: Friend locations are cached during chat sessions
- **Batch Loading**: Group member locations loaded in batches
- **Lazy Loading**: Triangulation only triggered when needed
- **Error Boundaries**: Graceful degradation when services fail

## Future Enhancements

### Planned Features
- **Real-time Location Updates**: Live location sharing during conversations
- **Location History**: Track meeting points over time
- **Advanced Analytics**: Travel time optimization, traffic considerations
- **Venue Integration**: Direct booking/reservation links
- **Custom Preferences**: User preferences for venue types
- **Offline Support**: Cached locations for offline triangulation

### API Improvements
- **Batch Triangulation**: Multiple meeting point calculations
- **Route Optimization**: Consider travel routes, not just distances
- **Weather Integration**: Factor in weather conditions
- **Event Integration**: Calendar integration for meeting scheduling

## Testing

### Unit Tests
```bash
# Test triangulation calculations
npm test triangulation

# Test API endpoints
npm test api/triangulate
```

### Integration Tests
```bash
# Test full triangulation flow
npm test integration/triangulation
```

## Deployment Notes

### Environment Variables
```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

### Firebase Rules
Ensure Firestore rules allow location updates:
```javascript
// Allow users to update their own location
match /users/{userId} {
  allow update: if request.auth.uid == userId;
}
```

### API Rate Limits
- Gemini API has rate limits
- Consider implementing request throttling
- Monitor usage and implement caching

## Troubleshooting

### Common Issues

1. **"Friend location not available"**
   - Friend hasn't shared their location
   - Location permissions not granted
   - Check Firebase user document for location field

2. **"Geolocation error"**
   - Browser location permissions denied
   - HTTPS required for geolocation
   - Check browser console for specific errors

3. **"Failed to triangulate meeting point"**
   - Gemini API key not configured
   - Network connectivity issues
   - Check server logs for detailed error messages

### Debug Mode
Enable debug logging by setting:
```bash
DEBUG=triangulation
```

## Contributing

When adding new features to the triangulation system:

1. Update TypeScript interfaces in `types.ts`
2. Add corresponding Firebase functions
3. Update API endpoint if needed
4. Add comprehensive error handling
5. Include unit tests
6. Update this documentation

## Support

For issues or questions about the triangulation feature:
- Check the troubleshooting section above
- Review server logs for error details
- Test with different location scenarios
- Verify Firebase permissions and API keys
