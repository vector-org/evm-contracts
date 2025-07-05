"use client";
import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { Button } from './ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card'
import { useContract } from '../hooks/useContract'
import { useTransactions, useTransactionWatcher } from '../hooks/useTransactions'
import { formatEther, shortenAddress } from '../lib/utils'
import { CONTRACT_ADDRESSES, CONTRACTS } from '../lib/contracts'
import { Loader2, ShoppingCart, User, Coins, ExternalLink, AlertCircle, X, RefreshCw } from 'lucide-react'

export default function SecondaryMarketplace() {
  const { address, isConnected } = useAccount()
  const { 
    useGetOpenOffers,
    useAcceptOffer,
    useRemoveOffer
  } = useContract()
  const { addTransaction } = useTransactions()

  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [buyingOffer, setBuyingOffer] = useState(null)
  const [removingOffer, setRemovingOffer] = useState(null)
  const [currentBuyTx, setCurrentBuyTx] = useState(null)
  const [currentRemoveTx, setCurrentRemoveTx] = useState(null)

  const { data: openOffers, isLoading: loadingOffers, refetch } = useGetOpenOffers()
  const { acceptOffer, isPending: isBuyPending } = useAcceptOffer()
  const { removeOffer, isPending: isRemovePending } = useRemoveOffer()

  useTransactionWatcher(
    currentBuyTx,
    (receipt) => {
      console.log('🎉 NFT purchase successful!', {
        transactionHash: currentBuyTx,
        receipt: receipt
      })
      setBuyingOffer(null)
      setCurrentBuyTx(null)
      
      // Refresh offers after successful purchase
      setTimeout(() => {
        refetch()
      }, 2000)
    },
    () => {
      console.error('💥 NFT purchase failed:', currentBuyTx)
      setBuyingOffer(null)
      setCurrentBuyTx(null)
    }
  )

  useTransactionWatcher(
    currentRemoveTx,
    (receipt) => {
      console.log('✅ Offer removal successful!', {
        transactionHash: currentRemoveTx,
        receipt: receipt
      })
      setRemovingOffer(null)
      setCurrentRemoveTx(null)
      
      // Refresh offers after successful removal
      setTimeout(() => {
        refetch()
      }, 2000)
    },
    () => {
      console.error('💥 Offer removal failed:', currentRemoveTx)
      setRemovingOffer(null)
      setCurrentRemoveTx(null)
    }
  )

  const OfferCard = ({ offer, index }) => {
    const isMyOffer = offer.seller.toLowerCase() === address?.toLowerCase()
    const canBuy = isConnected && !isMyOffer && offer.isActive
    const [metadata, setMetadata] = useState(null)
    const [loadingMetadata, setLoadingMetadata] = useState(false)

    useEffect(() => {
      loadOfferMetadata()
    }, [offer])

    const loadOfferMetadata = async () => {
      try {
        setLoadingMetadata(true)
        console.log('📋 Loading metadata for offer:', offer.tokenId)
        
        // Create basic metadata for the offer
        setMetadata({
          name: `Gaming License #${offer.tokenId}`,
          description: `Gaming license NFT available for purchase`,
          image: null,
          attributes: [
            {
              trait_type: "Token ID",
              value: offer.tokenId.toString()
            },
            {
              trait_type: "Price",
              value: `${formatEther(offer.price)} ETH`
            },
            {
              trait_type: "Seller",
              value: shortenAddress(offer.seller)
            }
          ]
        })
        
        console.log('✅ Metadata created for offer:', offer.tokenId)
      } catch (error) {
        console.error('💥 Error loading offer metadata:', error)
      } finally {
        setLoadingMetadata(false)
      }
    }

    const handleBuyOffer = async () => {
      if (!canBuy) return

      try {
        console.log('🚀 Starting purchase process:', {
          tokenId: offer.tokenId,
          price: formatEther(offer.price),
          seller: offer.seller
        })

        setBuyingOffer(offer.tokenId)

        const txHash = await acceptOffer(offer.tokenId, offer.price)

        console.log('📝 Purchase transaction submitted successfully:', txHash)
        console.log('🔗 View on Etherscan:', `https://sepolia.etherscan.io/tx/${txHash}`)
        
        setCurrentBuyTx(txHash)

        addTransaction(
          txHash,
          `Buying NFT #${offer.tokenId} for ${formatEther(offer.price)} ETH`,
          'buy-nft'
        )

      } catch (error) {
        console.error('💥 Error buying NFT:', {
          tokenId: offer.tokenId,
          error: error.message,
          stack: error.stack
        })
        
        setBuyingOffer(null)
        
        // Show user-friendly error message
        if (error.message.includes('User rejected') || error.message.includes('user rejected')) {
          alert('Transaction was cancelled by user')
        } else if (error.message.includes('insufficient funds')) {
          alert('Insufficient funds for transaction (including gas fees)')
        } else if (error.message.includes('Offer is not active')) {
          alert('This offer is no longer active')
        } else {
          alert(`Error buying NFT: ${error.message}`)
        }
      }
    }

    const handleRemoveOffer = async () => {
      if (!isMyOffer) return

      try {
        console.log('🗑️ Starting offer removal:', {
          tokenId: offer.tokenId,
          seller: offer.seller
        })

        setRemovingOffer(offer.tokenId)

        const txHash = await removeOffer(offer.tokenId)

        console.log('📝 Removal transaction submitted successfully:', txHash)
        console.log('🔗 View on Etherscan:', `https://sepolia.etherscan.io/tx/${txHash}`)
        
        setCurrentRemoveTx(txHash)

        addTransaction(
          txHash,
          `Removing offer for NFT #${offer.tokenId}`,
          'remove-offer'
        )

      } catch (error) {
        console.error('💥 Error removing offer:', {
          tokenId: offer.tokenId,
          error: error.message,
          stack: error.stack
        })
        
        setRemovingOffer(null)
        
        if (error.message.includes('User rejected') || error.message.includes('user rejected')) {
          alert('Transaction was cancelled by user')
        } else {
          alert(`Error removing offer: ${error.message}`)
        }
      }
    }

    if (loadingMetadata) {
      return (
        <Card className="animate-pulse">
          <div className="h-48 bg-gray-200 rounded-t-lg"></div>
          <CardContent className="pt-4">
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="h-48 bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center relative">
          {metadata?.image ? (
            <img 
              src={metadata.image} 
              alt={metadata.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center">
              <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">For Sale</p>
            </div>
          )}
          
          {/* Token ID Badge */}
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium">
            #{offer.tokenId}
          </div>
          
          {/* Status Badge */}
          {isMyOffer && (
            <div className="absolute top-2 left-2 bg-blue-500/90 text-white px-2 py-1 rounded-full text-xs font-medium">
              Your Listing
            </div>
          )}
        </div>
        
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="truncate">{metadata?.name || `NFT #${offer.tokenId}`}</span>
            <div className="flex items-center space-x-1">
              <Coins className="h-4 w-4 text-yellow-500" />
              <span className="font-bold text-lg text-green-600">
                {formatEther(offer.price)}
              </span>
              <span className="text-sm text-gray-500">ETH</span>
            </div>
          </CardTitle>
          <CardDescription>
            {metadata?.description || "Gaming license NFT available for purchase"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Seller</p>
                <p className="font-medium">{shortenAddress(offer.seller)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Status</p>
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${offer.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm font-medium">
                  {offer.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t pt-3">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>License Contract</span>
              <span className="font-mono text-xs">{shortenAddress(offer.licenseAddress)}</span>
            </div>
          </div>

          {metadata?.attributes && (
            <div className="border-t pt-3">
              <p className="text-sm text-gray-500 mb-2">Details</p>
              <div className="grid grid-cols-2 gap-2">
                {metadata.attributes.slice(0, 4).map((attr, index) => (
                  <div key={index} className="text-xs">
                    <span className="text-gray-500">{attr.trait_type}</span>
                    <p className="font-medium truncate">{attr.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="space-x-2">
          {isMyOffer ? (
            <Button 
              onClick={handleRemoveOffer}
              disabled={removingOffer === offer.tokenId || isRemovePending}
              variant="destructive"
              className="flex-1"
            >
              {(removingOffer === offer.tokenId || isRemovePending) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Remove Listing
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={handleBuyOffer}
              disabled={!canBuy || buyingOffer === offer.tokenId || !offer.isActive || isBuyPending}
              className="flex-1"
            >
              {(buyingOffer === offer.tokenId || isBuyPending) ? (
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

  useEffect(() => {
    console.log('📊 Open offers data updated:', openOffers)
    
    if (openOffers && openOffers.length > 0) {
      const activeOffers = openOffers.filter(offer => offer.isActive)
      setOffers(activeOffers)
      setLoading(false)
      
      console.log('✅ Found active offers:', activeOffers.length)
    } else if (!loadingOffers) {
      setLoading(false)
      console.log('ℹ️ No active offers found')
    }
  }, [openOffers, loadingOffers])

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Wallet Not Connected</h3>
              <p className="text-gray-600 mb-4">
                Please connect your wallet to access the secondary marketplace
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

  if (offers.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Secondary Marketplace</h1>
          <p className="text-gray-600">
            Buy and sell gaming license NFTs with other users
          </p>
        </div>
        
        <div className="text-center py-12">
          <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Offers Available</h3>
          <p className="text-gray-600 mb-4">
            No NFTs are currently listed for sale. Be the first to list your NFT!
          </p>
          <Button 
            onClick={refetch}
            variant="outline"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Secondary Marketplace</h1>
        <p className="text-gray-600">
          Buy and sell gaming license NFTs with other users
        </p>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {offers.length} active offer{offers.length !== 1 ? 's' : ''} available
          </div>
          <Button 
            onClick={refetch}
            variant="outline"
            size="sm"
            disabled={loadingOffers}
          >
            {loadingOffers ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {offers.map((offer, index) => (
          <OfferCard key={`${offer.tokenId}-${offer.seller}-${index}`} offer={offer} index={index} />
        ))}
      </div>

      {/* Loading overlay during transactions */}
      {(buyingOffer || removingOffer || isBuyPending || isRemovePending) && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="max-w-sm mx-4">
            <CardContent className="pt-6">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <h3 className="font-semibold mb-2">
                  {buyingOffer || isBuyPending ? 'Processing Purchase' : 'Removing Offer'}
                </h3>
                <p className="text-sm text-gray-600">
                  {buyingOffer || isBuyPending
                    ? 'Please wait while your purchase is being processed...'
                    : 'Please wait while your offer is being removed...'
                  }
                </p>
                {(currentBuyTx || currentRemoveTx) && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 break-all">
                      TX: {currentBuyTx || currentRemoveTx}
                    </p>
                    <a 
                      href={`https://sepolia.etherscan.io/tx/${currentBuyTx || currentRemoveTx}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 text-xs underline"
                    >
                      View on Etherscan
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}