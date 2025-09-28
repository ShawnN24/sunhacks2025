"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { User } from "firebase/auth";
import GoogleAuthButton from "./components/GoogleAuthButton";
import { onAuthStateChange, handleRedirectResult } from "@/lib/firebase/auth";
import { motion, AnimatePresence } from "framer-motion";

export default function Login() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const router = useRouter();

  // Carousel data
  const carouselItems = [
    {
      id: 1,
      title: "AI-Powered Chat",
      description: "Intelligent conversations with AI assistance for better group coordination",
      image: "/chat.png",
      color: "from-blue-400 to-purple-500"
    },
    {
      id: 2,
      title: "Friend Connections",
      description: "Connect with friends and build your social network on the platform",
      image: "/friends.png",
      color: "from-emerald-400 to-teal-500"
    },
    {
      id: 3,
      title: "Smart Search",
      description: "Find places, activities, and friends with our advanced search capabilities",
      image: "/search.png",
      color: "from-purple-400 to-pink-500"
    },
    {
      id: 4,
      title: "Real-time Messaging",
      description: "Stay connected with instant messaging and group chat features",
      image: "/messages.png",
      color: "from-yellow-400 to-orange-500"
    }
  ];

  // Auto-advance carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselItems.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [carouselItems.length]);


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

    // Check for redirect results
    const checkRedirectResult = async () => {
      try {
        const result = await handleRedirectResult();
        if (result) {
          console.log("Redirect login successful:", result.user.displayName);
          setUser(result.user);
        }
      } catch (error) {
        console.error("Error handling redirect result:", error);
      }
    };

    checkRedirectResult();

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
      {/* Static Background Image with Blur */}
      <div className="absolute inset-0">
        <img
          src="/map.png"
          alt="Map background"
          className="w-full h-full object-cover filter blur-[8px]"
        />
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

      {/* Top/Middle Content - Split Layout */}
      <div className="absolute top-2/5 left-0 right-0 transform -translate-y-1/2 z-10 px-8" style={{ pointerEvents: 'auto' }}>
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Left Half - Welcome Content */}
          <div className="flex-1 pr-8 ml-16">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2, duration: 0.6 }}
              className="mb-6"
            >
              <h1 className="text-4xl font-bold text-white mb-4 drop-shadow-lg">
                Welcome to Mapi
              </h1>
              <p className="text-white/90 text-lg mb-6">
                Connect with friends, discover amazing places, and create unforgettable memories together. 
                Share your location, find activities, and stay connected in real-time.
              </p>
              <p className="text-white/70 text-sm mb-8">
                Sign in to your account to continue your journey
              </p>
            </motion.div>

            {/* Animated Google Auth Button */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 2.3, duration: 0.5 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative z-50"
              style={{ pointerEvents: 'auto', position: 'relative' }}
            >
              <GoogleAuthButton
                onSuccess={handleLoginSuccess}
                onError={handleLoginError}
                className="w-80 transform transition-all duration-200 hover:shadow-2xl"
              />
            </motion.div>
          </div>

          {/* Right Half - Carousel */}
          <div className="flex-1 pl-8 mr-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 2.1, duration: 0.8 }}
              className="relative w-full max-w-sm mx-auto"
            >
              {/* Carousel Container */}
              <div className="relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0, x: 300 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -300 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="p-6 text-center"
                  >
                    {/* Image */}
                    <div className="mb-4 overflow-hidden rounded-lg">
                      <img
                        src={carouselItems[currentSlide].image}
                        alt={carouselItems[currentSlide].title}
                        className="w-full h-48 object-cover object-top drop-shadow-2xl"
                        style={{ objectPosition: 'top', height: '300px' }}
                      />
                    </div>
                    
                    {/* Content */}
                    <h3 className="text-xl font-bold text-white mb-3 drop-shadow-lg">
                      {carouselItems[currentSlide].title}
                    </h3>
                    <p className="text-white/80 text-sm leading-relaxed">
                      {carouselItems[currentSlide].description}
                    </p>
                  </motion.div>
                </AnimatePresence>

                {/* Decorative glow effect */}
                <motion.div
                  className={`absolute inset-0 bg-gradient-to-r ${carouselItems[currentSlide].color} opacity-20 rounded-2xl blur-xl`}
                  animate={{
                    scale: [1, 1.05, 1],
                    opacity: [0.2, 0.4, 0.2]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />

                {/* Navigation Dots */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                  {carouselItems.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        index === currentSlide 
                          ? 'bg-white scale-125' 
                          : 'bg-white/40 hover:bg-white/60'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Three Card Layout - Bottom Positioned */}
      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center z-5 px-8 pb-8">
        <div className="flex gap-32 max-w-7xl w-full justify-center">

          {/* Card 1 - Features */}
          <motion.div 
            className="backdrop-blur-md bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-4 w-80"
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.8, 
              delay: 1.5,
              ease: "easeOut"
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.1, duration: 0.6 }}
              className="mb-3"
            >
              <h2 className="text-lg font-bold text-white mb-3 drop-shadow-lg text-center">
                Key Features
              </h2>
              <div className="space-y-2 text-left">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                  <p className="text-white/80 text-xs">
                    <strong>Smart Location Sharing</strong>
                  </p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full mt-1.5 flex-shrink-0"></div>
                  <p className="text-white/80 text-xs">
                    <strong>AI Recommendations</strong>
                  </p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full mt-1.5 flex-shrink-0"></div>
                  <p className="text-white/80 text-xs">
                    <strong>Real-time Messaging</strong>
                  </p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
                  <p className="text-white/80 text-xs">
                    <strong>Privacy First</strong>
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Decorative Elements */}
            <motion.div 
              className="absolute -top-4 -right-4 w-8 h-8 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full opacity-60"
              animate={{ 
                rotate: -360,
                scale: [1, 1.2, 1]
              }}
              transition={{
                rotate: { duration: 12, repeat: Infinity, ease: "linear" },
                scale: { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
              }}
            />
            
            <motion.div 
              className="absolute -bottom-2 -left-2 w-6 h-6 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full opacity-40"
              animate={{ 
                rotate: 360,
                scale: [1, 0.8, 1]
              }}
              transition={{
                rotate: { duration: 9, repeat: Infinity, ease: "linear" },
                scale: { duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.3 }
              }}
            />
          </motion.div>

          {/* Card 2 - How It Works */}
          <motion.div 
            className="backdrop-blur-md bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-4 w-80"
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.8, 
              delay: 1.8,
              ease: "easeOut"
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.1, duration: 0.6 }}
              className="mb-3"
            >
              <h2 className="text-lg font-bold text-white mb-3 drop-shadow-lg text-center">
                How It Works
              </h2>
              <div className="space-y-2 text-left">
                <div className="flex items-start space-x-2">
                  <div className="w-5 h-5 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">1</div>
                  <p className="text-white/80 text-xs">
                    Share your location with friends
                  </p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-5 h-5 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white text-xs font-bold">2</div>
                  <p className="text-white/80 text-xs">
                    Discover nearby activities together
                  </p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-5 h-5 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">3</div>
                  <p className="text-white/80 text-xs">
                    Chat and coordinate in real-time
                  </p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-5 h-5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">4</div>
                  <p className="text-white/80 text-xs">
                    Enjoy your shared experiences
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Decorative Elements */}
            <motion.div 
              className="absolute -top-4 -right-4 w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full opacity-60"
              animate={{ 
                rotate: 360,
                scale: [1, 1.2, 1]
              }}
              transition={{
                rotate: { duration: 15, repeat: Infinity, ease: "linear" },
                scale: { duration: 3, repeat: Infinity, ease: "easeInOut" }
              }}
            />
            
            <motion.div 
              className="absolute -bottom-2 -left-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full opacity-40"
              animate={{ 
                rotate: -360,
                scale: [1, 0.8, 1]
              }}
              transition={{
                rotate: { duration: 11, repeat: Infinity, ease: "linear" },
                scale: { duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.7 }
              }}
            />
          </motion.div>

          {/* Card 3 - Technologies Used */}
          <motion.div 
            className="backdrop-blur-md bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-4 w-80"
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.8, 
              delay: 2.1,
              ease: "easeOut"
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.4, duration: 0.6 }}
              className="mb-3"
            >
              <h2 className="text-lg font-bold text-white mb-3 drop-shadow-lg text-center">
                Technologies Used
              </h2>
              <div className="space-y-2 text-left">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                  <p className="text-white/80 text-xs">
                    <strong>Next.js & React</strong>
                  </p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full mt-1.5 flex-shrink-0"></div>
                  <p className="text-white/80 text-xs">
                    <strong>Firebase & TypeScript</strong>
                  </p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full mt-1.5 flex-shrink-0"></div>
                  <p className="text-white/80 text-xs">
                    <strong>Gemini AI and Google Maps APIs</strong>
                  </p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
                  <p className="text-white/80 text-xs">
                    <strong>Framer Motion</strong>
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Decorative Elements */}
            <motion.div 
              className="absolute -top-4 -right-4 w-8 h-8 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full opacity-60"
              animate={{ 
                rotate: -360,
                scale: [1, 1.2, 1]
              }}
              transition={{
                rotate: { duration: 18, repeat: Infinity, ease: "linear" },
                scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
              }}
            />
            
            <motion.div 
              className="absolute -bottom-2 -left-2 w-6 h-6 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full opacity-40"
              animate={{ 
                rotate: 360,
                scale: [1, 0.8, 1]
              }}
              transition={{
                rotate: { duration: 14, repeat: Infinity, ease: "linear" },
                scale: { duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 1.2 }
              }}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}