"use client";
import { useState, useEffect, useCallback, useRef } from 'react'
import { useAccount } from 'wagmi'
import { Button } from './ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card'
import { useContract } from '../hooks/useContract'
import { formatEther } from '../lib/utils'
import { MetadataUtils } from '../lib/metadataUtils'
import { Loader2, ShoppingCart, ExternalLink, User, AlertTriangle, Package, Gamepad2 } from 'lucide-react'

export default function LicenseMarketplace() {
  const { address, isConnected } = useAccount()
  const { 
    useGetAllLicenseIds, 
    useGetLicenseFromID, 
    useMintLicense
  } = useContract()

  // Simplified state management
  const [licenses, setLicenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [mintingLicense, setMintingLicense] = useState(null)
  const [txNotification, setTxNotification] = useState(null)
  const [mintedLicenses, setMintedLicenses] = useState(new Set())
  
  // Refs to prevent re-renders
  const processedIds = useRef(new Set())
  const notificationTimeout = useRef(null)

  const { data: licenseIds, isLoading: loadingIds } = useGetAllLicenseIds()
  const { mintLicense, isPending: isMintPending } = useMintLicense()

  // Simple license loading - only when data actually changes
  useEffect(() => {
    if (loadingIds) return
    
    if (licenseIds && licenseIds.length > 0) {
      const idsString = licenseIds.join(',')
      if (!processedIds.current.has(idsString)) {
        processedIds.current.add(idsString)
        setLicenses(licenseIds.map(id => id.toString()))
        setLoading(false)
      }
    } else {
      setLicenses([])
      setLoading(false)
    }
  }, [licenseIds, loadingIds])

  // Simple transaction checker - no loops
  const checkTransaction = useCallback(async (txHash) => {
    try {
      const receipt = await window.ethereum.request({
        method: 'eth_getTransactionReceipt',
        params: [txHash]
      })
      
      if (receipt) {
        if (receipt.status === '0x1') {
          console.log('✅ Transaction successful:', txHash)
          return 'success'
        } else {
          console.log('❌ Transaction failed:', txHash)
          return 'failed'
        }
      }
      return 'pending'
    } catch (error) {
      console.error('Error checking transaction:', error)
      return 'error'
    }
  }, [])

  // Show notification
  const showNotification = useCallback((status, hash) => {
    // Clear any existing timeout
    if (notificationTimeout.current) {
      clearTimeout(notificationTimeout.current)
    }
    
    setTxNotification({ status, hash })
    
    // Auto-clear after 5 seconds
    notificationTimeout.current = setTimeout(() => {
      setTxNotification(null)
    }, 5000)
  }, [])

  // Handle minting - simplified
  const handleMintLicense = useCallback(async (licenseId, licenseData) => {
    if (!isConnected || mintingLicense || mintedLicenses.has(licenseId)) {
      return
    }

    if (!licenseData?.uri) {
      alert('License data not ready. Please try again.')
      return
    }

    try {
      setMintingLicense(licenseId)

      const result = await mintLicense({
        licenseId,
        receiver: address,
        metadataURI: licenseData.uri
      })
      
      const txHash = result.hash
      console.log('📤 Transaction submitted:', txHash)

      // Mark as minted immediately
      setMintedLicenses(prev => new Set([...prev, licenseId]))

      // Check transaction once after delay
      setTimeout(async () => {
        const status = await checkTransaction(txHash)
        if (status === 'success') {
          showNotification('success', txHash)
        } else if (status === 'failed') {
          showNotification('failed', txHash)
          // Remove from minted set if failed
          setMintedLicenses(prev => {
            const newSet = new Set(prev)
            newSet.delete(licenseId)
            return newSet
          })
        }
        setMintingLicense(null)
      }, 3000)

    } catch (error) {
      console.error('💥 Minting failed:', error)
      setMintingLicense(null)
      
      if (error.message.includes('User rejected')) {
        alert('Transaction cancelled')
      } else {
        alert(`Minting failed: ${error.message}`)
      }
    }
  }, [isConnected, mintingLicense, mintedLicenses, mintLicense, address, checkTransaction, showNotification])

  // License card component
  const LicenseCard = ({ licenseId }) => {
    const { data: licenseData, isLoading: isLoadingLicense } = useGetLicenseFromID(licenseId)
    const [metadata, setMetadata] = useState(null)
    const [imageUrl, setImageUrl] = useState(null)
    const [metadataLoaded, setMetadataLoaded] = useState(false)

    // Load metadata only once
    useEffect(() => {
      if (licenseData?.uri && !metadataLoaded) {
        setMetadataLoaded(true)
        
        MetadataUtils.fetchMetadataEnhanced(licenseData.uri)
          .then(data => {
            const normalized = MetadataUtils.normalizeImageUrls(data)
            setMetadata(normalized)
            
            if (normalized?.imageUrl) {
              const img = new Image()
              img.onload = () => setImageUrl(normalized.imageUrl)
              img.onerror = () => {
                if (normalized?.imageFallbackUrl) {
                  const fallbackImg = new Image()
                  fallbackImg.onload = () => setImageUrl(normalized.imageFallbackUrl)
                  fallbackImg.src = normalized.imageFallbackUrl
                }
              }
              img.src = normalized.imageUrl
            }
          })
          .catch(error => {
            console.error('Metadata fetch failed:', error)
            setMetadata({
              name: `License #${licenseId}`,
              description: 'Gaming license'
            })
          })
      }
    }, [licenseData, licenseId, metadataLoaded])

    if (isLoadingLicense) {
      return (
        <Card className="overflow-hidden bg-white shadow-md border-2 border-gray-200">
          <div className="h-48 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
          <CardContent className="p-4">
            <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
          </CardContent>
        </Card>
      )
    }

    if (!licenseData) return null

    const isCurrentlyMinting = mintingLicense === licenseId
    const hasAlreadyMinted = mintedLicenses.has(licenseId)
    const isActive = licenseData.isActive

    return (
      <Card className="overflow-hidden hover:shadow-lg transition-shadow bg-white border-2 border-gray-200">
        {/* Image Section */}
        <div className="h-48 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center relative overflow-hidden">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={metadata?.name || `License #${licenseId}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none'
                setImageUrl(null)
              }}
            />
          ) : (
            <div className="text-center">
              <Gamepad2 className="h-12 w-12 text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-blue-800">Gaming License</p>
            </div>
          )}
          
          {!isActive && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                INACTIVE
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold text-gray-900 truncate">
            {metadata?.name || licenseData.name || `License #${licenseId}`}
          </CardTitle>
          <CardDescription className="text-sm text-gray-700">
            {metadata?.description || `Gaming license ${licenseData.symbol}`}
          </CardDescription>
        </CardHeader>

        <CardContent className="px-4 pb-2">
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Symbol:</span>
              <span className="font-mono font-bold text-gray-900">{licenseData.symbol}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={`font-semibold ${isActive ? 'text-green-600' : 'text-red-600'}`}>
                {isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </CardContent>

        {/* Footer */}
        <CardFooter className="px-4 pt-2 pb-4">
          {!isConnected ? (
            <Button disabled className="w-full bg-gray-400 text-gray-600 font-semibold">
              <User className="mr-2 h-4 w-4" />
              Connect Wallet
            </Button>
          ) : hasAlreadyMinted ? (
            <Button disabled className="w-full bg-green-100 text-green-800 border border-green-300 font-semibold">
              Already Minted ✓
            </Button>
          ) : !isActive ? (
            <Button disabled className="w-full bg-red-100 text-red-600 border border-red-300 font-semibold">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Inactive
            </Button>
          ) : (
            <Button 
              onClick={() => handleMintLicense(licenseId, licenseData)}
              disabled={isCurrentlyMinting || isMintPending || !licenseData?.uri}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              {isCurrentlyMinting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Minting...
                </>
              ) : !licenseData?.uri ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Mint License
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    )
  }

  // Transaction notification
  const TransactionNotification = () => {
    if (!txNotification) return null

    return (
      <div className="fixed top-20 right-4 z-50 max-w-sm">
        <Card className={`border-2 shadow-lg ${txNotification.status === 'success' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`h-2 w-2 rounded-full ${txNotification.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <div>
                  <p className="font-semibold text-xs">
                    {txNotification.status === 'success' ? '✅ Mint Successful!' : '❌ Transaction Failed!'}
                  </p>
                  <a 
                    href={`https://sepolia.etherscan.io/tx/${txNotification.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center"
                  >
                    View Transaction <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </div>
              </div>
              <button
                onClick={() => setTxNotification(null)}
                className="text-gray-400 hover:text-gray-600 ml-2"
              >
                ×
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (notificationTimeout.current) {
        clearTimeout(notificationTimeout.current)
      }
    }
  }, [])

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Gaming License Marketplace</h2>
          <p className="text-gray-700">Mint gaming licenses to access exclusive content and features</p>
        </div>
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-gray-800 font-semibold">Loading gaming licenses...</p>
        </div>
      </div>
    )
  }

  // Not connected state
  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Gaming License Marketplace</h2>
          <p className="text-gray-700">Mint gaming licenses to access exclusive content and features</p>
        </div>
        <div className="text-center py-8">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">Connect Your Wallet</h3>
          <p className="text-gray-700">Please connect your wallet to view available licenses.</p>
        </div>
      </div>
    )
  }

  // Main render
  return (
    <div className="space-y-6">
      <TransactionNotification />
      
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Gaming License Marketplace</h2>
        <p className="text-gray-700">Mint gaming licenses to access exclusive content and features</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {licenses.length > 0 ? (
          licenses.map((licenseId) => (
            <LicenseCard key={licenseId} licenseId={licenseId} />
          ))
        ) : (
          <div className="col-span-full text-center py-8">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">No Licenses Available</h3>
            <p className="text-gray-700">There are currently no gaming licenses available for minting.</p>
          </div>
        )}
      </div>
    </div>
  )
}