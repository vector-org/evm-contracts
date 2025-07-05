import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Vector - Gaming License Platform",
  description: "Create, trade and manage gaming licenses as NFTs on the blockchain",
  keywords: "gaming, nft, blockchain, licenses, web3, ethereum",
  authors: [{ name: "Vector Team" }],
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#3b82f6",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Vector - Gaming License Platform",
    description: "Create, trade and manage gaming licenses as NFTs on the blockchain",
    type: "website",
    url: "https://vector.dev",
    siteName: "Vector",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Vector Gaming License Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vector - Gaming License Platform",
    description: "Create, trade and manage gaming licenses as NFTs on the blockchain",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="light">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50`}
      >
        <div className="min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}