"use client";
import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { Button } from './ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card'
import { useContract } from '../hooks/useContract'
import { testPinataConnection } from '../lib/pinata' // Updated import
import { CONTRACT_ADDRESSES } from '../lib/contracts'
import { CheckCircle, AlertCircle, Loader2, ExternalLink, Wifi, Database, Code } from 'lucide-react'

export default function ImplementationStatus() {
  const { address, isConnected, chain } = useAccount()
  const { useGetAllLicenseIds, useGetAllNFTIds, useGetOpenOffers } = useContract()
  
  const [pinataStatus, setPinataStatus] = useState('testing')
  const [systemChecks, setSystemChecks] = useState({
    wallet: false,
    network: false,
    contracts: false,
    pinata: false
  })

  const { data: licenseIds } = useGetAllLicenseIds()
  const { data: nftIds } = useGetAllNFTIds()
  const { data: offers } = useGetOpenOffers()

  useEffect(() => {
    checkPinataConnection() // Updated function name
    updateSystemChecks()
  }, [isConnected, chain, address])

  const checkPinataConnection = async () => {
    try {
      setPinataStatus('testing')
      const isConnected = await testPinataConnection() // Updated function call
      setPinataStatus(isConnected ? 'connected' : 'failed')
    } catch (error) {
      console.error('Pinata connection check failed:', error)
      setPinataStatus('failed')
    }
  }

  const updateSystemChecks = () => {
    setSystemChecks({
      wallet: isConnected && !!address,
      network: chain?.id === 11155111, // Sepolia
      contracts: !!CONTRACT_ADDRESSES?.licenseNFT,
      pinata: pinataStatus === 'connected' // Updated check
    })
  }

  useEffect(() => {
    updateSystemChecks()
  }, [pinataStatus, isConnected, chain, address])

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected':
      case true:
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'testing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
      case 'failed':
      case false:
        return <AlertCircle className="w-5 h-5 text-red-500" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'connected':
      case true:
        return 'Connected'
      case 'testing':
        return 'Testing...'
      case 'failed':
      case false:
        return 'Failed'
      default:
        return 'Unknown'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected':
      case true:
        return 'text-green-600'
      case 'testing':
        return 'text-blue-600'
      case 'failed':
      case false:
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-6 h-6" />
            System Status
          </CardTitle>
          <CardDescription>
            Real-time status of all system components and integrations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Wallet Connection */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Wifi className="w-5 h-5 text-gray-600" />
              <div>
                <div className="font-medium">Wallet Connection</div>
                <div className="text-sm text-gray-600">
                  {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(systemChecks.wallet)}
              <span className={`text-sm font-medium ${getStatusColor(systemChecks.wallet)}`}>
                {getStatusText(systemChecks.wallet)}
              </span>
            </div>
          </div>

          {/* Network */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-gray-600" />
              <div>
                <div className="font-medium">Network</div>
                <div className="text-sm text-gray-600">
                  {chain?.name || 'Unknown'} (ID: {chain?.id || 'N/A'})
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(systemChecks.network)}
              <span className={`text-sm font-medium ${getStatusColor(systemChecks.network)}`}>
                {systemChecks.network ? 'Sepolia' : 'Wrong Network'}
              </span>
            </div>
          </div>

          {/* Smart Contracts */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Code className="w-5 h-5 text-gray-600" />
              <div>
                <div className="font-medium">Smart Contracts</div>
                <div className="text-sm text-gray-600">
                  License NFT & Marketplace contracts
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(systemChecks.contracts)}
              <span className={`text-sm font-medium ${getStatusColor(systemChecks.contracts)}`}>
                {getStatusText(systemChecks.contracts)}
              </span>
            </div>
          </div>

          {/* Pinata Storage - Updated section */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-gray-600" />
              <div>
                <div className="font-medium">Pinata Storage</div>
                <div className="text-sm text-gray-600">
                  Decentralized file storage via Pinata
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(pinataStatus)}
              <span className={`text-sm font-medium ${getStatusColor(pinataStatus)}`}>
                {getStatusText(pinataStatus)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={checkPinataConnection}
                disabled={pinataStatus === 'testing'}
              >
                {pinataStatus === 'testing' ? 'Testing...' : 'Retest'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Data Summary</CardTitle>
          <CardDescription>
            Current state of licenses, NFTs, and marketplace activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {licenseIds?.length || 0}
              </div>
              <div className="text-sm text-blue-800">Total Licenses</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {nftIds?.length || 0}
              </div>
              <div className="text-sm text-green-800">Total NFTs</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {offers?.length || 0}
              </div>
              <div className="text-sm text-purple-800">Open Offers</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle>Overall System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.values(systemChecks).every(check => check === true) ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">All systems operational</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-yellow-600">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">
                  {Object.values(systemChecks).filter(check => check === false).length} issue(s) detected
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}