"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  
  // Example placeholders – replace with your uploaded image paths
  const images = ["/img1.png", "/citystockimage.jpg", "/img3.png", "/img4.png"];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* Background Sliding Images */}
      <div className="absolute inset-0 flex">
        {images.map((src, i) => (
          <motion.div
            key={i}
            className="flex-1"
          >
            <motion.img
              src={src}
              alt={`bg-${i}`}
              initial={{ y: "100%", filter: "blur(0px)" }}
              animate={{ y: "0%", filter: "blur(10px)" }}
              transition={{ duration: 1, delay: i * 0.5 }}
              className="w-full h-full object-cover"
            />
          </motion.div>
        ))}
      </div>

      {/* Centered Login Window */}
      <div className="relative flex items-center justify-center h-full">
        <div className="bg-[#00af64] rounded-2xl shadow-2xl p-8 w-96 text-center">
          <h1 className="text-xl font-bold text-white mb-6">goonbot</h1>
          <button onClick={() => router.push("/homescreen")} className="bg-white text-black font-medium px-6 py-3 rounded-xl hover:bg-gray-200 transition">
            Log in with Google
          </button>
        </div>
      </div>
    </div>
  );
}