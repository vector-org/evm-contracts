"use client";
import { Web3Provider } from "@/components/Web3Provider";

export default function Home() {
  return (
    <Web3Provider>
      <div className="min-h-screen bg-black">
        <main>
          <div className="text-white">Dashboard Content</div>;
        </main>
      </div>
    </Web3Provider>
  );
}