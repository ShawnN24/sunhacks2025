# MApI - Social Location Platform

**MApI** is a sophisticated social location-sharing platform built for SunHacks 2025 that combines real-time location sharing, social messaging, intelligent activity recommendations, and advanced mapping features.

![MApI Logo](public/mapi.png)

## 🌟 Features

### 📍 Smart Location Services
- **Real-time Location Sharing**: Share your live location with friends and groups
- **Privacy Controls**: Granular control over who can see your location and when
- **Location-based Chat**: Context-aware messaging based on proximity and location
- **Interactive Maps**: Powered by Google Maps with custom markers and overlays

### 🤝 Social Networking
- **Friend Management**: Send, accept, and manage friend requests
- **Group Messaging**: Create and manage group conversations
- **Real-time Messaging**: Instant direct and group messaging with Firebase
- **Social Discovery**: Find and connect with friends through search

### 🎯 Intelligent Activity Recommendations
- **Triangulation System**: AI-powered meeting point calculation for groups
- **Activity Suggestions**: Gemini AI generates personalized activity recommendations
- **Smart Filtering**: Automatically filters outlier locations for better recommendations
- **Context-Aware Suggestions**: Recommendations based on group size, location, and preferences

### 🧭 Advanced Navigation
- **Turn-by-Turn Navigation**: Real-time navigation with Google Maps integration
- **Route Optimization**: Calculate optimal routes between multiple points
- **Live Updates**: Real-time location tracking during navigation
- **Progress Tracking**: Visual progress indicators and step-by-step instructions

### 🤖 AI Assistant (MApI)
- **Context-Aware Chat**: AI assistant specialized in location and navigation queries
- **Activity Planning**: Get suggestions for activities, restaurants, and points of interest
- **Route Assistance**: Help with navigation, traffic updates, and route planning
- **Natural Language Interface**: Intuitive chat-based interaction

## 🛠 Tech Stack

### Frontend
- **Next.js 15.5.4** - React framework with App Router
- **TypeScript** - Type safety and better developer experience
- **Tailwind CSS 4** - Utility-first CSS framework
- **Framer Motion** - Smooth animations and transitions
- **React Google Maps** - Google Maps integration for React

### Backend & Services
- **Firebase** - Authentication, Firestore database, and real-time features
- **Google Maps API** - Maps, Places, and Directions services
- **Gemini AI** - AI-powered activity recommendations and chat assistant
- **Genkit SDK** - AI integration framework

### Authentication
- **Firebase Auth** - Google OAuth integration
- **Real-time Auth State** - Persistent login sessions

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Firebase project with Firestore enabled
- Google Cloud Console project with Maps API enabled
- Gemini API key

### Environment Setup

Create a `.env.local` file in the root directory:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Google Maps API
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Gemini AI API
GEMINI_API_KEY=your_gemini_api_key
```

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd sunhacks2025
```

2. Install dependencies:
```bash
npm install
```

3. Set up Firebase:
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Authentication with Google provider
   - Create a Firestore database
   - Add your web app and copy the configuration

4. Set up Google Maps API:
   - Create a project in [Google Cloud Console](https://console.cloud.google.com)
   - Enable Maps JavaScript API, Places API, and Directions API
   - Create credentials and restrict the API key appropriately

5. Set up Gemini AI:
   - Get your API key from [Google AI Studio](https://aistudio.google.com)

6. Start the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

## 💡 Key Features Deep Dive

### Location Triangulation
The app uses a sophisticated triangulation algorithm that:
- Calculates the geometric center of multiple user locations
- Filters out geographical outliers for better recommendations
- Uses Gemini AI to suggest activities near the meeting point
- Considers group size and context for personalized suggestions

### Real-time Messaging
Built on Firebase Firestore with:
- Real-time message synchronization
- Read receipts and message status
- Direct messages and group conversations
- Integration with location services for context-aware messaging

### Privacy & Security
- Location sharing is opt-in and can be toggled per friend/group
- Firebase security rules protect user data
- Location data is only shared with explicitly approved friends
- Users can disable location sharing at any time

## 📱 Usage Guide

1. **Login**: Sign in with your Google account
2. **Add Friends**: Use the search feature to find and add friends
3. **Enable Location**: Toggle location sharing in settings
4. **Start Conversations**: Send direct messages or create group chats
5. **Find Activities**: Use the triangulation feature to get AI-powered activity suggestions
6. **Navigate**: Get turn-by-turn directions to suggested locations

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- Built with Next.js, Firebase, and Google Maps Platform
- AI recommendations powered by Google's Gemini
- Developed for SunHacks 2025 hackathon

---

*MApI - Making location sharing social and intelligent* 🗺️✨