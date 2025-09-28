import { auth } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from "firebase/auth";

export const login = async () => {
  try {
    console.log("Firebase auth object:", auth);
    console.log("Auth domain:", auth.config.authDomain);
    console.log("Auth app:", auth.app);
    
    // Check if auth is properly initialized
    if (!auth) {
      throw new Error("Firebase auth is not initialized");
    }
    
    const provider = new GoogleAuthProvider();
    // Add additional scopes if needed
    provider.addScope('email');
    provider.addScope('profile');
    
    console.log("Attempting Google sign-in...");
    let result;
    try {
      result = await signInWithPopup(auth, provider);
    } catch (popupError) {
      console.log("Popup failed, trying redirect method:", popupError);
      if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/popup-closed-by-user') {
        console.log("Using redirect method instead...");
        await signInWithRedirect(auth, provider);
        return null; // Will be handled by getRedirectResult
      }
      throw popupError;
    }
    
    // The signed-in user info
    const user = result.user;
    
    // You can also get the Google Access Token
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;
    
    console.log("User signed in successfully:", user.displayName);
    
    return {
      user,
      token,
      credential
    };
  } catch (error) {
    console.error("Error during sign in:", error);
    
    // Handle specific error codes
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in was cancelled');
    } else if (error.code === 'auth/popup-blocked') {
      throw new Error('Pop-up was blocked by the browser');
    } else if (error.code === 'auth/cancelled-popup-request') {
      throw new Error('Multiple sign-in requests detected');
    } else {
      throw new Error(error.message || 'Sign-in failed');
    }
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
    console.log("User signed out successfully");
  } catch (error) {
    console.error("Error during sign out:", error);
    throw new Error(error.message || 'Sign-out failed');
  }
};

// Get current user
export const getCurrentUser = () => {
  return auth.currentUser;
};

// Handle redirect results
export const handleRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      console.log("Redirect result:", result);
      return {
        user: result.user,
        token: GoogleAuthProvider.credentialFromResult(result)?.accessToken,
        credential: GoogleAuthProvider.credentialFromResult(result)
      };
    }
    return null;
  } catch (error) {
    console.error("Error handling redirect result:", error);
    throw error;
  }
};

// Listen to auth state changes
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};
