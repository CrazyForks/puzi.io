import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";

import { Geist, Geist_Mono } from "next/font/google";

import type { Metadata } from "next";
import { SolanaProvider } from "@/providers/SolanaProvider";
import { Toaster } from "sonner";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Analytics } from "@vercel/analytics/next"
import { LanguageProvider } from "@/lib/i18n/context"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "puzi.io - Open a Shop",
  description: "Decentralized Trading Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-950 text-white min-h-screen flex flex-col`}
      >
        <LanguageProvider>
          <SolanaProvider>
            <Header />
            <main className="pt-16 flex-1">
              {children}
            </main>
            <Footer />
            <Toaster
              position="bottom-right"
              theme="dark"
              closeButton
              richColors={false}
              toastOptions={{
                style: {
                  background: "#171717",
                  color: "white",
                  border: "1px solid rgba(75, 85, 99, 0.3)",
                  borderRadius: "0.5rem",
                  padding: "0.75rem 1rem",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
                },
                className: "toast-container",
              }}
            />
          </SolanaProvider>
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  );
}
