# Google Auth with Firebase - Setup Guide

This guide will help you set up Google authentication using Firebase in your Next.js application.

## 🚀 Quick Start

Your Firebase setup is already configured! Here's what you need to do:

### 1. Firebase Project Setup

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable Authentication:
   - Go to **Authentication** > **Sign-in method**
   - Enable **Google** as a sign-in provider
   - Add your domain (e.g., `localhost` for development)

### 2. Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Get your Firebase configuration:
   - Go to **Project Settings** > **General**
   - Under "Your apps", click on your web app or create one
   - Copy the configuration values

3. Update `.env.local` with your values:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_actual_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

### 3. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Go to **APIs & Services** > **Credentials**
4. Configure OAuth consent screen if needed
5. Add authorized domains for your app

## 📁 Files Overview

### Core Files:
- `lib/firebase.ts` - Firebase configuration
- `lib/firebase/auth.js` - Authentication functions
- `app/components/GoogleAuthButton.tsx` - Reusable Google login button

### Example Usage:
- `app/auth-example.tsx` - Complete authentication example

## 🔧 Usage Examples

### Basic Usage
```tsx
import GoogleAuthButton from './components/GoogleAuthButton';

export default function LoginPage() {
  return (
    <div>
      <h1>Sign In</h1>
      <GoogleAuthButton />
    </div>
  );
}
```

### Advanced Usage with Callbacks
```tsx
import GoogleAuthButton from './components/GoogleAuthButton';

export default function LoginPage() {
  const handleSuccess = (user) => {
    console.log('Logged in:', user.displayName);
    // Redirect or update UI
  };

  const handleError = (error) => {
    console.error('Login failed:', error.message);
    // Show error message
  };

  return (
    <GoogleAuthButton
      onSuccess={handleSuccess}
      onError={handleError}
      className="w-full max-w-sm"
    />
  );
}
```

### Checking Auth State
```tsx
import { useEffect, useState } from 'react';
import { onAuthStateChange } from '@/lib/firebase/auth';

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setUser(user);
    });
    
    return () => unsubscribe();
  }, []);

  return (
    <div>
      {user ? (
        <p>Welcome, {user.displayName}!</p>
      ) : (
        <GoogleAuthButton />
      )}
    </div>
  );
}
```

## 🎨 Styling

The GoogleAuthButton component uses Tailwind CSS classes. You can customize it by:

1. **Using the className prop:**
   ```tsx
   <GoogleAuthButton className="w-full bg-blue-600 text-white" />
   ```

2. **Modifying the component directly** in `app/components/GoogleAuthButton.tsx`

## 🛠️ Available Functions

From `lib/firebase/auth.js`:

- `login()` - Sign in with Google popup
- `logout()` - Sign out current user  
- `getCurrentUser()` - Get current authenticated user
- `onAuthStateChange(callback)` - Listen to auth state changes

## 🔒 Security Notes

1. **Environment Variables**: Never commit `.env.local` to version control
2. **Domain Restrictions**: Add only trusted domains to Firebase/Google Cloud
3. **User Data**: Always validate user data on the server side
4. **Token Validation**: Verify Firebase tokens on your backend for protected routes

## 🐛 Troubleshooting

### Common Issues:

1. **"Popup blocked"**: 
   - User needs to allow popups for your domain
   - Consider using redirect-based auth for mobile

2. **"Unauthorized domain"**:
   - Add your domain to Firebase Auth settings
   - Add domain to Google Cloud Console OAuth settings

3. **"API key not valid"**:
   - Check your `.env.local` values
   - Ensure API key has correct permissions

### Testing
```bash
npm run dev
```

Navigate to your app and test the Google login button. Check the browser console for any errors.

## 📱 Production Deployment

Before deploying:

1. Add production domain to Firebase Auth
2. Add production domain to Google Cloud OAuth
3. Set environment variables in your hosting platform
4. Test authentication flow in production environment

## 🎉 You're Ready!

Your Google authentication is now set up! The button includes:
- ✅ Loading states
- ✅ Error handling  
- ✅ Google branding
- ✅ TypeScript support
- ✅ Responsive design