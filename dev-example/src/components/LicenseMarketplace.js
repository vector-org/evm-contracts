"use client";
import { useState, useEffect, useCallback, useRef } from 'react'
import { useAccount } from 'wagmi'
import { Button } from './ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card'
import { useContract } from '../hooks/useContract'
import { formatEther } from '../lib/utils'
import { MetadataUtils } from '../lib/metadataUtils'
import { Loader2, ShoppingCart, ExternalLink, User, AlertTriangle, Package, Gamepad2, CheckCircle } from 'lucide-react'

// License card component - extracted to prevent re-renders
const LicenseCard = ({ 
  licenseId, 
  isConnected, 
  mintingLicense, 
  mintedLicenses, 
  pendingMints, 
  handleMintLicense 
}) => {
  const { useGetLicenseFromId } = useContract()
  const { data: licenseData, isLoading: isLoadingLicense } = useGetLicenseFromId(licenseId)
  const [metadata, setMetadata] = useState(null)
  const [imageUrl, setImageUrl] = useState(null)
  const [metadataLoaded, setMetadataLoaded] = useState(false)

  // Load metadata only once
  useEffect(() => {
    if (licenseData?.uri && !metadataLoaded) {
      setMetadataLoaded(true)
      console.log('license data', licenseData);
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
  const isPendingMint = pendingMints.has(licenseId)
  const isActive = licenseData.isActive

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow bg-white border-2 border-gray-200">
      {/* Image Section */}
      <div className="h-48 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center relative overflow-hidden">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={metadata?.name || 'NFT'} 
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none'
              e.target.nextSibling.style.display = 'flex'
            }}
          />
        ) : null}
        <div className={`${imageUrl ? 'hidden' : 'flex'} w-full h-full items-center justify-center`}>
          <Gamepad2 className="h-16 w-16 text-blue-600/60" />
        </div>
        
        {/* Status badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {!isActive && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
              Inactive
            </span>
          )}
          {hasAlreadyMinted && (
            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Minted
            </span>
          )}
          {isPendingMint && (
            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Pending
            </span>
          )}
        </div>
      </div>

      {/* Content Section */}
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold text-gray-900 truncate">
          {metadata?.name || licenseData?.name || `License #${licenseId}`}
        </CardTitle>
        <CardDescription className="text-sm text-gray-600 line-clamp-2">
          {metadata?.description || `Gaming license for ${licenseData?.name || 'Unknown Game'}`}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0 pb-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">License ID:</span>
            <span className="font-semibold text-gray-900">#{licenseId}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Symbol:</span>
            <span className="font-semibold text-gray-900">{licenseData?.symbol || 'N/A'}</span>
          </div>
          {/* Fee summary */}
          {(() => {
            // Use developerFee, platformFee, publisherFee from licenseData
            // Always treat as string for replace
            let devFeeRaw = licenseData?.developerFee ?? '0';
            let platformFeeRaw = licenseData?.platformFee ?? '0';
            let publisherFeeRaw = licenseData?.publisherFee ?? '0';
            devFeeRaw = String(devFeeRaw).replace(/,/g, '');
            platformFeeRaw = String(platformFeeRaw).replace(/,/g, '');
            publisherFeeRaw = String(publisherFeeRaw).replace(/,/g, '');
            let developerFee = BigInt(0), platformFee = BigInt(0), publisherFee = BigInt(0);
            try { developerFee = BigInt(devFeeRaw); } catch (e) { developerFee = 0n; }
            try { platformFee = BigInt(platformFeeRaw); } catch (e) { platformFee = 0n; }
            try { publisherFee = BigInt(publisherFeeRaw); } catch (e) { publisherFee = 0n; }
            const totalFee = developerFee + platformFee + publisherFee;
            if (totalFee > 0n) {
              return (
                <div className="flex flex-col gap-1 mt-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Developer Share:</span>
                    <span className="font-semibold text-gray-900">{formatEther(developerFee)} VCTR</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Platform Fee:</span>
                    <span className="font-semibold text-gray-900">{formatEther(platformFee)} VCTR</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Publisher Fee:</span>
                    <span className="font-semibold text-gray-900">{formatEther(publisherFee)} VCTR</span>
                  </div>
                  <div className="text-xs text-orange-600 mt-1">
                    5% of the total fee goes to the platform, 5% to the publisher, and the rest to the developer.
                  </div>
                </div>
              )
            } else {
              return (
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-600">Price:</span>
                  <span className="font-semibold text-green-700">FREE</span>
                </div>
              )
            }
          })()}
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        {!isConnected ? (
          <Button disabled className="w-full bg-gray-400 text-gray-600 font-semibold">
            <User className="mr-2 h-4 w-4" />
            Connect Wallet
          </Button>
        ) : hasAlreadyMinted ? (
          <Button disabled className="w-full bg-green-100 text-green-800 border border-green-300 font-semibold">
            <CheckCircle className="mr-2 h-4 w-4" />
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
            disabled={isCurrentlyMinting || isPendingMint || !licenseData?.uri}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            {isCurrentlyMinting || isPendingMint ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isCurrentlyMinting ? 'Minting...' : 'Confirming...'}
              </>
            ) : !licenseData?.uri ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Buy Game
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

// Transaction notification component - extracted to prevent re-renders
const TransactionNotification = ({ txNotification, setTxNotification }) => {
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
                <p className="text-xs text-gray-600">
                  License has been {txNotification.status === 'success' ? 'minted' : 'failed'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTxNotification(null)}
              className="h-6 w-6 p-0"
            >
              ×
            </Button>
          </div>
          {txNotification.hash && (
            <div className="mt-2">
              <a
                href={`https://explorer.evm.wasm.host/tx/${txNotification.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center"
              >
                View on Explorer <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function LicenseMarketplace() {
  const { address, isConnected } = useAccount()
  const { 
    useGetAllLicenseIds, 
  useGetLicenseFromId, 
    useMintLicense
  } = useContract()

  // Simplified state management
  const [licenses, setLicenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [mintingLicense, setMintingLicense] = useState(null)
  const [txNotification, setTxNotification] = useState(null)
  const [mintedLicenses, setMintedLicenses] = useState(new Set())
  const [pendingMints, setPendingMints] = useState(new Set()) // Track pending mints
  
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
    if (notificationTimeout.current) {
      clearTimeout(notificationTimeout.current)
    }
    
    setTxNotification({ status, hash })
    
    notificationTimeout.current = setTimeout(() => {
      setTxNotification(null)
    }, 5000)
  }, [])

  // Poll transaction status
  const pollTransactionStatus = useCallback(async (txHash, licenseId, maxAttempts = 20) => {
    let attempts = 0
    
    const poll = async () => {
      try {
        attempts++
        console.log(`🔍 [Mint] Checking transaction status (attempt ${attempts}/${maxAttempts}):`, txHash)
        
        const status = await checkTransaction(txHash)
        
        if (status === 'success') {
          console.log('✅ [Mint] Transaction confirmed!')
          showNotification('success', txHash)
          // Mark as successfully minted
          setMintedLicenses(prev => new Set([...prev, licenseId]))
          setPendingMints(prev => {
            const newSet = new Set(prev)
            newSet.delete(licenseId)
            return newSet
          })
          setMintingLicense(null)
          return
        } else if (status === 'failed') {
          console.log('❌ [Mint] Transaction failed!')
          showNotification('failed', txHash)
          // Remove from pending mints
          setPendingMints(prev => {
            const newSet = new Set(prev)
            newSet.delete(licenseId)
            return newSet
          })
          setMintingLicense(null)
          return
        } else if (attempts >= maxAttempts) {
          console.log('⏰ [Mint] Transaction polling timeout after', maxAttempts, 'attempts')
          showNotification('failed', txHash)
          setPendingMints(prev => {
            const newSet = new Set(prev)
            newSet.delete(licenseId)
            return newSet
          })
          setMintingLicense(null)
          return
        }
        
        // Continue polling every 3 seconds
        setTimeout(poll, 3000)
      } catch (error) {
        console.error('💥 [Mint] Error polling transaction:', error)
        if (attempts >= maxAttempts) {
          showNotification('failed', txHash)
          setPendingMints(prev => {
            const newSet = new Set(prev)
            newSet.delete(licenseId)
            return newSet
          })
          setMintingLicense(null)
        } else {
          setTimeout(poll, 3000)
        }
      }
    }
    
    poll()
  }, [checkTransaction, showNotification])

  // Handle minting - fixed to show loader properly
  const handleMintLicense = useCallback(async (licenseId, licenseData) => {
    if (!isConnected || mintingLicense || mintedLicenses.has(licenseId) || pendingMints.has(licenseId)) {
      return
    }

    if (!licenseData?.uri) {
      alert('License data not ready. Please try again.')
      return
    }

  // Use totalFee from contract
  const totalFee = BigInt(licenseData?.totalFee || 0)

    try {
      setMintingLicense(licenseId)
      setPendingMints(prev => new Set([...prev, licenseId])) // Track pending mint

      const result = await mintLicense({
        licenseId,
        receiver: address,
        metadataURI: licenseData.uri,
        value: totalFee
      })
      
      const txHash = result.hash
      console.log('📤 [Mint] Transaction submitted:', txHash)

      // Start polling for transaction confirmation
      pollTransactionStatus(txHash, licenseId)

    } catch (error) {
      console.error('💥 [Mint] Minting failed:', error)
      setMintingLicense(null)
      setPendingMints(prev => {
        const newSet = new Set(prev)
        newSet.delete(licenseId)
        return newSet
      })
      
      if (error.message.includes('User rejected')) {
        alert('Transaction cancelled')
      } else {
        alert(`Minting failed: ${error.message}`)
      }
    }
  }, [isConnected, mintingLicense, mintedLicenses, pendingMints, mintLicense, address, pollTransactionStatus])



  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (notificationTimeout.current) {
        clearTimeout(notificationTimeout.current)
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600">Loading licenses...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">License Marketplace</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Discover and mint gaming licenses from verified developers and publishers
        </p>
      </div>

      {licenses.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Licenses Available</h3>
          <p className="text-gray-600">Check back later for new gaming licenses!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {licenses.map((licenseId) => (
            <LicenseCard 
              key={licenseId} 
              licenseId={licenseId}
              isConnected={isConnected}
              mintingLicense={mintingLicense}
              mintedLicenses={mintedLicenses}
              pendingMints={pendingMints}
              handleMintLicense={handleMintLicense}
            />
          ))}
        </div>
      )}

      <TransactionNotification 
        txNotification={txNotification}
        setTxNotification={setTxNotification}
      />
    </div>
  )
}