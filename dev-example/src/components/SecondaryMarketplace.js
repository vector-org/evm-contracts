"use client";
import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { Button } from './ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card'
import { useContract } from '../hooks/useContract'
import { useTransactions, useTransactionWatcher } from '../hooks/useTransactions'
import { formatEther, shortenAddress, parseEther } from '../lib/utils'
import { CONTRACT_ADDRESSES, CONTRACTS } from '../lib/contracts'
import { Loader2, ShoppingCart, User, Coins, ExternalLink, AlertCircle, X } from 'lucide-react'

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

  const { data: openOffers, isLoading: loadingOffers, refetch } = useGetOpenOffers()
  const { writeContractAsync: acceptOffer, data: acceptOfferData } = useAcceptOffer()
  const { writeContractAsync: removeOffer, data: removeOfferData } = useRemoveOffer()

  useTransactionWatcher(
    acceptOfferData,
    () => {
      setBuyingOffer(null)
      refetch()
    },
    () => {
      setBuyingOffer(null)
    }
  )

  useTransactionWatcher(
    removeOfferData,
    () => {
      setRemovingOffer(null)
      refetch()
    },
    () => {
      setRemovingOffer(null)
    }
  )

  const OfferCard = ({ offer }) => {
    const isMyOffer = offer.seller.toLowerCase() === address?.toLowerCase()
    const canBuy = isConnected && !isMyOffer && offer.isActive

    const handleBuyOffer = async () => {
      if (!canBuy) return

      try {
        setBuyingOffer(offer.tokenId)

        const tx = await acceptOffer({
          address: CONTRACT_ADDRESSES.SECONDARY_MARKETPLACE,
          abi: CONTRACTS.SECONDARY_MARKETPLACE.abi,
          functionName: 'acceptOffer',
          args: [offer.tokenId],
          value: offer.price
        })

        addTransaction(
          tx,
          `Buying NFT #${offer.tokenId} for ${formatEther(offer.price)} ETH`,
          'buy-nft'
        )

      } catch (error) {
        console.error('Error buying NFT:', error)
        setBuyingOffer(null)
      }
    }

    const handleRemoveOffer = async () => {
      if (!isMyOffer) return

      try {
        setRemovingOffer(offer.tokenId)

        const tx = await removeOffer({
          address: CONTRACT_ADDRESSES.SECONDARY_MARKETPLACE,
          abi: CONTRACTS.SECONDARY_MARKETPLACE.abi,
          functionName: 'removeOffer',
          args: [offer.tokenId]
        })

        addTransaction(
          tx,
          `Removing offer for NFT #${offer.tokenId}`,
          'remove-offer'
        )

      } catch (error) {
        console.error('Error removing offer:', error)
        setRemovingOffer(null)
      }
    }

    return (
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="h-48 bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
          <div className="text-center">
            <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">NFT #{offer.tokenId}</p>
          </div>
        </div>
        
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Game License #{offer.tokenId}</span>
            {isMyOffer && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                Your Listing
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Gaming license NFT available for purchase
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
              <p className="text-sm text-gray-500">Price</p>
              <div className="flex items-center space-x-1">
                <Coins className="h-4 w-4 text-yellow-500" />
                <span className="font-bold text-lg">{formatEther(offer.price)} ETH</span>
              </div>
            </div>
          </div>

          <div className="border-t pt-3">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>License Contract</span>
              <span className="font-mono">{shortenAddress(offer.licenseAddress)}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="space-x-2">
          {isMyOffer ? (
            <Button 
              onClick={handleRemoveOffer}
              disabled={removingOffer === offer.tokenId}
              variant="destructive"
              className="flex-1"
            >
              {removingOffer === offer.tokenId ? (
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
              disabled={!canBuy || buyingOffer === offer.tokenId}
              className="flex-1"
            >
              {buyingOffer === offer.tokenId ? (
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
    if (openOffers && openOffers.length > 0) {
      setOffers(openOffers.filter(offer => offer.isActive))
      setLoading(false)
    } else if (!loadingOffers) {
      setLoading(false)
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
          <p className="text-gray-600">
            No NFTs are currently listed for sale. Be the first to list your NFT!
          </p>
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
        <div className="mt-4 text-sm text-gray-500">
          {offers.length} offer{offers.length !== 1 ? 's' : ''} available
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {offers.map((offer, index) => (
          <OfferCard key={`${offer.tokenId}-${index}`} offer={offer} />
        ))}
      </div>
    </div>
  )
}