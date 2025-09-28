"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { User } from "firebase/auth";
import GoogleAuthButton from "./components/GoogleAuthButton";
import { onAuthStateChange } from "@/lib/firebase/auth";

export default function Login() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange((authUser: User | null) => {
      setUser(authUser);
      setIsLoading(false);
      
      // If user is authenticated, redirect to homescreen
      if (authUser) {
        router.push('/Homescreen');
      }
    });

    // Cleanup subscription on component unmount
    return () => unsubscribe();
  }, [router]);

  // Handle successful login from GoogleAuthButton
  const handleLoginSuccess = (loggedInUser: User) => {
    console.log("Login successful:", loggedInUser.displayName);
    setUser(loggedInUser);
    // Navigation will be handled by the auth state listener above
  };

  // Handle login errors
  const handleLoginError = (error: Error) => {
    console.error("Login failed:", error);
    alert(`Login failed: ${error.message}`);
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // If user is already logged in, show a message (they'll be redirected)
  if (user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg">Welcome back, {user.displayName}!</p>
          <p className="text-gray-600">Redirecting to homescreen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full mx-auto p-8 bg-white rounded-lg shadow-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your account to continue</p>
        </div>
        
        <GoogleAuthButton
          onSuccess={handleLoginSuccess}
          onError={handleLoginError}
          className="w-full"
        />
      </div>
    </div>
  );
}
