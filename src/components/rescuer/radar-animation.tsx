
"use client";

import React from 'react';

export function RadarAnimation() {
  return (
    <div 
      className="relative w-40 h-40 sm:w-48 sm:h-48 mx-auto my-6 flex items-center justify-center bg-yellow-100 p-1" // Added obvious background and padding
      aria-hidden="true"
      role="img"
      aria-label="Radar scan in progress"
    >
      {/* Static Background Grid/Circles */}
      <div className="absolute inset-0 border-[4px] border-sky-500 rounded-full"></div>
      <div className="absolute inset-[25%] border-[3px] border-sky-400 rounded-full"></div>
      <div className="absolute inset-[50%] border-[3px] border-sky-300 rounded-full"></div>
      <div className="absolute inset-[75%] border-[2px] border-sky-200 rounded-full"></div>

      {/* Optional: crosshair lines */}
      <div className="absolute w-full h-[3px] bg-sky-600 top-1/2 -translate-y-1/2"></div>
      <div className="absolute h-full w-[3px] bg-sky-600 left-1/2 -translate-x-1/2"></div>
      
      {/* Sweeping Line */}
      <div className="absolute w-full h-full animate-[spin_3s_linear_infinite]">
        {/* The arm of the radar */}
        <div 
          className="absolute top-1/2 left-1/2 w-1/2 h-[5px] bg-gradient-to-r from-green-500/10 via-green-500 to-green-600" // Made gradient start less transparent
          style={{ 
            transformOrigin: '0% 50%', 
            transform: 'translateY(-50%)', 
          }}
        ></div>
      </div>

      {/* Center Dot */}
      <div className="absolute w-3 h-3 bg-red-600 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
    </div>
  );
}
