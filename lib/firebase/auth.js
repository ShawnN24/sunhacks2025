import { auth } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

export const login = async () => {
  try {
    const provider = new GoogleAuthProvider();
    // Add additional scopes if needed
    provider.addScope('email');
    provider.addScope('profile');
    
    const result = await signInWithPopup(auth, provider);
    
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

// Listen to auth state changes
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};
