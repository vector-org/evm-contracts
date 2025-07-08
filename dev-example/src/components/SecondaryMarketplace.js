"use client";
import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { Button } from './ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card'
import { useContract } from '../hooks/useContract'
import { useTransactions } from '../hooks/useTransactions'
import { formatEther, shortenAddress } from '../lib/utils'
import { Loader2, ShoppingCart, ExternalLink, User, Coins, Package, CheckCircle, AlertCircle } from 'lucide-react'

export default function SecondaryMarketplace() {
  const { address, isConnected } = useAccount()
  const { 
    useGetOpenOffers,
    useAcceptOffer,
    useRemoveOffer
  } = useContract()
  const { addTransaction } = useTransactions()

  const [allOffers, setAllOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingOffer, setProcessingOffer] = useState(null)

  const { data: openOffers, isLoading: loadingOffers, refetch: refetchOffers } = useGetOpenOffers()
  const { acceptOffer, isPending: isAcceptPending } = useAcceptOffer()
  const { removeOffer, isPending: isRemovePending } = useRemoveOffer()

  // Load all offers
  useEffect(() => {
    if (openOffers) {
      setAllOffers(openOffers)
      setLoading(false)
      console.log('📊 Loaded offers:', openOffers.length, 'Active:', openOffers.filter(o => o.isActive).length)
    } else if (!loadingOffers) {
      setLoading(false)
    }
  }, [openOffers, loadingOffers])

  const OfferCard = ({ offer }) => {
    const [nftMetadata, setNftMetadata] = useState(null)

    useEffect(() => {
      const basicMetadata = {
        name: `Gaming License NFT #${offer.tokenId}`,
        description: `Gaming license NFT from contract ${shortenAddress(offer.licenseAddress)}`,
        image: null,
        attributes: [
          {
            trait_type: "Token ID",
            value: offer.tokenId.toString()
          },
          {
            trait_type: "License Contract", 
            value: shortenAddress(offer.licenseAddress)
          },
          {
            trait_type: "Price",
            value: `${formatEther(offer.price)} ETH`
          }
        ]
      }
      setNftMetadata(basicMetadata)
    }, [offer])

    const handleBuyOffer = async () => {
      if (!isConnected) {
        alert('Please connect your wallet')
        return
      }

      if (!offer.isActive) {
        alert('This offer is no longer available - it has already been sold!')
        return
      }

      try {
        console.log('🛒 Buying NFT:', {
          tokenId: offer.tokenId,
          price: formatEther(offer.price),
          priceWei: offer.price.toString(),
          seller: offer.seller
        })

        setProcessingOffer(offer.tokenId)
        
        // CRITICAL FIX: Send exact BigInt price, not formatted ether
        const txHash = await acceptOffer(offer.tokenId, offer.price)
        
        console.log('✅ Purchase submitted:', txHash)

        addTransaction(
          txHash,
          `Buying NFT #${offer.tokenId} for ${formatEther(offer.price)} ETH`,
          'buy-nft'
        )

        // Wait for transaction confirmation
        setTimeout(() => {
          setProcessingOffer(null)
          refetchOffers()
        }, 3000)

      } catch (error) {
        console.error('❌ Purchase failed:', error)
        setProcessingOffer(null)
        
        if (error.message.includes('User rejected')) {
          alert('Transaction was cancelled by user')
        } else if (error.message.includes('insufficient funds')) {
          alert('Insufficient funds for transaction')
        } else if (error.message.includes('not active') || error.message.includes('already sold')) {
          alert('This NFT has already been sold!')
          refetchOffers()
        } else {
          alert(`Error buying NFT: ${error.message}`)
        }
      }
    }

    const handleRemoveOffer = async () => {
      if (!isConnected) {
        alert('Please connect your wallet')
        return
      }

      if (offer.seller.toLowerCase() !== address?.toLowerCase()) {
        alert('You can only remove your own offers')
        return
      }

      if (!offer.isActive) {
        alert('This offer has already been sold and cannot be removed')
        return
      }

      try {
        console.log('🗑️ Removing offer:', offer.tokenId)

        setProcessingOffer(offer.tokenId)
        
        const txHash = await removeOffer(offer.tokenId)
        
        console.log('✅ Removal submitted:', txHash)

        addTransaction(
          txHash,
          `Removing offer for NFT #${offer.tokenId}`,
          'remove-offer'
        )

        // Wait for transaction confirmation
        setTimeout(() => {
          setProcessingOffer(null)
          refetchOffers()
        }, 3000)

      } catch (error) {
        console.error('❌ Removal failed:', error)
        setProcessingOffer(null)
        
        if (error.message.includes('User rejected')) {
          alert('Transaction was cancelled by user')
        } else {
          alert(`Error removing offer: ${error.message}`)
        }
      }
    }

    const isOwnOffer = offer.seller.toLowerCase() === address?.toLowerCase()
    const isProcessing = processingOffer === offer.tokenId
    const isSold = !offer.isActive
    const isPurchaser = offer.buyer?.toLowerCase() === address?.toLowerCase()

    return (
      <Card className={`overflow-hidden transition-shadow ${isSold ? 'opacity-75' : 'hover:shadow-lg'}`}>
        <div className="h-48 bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center relative">
          {nftMetadata?.image ? (
            <img 
              src={nftMetadata.image} 
              alt={nftMetadata.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Gaming License NFT</p>
            </div>
          )}
          
          {isSold && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-lg">
                <CheckCircle className="inline mr-2 h-5 w-5" />
                SOLD
              </div>
            </div>
          )}
          
          <div className={`absolute top-2 right-2 backdrop-blur-sm px-3 py-2 rounded-full ${
            isSold ? 'bg-gray-500/90 text-gray-200' : 'bg-white/90'
          }`}>
            <div className="text-center">
              <p className="text-xs text-gray-500">Price</p>
              <p className={`font-bold text-sm ${isSold ? 'line-through' : ''}`}>
                {formatEther(offer.price)} ETH
              </p>
            </div>
          </div>

          <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium">
            #{offer.tokenId}
          </div>
        </div>
        
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="truncate">{nftMetadata?.name || `NFT #${offer.tokenId}`}</span>
            {isSold ? (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                Sold
              </span>
            ) : isOwnOffer ? (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                My Offer
              </span>
            ) : (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                Available
              </span>
            )}
          </CardTitle>
          <CardDescription>
            {isSold ? (
              <span className="text-gray-500">
                {isPurchaser ? 'You purchased this NFT' : 'This NFT has been sold'}
              </span>
            ) : (
              nftMetadata?.description
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-gray-500">Seller</p>
                <p className="font-medium">{shortenAddress(offer.seller)}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Coins className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-gray-500">Price</p>
                <p className={`font-medium text-lg ${isSold ? 'text-gray-500 line-through' : ''}`}>
                  {formatEther(offer.price)} ETH
                </p>
                {/* DEBUG INFO - Remove in production */}
                <p className="text-xs text-gray-400">
                  Wei: {offer.price.toString()}
                </p>
              </div>
            </div>
          </div>

          {isSold && offer.buyer && (
            <div className="border-t pt-3">
              <div className="flex items-center space-x-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-gray-500">Purchased by</p>
                  <p className="font-medium text-green-600">{shortenAddress(offer.buyer)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="border-t pt-3">
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Token ID</span>
                <span className="font-medium">#{offer.tokenId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">License Contract</span>
                <span className="font-medium">{shortenAddress(offer.licenseAddress)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`font-medium ${isSold ? 'text-gray-500' : 'text-green-600'}`}>
                  {isSold ? 'Sold' : 'Available'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="space-x-2">
          {isSold ? (
            <Button disabled className="flex-1 bg-gray-100 text-gray-500">
              <CheckCircle className="mr-2 h-4 w-4" />
              {isPurchaser ? 'You Own This' : 'Sold Out'}
            </Button>
          ) : isOwnOffer ? (
            <Button 
              onClick={handleRemoveOffer}
              disabled={isProcessing || isRemovePending}
              variant="destructive"
              className="flex-1"
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
              disabled={isProcessing || isAcceptPending}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Buying...
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Buy Now
                </>
              )}
            </Button>
          )}
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => window.open(`https://sepolia.etherscan.io/address/${offer.licenseAddress}`, '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    )
  }

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <ShoppingCart className="mx-auto h-12 w-12 text-blue-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
              <p className="text-gray-600 mb-4">
                Please connect your wallet to view and buy NFTs from the secondary marketplace
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading marketplace offers...</p>
        </div>
      </div>
    )
  }

  if (allOffers.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Secondary Marketplace</h1>
          <p className="text-gray-600">
            Buy gaming license NFTs from other collectors
          </p>
        </div>
        
        <div className="text-center py-12">
          <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Offers Available</h3>
          <p className="text-gray-600">
            No NFTs are currently listed for sale. Check back later or list your own!
          </p>
          <Button onClick={refetchOffers} variant="outline" className="mt-4">
            Refresh
          </Button>
        </div>
      </div>
    )
  }

  const activeOffers = allOffers.filter(offer => offer.isActive)
  const soldOffers = allOffers.filter(offer => !offer.isActive)

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Secondary Marketplace</h1>
        <p className="text-gray-600">
          Buy gaming license NFTs from other collectors
        </p>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>{allOffers.length} total offer{allOffers.length !== 1 ? 's' : ''}</span>
            <span>•</span>
            <span className="text-green-600">{activeOffers.length} available</span>
            <span>•</span>
            <span className="text-gray-400">{soldOffers.length} sold</span>
          </div>
          <Button onClick={refetchOffers} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {activeOffers.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Now</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeOffers.map((offer, index) => (
              <OfferCard key={`active-offer-${offer.tokenId}-${index}`} offer={offer} />
            ))}
          </div>
        </div>
      )}

      {soldOffers.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-500 mb-4">Recently Sold</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {soldOffers.slice(0, 6).map((offer, index) => (
              <OfferCard key={`sold-offer-${offer.tokenId}-${index}`} offer={offer} />
            ))}
          </div>
          {soldOffers.length > 6 && (
            <div className="text-center mt-6">
              <p className="text-gray-500 text-sm">+ {soldOffers.length - 6} more sold items</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}