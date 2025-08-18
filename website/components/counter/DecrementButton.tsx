"use client";

import React from "react";
import { Button } from "@/components/ui/button";

/**
 * Placeholder button for marketplace
 */
export function DecrementButton() {
  return (
    <Button
      disabled
      className="w-[85%] bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white h-11 text-base font-medium opacity-50"
    >
      Market Action
    </Button>
  );
}
