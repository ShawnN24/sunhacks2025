"use client"

import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { onAuthStateChange } from "@/lib/firebase/auth";
import Login from "@/app/login";
import Homescreen from "@/app/Homescreen/page";

export default function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Example placeholders – replace with your uploaded image paths
  const images = ["/img1.png", "/citystockimage.jpg", "chat.png", "/img4.png"];

    return () => unsubscribe();
  }, []);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }
  
  // Render based on authentication state
  if (user) {
    return <Homescreen />;
  }
  return <Login />;
}