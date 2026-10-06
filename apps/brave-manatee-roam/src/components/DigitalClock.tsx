"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function DigitalClock({ className }: { className?: string }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timerId);
  }, []);

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  return (
    <div
      className={cn(
        "relative p-4 bg-gray-950 border border-cyan-700 rounded-lg shadow-glow-cyan overflow-hidden", // Changed shadow-lg to shadow-glow-cyan
        "flex items-center justify-center",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 to-purple-900/20 opacity-30 animate-pulse-slow"></div>
      <div className="relative z-10 text-center">
        <p className="text-6xl md:text-7xl lg:text-8xl font-mono font-extrabold text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]"> {/* Added text-shadow */}
          {formatTime(time)}
        </p>
      </div>
    </div>
  );
}