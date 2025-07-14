"use client";
import { useState, useEffect, useCallback, useRef } from 'react'
import { useAccount } from 'wagmi'
import { Button } from './ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card'
import { useContract } from '../hooks/useContract'
import { formatEther, shortenAddress } from '../lib/utils'
import { MetadataUtils } from '../lib/metadataUtils'
import { Loader2, ShoppingCart, ExternalLink, User, Coins, Package, CheckCircle, AlertCircle, Gamepad2, DollarSign } from 'lucide-react'

export default function SecondaryMarketplace() {
  const { address, isConnected } = useAccount()
  const { 
    useGetOpenOffers,
    useAcceptOffer,
    useRemoveOffer,
    useGetNFTDetails,
    useTokenURI,
    useGetLicenseFromID
  } = useContract()

  const [allOffers, setAllOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingOffer, setProcessingOffer] = useState(null)
  const [txNotification, setTxNotification] = useState(null)

  // Refs for cleanup
  const pollingTimeoutRef = useRef(null)
  const notificationTimeout = useRef(null)

  const { data: openOffers, isLoading: loadingOffers, refetch: refetchOffers } = useGetOpenOffers()
  const { acceptOffer, isPending: isAcceptPending } = useAcceptOffer()
  const { removeOffer, isPending: isRemovePending } = useRemoveOffer()

  // Transaction status checker
  const checkTransactionStatus = useCallback(async (hash) => {
    if (!hash) return 'pending'

    try {
      const receipt = await window.ethereum.request({
        method: 'eth_getTransactionReceipt',
        params: [hash]
      })
      
      if (receipt) {
        return receipt.status === '0x1' ? 'success' : 'failed'
      }
      return 'pending'
    } catch (error) {
      console.error('Error checking transaction:', error)
      return 'error'
    }
  }, [])

  // Show notification
  const showNotification = useCallback((status, hash, message) => {
    if (notificationTimeout.current) {
      clearTimeout(notificationTimeout.current)
    }
    
    setTxNotification({ status, hash, message })
    
    notificationTimeout.current = setTimeout(() => {
      setTxNotification(null)
    }, 5000)
  }, [])

  // Poll transaction status
  const pollTransactionStatus = useCallback(async (hash, onSuccess, onFailure, maxAttempts = 20) => {
    let attempts = 0
    
    const poll = async () => {
      try {
        attempts++
        console.log(`🔍 [SecondaryMP] Checking transaction status (attempt ${attempts}/${maxAttempts}):`, hash)
        
        const status = await checkTransactionStatus(hash)
        
        if (status === 'success') {
          console.log('✅ [SecondaryMP] Transaction confirmed!')
          if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current)
            pollingTimeoutRef.current = null
          }
          onSuccess()
          return
        } else if (status === 'failed') {
          console.log('❌ [SecondaryMP] Transaction failed!')
          if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current)
            pollingTimeoutRef.current = null
          }
          onFailure('Transaction failed')
          return
        } else if (attempts >= maxAttempts) {
          console.log('⏰ [SecondaryMP] Transaction polling timeout after', maxAttempts, 'attempts')
          if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current)
            pollingTimeoutRef.current = null
          }
          onFailure('Transaction confirmation timeout')
          return
        }
        
        console.log(`⏳ [SecondaryMP] Transaction still pending, will check again in 3 seconds...`)
        pollingTimeoutRef.current = setTimeout(poll, 3000)
      } catch (error) {
        console.error('💥 [SecondaryMP] Error polling transaction:', error)
        if (attempts >= maxAttempts) {
          if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current)
            pollingTimeoutRef.current = null
          }
          onFailure('Error checking transaction status')
        } else {
          pollingTimeoutRef.current = setTimeout(poll, 3000)
        }
      }
    }
    
    poll()
  }, [checkTransactionStatus])

  // Load all offers
  useEffect(() => {
    if (openOffers) {
      setAllOffers(openOffers)
      setLoading(false)
      console.log('📊 [SecondaryMP] Loaded offers:', openOffers.length, 'Active:', openOffers.filter(o => o.isActive).length)
    } else if (!loadingOffers) {
      setLoading(false)
    }
  }, [openOffers, loadingOffers])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current)
        pollingTimeoutRef.current = null
      }
      if (notificationTimeout.current) {
        clearTimeout(notificationTimeout.current)
        notificationTimeout.current = null
      }
    }
  }, [])

  // Enhanced OfferCard component with proper metadata fetching
  const OfferCard = ({ offer }) => {
    const [nftMetadata, setNftMetadata] = useState(null)
    const [licenseMetadata, setLicenseMetadata] = useState(null)
    const [imageUrl, setImageUrl] = useState(null)
    const [metadataLoading, setMetadataLoading] = useState(true)

    // Get NFT details from primary marketplace
    const { data: nftDetails } = useGetNFTDetails(offer.tokenId)
    
    // Get token URI from license contract
    const { data: tokenURI } = useTokenURI(offer.licenseAddress, offer.tokenId)
    
    // Get license details
    const { data: licenseData } = useGetLicenseFromID(nftDetails?.licenseId)

    // Load comprehensive metadata
    useEffect(() => {
      const loadMetadata = async () => {
        setMetadataLoading(true)
        
        try {
          let finalMetadata = null
          let finalImageUrl = null

          // Try to get metadata from multiple sources
          console.log('🔍 [OfferCard] Loading metadata for token:', offer.tokenId, {
            hasNftDetails: !!nftDetails,
            hasTokenURI: !!tokenURI,
            hasLicenseData: !!licenseData,
            nftURI: nftDetails?.uri,
            tokenURI: tokenURI
          })

          // Priority 1: NFT Details URI
          if (nftDetails?.uri) {
            try {
              console.log('📋 [OfferCard] Trying NFT details URI:', nftDetails.uri)
              const metadata = await MetadataUtils.fetchMetadataEnhanced(nftDetails.uri)
              const normalized = MetadataUtils.normalizeImageUrls(metadata)
              
              if (normalized?.name || normalized?.description) {
                finalMetadata = normalized
                finalImageUrl = normalized.imageUrl
                console.log('✅ [OfferCard] Successfully loaded from NFT details URI')
              }
            } catch (error) {
              console.log('⚠️ [OfferCard] NFT details URI failed:', error.message)
            }
          }

          // Priority 2: Token URI from license contract
          if (!finalMetadata && tokenURI) {
            try {
              console.log('📋 [OfferCard] Trying token URI:', tokenURI)
              const metadata = await MetadataUtils.fetchMetadataEnhanced(tokenURI)
              const normalized = MetadataUtils.normalizeImageUrls(metadata)
              
              if (normalized?.name || normalized?.description) {
                finalMetadata = normalized
                finalImageUrl = normalized.imageUrl
                console.log('✅ [OfferCard] Successfully loaded from token URI')
              }
            } catch (error) {
              console.log('⚠️ [OfferCard] Token URI failed:', error.message)
            }
          }

          // Priority 3: Create metadata from license data
          if (!finalMetadata && licenseData) {
            try {
              console.log('📋 [OfferCard] Creating metadata from license data')
              if (licenseData.uri) {
                const licenseMetadata = await MetadataUtils.fetchMetadataEnhanced(licenseData.uri)
                const normalized = MetadataUtils.normalizeImageUrls(licenseMetadata)
                
                finalMetadata = {
                  name: `${normalized?.name || licenseData?.name || 'Gaming License'} NFT #${offer.tokenId}`,
                  description: normalized?.description || `Gaming license NFT for ${licenseData?.name || 'Unknown Game'}`,
                  image: normalized?.image,
                  imageUrl: normalized?.imageUrl,
                  imageFallbackUrl: normalized?.imageFallbackUrl,
                  symbol: licenseData?.symbol,
                  attributes: [
                    ...(normalized?.attributes || []),
                    {
                      trait_type: "Token ID",
                      value: offer.tokenId.toString()
                    },
                    {
                      trait_type: "License ID",
                      value: nftDetails?.licenseId?.toString() || "Unknown"
                    },
                    {
                      trait_type: "Symbol",
                      value: licenseData?.symbol || "N/A"
                    },
                    {
                      trait_type: "Price",
                      value: `${formatEther(offer.price)} ETH`
                    },
                    {
                      trait_type: "License Contract",
                      value: shortenAddress(offer.licenseAddress)
                    }
                  ]
                }
                finalImageUrl = normalized?.imageUrl
                console.log('✅ [OfferCard] Successfully created from license data')
              }
            } catch (error) {
              console.log('⚠️ [OfferCard] License metadata failed:', error.message)
            }
          }

          // Fallback: Create basic metadata
          if (!finalMetadata) {
            console.log('📋 [OfferCard] Creating fallback metadata')
            finalMetadata = {
              name: `Gaming License NFT #${offer.tokenId}`,
              description: `Gaming license NFT from contract ${shortenAddress(offer.licenseAddress)}`,
              symbol: licenseData?.symbol || 'N/A',
              image: null,
              imageUrl: null,
              attributes: [
                {
                  trait_type: "Token ID",
                  value: offer.tokenId.toString()
                },
                {
                  trait_type: "License ID",
                  value: nftDetails?.licenseId?.toString() || "Unknown"
                },
                {
                  trait_type: "Symbol",
                  value: licenseData?.symbol || "N/A"
                },
                {
                  trait_type: "Price",
                  value: `${formatEther(offer.price)} ETH`
                },
                {
                  trait_type: "License Contract", 
                  value: shortenAddress(offer.licenseAddress)
                }
              ]
            }
          }

          setNftMetadata(finalMetadata)
          setLicenseMetadata(licenseData)

          // Load image if available
          if (finalImageUrl) {
            const img = new Image()
            img.onload = () => {
              setImageUrl(finalImageUrl)
              console.log('✅ [OfferCard] Image loaded successfully')
            }
            img.onerror = () => {
              console.log('⚠️ [OfferCard] Primary image failed, trying fallback')
              if (finalMetadata?.imageFallbackUrl) {
                const fallbackImg = new Image()
                fallbackImg.onload = () => setImageUrl(finalMetadata.imageFallbackUrl)
                fallbackImg.src = finalMetadata.imageFallbackUrl
              }
            }
            img.src = finalImageUrl
          }

        } catch (error) {
          console.error('💥 [OfferCard] Error loading metadata:', error)
          // Still set basic fallback
          setNftMetadata({
            name: `Gaming License NFT #${offer.tokenId}`,
            description: `Gaming license NFT from contract ${shortenAddress(offer.licenseAddress)}`,
            symbol: 'N/A'
          })
        } finally {
          setMetadataLoading(false)
        }
      }

      loadMetadata()
    }, [offer, nftDetails, tokenURI, licenseData])

    const handleBuyOffer = async () => {
      if (!isConnected) {
        alert('Please connect your wallet')
        return
      }

      if (!offer.isActive) {
        alert('This offer is no longer available - it has already been sold!')
        return
      }

      if (offer.seller.toLowerCase() === address?.toLowerCase()) {
        alert('You cannot buy your own offer!')
        return
      }

      try {
        setProcessingOffer(offer.tokenId)
        
        console.log('💰 [SecondaryMP] Starting purchase:', {
          tokenId: offer.tokenId,
          price: formatEther(offer.price),
          seller: offer.seller,
          buyer: address
        })

        const hash = await acceptOffer(offer.tokenId, offer.price)
        
        if (hash) {
          console.log('📤 [SecondaryMP] Purchase transaction submitted:', hash)
          showNotification('success', hash, 'Purchase transaction submitted...')

          pollTransactionStatus(
            hash,
            // Success callback
            () => {
              console.log('✅ [SecondaryMP] Purchase completed successfully!')
              showNotification('success', hash, 'NFT purchased successfully!')
              setProcessingOffer(null)
              
              // Refresh offers after successful purchase
              setTimeout(() => {
                refetchOffers()
              }, 2000)
            },
            // Failure callback
            (error) => {
              console.log('❌ [SecondaryMP] Purchase failed:', error)
              showNotification('failed', hash, 'Purchase failed')
              setProcessingOffer(null)
            }
          )
        }
      } catch (error) {
        console.error('💥 [SecondaryMP] Purchase error:', error)
        setProcessingOffer(null)
        
        if (error.message.includes('User rejected')) {
          showNotification('failed', null, 'Transaction cancelled')
        } else {
          showNotification('failed', null, `Purchase failed: ${error.message}`)
        }
      }
    }

    const handleRemoveOffer = async () => {
      if (!isConnected) {
        alert('Please connect your wallet')
        return
      }

      if (offer.seller.toLowerCase() !== address?.toLowerCase()) {
        alert('You can only remove your own offers!')
        return
      }

      try {
        setProcessingOffer(offer.tokenId)
        
        const hash = await removeOffer(offer.tokenId)
        
        if (hash) {
          console.log('📤 [SecondaryMP] Remove offer transaction submitted:', hash)
          showNotification('success', hash, 'Removing offer...')

          pollTransactionStatus(
            hash,
            // Success callback
            () => {
              console.log('✅ [SecondaryMP] Offer removed successfully!')
              showNotification('success', hash, 'Offer removed successfully!')
              setProcessingOffer(null)
              
              // Refresh offers
              setTimeout(() => {
                refetchOffers()
              }, 2000)
            },
            // Failure callback
            (error) => {
              console.log('❌ [SecondaryMP] Remove offer failed:', error)
              showNotification('failed', hash, 'Failed to remove offer')
              setProcessingOffer(null)
            }
          )
        }
      } catch (error) {
        console.error('💥 [SecondaryMP] Remove offer error:', error)
        setProcessingOffer(null)
        showNotification('failed', null, `Failed to remove offer: ${error.message}`)
      }
    }

    const isProcessing = processingOffer === offer.tokenId
    const isOwnOffer = offer.seller.toLowerCase() === address?.toLowerCase()

    if (metadataLoading) {
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

    return (
      <Card className="overflow-hidden hover:shadow-lg transition-shadow bg-white border-2 border-gray-200">
        {/* Image Section */}
        <div className="h-48 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center relative overflow-hidden">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={nftMetadata?.name || 'NFT'} 
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
          
          {/* Price badge */}
          <div className="absolute top-2 left-2">
            <span className="bg-blue-600 text-white text-sm px-3 py-1 rounded-full font-bold flex items-center">
              <DollarSign className="h-4 w-4 mr-1" />
              {formatEther(offer.price)} ETH
            </span>
          </div>

          {/* Own offer badge */}
          {isOwnOffer && (
            <div className="absolute top-2 right-2">
              <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full font-bold">
                Your Offer
              </span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold text-gray-900 truncate">
            {nftMetadata?.name || `NFT #${offer.tokenId}`}
          </CardTitle>
          <CardDescription className="text-sm text-gray-600 line-clamp-2">
            {nftMetadata?.description || `Gaming license NFT from contract ${shortenAddress(offer.licenseAddress)}`}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-0 pb-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Token ID:</span>
              <span className="font-semibold text-gray-900">#{offer.tokenId.toString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Symbol:</span>
              <span className="font-semibold text-gray-900">{nftMetadata?.symbol || licenseMetadata?.symbol || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">License ID:</span>
              <span className="font-semibold text-gray-900">#{nftDetails?.licenseId?.toString() || 'Unknown'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Seller:</span>
              <span className="font-semibold text-gray-900">{shortenAddress(offer.seller)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Contract:</span>
              <span className="font-semibold text-gray-900">{shortenAddress(offer.licenseAddress)}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-0">
          {!isConnected ? (
            <Button disabled className="w-full bg-gray-400 text-gray-600 font-semibold">
              <User className="mr-2 h-4 w-4" />
              Connect Wallet
            </Button>
          ) : isOwnOffer ? (
            <Button 
              onClick={handleRemoveOffer}
              disabled={isProcessing || isRemovePending}
              variant="destructive"
              className="w-full font-bold"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove Offer'
              )}
            </Button>
          ) : (
            <Button 
              onClick={handleBuyOffer}
              disabled={!offer.isActive || isProcessing || isAcceptPending}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Purchasing...
                </>
              ) : !offer.isActive ? (
                'Sold Out'
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Buy for {formatEther(offer.price)} ETH
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
                    {txNotification.status === 'success' ? '✅ Success!' : '❌ Failed!'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {txNotification.message}
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
                  href={`https://sepolia.etherscan.io/tx/${txNotification.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center"
                >
                  View on Etherscan <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600">Loading marketplace offers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Secondary Marketplace</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Buy and sell gaming license NFTs from other collectors
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <Package className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-900">{allOffers.length}</p>
            <p className="text-sm text-blue-700">Total Offers</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-900">
              {allOffers.filter(o => o.isActive).length}
            </p>
            <p className="text-sm text-green-700">Active Offers</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4 text-center">
            <Coins className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-purple-900">
              {allOffers.length > 0 ? 
                formatEther(
                  allOffers
                    .filter(o => o.isActive)
                    .reduce((sum, offer) => sum + BigInt(offer.price), BigInt(0))
                ).slice(0, 6)
                : '0'
              } ETH
            </p>
            <p className="text-sm text-purple-700">Total Value</p>
          </CardContent>
        </Card>
      </div>

      {allOffers.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Offers Available</h3>
          <p className="text-gray-600">There are currently no NFTs listed for sale.</p>
          <p className="text-gray-600">Check back later or list your own NFTs!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allOffers.filter(offer => offer.isActive).map((offer, index) => (
            <OfferCard key={`${offer.tokenId}-${index}`} offer={offer} />
          ))}
        </div>
      )}

      <TransactionNotification />
    </div>
  )
}