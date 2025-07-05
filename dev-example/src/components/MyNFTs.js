"use client";
import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { useContract } from '../hooks/useContract'
import { useTransactions, useTransactionWatcher } from '../hooks/useTransactions'
import { formatEther, parseEther, shortenAddress } from '../lib/utils'
import { CONTRACT_ADDRESSES, CONTRACTS } from '../lib/contracts'
import { Loader2, Package, Tag, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react'

export default function MyNFTs() {
  const { address, isConnected } = useAccount()
  const { 
    useGetAllNFTIds, 
    useGetNFTDetails,
    useApprove,
    useGetApproved,
    useCreateOffer
  } = useContract()
  const { addTransaction } = useTransactions()

  const [nfts, setNfts] = useState([])
  const [loading, setLoading] = useState(true)
  const [listingNFT, setListingNFT] = useState(null)
  const [listingPrice, setListingPrice] = useState('')
  const [approvingNFT, setApprovingNFT] = useState(null)

  const { data: allNFTIds, isLoading: loadingIds } = useGetAllNFTIds()
  const { writeContractAsync: approve, data: approveData } = useApprove(listingNFT?.licenseAddress)
  const { writeContractAsync: createOffer, data: createOfferData } = useCreateOffer()

  useTransactionWatcher(
    approveData,
    () => {
      setApprovingNFT(null)
      // After approval, create the offer
      if (listingNFT && listingPrice) {
        handleCreateOffer()
      }
    },
    () => {
      setApprovingNFT(null)
    }
  )

  useTransactionWatcher(
    createOfferData,
    () => {
      setListingNFT(null)
      setListingPrice('')
    },
    () => {
      // Handle error
    }
  )

  const NFTCard = ({ nftId }) => {
    const { data: nftDetails, isLoading } = useGetNFTDetails(nftId)
    
    if (isLoading) {
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

    if (!nftDetails || nftDetails.owner.toLowerCase() !== address?.toLowerCase()) {
      return null
    }

    return (
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="h-48 bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center">
          <div className="text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">NFT #{nftId}</p>
          </div>
        </div>
        
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Game License #{nftId}</span>
          </CardTitle>
          <CardDescription>
            You own this gaming license NFT
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Owner</span>
              <span className="font-medium">{shortenAddress(nftDetails.owner)}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="space-x-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="flex-1">
                <Tag className="mr-2 h-4 w-4" />
                List for Sale
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>List NFT for Sale</DialogTitle>
                <DialogDescription>
                  Set a price for your NFT #{nftId} on the secondary marketplace
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (ETH)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.001"
                    value={listingPrice}
                    onChange={(e) => setListingPrice(e.target.value)}
                    placeholder="Enter price in ETH"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={() => handleListNFT(nftId, nftDetails)}
                  disabled={!listingPrice || approvingNFT}
                >
                  {approvingNFT ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    'List NFT'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => window.open(`https://sepolia.etherscan.io/token/${nftDetails.owner}`, '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    )
  }

  const handleListNFT = async (nftId, nftDetails) => {
    if (!isConnected || !listingPrice) return

    try {
      setListingNFT({ id: nftId, ...nftDetails, licenseAddress: CONTRACT_ADDRESSES.PRIMARY_MARKETPLACE })
      setApprovingNFT(nftId)

      // First approve the secondary marketplace
      const approveTx = await approve({
        address: CONTRACT_ADDRESSES.PRIMARY_MARKETPLACE,
        abi: CONTRACTS.LICENSE.abi,
        functionName: 'approve',
        args: [CONTRACT_ADDRESSES.SECONDARY_MARKETPLACE, nftId]
      })

      addTransaction(
        approveTx,
        `Approving NFT #${nftId} for listing`,
        'approve-nft'
      )

    } catch (error) {
      console.error('Error approving NFT:', error)
      setApprovingNFT(null)
      setListingNFT(null)
    }
  }

  const handleCreateOffer = async () => {
    if (!listingNFT || !listingPrice) return

    try {
      const offerTx = await createOffer({
        address: CONTRACT_ADDRESSES.SECONDARY_MARKETPLACE,
        abi: CONTRACTS.SECONDARY_MARKETPLACE.abi,
        functionName: 'createOffer',
        args: [
          listingNFT.id,
          listingNFT.licenseAddress,
          parseEther(listingPrice)
        ]
      })

      addTransaction(
        offerTx,
        `Creating offer for NFT #${listingNFT.id}`,
        'create-offer'
      )

    } catch (error) {
      console.error('Error creating offer:', error)
      setListingNFT(null)
    }
  }

  useEffect(() => {
    if (allNFTIds && allNFTIds.length > 0) {
      setNfts(allNFTIds.map(id => id.toString()))
      setLoading(false)
    } else if (!loadingIds) {
      setLoading(false)
    }
  }, [allNFTIds, loadingIds])

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Wallet Not Connected</h3>
              <p className="text-gray-600 mb-4">
                Please connect your wallet to view your NFTs
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
          <p className="text-gray-600">Loading your NFTs...</p>
        </div>
      </div>
    )
  }

  // Filter NFTs owned by the current user
  const ownedNFTs = nfts.filter(nftId => {
    // This will be filtered in the NFTCard component
    return true
  })

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My NFT Collection</h1>
        <p className="text-gray-600">
          Manage your gaming license NFTs and list them for sale
        </p>
      </div>

      {nfts.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No NFTs Found</h3>
          <p className="text-gray-600">
            You don't own any gaming license NFTs yet. Visit the marketplace to mint some!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {nfts.map((nftId) => (
            <NFTCard key={nftId} nftId={nftId} />
          ))}
        </div>
      )}
    </div>
  )
}