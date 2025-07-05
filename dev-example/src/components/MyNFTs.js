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
import { Loader2, Package, Tag, ExternalLink, AlertCircle, CheckCircle, X } from 'lucide-react'

export default function MyNFTs() {
  const { address, isConnected } = useAccount()
  const { 
    useGetAllNFTIds, 
    useGetNFTDetails,
    useApprove,
    useCreateOffer
  } = useContract()
  const { addTransaction } = useTransactions()

  const [nfts, setNfts] = useState([])
  const [loading, setLoading] = useState(true)
  const [listingNFT, setListingNFT] = useState(null)
  const [listingPrice, setListingPrice] = useState('')
  const [approvingNFT, setApprovingNFT] = useState(null)
  const [currentApprovalTx, setCurrentApprovalTx] = useState(null)
  const [currentOfferTx, setCurrentOfferTx] = useState(null)
  const [showListingDialog, setShowListingDialog] = useState(false)

  const { data: allNFTIds, isLoading: loadingIds, refetch: refetchNFTIds } = useGetAllNFTIds()
  const { approve, isPending: isApprovePending } = useApprove()
  const { createOffer, isPending: isOfferPending } = useCreateOffer()

  useTransactionWatcher(
    currentApprovalTx,
    (receipt) => {
      console.log('✅ NFT approval successful!', {
        transactionHash: currentApprovalTx,
        receipt: receipt
      })
      setApprovingNFT(null)
      setCurrentApprovalTx(null)
      
      // After approval, create the offer
      if (listingNFT && listingPrice) {
        handleCreateOffer()
      }
    },
    () => {
      console.error('💥 NFT approval failed:', currentApprovalTx)
      setApprovingNFT(null)
      setCurrentApprovalTx(null)
      setListingNFT(null)
    }
  )

  useTransactionWatcher(
    currentOfferTx,
    (receipt) => {
      console.log('✅ Offer created successfully!', {
        transactionHash: currentOfferTx,
        receipt: receipt
      })
      setCurrentOfferTx(null)
      setListingNFT(null)
      setListingPrice('')
      setShowListingDialog(false)
      
      // Refresh NFT data
      setTimeout(() => {
        refetchNFTIds()
      }, 2000)
    },
    () => {
      console.error('💥 Offer creation failed:', currentOfferTx)
      setCurrentOfferTx(null)
      setListingNFT(null)
    }
  )

  const NFTCard = ({ nftId }) => {
    const { data: nftDetails, isLoading, refetch } = useGetNFTDetails(nftId)
    const [metadata, setMetadata] = useState(null)
    const [loadingMetadata, setLoadingMetadata] = useState(false)
    
    useEffect(() => {
      if (nftDetails && nftDetails.uri) {
        loadMetadata(nftDetails.uri)
      }
    }, [nftDetails])

    const loadMetadata = async (uri) => {
      try {
        setLoadingMetadata(true)
        console.log('📋 Loading NFT metadata:', uri)
        
        if (uri.startsWith('data:application/json;base64,')) {
          // Handle base64 encoded metadata
          const base64Data = uri.split(',')[1]
          const decodedData = atob(base64Data)
          const metadata = JSON.parse(decodedData)
          setMetadata(metadata)
          console.log('✅ Metadata loaded from base64:', metadata)
        } else if (uri.startsWith('http')) {
          // Handle HTTP/IPFS URLs
          const response = await fetch(uri)
          const metadata = await response.json()
          setMetadata(metadata)
          console.log('✅ Metadata loaded from URL:', metadata)
        } else {
          // Fallback for other URI formats
          setMetadata({
            name: `Gaming License #${nftId}`,
            description: "Gaming license NFT",
            image: null
          })
        }
      } catch (error) {
        console.error('💥 Error loading metadata:', error)
        setMetadata({
          name: `Gaming License #${nftId}`,
          description: "Gaming license NFT",
          image: null
        })
      } finally {
        setLoadingMetadata(false)
      }
    }

    if (isLoading || loadingMetadata) {
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
      return null // Don't show NFTs not owned by current user
    }

    return (
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="h-48 bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center relative">
          {metadata?.image ? (
            <img 
              src={metadata.image} 
              alt={metadata.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Gaming License</p>
            </div>
          )}
          
          {/* NFT ID Badge */}
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium">
            #{nftId}
          </div>
        </div>
        
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="truncate">{metadata?.name || `License #${nftId}`}</span>
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
              Owned
            </span>
          </CardTitle>
          <CardDescription>
            {metadata?.description || "Gaming license NFT that you own"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Owner</span>
              <span className="font-medium">{shortenAddress(nftDetails.owner)}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-gray-500">Token ID</span>
              <span className="font-medium">#{nftId}</span>
            </div>
            {nftDetails.uri && (
              <div className="flex items-center justify-between mt-2">
                <span className="text-gray-500">Metadata</span>
                <span className="font-medium text-xs">Available</span>
              </div>
            )}
          </div>

          {metadata?.attributes && (
            <div className="border-t pt-3">
              <p className="text-sm text-gray-500 mb-2">Attributes</p>
              <div className="space-y-1">
                {metadata.attributes.slice(0, 3).map((attr, index) => (
                  <div key={index} className="flex justify-between text-xs">
                    <span className="text-gray-500">{attr.trait_type}</span>
                    <span className="font-medium">{attr.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="space-x-2">
          <Button 
            onClick={() => handleStartListing(nftId, nftDetails, metadata)}
            disabled={approvingNFT === nftId || currentApprovalTx || currentOfferTx || isApprovePending || isOfferPending}
            className="flex-1"
          >
            {(approvingNFT === nftId || isApprovePending || isOfferPending) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Tag className="mr-2 h-4 w-4" />
                List for Sale
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => window.open(`https://sepolia.etherscan.io/tx/${nftId}`, '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    )
  }

  const handleStartListing = (nftId, nftDetails, metadata) => {
    console.log('🏷️ Starting listing process for NFT:', nftId)
    setListingNFT({ 
      id: nftId, 
      ...nftDetails, 
      metadata,
      licenseAddress: CONTRACT_ADDRESSES.PRIMARY_MARKETPLACE // This should be the actual license contract
    })
    setListingPrice('')
    setShowListingDialog(true)
  }

  const handleListNFT = async () => {
    if (!isConnected || !listingPrice || !listingNFT) return

    try {
      console.log('🚀 Starting NFT listing process:', {
        nftId: listingNFT.id,
        price: listingPrice,
        licenseAddress: listingNFT.licenseAddress
      })

      setApprovingNFT(listingNFT.id)

      // First approve the secondary marketplace to transfer the NFT
      const approveTxHash = await approve(
        listingNFT.licenseAddress,
        CONTRACT_ADDRESSES.SECONDARY_MARKETPLACE,
        listingNFT.id
      )

      console.log('📝 Approval transaction submitted successfully:', approveTxHash)
      console.log('🔗 View on Etherscan:', `https://sepolia.etherscan.io/tx/${approveTxHash}`)
      
      setCurrentApprovalTx(approveTxHash)

      addTransaction(
        approveTxHash,
        `Approving NFT #${listingNFT.id} for listing`,
        'approve-nft'
      )

    } catch (error) {
      console.error('💥 Error approving NFT:', {
        nftId: listingNFT.id,
        error: error.message,
        stack: error.stack
      })
      
      setApprovingNFT(null)
      setListingNFT(null)
      setShowListingDialog(false)
      
      // Show user-friendly error message
      if (error.message.includes('User rejected') || error.message.includes('user rejected')) {
        alert('Transaction was cancelled by user')
      } else if (error.message.includes('insufficient funds')) {
        alert('Insufficient funds for transaction')
      } else {
        alert(`Error approving NFT: ${error.message}`)
      }
    }
  }

  const handleCreateOffer = async () => {
    if (!listingNFT || !listingPrice) return

    try {
      console.log('🏪 Creating marketplace offer:', {
        nftId: listingNFT.id,
        price: listingPrice,
        priceWei: parseEther(listingPrice)
      })

      const offerTxHash = await createOffer(
        listingNFT.id,
        listingNFT.licenseAddress,
        parseEther(listingPrice)
      )

      console.log('📝 Offer creation transaction submitted successfully:', offerTxHash)
      console.log('🔗 View on Etherscan:', `https://sepolia.etherscan.io/tx/${offerTxHash}`)
      
      setCurrentOfferTx(offerTxHash)

      addTransaction(
        offerTxHash,
        `Creating offer for NFT #${listingNFT.id} at ${listingPrice} ETH`,
        'create-offer'
      )

    } catch (error) {
      console.error('💥 Error creating offer:', {
        nftId: listingNFT.id,
        error: error.message,
        stack: error.stack
      })
      
      setListingNFT(null)
      setShowListingDialog(false)
      
      if (error.message.includes('User rejected') || error.message.includes('user rejected')) {
        alert('Transaction was cancelled by user')
      } else {
        alert(`Error creating offer: ${error.message}`)
      }
    }
  }

  useEffect(() => {
    console.log('📊 NFT IDs data updated:', allNFTIds)
    
    if (allNFTIds && allNFTIds.length > 0) {
      const idStrings = allNFTIds.map(id => id.toString())
      setNfts(idStrings)
      setLoading(false)
      
      console.log('✅ Found NFTs:', idStrings)
    } else if (!loadingIds) {
      setLoading(false)
      console.log('ℹ️ No NFTs found')
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

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My NFT Collection</h1>
        <p className="text-gray-600">
          Manage your gaming license NFTs and list them for sale
        </p>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {nfts.length} NFT{nfts.length !== 1 ? 's' : ''} found
          </p>
          <Button 
            onClick={refetchNFTIds}
            variant="outline"
            size="sm"
          >
            Refresh
          </Button>
        </div>
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

      {/* Listing Dialog */}
      <Dialog open={showListingDialog} onOpenChange={setShowListingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>List NFT for Sale</DialogTitle>
            <DialogDescription>
              {listingNFT && (
                <>Set a price for {listingNFT.metadata?.name || `NFT #${listingNFT.id}`} on the secondary marketplace</>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {listingNFT?.metadata && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium">{listingNFT.metadata.name}</h4>
                <p className="text-sm text-gray-600">{listingNFT.metadata.description}</p>
                <p className="text-xs text-gray-500 mt-2">Token ID: #{listingNFT.id}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="price">Price (ETH)</Label>
              <Input
                id="price"
                type="number"
                step="0.001"
                min="0"
                value={listingPrice}
                onChange={(e) => setListingPrice(e.target.value)}
                placeholder="Enter price in ETH"
                disabled={approvingNFT || currentApprovalTx || currentOfferTx || isApprovePending || isOfferPending}
              />
              <p className="text-xs text-gray-500">
                This will create a listing on the secondary marketplace
              </p>
            </div>

            {/* Process Status */}
            {(approvingNFT || currentApprovalTx || isApprovePending) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <div>
                    <p className="text-blue-800 text-sm font-medium">Step 1: Approving NFT</p>
                    <p className="text-blue-600 text-xs">Allowing marketplace to transfer your NFT...</p>
                    {currentApprovalTx && (
                      <a 
                        href={`https://sepolia.etherscan.io/tx/${currentApprovalTx}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 text-xs underline"
                      >
                        View on Etherscan
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {(currentOfferTx || isOfferPending) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
                  <div>
                    <p className="text-yellow-800 text-sm font-medium">Step 2: Creating Listing</p>
                    <p className="text-yellow-600 text-xs">Publishing your NFT to the marketplace...</p>
                    {currentOfferTx && (
                      <a 
                        href={`https://sepolia.etherscan.io/tx/${currentOfferTx}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-yellow-700 text-xs underline"
                      >
                        View on Etherscan
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline"
              onClick={() => {
                setShowListingDialog(false)
                setListingNFT(null)
                setListingPrice('')
              }}
              disabled={approvingNFT || currentApprovalTx || currentOfferTx || isApprovePending || isOfferPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleListNFT}
              disabled={!listingPrice || approvingNFT || currentApprovalTx || currentOfferTx || isApprovePending || isOfferPending}
            >
              {(approvingNFT || currentApprovalTx || currentOfferTx || isApprovePending || isOfferPending) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'List NFT'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}