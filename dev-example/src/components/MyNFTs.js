"use client";
import { useState, useEffect, useRef } from 'react'
import { useAccount } from 'wagmi'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'
import { useContract } from '../hooks/useContract'
import { useSimpleTransactions, useSimpleTransactionWatcher } from '../hooks/useSimpleTransactionWatcher'
import { shortenAddress, formatEther, parseEther } from '../lib/utils'
import { MetadataUtils } from '../lib/metadataUtils'
import { Package, Loader2, ExternalLink, AlertCircle, CheckCircle, DollarSign } from 'lucide-react'

export default function MyNFTs() {
  const { address, isConnected } = useAccount()
  const { 
    useGetAllNFTIds, 
    useGetNFTDetails, 
    useGetLicenseFromID,
    useGetLicenseURI,
    useCreateOffer,
    useApprove,
    useGetApproved
  } = useContract()
  const { addTransaction, updateTransaction } = useSimpleTransactions()
  
  const [nfts, setNfts] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogState, setDialogState] = useState({
    open: false,
    step: 'setup', // 'setup', 'approve', 'create-offer', 'complete'
    selectedNFT: null,
    licenseData: null,
    price: '',
    txHash: null,
    error: null,
    isWaitingForTx: false
  })
  
  const { data: allNFTIds, isLoading: loadingIds, refetch: refetchNFTIds } = useGetAllNFTIds()
  const { createOffer } = useCreateOffer()
  const { approve } = useApprove()

  // Simple transaction watcher for dialog transactions
  useSimpleTransactionWatcher(
    dialogState.txHash,
    (receipt) => {
      console.log('✅ Transaction successful:', dialogState.txHash)
      updateTransaction(dialogState.txHash, { status: 'success', receipt })
      handleTransactionSuccess()
    },
    (error) => {
      console.error('❌ Transaction failed:', dialogState.txHash, error)
      updateTransaction(dialogState.txHash, { status: 'error', error: error.message })
      handleTransactionError()
    }
  )

  // Load NFTs - simplified
  useEffect(() => {
    if (allNFTIds?.length > 0) {
      setNfts(allNFTIds.map(id => id.toString()))
      setLoading(false)
    } else if (!loadingIds) {
      setLoading(false)
    }
  }, [allNFTIds, loadingIds])

  const handleTransactionSuccess = () => {
    if (dialogState.step === 'approve') {
      // Approval successful, move to create offer step
      setDialogState(prev => ({
        ...prev,
        step: 'create-offer',
        txHash: null,
        error: null,
        isWaitingForTx: false
      }))
    } else if (dialogState.step === 'create-offer') {
      // Offer creation successful, complete the process
      setDialogState(prev => ({
        ...prev,
        step: 'complete',
        txHash: null,
        error: null,
        isWaitingForTx: false
      }))
      // Refresh data after completion
      setTimeout(() => {
        refetchNFTIds()
      }, 1000)
    }
  }

  const handleTransactionError = () => {
    setDialogState(prev => ({
      ...prev,
      error: 'Transaction failed. Please try again.',
      txHash: null,
      isWaitingForTx: false,
      step: prev.step === 'approve' ? 'setup' : 'create-offer'
    }))
  }

  const NFTCard = ({ nftId }) => {
    const { data: nftDetails } = useGetNFTDetails(nftId)
    const [metadata, setMetadata] = useState(null)
    const [extractedLicenseId, setExtractedLicenseId] = useState(null)
    const [loadingMetadata, setLoadingMetadata] = useState(false)
    const metadataLoaded = useRef(false)

    // Enhanced metadata loading with better URI handling
    useEffect(() => {
      if (nftDetails?.uri && !metadataLoaded.current) {
        metadataLoaded.current = true
        loadMetadata(nftDetails.uri)
      }
    }, [nftDetails?.uri])

    const loadMetadata = async (uri) => {
      if (!uri || loadingMetadata) return
      
      setLoadingMetadata(true)
      
      try {
        console.log('🔍 Loading NFT metadata from URI:', uri)
        
        const fetchedMetadata = await MetadataUtils.fetchMetadata(uri)

        if (fetchedMetadata) {
          console.log('✅ NFT metadata loaded:', fetchedMetadata)
          setMetadata(fetchedMetadata)
          
          // Extract license ID from metadata attributes
          const licenseId = MetadataUtils.extractLicenseId(fetchedMetadata, nftId)
          setExtractedLicenseId(licenseId)
        }
      } catch (error) {
        console.error('❌ Error loading NFT metadata:', error)
        
        // Create fallback metadata
        const fallbackMetadata = MetadataUtils.createFallbackMetadata(
          `Gaming License #${nftId}`,
          "Gaming license NFT",
          nftId
        )
        
        setMetadata(fallbackMetadata)
        setExtractedLicenseId(nftId)
      } finally {
        setLoadingMetadata(false)
      }
    }

    const handleListForSale = () => {
      if (!extractedLicenseId || dialogState.open) return
      
      setDialogState({
        open: true,
        step: 'setup',
        selectedNFT: {
          id: nftId,
          ...nftDetails,
          metadata,
          licenseId: extractedLicenseId
        },
        licenseData: null,
        price: '',
        txHash: null,
        error: null,
        isWaitingForTx: false
      })
    }

    if (!nftDetails || nftDetails.owner?.toLowerCase() !== address?.toLowerCase()) {
      return null
    }

    const isProcessing = dialogState.open && dialogState.selectedNFT?.id === nftId && dialogState.isWaitingForTx

    return (
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="h-48 bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center relative">
          {metadata?.image ? (
            <img 
              src={metadata.image} 
              alt={metadata.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                console.log('🖼️ NFT Image failed to load:', metadata.image)
                
                // Try fallback gateways for images
                const currentSrc = e.target.src
                const allGateways = MetadataUtils.getIPFSGateways()
                
                // Extract IPFS hash from current URL
                const hashMatch = currentSrc.match(/\/ipfs\/([^\/]+)/)
                if (hashMatch) {
                  const hash = hashMatch[1]
                  
                  // Find current gateway and try next one
                  let currentGatewayIndex = -1
                  for (let i = 0; i < allGateways.length; i++) {
                    if (currentSrc.includes(allGateways[i].replace('https://', '').replace('/ipfs', ''))) {
                      currentGatewayIndex = i
                      break
                    }
                  }
                  
                  const nextGatewayIndex = currentGatewayIndex + 1
                  if (nextGatewayIndex < allGateways.length) {
                    const fallbackUrl = `${allGateways[nextGatewayIndex]}/${hash}`
                    console.log('🔄 Trying fallback image gateway:', fallbackUrl)
                    e.target.src = fallbackUrl
                    return // Try the fallback
                  }
                }
                
                console.log('❌ All image gateways failed, hiding image')
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'flex'
              }}
            />
          ) : null}
          
          {/* Fallback display */}
          <div className={`text-center flex flex-col items-center justify-center ${metadata?.image ? 'hidden' : ''}`}>
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Gaming License</p>
          </div>
          
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium">
            #{nftId}
          </div>
          
          {loadingMetadata && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
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
              'Loading...'
            ) : (
              <>
                <DollarSign className="mr-2 h-4 w-4" />
                List for Sale
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // Dialog component for listing NFT
  const ListingDialog = () => {
    const { data: licenseData } = useGetLicenseFromID(dialogState.selectedNFT?.licenseId)
    const { data: approvedAddress } = useGetApproved(
      licenseData?.contractAddress, 
      dialogState.selectedNFT?.id
    )

    // Update license data when it loads
    useEffect(() => {
      if (licenseData && !dialogState.licenseData) {
        setDialogState(prev => ({
          ...prev,
          licenseData
        }))
      }
    }, [licenseData])

    // Check if approval is needed
    const needsApproval = approvedAddress?.toLowerCase() !== process.env.NEXT_PUBLIC_SECONDARY_MARKETPLACE_ADDRESS?.toLowerCase()

    // Handle approval step
    const handleApprove = async () => {
      if (!dialogState.selectedNFT || !dialogState.licenseData || dialogState.isWaitingForTx) return

      try {
        const approveTxHash = await approve(
          dialogState.licenseData.contractAddress,
          process.env.NEXT_PUBLIC_SECONDARY_MARKETPLACE_ADDRESS,
          dialogState.selectedNFT.id
        )

        setDialogState(prev => ({
          ...prev,
          step: 'approve',
          txHash: approveTxHash,
          error: null,
          isWaitingForTx: true
        }))

        addTransaction(
          approveTxHash,
          `Approving NFT #${dialogState.selectedNFT.id} for marketplace`,
          'approve'
        )

      } catch (error) {
        console.error('Approval failed:', error)
        setDialogState(prev => ({
          ...prev,
          error: error.message.includes('User rejected') ? 
            'Transaction cancelled by user' : `Approval failed: ${error.message}`
        }))
      }
    }

    // Handle create offer step
    const handleCreateOffer = async () => {
      if (!dialogState.selectedNFT || !dialogState.licenseData || !dialogState.price || dialogState.isWaitingForTx) return

      try {
        const offerTxHash = await createOffer(
          dialogState.selectedNFT.id,
          dialogState.licenseData.contractAddress,
          parseEther(dialogState.price)
        )

        setDialogState(prev => ({
          ...prev,
          step: 'create-offer',
          txHash: offerTxHash,
          error: null,
          isWaitingForTx: true
        }))

        addTransaction(
          offerTxHash,
          `Creating offer for NFT #${dialogState.selectedNFT.id} at ${dialogState.price} ETH`,
          'create-offer'
        )

      } catch (error) {
        console.error('Create offer failed:', error)
        setDialogState(prev => ({
          ...prev,
          error: error.message.includes('User rejected') ? 'Transaction cancelled by user' : `Create offer failed: ${error.message}`
        }))
      }
    }

    // Close dialog and reset state
    const closeDialog = () => {
      setDialogState({
        open: false,
        step: 'setup',
        selectedNFT: null,
        licenseData: null,
        price: '',
        txHash: null,
        error: null,
        isWaitingForTx: false
      })
    }

    // Render dialog content based on step
    const renderDialogContent = () => {
      const { step, selectedNFT, licenseData, price, txHash, error, isWaitingForTx } = dialogState

      if (step === 'setup') {
        return (
          <>
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
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="price">Sale Price (ETH)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.001"
                  min="0"
                  value={price}
                  onChange={(e) => setDialogState(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="0.0"
                  disabled={isWaitingForTx}
                />
              </div>
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-red-800 text-sm">{error}</span>
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button 
                onClick={needsApproval ? handleApprove : handleCreateOffer}
                disabled={!price || !licenseData || isWaitingForTx}
              >
                {needsApproval ? 'Approve & List' : 'List for Sale'}
              </Button>
            </DialogFooter>
          </>
        )
      }

      if (step === 'approve') {
        return (
          <>
            <DialogHeader>
              <DialogTitle>Approving NFT</DialogTitle>
              <DialogDescription>
                Waiting for approval transaction to be confirmed...
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <p className="text-sm text-gray-600">
                Please wait while your approval transaction is being processed.
              </p>
              {txHash && (
                <p className="text-xs text-gray-500">
                  TX: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                </p>
              )}
            </div>
          </>
        )
      }

      if (step === 'create-offer') {
        return (
          <>
            <DialogHeader>
              <DialogTitle>Creating Offer</DialogTitle>
              <DialogDescription>
                Waiting for offer creation transaction to be confirmed...
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <p className="text-sm text-gray-600">
                Creating your marketplace offer for {price} ETH.
              </p>
              {txHash && (
                <p className="text-xs text-gray-500">
                  TX: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                </p>
              )}
            </div>
          </>
        )
      }

      if (step === 'complete') {
        return (
          <>
            <DialogHeader>
              <DialogTitle>NFT Listed Successfully!</DialogTitle>
              <DialogDescription>
                Your NFT is now available on the secondary marketplace
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
              <div>
                <p className="font-medium">NFT #{selectedNFT.id} is now listed for sale</p>
                <p className="text-sm text-gray-600">Price: {price} ETH</p>
              </div>
            </div>
            
            <DialogFooter>
              <Button onClick={closeDialog} className="w-full">Close</Button>
            </DialogFooter>
          </>
        )
      }
    }

    return (
      <Dialog open={dialogState.open} onOpenChange={closeDialog}>
        <DialogContent className="max-w-md">
          {renderDialogContent()}
        </DialogContent>
      </Dialog>
    )
  }

  if (!isConnected) {
    return (
      <div className="text-center py-8">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Your Wallet</h3>
        <p className="text-gray-500">Please connect your wallet to view your NFTs.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading your NFTs...</p>
        </div>
      </div>
    )
  }

  if (nfts.length === 0) {
    return (
      <div className="text-center py-8">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No NFTs Found</h3>
        <p className="text-gray-500">You don't own any gaming license NFTs yet. Visit the marketplace to mint some!</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">My Gaming Licenses</h2>
        <p className="text-gray-600">Manage and trade your gaming license NFTs</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {nfts.map((nftId) => (
          <NFTCard key={nftId} nftId={nftId} />
        ))}
      </div>

      <ListingDialog />
    </div>
  )
}