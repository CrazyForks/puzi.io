"use client";

import { ActiveListings } from "./ActiveListings";

export function MarketplaceCard() {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <ActiveListings 
        onRefresh={() => {
          // 可以在这里添加其他刷新逻辑
        }}
      />
    </div>
  );
}