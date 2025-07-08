"use client";
import { useState, useEffect, useRef } from 'react'
import { useAccount, useWaitForTransactionReceipt } from 'wagmi'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'
import { useContract } from '../hooks/useContract'
import { useTransactions } from '../hooks/useTransactions'
import { formatEther, parseEther, shortenAddress } from '../lib/utils'
import { CONTRACT_ADDRESSES } from '../lib/contracts'
import { Loader2, Package, Tag, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react'

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
  
  // Dialog state - simplified
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

  // Manual transaction checking with intervals
  const pollIntervalRef = useRef(null)
  const lastTxHashRef = useRef(null)

  const { data: allNFTIds, isLoading: loadingIds, refetch: refetchNFTIds } = useGetAllNFTIds()
  const { approve } = useApprove()
  const { createOffer } = useCreateOffer()

  // Use wagmi's useWaitForTransactionReceipt but with manual control
  const { 
    data: txReceipt, 
    isLoading: isTxPending, 
    isSuccess: isTxSuccess, 
    isError: isTxError 
  } = useWaitForTransactionReceipt({
    hash: dialogState.txHash,
    query: {
      enabled: !!dialogState.txHash && dialogState.isWaitingForTx,
      refetchInterval: 3000, // Poll every 3 seconds
      retry: 3
    }
  })

  // Load NFTs - simplified
  useEffect(() => {
    if (allNFTIds?.length > 0) {
      setNfts(allNFTIds.map(id => id.toString()))
      setLoading(false)
    } else if (!loadingIds) {
      setLoading(false)
    }
  }, [allNFTIds, loadingIds])

  // Handle transaction status changes - simplified with single effect
  useEffect(() => {
    if (!dialogState.txHash || !dialogState.isWaitingForTx) return

    if (isTxSuccess && txReceipt) {
      console.log('✅ Transaction successful:', dialogState.txHash)
      handleTransactionSuccess()
    } else if (isTxError) {
      console.error('❌ Transaction failed:', dialogState.txHash)
      handleTransactionError()
    }
  }, [isTxSuccess, isTxError, txReceipt, dialogState.txHash, dialogState.isWaitingForTx])

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
    const metadataLoaded = useRef(false)

    // Load metadata once - simplified
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
          if (metadata.image && metadata.image.startsWith('ipfs://')) {
            metadata.image = `https://ipfs.io/ipfs/${metadata.image.replace('ipfs://', '')}`
          }
          
          setMetadata(metadata)
          
          // Extract license ID
          let licenseId = null
          if (metadata.attributes) {
            const licenseAttr = metadata.attributes.find(attr => 
              attr.trait_type === 'License ID' || attr.trait_type === 'License Id'
            )
            licenseId = licenseAttr?.value
          }
          
          setExtractedLicenseId(licenseId || nftId)
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

  // Fetch license data when needed
  const { data: fetchedLicenseData, isLoading: loadingLicenseData } = useGetLicenseFromID(
    dialogState.selectedNFT?.licenseId
  )

  // Update license data when fetched - simplified
  useEffect(() => {
    if (fetchedLicenseData && dialogState.step === 'setup' && !dialogState.licenseData) {
      setDialogState(prev => ({
        ...prev,
        licenseData: fetchedLicenseData,
        error: null
      }))
    }
  }, [fetchedLicenseData, dialogState.step, dialogState.licenseData])

  // Handle approval step
  const handleApprove = async () => {
    if (!dialogState.selectedNFT || !dialogState.licenseData || dialogState.isWaitingForTx) return

    try {
      setDialogState(prev => ({
        ...prev,
        step: 'approve',
        error: null
      }))

      const approveTxHash = await approve(
        dialogState.licenseData.contractAddress,
        CONTRACT_ADDRESSES.SECONDARY_MARKETPLACE,
        dialogState.selectedNFT.id
      )

      setDialogState(prev => ({
        ...prev,
        txHash: approveTxHash,
        isWaitingForTx: true
      }))

      addTransaction(
        approveTxHash,
        `Approving NFT #${dialogState.selectedNFT.id} for listing`,
        'approve-nft'
      )

    } catch (error) {
      console.error('Approval failed:', error)
      setDialogState(prev => ({
        ...prev,
        step: 'setup',
        error: error.message.includes('User rejected') ? 'Transaction cancelled by user' : `Approval failed: ${error.message}`
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
    // Clear any polling intervals
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }

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
                <p className="text-xs text-gray-500">License ID: #{selectedNFT.licenseId}</p>
              </div>
            )}

            {loadingLicenseData && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <p className="text-blue-800 text-sm">Fetching license data...</p>
                </div>
              </div>
            )}

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
                value={price}
                onChange={(e) => setDialogState(prev => ({ ...prev, price: e.target.value }))}
                placeholder="Enter price in ETH"
                disabled={!licenseData}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button 
              onClick={handleApprove}
              disabled={!price || !licenseData || parseFloat(price) <= 0}
            >
              Start Listing Process
            </Button>
          </DialogFooter>
        </>
      )
    }

    if (step === 'approve') {
      return (
        <>
          <DialogHeader>
            <DialogTitle>Step 1: Approve NFT</DialogTitle>
            <DialogDescription>
              Approving the marketplace to transfer your NFT
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <div>
                  <p className="text-blue-800 text-sm font-medium">
                    {isWaitingForTx ? 'Waiting for approval confirmation...' : 'Processing approval...'}
                  </p>
                  {isTxPending && <p className="text-blue-600 text-xs">Transaction is being processed on blockchain</p>}
                </div>
              </div>
              {txHash && (
                <a 
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 text-xs underline block mt-2"
                >
                  View on Etherscan
                </a>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isWaitingForTx}>
              Cancel
            </Button>
          </DialogFooter>
        </>
      )
    }

    if (step === 'create-offer') {
      return (
        <>
          <DialogHeader>
            <DialogTitle>Step 2: Create Offer</DialogTitle>
            <DialogDescription>
              Creating your listing on the marketplace
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-800 text-sm">✅ NFT Approved Successfully</p>
            </div>

            {isWaitingForTx && txHash ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <div>
                    <p className="text-blue-800 text-sm font-medium">Creating marketplace offer...</p>
                    {isTxPending && <p className="text-blue-600 text-xs">Transaction is being processed on blockchain</p>}
                  </div>
                </div>
                <a 
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 text-xs underline block mt-2"
                >
                  View on Etherscan
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium">Ready to create offer</h4>
                  <p className="text-sm text-gray-600">Price: {price} ETH</p>
                  <p className="text-xs text-gray-500">NFT: #{selectedNFT?.id}</p>
                </div>
                
                <Button onClick={handleCreateOffer} className="w-full" disabled={isWaitingForTx}>
                  Create Marketplace Offer
                </Button>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">{error}</p>
                <Button onClick={handleCreateOffer} className="mt-2" size="sm">
                  Try Again
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isWaitingForTx}>
              Cancel
            </Button>
          </DialogFooter>
        </>
      )
    }

    if (step === 'complete') {
      return (
        <>
          <DialogHeader>
            <DialogTitle>Listing Complete!</DialogTitle>
            <DialogDescription>
              Your NFT has been successfully listed for sale
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-green-800 text-sm font-medium">NFT Listed Successfully!</p>
              <p className="text-green-600 text-xs">Your NFT is now available on the marketplace</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium">{selectedNFT?.metadata?.name}</h4>
              <p className="text-sm text-gray-600">Price: {price} ETH</p>
              <p className="text-xs text-gray-500">Token ID: #{selectedNFT?.id}</p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={closeDialog} className="w-full">
              Close
            </Button>
          </DialogFooter>
        </>
      )
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

      {/* Single Listing Dialog */}
      <Dialog open={dialogState.open} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-md">
          {renderDialogContent()}
        </DialogContent>
      </Dialog>
    </div>
  )
}