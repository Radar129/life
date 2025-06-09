
"use client";

import React from 'react';

export function RadarAnimation() {
  return (
    <div 
      className="relative w-40 h-40 sm:w-48 sm:h-48 mx-auto my-6 flex items-center justify-center" 
      aria-hidden="true"
      role="img"
      aria-label="Radar scan in progress"
    >
      {/* Static Background Grid/Circles */}
      <div className="absolute inset-0 border-2 border-primary/60 rounded-full"></div>
      <div className="absolute inset-[25%] border-2 border-primary/60 rounded-full"></div>
      <div className="absolute inset-[50%] border-2 border-primary/60 rounded-full"></div>
      <div className="absolute inset-[75%] border-2 border-primary/60 rounded-full"></div>

      {/* Optional: crosshair lines */}
      <div className="absolute w-full h-[2px] bg-primary/50 top-1/2 -translate-y-1/2"></div>
      <div className="absolute h-full w-[2px] bg-primary/50 left-1/2 -translate-x-1/2"></div>
      
      {/* Sweeping Line */}
      <div className="absolute w-full h-full animate-[spin_3s_linear_infinite]">
        {/* The arm of the radar */}
        <div 
          className="absolute top-1/2 left-1/2 w-1/2 h-[3px] bg-gradient-to-r from-transparent via-primary/60 to-primary"
          style={{ 
            transformOrigin: '0% 50%', // Rotate around the start of the line (center of radar)
            transform: 'translateY(-50%) rotate(0deg)', // Initial position
          }}
        ></div>
      </div>

      {/* Center Dot */}
      <div className="absolute w-2 h-2 bg-primary rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
    </div>
  );
}
