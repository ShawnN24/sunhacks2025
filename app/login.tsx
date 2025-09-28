"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { User } from "firebase/auth";
import GoogleAuthButton from "./components/GoogleAuthButton";
import { onAuthStateChange } from "@/lib/firebase/auth";
import { motion } from "framer-motion";

export default function Login() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const images = ["/img1.png", "/citystockimage.jpg", "/img3.png", "/img4.png"];

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
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* Animated Background Images */}
      <div className="absolute inset-0 flex">
        {images.map((src, i) => (
          <motion.div
            key={i}
            className="flex-1"
            initial={{ y: "100%" }}
            animate={{ y: "0%" }}
            transition={{ 
              duration: 1.2, 
              delay: i * 0.3,
              ease: "easeOut"
            }}
          >
            <motion.img
              src={src}
              alt={`bg-${i}`}
              initial={{ filter: "blur(0px)", scale: 1.1 }}
              animate={{ filter: "blur(8px)", scale: 1 }}
              transition={{ 
                duration: 1.5, 
                delay: i * 0.3 + 0.5,
                ease: "easeInOut"
              }}
              className="w-full h-full object-cover"
            />
          </motion.div>
        ))}
      </div>

      {/* Dark Overlay for Better Text Contrast */}
      <motion.div 
        className="absolute inset-0 bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, delay: 1 }}
      />

      {/* Floating Particles/Dots Animation */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-2 h-2 bg-white/20 rounded-full"
            initial={{ 
              x: Math.random() * window.innerWidth,
              y: window.innerHeight + 100,
              opacity: 0 
            }}
            animate={{ 
              y: -100,
              opacity: [0, 1, 0],
              scale: [0.5, 1, 0.5]
            }}
            transition={{
              duration: Math.random() * 3 + 4,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "linear"
            }}
          />
        ))}
      </div>

      {/* Centered Login Container with Glassmorphism */}
      <div className="relative flex items-center justify-center h-full z-10">
        <motion.div 
          className="backdrop-blur-md bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8 w-96 text-center"
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.8, 
            delay: 1.5,
            ease: "easeOut"
          }}
        >
          {/* Logo/Title Animation */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2, duration: 0.6 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
              Welcome to Mapi
            </h1>
            <p className="text-white/80 text-sm">
              Sign in to your account to continue
            </p>
          </motion.div>

          {/* Animated Google Auth Button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 2.3, duration: 0.5 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <GoogleAuthButton
              onSuccess={handleLoginSuccess}
              onError={handleLoginError}
              className="w-full transform transition-all duration-200 hover:shadow-2xl"
            />
          </motion.div>

          {/* Decorative Elements */}
          <motion.div 
            className="absolute -top-4 -right-4 w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full opacity-60"
            animate={{ 
              rotate: 360,
              scale: [1, 1.2, 1]
            }}
            transition={{
              rotate: { duration: 10, repeat: Infinity, ease: "linear" },
              scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }}
          />
          
          <motion.div 
            className="absolute -bottom-2 -left-2 w-6 h-6 bg-gradient-to-r from-green-400 to-blue-500 rounded-full opacity-40"
            animate={{ 
              rotate: -360,
              scale: [1, 0.8, 1]
            }}
            transition={{
              rotate: { duration: 8, repeat: Infinity, ease: "linear" },
              scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}