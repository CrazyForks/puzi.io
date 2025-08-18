import { MarketplaceCard } from "@/components/marketplace/MarketplaceCard";

export default function Home() {
  return (
    <div className="min-h-screen p-8 bg-gradient-to-b from-gray-950 via-gray-900 to-black">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-10"></div>

      <div className="relative z-10 mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-blue-500 text-transparent bg-clip-text">
          每个人都该开个铺子
        </h1>
        <p className="text-gray-400">
          去中心化代币交易市场
        </p>
      </div>

      <div className="relative z-10 mb-8">
        <MarketplaceCard />
      </div>

      <footer className="mt-12 text-center text-sm text-gray-500 relative z-10">
        <p>Powered by Anchor, Solana, and Next.js</p>
      </footer>
    </div>
  );
}
