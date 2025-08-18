"use client";

import React from "react";

/**
 * Placeholder component for the marketplace
 */
export function CounterDisplay() {
  return (
    <div className="text-center w-full px-5">
      <p className="text-sm text-muted-foreground mb-2">Market Stats:</p>
      <div className="h-14 flex items-center justify-center">
        <p className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 text-transparent bg-clip-text">
          0
        </p>
      </div>
      <p className="text-xs text-gray-500 mt-1">Active Listings</p>
    </div>
  );
}
