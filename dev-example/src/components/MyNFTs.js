"use client";
import { useState, useEffect, useRef } from 'react'
import { useAccount } from 'wagmi'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'
import { useContract } from '../hooks/useContract'
import { useTransactions, useTransactionWatcher } from '../hooks/useTransactions'
import { formatEther, parseEther, shortenAddress } from '../lib/utils'
import { CONTRACT_ADDRESSES } from '../lib/contracts'
import { Loader2, Package, Tag, ExternalLink, AlertCircle } from 'lucide-react'

export default function MyNFTs() {
  const { address, isConnected } = useAccount()
  const { 
    useGetAllNFTIds, 
    useGetNFTDetails,
    useGetLicenseFromID,
    useApprove,
    useCreateOffer
  } = useContract()
  const { addTransaction } = useTransactions()

  // Core state
  const [nfts, setNfts] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedNFT, setSelectedNFT] = useState(null)
  const [listingPrice, setListingPrice] = useState('')
  const [licenseData, setLicenseData] = useState(null)
  
  // Process state
  const [processStatus, setProcessStatus] = useState('idle') // idle, approving, creating-offer
  const [currentTxHash, setCurrentTxHash] = useState(null)
  
  // Refs to prevent infinite loops
  const processedNFTs = useRef(new Set())
  const isProcessingRef = useRef(false)

  const { data: allNFTIds, isLoading: loadingIds, refetch: refetchNFTIds } = useGetAllNFTIds()
  const { approve } = useApprove()
  const { createOffer } = useCreateOffer()

  // Load NFTs once
  useEffect(() => {
    if (allNFTIds?.length > 0) {
      setNfts(allNFTIds.map(id => id.toString()))
      setLoading(false)
    } else if (!loadingIds) {
      setLoading(false)
    }
  }, [allNFTIds, loadingIds])

  // Transaction watcher - simplified
  useTransactionWatcher(
    currentTxHash,
    () => {
      // Success
      console.log('✅ Transaction successful:', currentTxHash)
      setProcessStatus('idle')
      setCurrentTxHash(null)
      setDialogOpen(false)
      setSelectedNFT(null)
      setLicenseData(null)
      setListingPrice('')
      isProcessingRef.current = false
      setTimeout(() => refetchNFTIds(), 3000)
    },
    () => {
      // Error
      console.error('❌ Transaction failed:', currentTxHash)
      setProcessStatus('idle')
      setCurrentTxHash(null)
      isProcessingRef.current = false
    }
  )

  const NFTCard = ({ nftId }) => {
    const { data: nftDetails } = useGetNFTDetails(nftId)
    const [metadata, setMetadata] = useState(null)
    const [extractedLicenseId, setExtractedLicenseId] = useState(null)
    const metadataLoaded = useRef(false)

    // Load metadata once when nftDetails is available
    useEffect(() => {
      if (nftDetails?.uri && !metadataLoaded.current) {
        metadataLoaded.current = true
        loadMetadata(nftDetails.uri)
      }
    }, [nftDetails?.uri])

    const loadMetadata = async (uri) => {
      try {
        let metadata = null
        
        if (uri.startsWith('data:application/json;base64,')) {
          const base64Data = uri.split(',')[1]
          const decodedData = atob(base64Data)
          metadata = JSON.parse(decodedData)
        } else if (uri.startsWith('http') || uri.startsWith('ipfs://')) {
          const fetchUrl = uri.startsWith('ipfs://') 
            ? `https://ipfs.io/ipfs/${uri.replace('ipfs://', '')}`
            : uri
          const response = await fetch(fetchUrl)
          metadata = await response.json()
        }

        if (metadata) {
          // Fix IPFS image URLs
          if (metadata.image && metadata.image.startsWith('ipfs://')) {
            metadata.image = `https://ipfs.io/ipfs/${metadata.image.replace('ipfs://', '')}`
          }
          
          setMetadata(metadata)
          
          // Extract license ID from metadata
          let licenseId = null
          if (metadata.attributes) {
            const licenseAttr = metadata.attributes.find(attr => 
              attr.trait_type === 'License ID' || attr.trait_type === 'License Id'
            )
            licenseId = licenseAttr?.value
          }
          
          setExtractedLicenseId(licenseId || nftId)
          console.log('📋 NFT metadata loaded:', metadata.name, 'License ID:', licenseId || nftId)
        }
      } catch (error) {
        console.error('Error loading metadata:', error)
        setMetadata({
          name: `Gaming License #${nftId}`,
          description: "Gaming license NFT",
          image: null
        })
        setExtractedLicenseId(nftId)
      }
    }

    const handleListForSale = () => {
      if (!extractedLicenseId || isProcessingRef.current) return
      
      setSelectedNFT({
        id: nftId,
        ...nftDetails,
        metadata,
        licenseId: extractedLicenseId
      })
      setDialogOpen(true)
    }

    if (!nftDetails || nftDetails.owner?.toLowerCase() !== address?.toLowerCase()) {
      return null
    }

    const isProcessing = processStatus !== 'idle'

    return (
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="h-48 bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center relative">
          {metadata?.image ? (
            <img 
              src={metadata.image} 
              alt={metadata.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
          ) : (
            <div className="text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Gaming License</p>
            </div>
          )}
          
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
            {extractedLicenseId && (
              <div className="flex items-center justify-between mt-2">
                <span className="text-gray-500">License ID</span>
                <span className="font-medium">#{extractedLicenseId}</span>
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
            onClick={handleListForSale}
            disabled={isProcessing || !extractedLicenseId}
            className="flex-1"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : !extractedLicenseId ? (
              <>
                <AlertCircle className="mr-2 h-4 w-4" />
                No License ID
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

  // License data fetcher component - simplified
  const LicenseDataFetcher = ({ licenseId }) => {
    const { data: fetchedLicenseData, isLoading, error } = useGetLicenseFromID(licenseId)
    const hasProcessed = useRef(false)
    
    useEffect(() => {
      if (fetchedLicenseData && !isLoading && !hasProcessed.current) {
        hasProcessed.current = true
        console.log('✅ License data fetched:', fetchedLicenseData.name)
        setLicenseData(fetchedLicenseData)
      } else if (error && !hasProcessed.current) {
        hasProcessed.current = true
        console.error('❌ License fetch error:', error)
        alert('Failed to fetch license data')
        setDialogOpen(false)
      }
    }, [fetchedLicenseData, isLoading, error])

    if (isLoading) {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <p className="text-blue-800 text-sm">Fetching license data...</p>
          </div>
        </div>
      )
    }

    return null
  }

  // Handle listing process
  const handleListNFT = async () => {
    if (!selectedNFT || !licenseData || !listingPrice || isProcessingRef.current) return

    try {
      isProcessingRef.current = true
      setProcessStatus('approving')

      console.log('🚀 Starting approval:', {
        licenseContract: licenseData.contractAddress,
        marketplace: CONTRACT_ADDRESSES.SECONDARY_MARKETPLACE,
        tokenId: selectedNFT.id
      })

      const approveTxHash = await approve(
        licenseData.contractAddress,
        CONTRACT_ADDRESSES.SECONDARY_MARKETPLACE,
        selectedNFT.id
      )

      console.log('✅ Approval submitted:', approveTxHash)
      setCurrentTxHash(approveTxHash)

      addTransaction(
        approveTxHash,
        `Approving NFT #${selectedNFT.id} for listing`,
        'approve-nft'
      )

      // Wait then create offer
      setTimeout(async () => {
        try {
          setProcessStatus('creating-offer')
          
          const offerTxHash = await createOffer(
            selectedNFT.id,
            licenseData.contractAddress,
            parseEther(listingPrice)
          )

          console.log('✅ Offer created:', offerTxHash)
          setCurrentTxHash(offerTxHash)

          addTransaction(
            offerTxHash,
            `Creating offer for NFT #${selectedNFT.id} at ${listingPrice} ETH`,
            'create-offer'
          )
        } catch (error) {
          console.error('❌ Offer creation failed:', error)
          setProcessStatus('idle')
          isProcessingRef.current = false
          alert(`Error creating offer: ${error.message}`)
        }
      }, 8000) // Wait 8 seconds for approval

    } catch (error) {
      console.error('❌ Approval failed:', error)
      setProcessStatus('idle')
      isProcessingRef.current = false
      alert(`Error approving NFT: ${error.message}`)
    }
  }

  // Close dialog
  const closeDialog = () => {
    if (processStatus === 'idle') {
      setDialogOpen(false)
      setSelectedNFT(null)
      setLicenseData(null)
      setListingPrice('')
    }
  }

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
          <Button onClick={refetchNFTIds} variant="outline" size="sm">
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
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>List NFT for Sale</DialogTitle>
            <DialogDescription>
              Set a price for your NFT on the secondary marketplace
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedNFT && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium">{selectedNFT.metadata?.name}</h4>
                <p className="text-sm text-gray-600">{selectedNFT.metadata?.description}</p>
                <p className="text-xs text-gray-500 mt-2">Token ID: #{selectedNFT.id}</p>
                <p className="text-xs text-gray-500">License ID: #{selectedNFT.licenseId}</p>
              </div>
            )}

            {/* License Data Fetcher */}
            {selectedNFT && !licenseData && (
              <LicenseDataFetcher licenseId={selectedNFT.licenseId} />
            )}

            {/* License Data Display */}
            {licenseData && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-green-800 text-sm font-medium">✅ License Contract Ready</p>
                <p className="text-green-600 text-xs">Contract: {shortenAddress(licenseData.contractAddress)}</p>
                <p className="text-green-600 text-xs">License: {licenseData.name} ({licenseData.symbol})</p>
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
                disabled={processStatus !== 'idle' || !licenseData}
              />
            </div>

            {/* Process Status */}
            {processStatus !== 'idle' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <p className="text-blue-800 text-sm">
                    {processStatus === 'approving' ? 'Approving NFT...' : 'Creating Offer...'}
                  </p>
                </div>
                {currentTxHash && (
                  <a 
                    href={`https://sepolia.etherscan.io/tx/${currentTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-700 text-xs underline block mt-2"
                  >
                    View on Etherscan
                  </a>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={processStatus !== 'idle'}>
              Cancel
            </Button>
            <Button 
              onClick={handleListNFT}
              disabled={!listingPrice || !licenseData || processStatus !== 'idle'}
            >
              {processStatus !== 'idle' ? (
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