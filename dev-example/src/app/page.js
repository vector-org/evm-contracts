"use client";
import { useState } from 'react'
import { Web3Provider } from "@/components/Web3Provider";
import Navbar from "@/components/Navbar";
import CreateLicense from "@/components/CreateLicense";
import LicenseMarketplace from "@/components/LicenseMarketplace";
import MyNFTs from "@/components/MyNFTs";
import SecondaryMarketplace from "@/components/SecondaryMarketplace";
import ImplementationStatus from "@/components/ImplementationStatus";
import SystemTest from "@/components/SystemTest";
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
      case 'status':
        return <ImplementationStatus />
      case 'test':
        return <SystemTest />
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
                © 2025 Vector. Built with Next.js, Web3 technologies, and real IPFS integration.
              </div>
              <div className="flex space-x-6 text-sm text-gray-600">
                <button 
                  onClick={() => setActiveTab('status')}
                  className="hover:text-blue-600 transition-colors"
                >
                  System Status
                </button>
                <a href="#" className="hover:text-blue-600 transition-colors">
                  Documentation
                </a>
                <a href="https://github.com" className="hover:text-blue-600 transition-colors">
                  GitHub
                </a>
                <a href="https://sepolia.etherscan.io" className="hover:text-blue-600 transition-colors">
                  Sepolia Explorer
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