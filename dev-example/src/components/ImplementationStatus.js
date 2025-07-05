"use client";
import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { Button } from './ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card'
import { useContract } from '../hooks/useContract'
import { testIPFSConnection } from '../lib/ipfs'
import { CONTRACT_ADDRESSES } from '../lib/contracts'
import { CheckCircle, AlertCircle, Loader2, ExternalLink, Wifi, Database, Code } from 'lucide-react'

export default function ImplementationStatus() {
  const { address, isConnected, chain } = useAccount()
  const { useGetAllLicenseIds, useGetAllNFTIds, useGetOpenOffers } = useContract()
  
  const [ipfsStatus, setIpfsStatus] = useState('testing')
  const [systemChecks, setSystemChecks] = useState({
    wallet: false,
    network: false,
    contracts: false,
    ipfs: false
  })

  const { data: licenseIds } = useGetAllLicenseIds()
  const { data: nftIds } = useGetAllNFTIds()
  const { data: offers } = useGetOpenOffers()

  useEffect(() => {
    checkIPFSConnection()
    updateSystemChecks()
  }, [isConnected, chain, address])

  const checkIPFSConnection = async () => {
    try {
      setIpfsStatus('testing')
      const isConnected = await testIPFSConnection()
      setIpfsStatus(isConnected ? 'connected' : 'failed')
    } catch (error) {
      console.error('IPFS connection check failed:', error)
      setIpfsStatus('failed')
    }
  }

  const updateSystemChecks = () => {
    setSystemChecks({
      wallet: isConnected && !!address,
      network: chain?.id === 11155111, // Sepolia
      contracts: !!CONTRACT_ADDRESSES.FACTORY,
      ipfs: ipfsStatus === 'connected'
    })
  }

  useEffect(() => {
    updateSystemChecks()
  }, [isConnected, chain, address, ipfsStatus])

  const StatusIcon = ({ status, loading }) => {
    if (loading) return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
    if (status) return <CheckCircle className="h-5 w-5 text-green-500" />
    return <AlertCircle className="h-5 w-5 text-red-500" />
  }

  const StatusText = ({ status, loading, successText, failText, loadingText }) => {
    if (loading) return <span className="text-blue-600">{loadingText}</span>
    if (status) return <span className="text-green-600">{successText}</span>
    return <span className="text-red-600">{failText}</span>
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Vector Implementation Status</h1>
        <p className="text-gray-600">
          Real-time status of all system components and blockchain integration
        </p>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>System Status</span>
          </CardTitle>
          <CardDescription>
            Core system components and their current status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Wallet Connection */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center space-x-3">
              <StatusIcon status={systemChecks.wallet} />
              <div>
                <p className="font-medium">Wallet Connection</p>
                <p className="text-sm text-gray-500">
                  {isConnected ? `Connected: ${address?.slice(0, 10)}...` : 'Not connected'}
                </p>
              </div>
            </div>
            <StatusText 
              status={systemChecks.wallet}
              successText="Connected"
              failText="Disconnected"
            />
          </div>

          {/* Network */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center space-x-3">
              <StatusIcon status={systemChecks.network} />
              <div>
                <p className="font-medium">Network</p>
                <p className="text-sm text-gray-500">
                  {chain ? `${chain.name} (${chain.id})` : 'No network detected'}
                </p>
              </div>
            </div>
            <StatusText 
              status={systemChecks.network}
              successText="Sepolia"
              failText={chain ? "Wrong Network" : "No Network"}
            />
          </div>

          {/* Smart Contracts */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center space-x-3">
              <StatusIcon status={systemChecks.contracts} />
              <div>
                <p className="font-medium">Smart Contracts</p>
                <p className="text-sm text-gray-500">
                  Factory, Primary & Secondary Marketplace
                </p>
              </div>
            </div>
            <StatusText 
              status={systemChecks.contracts}
              successText="Deployed"
              failText="Not Found"
            />
          </div>

          {/* IPFS */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center space-x-3">
              <StatusIcon 
                status={ipfsStatus === 'connected'} 
                loading={ipfsStatus === 'testing'}
              />
              <div>
                <p className="font-medium">IPFS Storage</p>
                <p className="text-sm text-gray-500">
                  Infura IPFS gateway for metadata storage
                </p>
              </div>
            </div>
            <StatusText 
              status={ipfsStatus === 'connected'}
              loading={ipfsStatus === 'testing'}
              successText="Connected"
              failText="Failed"
              loadingText="Testing..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Contract Addresses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Code className="h-5 w-5" />
            <span>Contract Addresses</span>
          </CardTitle>
          <CardDescription>
            Deployed smart contract addresses on Sepolia testnet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-sm">License Factory</p>
              <div className="flex items-center justify-between mt-1">
                <code className="text-xs font-mono bg-white px-2 py-1 rounded">
                  {CONTRACT_ADDRESSES.FACTORY}
                </code>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => window.open(`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESSES.FACTORY}`, '_blank')}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-sm">Primary Marketplace</p>
              <div className="flex items-center justify-between mt-1">
                <code className="text-xs font-mono bg-white px-2 py-1 rounded">
                  {CONTRACT_ADDRESSES.PRIMARY_MARKETPLACE}
                </code>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => window.open(`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESSES.PRIMARY_MARKETPLACE}`, '_blank')}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-sm">Secondary Marketplace</p>
              <div className="flex items-center justify-between mt-1">
                <code className="text-xs font-mono bg-white px-2 py-1 rounded">
                  {CONTRACT_ADDRESSES.SECONDARY_MARKETPLACE}
                </code>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => window.open(`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESSES.SECONDARY_MARKETPLACE}`, '_blank')}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wifi className="h-5 w-5" />
            <span>Live Data</span>
          </CardTitle>
          <CardDescription>
            Current state of the platform data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {licenseIds?.length || 0}
              </div>
              <p className="text-sm text-gray-500">Licenses Created</p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {nftIds?.length || 0}
              </div>
              <p className="text-sm text-gray-500">NFTs Minted</p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {offers?.filter(offer => offer.isActive).length || 0}
              </div>
              <p className="text-sm text-gray-500">Active Offers</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Implementation Features */}
      <Card>
        <CardHeader>
          <CardTitle>✅ Implemented Features</CardTitle>
          <CardDescription>
            Complete feature set with real blockchain integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">🎮 Core Platform</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Real IPFS metadata storage</li>
                <li>• Wagmi v2 integration</li>
                <li>• ConnectKit wallet connection</li>
                <li>• Sepolia testnet deployment</li>
                <li>• Real-time transaction tracking</li>
                <li>• Comprehensive error handling</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">🏪 Marketplace Features</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• License creation with IPFS</li>
                <li>• NFT minting system</li>
                <li>• Secondary marketplace trading</li>
                <li>• Approval-based listing</li>
                <li>• Real-time offer management</li>
                <li>• Transaction confirmation system</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>🚀 Quick Start Guide</CardTitle>
          <CardDescription>
            How to test the platform functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="font-medium text-blue-800">1. Connect Wallet & Network</p>
              <p className="text-sm text-blue-600">
                Connect MetaMask to Sepolia testnet and get test ETH from a faucet
              </p>
            </div>
            
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-medium text-green-800">2. Create a License</p>
              <p className="text-sm text-green-600">
                Go to "Create License" tab, upload an image, and create your game license
              </p>
            </div>
            
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="font-medium text-purple-800">3. Mint & Trade</p>
              <p className="text-sm text-purple-600">
                Visit marketplace to mint NFTs, then list them for sale in "My NFTs"
              </p>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              onClick={checkIPFSConnection}
              variant="outline"
              size="sm"
              disabled={ipfsStatus === 'testing'}
            >
              {ipfsStatus === 'testing' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                'Test IPFS'
              )}
            </Button>
            <Button 
              onClick={() => window.open('https://sepoliafaucet.com', '_blank')}
              variant="outline"
              size="sm"
            >
              Get Test ETH
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}