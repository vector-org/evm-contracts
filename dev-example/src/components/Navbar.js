"use client";
import { useState } from 'react'
import { ConnectKitButton } from "connectkit"
import { Button } from './ui/button'
import { Menu, X, Plus, ShoppingBag, Store, TestTube } from 'lucide-react'

export default function Navbar({ activeTab, setActiveTab }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navItems = [
    { id: 'marketplace', label: 'Marketplace', icon: Store },
    { id: 'create', label: 'Create License', icon: Plus },
    { id: 'mynfts', label: 'My NFTs', icon: ShoppingBag },
    { id: 'secondary', label: 'Secondary Market', icon: Store },
    { id: 'test', label: 'System Test', icon: TestTube },
  ]

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              {/* <img 
                src="/logo.png" 
                alt="Vector Logo" 
                className="h-8 w-8 object-contain"
                onError={(e) => {
                  // Fallback to a simple colored div if logo image fails
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'flex'
                }}
              /> */}
              {/* Fallback logo */}
              <div 
                className="h-8 w-8 bg-blue-600 rounded-lg hidden items-center justify-center text-white font-bold text-sm"
              >
                V
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900">
                <img
                src="/vector.png" 
                alt="Vector Logo" 
                className="h-20 w-25 object-contain"
                onError={(e) => {
                  // Fallback to a simple colored div if logo image fails
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'flex'
                }}
              />
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? "default" : "ghost"}
                  onClick={() => setActiveTab(item.id)}
                  className="flex items-center space-x-2"
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Button>
              )
            })}
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center space-x-4">
            <ConnectKitButton.Custom>
              {({ isConnected, show, address, truncatedAddress }) => (
                <Button 
                  onClick={show}
                  variant={isConnected ? "outline" : "default"}
                  className="hidden sm:flex"
                >
                  {isConnected ? truncatedAddress : "Connect Wallet"}
                </Button>
              )}
            </ConnectKitButton.Custom>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 bg-white border-t">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? "default" : "ghost"}
                  onClick={() => {
                    setActiveTab(item.id)
                    setIsMobileMenuOpen(false)
                  }}
                  className="w-full justify-start flex items-center space-x-2"
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Button>
              )
            })}
            <div className="pt-2">
              <ConnectKitButton.Custom>
                {({ isConnected, show, truncatedAddress }) => (
                  <Button 
                    onClick={show}
                    variant={isConnected ? "outline" : "default"}
                    className="w-full"
                  >
                    {isConnected ? truncatedAddress : "Connect Wallet"}
                  </Button>
                )}
              </ConnectKitButton.Custom>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}