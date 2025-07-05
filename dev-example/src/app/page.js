"use client";
import { useState } from 'react'
import { Web3Provider } from "@/components/Web3Provider";
import Navbar from "@/components/Navbar";
import CreateLicense from "@/components/CreateLicense";
import LicenseMarketplace from "@/components/LicenseMarketplace";
import MyNFTs from "@/components/MyNFTs";
import SecondaryMarketplace from "@/components/SecondaryMarketplace";
import TransactionModal from "@/components/TransactionModal";

export default function Home() {
  const [activeTab, setActiveTab] = useState('marketplace')

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'marketplace':
        return <LicenseMarketplace />
      case 'create':
        return <CreateLicense />
      case 'mynfts':
        return <MyNFTs />
      case 'secondary':
        return <SecondaryMarketplace />
      default:
        return <LicenseMarketplace />
    }
  }

  return (
    <Web3Provider>
      <div className="min-h-screen flex flex-col">
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <main className="flex-1 animate-fade-in">
          {renderActiveComponent()}
        </main>

        <footer className="border-t bg-white/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-sm text-gray-600 mb-4 md:mb-0">
                © 2025 Vector. Built with Next.js and Web3 technologies.
              </div>
              <div className="flex space-x-6 text-sm text-gray-600">
                <a href="#" className="hover:text-blue-600 transition-colors">
                  Documentation
                </a>
                <a href="#" className="hover:text-blue-600 transition-colors">
                  GitHub
                </a>
                <a href="#" className="hover:text-blue-600 transition-colors">
                  Discord
                </a>
                <a href="#" className="hover:text-blue-600 transition-colors">
                  Twitter
                </a>
              </div>
            </div>
          </div>
        </footer>

        <TransactionModal />
      </div>
    </Web3Provider>
  );
}