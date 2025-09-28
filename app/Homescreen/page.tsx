"use client";

import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { onAuthStateChange, logout } from "@/lib/firebase/auth";

export default function Homescreen() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((authUser: User | null) => {
      setUser(authUser);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      // User will be redirected to login by the auth state listener in the main page
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Failed to logout. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header with user info and logout */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {user?.photoURL && (
                <img
                  src={user.photoURL}
                  alt="Profile"
                  className="w-12 h-12 rounded-full"
                />
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Welcome, {user?.displayName || "User"}! 
                </h1>
                <p className="text-gray-600">{user?.email}</p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              🎉 HOMESCREEN WHUMP WHUMP WHUMP WHUMP 🎉
            </h2>
            <p className="text-gray-600 mb-8">
              You have successfully logged in with Google!
            </p>
            
            {/* User details card */}
            <div className="max-w-md mx-auto bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Your Profile</h3>
              <div className="space-y-2 text-left">
                <p><strong>Name:</strong> {user?.displayName || "Not provided"}</p>
                <p><strong>Email:</strong> {user?.email || "Not provided"}</p>
                <p><strong>User ID:</strong> {user?.uid}</p>
                <p><strong>Email Verified:</strong> {user?.emailVerified ? "Yes" : "No"}</p>
                <p><strong>Last Sign In:</strong> {user?.metadata.lastSignInTime || "Unknown"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}