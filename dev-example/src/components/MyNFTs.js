"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'
import { useContract } from '../hooks/useContract'
import { shortenAddress, parseEther } from '../lib/utils'
import { MetadataUtils } from '../lib/metadataUtils'
import { Package, Loader2, AlertCircle, CheckCircle, DollarSign, Gamepad2 } from 'lucide-react'
import { CONTRACTS } from '@/lib/contracts';

export default function MyNFTs() {
  const { address, isConnected } = useAccount()
  const { 
    useGetAllNFTIds, 
    useGetNFTDetails, 
    useCreateOffer,
    useApprove,
    useGetApproved
  } = useContract()
  
  // Core state
  const [nfts, setNfts] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Dialog state - isolated to prevent flickering
  const [dialogState, setDialogState] = useState({
    open: false,
    selectedNFT: null,
    step: 'setup', // 'setup', 'approving', 'listing', 'complete'
    txHash: null,
    error: null
  })
  
  // Price state - separate to prevent dialog re-renders
  const [salePrice, setSalePrice] = useState('')
  
  // Refs for stability
  const processedNFTIds = useRef(new Set())
  
  const { data: allNFTIds, isLoading: loadingIds } = useGetAllNFTIds()
  const { createOffer } = useCreateOffer()
  const { approve } = useApprove()

  // Stable transaction checker
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

  // Load NFTs with stable logic
  useEffect(() => {
    if (loadingIds) return
    
    if (allNFTIds && allNFTIds.length > 0) {
      const idsString = allNFTIds.join(',')
      if (!processedNFTIds.current.has(idsString)) {
        processedNFTIds.current.add(idsString)
        console.log('🔄 Loading NFTs:', allNFTIds)
        setNfts(allNFTIds.map(id => id.toString()))
        setLoading(false)
      }
    } else {
      setNfts([])
      setLoading(false)
    }
  }, [allNFTIds, loadingIds])

  // Stable price input handler - completely isolated
  const handlePriceInput = useCallback((value) => {
    setSalePrice(value)
  }, [])

  // Stable dialog handlers
  const openDialog = useCallback((nftData) => {
    console.log('🔓 Opening dialog for NFT:', nftData)
    setDialogState({
      open: true,
      selectedNFT: nftData,
      step: 'setup',
      txHash: null,
      error: null
    })
    setSalePrice('')
  }, [])

  const closeDialog = useCallback(() => {
    console.log('🔒 Closing dialog')
    setDialogState({
      open: false,
      selectedNFT: null,
      step: 'setup',
      txHash: null,
      error: null
    })
    setSalePrice('')
  }, [])

  const updateDialogState = useCallback((updates) => {
    setDialogState(prev => ({ ...prev, ...updates }))
  }, [])

  const NFTCard = ({ nftId }) => {
    const { data: nftDetails, isLoading: loadingNFT } = useGetNFTDetails(nftId)
    
    // Simplified local state - no complex license fetching needed!
    const [nftState, setNftState] = useState({
      metadata: null,
      imageUrl: null,
      imageLoading: false,
      metadataLoaded: false
    })

    console.log(`🔍 [NFT-${nftId}] NFT Details:`, nftDetails)

    // Load metadata from the NFT URI (much simpler now!)
    useEffect(() => {
      if (nftDetails && nftDetails.uri && !nftState.metadataLoaded) {
        console.log(`📋 [NFT-${nftId}] Loading metadata from URI:`, nftDetails.uri)
        
        setNftState(prev => ({ ...prev, metadataLoaded: true }))
        
        MetadataUtils.fetchMetadataEnhanced(nftDetails.uri)
          .then(metadata => {
            console.log(`✅ [NFT-${nftId}] Metadata loaded:`, metadata)
            
            const normalized = MetadataUtils.normalizeImageUrls(metadata)
            setNftState(prev => ({ ...prev, metadata: normalized }))

            // Load image if available
            if (normalized?.imageUrl) {
              setNftState(prev => ({ ...prev, imageLoading: true }))
              
              const img = new Image()
              img.onload = () => {
                setNftState(prev => ({
                  ...prev,
                  imageUrl: normalized.imageUrl,
                  imageLoading: false
                }))
              }
              img.onerror = () => {
                if (normalized?.imageFallbackUrl) {
                  const fallbackImg = new Image()
                  fallbackImg.onload = () => {
                    setNftState(prev => ({
                      ...prev,
                      imageUrl: normalized.imageFallbackUrl,
                      imageLoading: false
                    }))
                  }
                  fallbackImg.onerror = () => {
                    setNftState(prev => ({ ...prev, imageLoading: false }))
                  }
                  fallbackImg.src = normalized.imageFallbackUrl
                } else {
                  setNftState(prev => ({ ...prev, imageLoading: false }))
                }
              }
              img.src = normalized.imageUrl
            }
          })
          .catch(error => {
            console.error(`💥 [NFT-${nftId}] Metadata fetch failed:`, error)
            setNftState(prev => ({
              ...prev,
              metadata: {
                name: `Gaming License #${nftId}`,
                description: "Gaming license NFT - metadata failed to load"
              }
            }))
          })
      }
    }, [nftDetails, nftId, nftState.metadataLoaded])

    const handleListForSale = useCallback(() => {
      if (!nftDetails || !nftDetails.licenseAddress) {
        console.warn(`🚫 [NFT-${nftId}] Cannot list: No license address`)
        return
      }
      
      // Create simplified NFT data using the licenseAddress directly from NFT details
      const nftData = {
        id: nftId,
        // Direct access to licenseAddress - no complex fetching needed!
        licenseAddress: nftDetails.licenseAddress,
        licenseId: nftDetails.licenseId.toString(),
        owner: nftDetails.owner,
        uri: nftDetails.uri,
        metadata: nftState.metadata
      }
      
      console.log(`🛒 [NFT-${nftId}] Preparing to list for sale:`, nftData)
      openDialog(nftData)
    }, [nftId, nftDetails, nftState.metadata, openDialog])

    // Don't render if not owned by user
    if (!nftDetails || nftDetails.owner?.toLowerCase() !== address?.toLowerCase()) {
      return null
    }

    // Show loading state
    if (loadingNFT || !nftDetails) {
      return (
        <Card className="overflow-hidden bg-white shadow-md border-2 border-gray-200">
          <div className="h-48 bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-xs text-blue-800">Loading NFT...</p>
            </div>
          </div>
          <CardContent className="p-4">
            <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
          </CardContent>
        </Card>
      )
    }

    // Check if we have a valid license address
    const hasValidLicenseAddress = nftDetails.licenseAddress && 
      nftDetails.licenseAddress !== '0x0000000000000000000000000000000000000000'

    return (
      <Card className="overflow-hidden hover:shadow-lg transition-shadow bg-white border-2 border-gray-200">
        {/* Image Section */}
        <div className="h-48 bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center relative overflow-hidden">
          {nftState.imageLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          ) : nftState.imageUrl ? (
            <img 
              src={nftState.imageUrl} 
              alt={nftState.metadata?.name || `NFT #${nftId}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                console.log(`❌ [NFT-${nftId}] Image display error`)
                e.target.style.display = 'none'
                setNftState(prev => ({ ...prev, imageUrl: null }))
              }}
            />
          ) : (
            <div className="text-center">
              <Gamepad2 className="h-12 w-12 text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-blue-800">Gaming NFT</p>
            </div>
          )}
          
          {/* Status indicator */}
          {!hasValidLicenseAddress && (
            <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
              No License
            </div>
          )}
        </div>

        {/* Content */}
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold text-gray-900 truncate">
            {nftState.metadata?.name || `Gaming License #${nftId}`}
          </CardTitle>
          <CardDescription className="text-sm text-gray-700">
            {nftState.metadata?.description || "Gaming license NFT"}
          </CardDescription>
        </CardHeader>

        <CardContent className="px-4 pb-2">
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Token ID:</span>
              <span className="font-mono font-bold text-gray-900">#{nftId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Owner:</span>
              <span className="font-mono text-gray-900">
                {shortenAddress(nftDetails.owner)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">License ID:</span>
              <span className="font-mono text-gray-900">#{nftDetails.licenseId.toString()}</span>
            </div>
            {hasValidLicenseAddress ? (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">License Contract:</span>
                <span className="font-mono text-gray-900">
                  {shortenAddress(nftDetails.licenseAddress)}
                </span>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mt-2">
                <p className="text-yellow-800 text-xs">
                  ⚠️ Invalid license address
                </p>
              </div>
            )}
          </div>
        </CardContent>

        {/* Footer */}
        <CardFooter className="px-4 pt-2 pb-4">
          <Button 
            onClick={handleListForSale}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
            disabled={!hasValidLicenseAddress}
          >
            <DollarSign className="mr-2 h-4 w-4" />
            {hasValidLicenseAddress ? 'List for Sale' : 'Invalid License'}
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // Memoized dialog data to prevent re-renders
  const dialogData = useMemo(() => {
    if (!dialogState.selectedNFT) return null
    
    const nft = dialogState.selectedNFT
    return {
      id: nft.id,
      name: nft.metadata?.name || `Gaming License #${nft.id}`,
      description: nft.metadata?.description || "Gaming license NFT",
      licenseAddress: nft.licenseAddress, // Direct from NFT details!
      licenseId: nft.licenseId,
      owner: nft.owner,
      uri: nft.uri
    }
  }, [dialogState.selectedNFT])

  // Listing Dialog Component - completely isolated
  const ListingDialog = useMemo(() => {
    if (!dialogState.open || !dialogData) return null

    return (
      <ListingDialogContent 
        dialogData={dialogData}
        dialogState={dialogState}
        salePrice={salePrice}
        onPriceChange={handlePriceInput}
        onUpdateState={updateDialogState}
        onClose={closeDialog}
        checkTransactionStatus={checkTransactionStatus}
        createOffer={createOffer}
        approve={approve}
        useGetApproved={useGetApproved}
      />
    )
  }, [dialogState, dialogData, salePrice, handlePriceInput, updateDialogState, closeDialog, checkTransactionStatus, createOffer, approve, useGetApproved])

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">My Games</h2>
          <p className="text-gray-700">Manage and list your gaming license NFTs for sale</p>
        </div>
        <div className="text-center py-8">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">Connect Your Wallet</h3>
          <p className="text-gray-700">Please connect your wallet to view your NFTs.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">My Games</h2>
          <p className="text-gray-700">Manage and list your gaming license NFTs for sale</p>
        </div>
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-gray-800 font-semibold">Loading your NFTs...</p>
        </div>
      </div>
    )
  }

  if (nfts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">My Games</h2>
          <p className="text-gray-700">Manage and list your gaming license NFTs for sale</p>
        </div>
        <div className="text-center py-8">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">No NFTs Found</h3>
          <p className="text-gray-700">You don't own any gaming license NFTs yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">My Games</h2>
        <p className="text-gray-700">Manage and list your gaming license NFTs for sale</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {nfts.map((nftId) => (
          <NFTCard key={nftId} nftId={nftId} />
        ))}
      </div>

      {ListingDialog}
    </div>
  )
}

// FIXED: Separate dialog component using licenseAddress directly
function ListingDialogContent({ 
  dialogData, 
  dialogState, 
  salePrice, 
  onPriceChange, 
  onUpdateState, 
  onClose,
  checkTransactionStatus,
  createOffer,
  approve,
  useGetApproved
}) {
  const inputRef = useRef(null)
  const pollingTimeoutRef = useRef(null)
  
  // FIXED: Use licenseAddress directly from NFT details
  const { data: approvedAddress } = useGetApproved(
    dialogData?.licenseAddress, // Direct from NFT details!
    dialogData?.id
  )

  const needsApproval = approvedAddress?.toLowerCase() !== 
    CONTRACTS.SECONDARY_MARKETPLACE.address?.toLowerCase()

  console.log('🔍 [Dialog] Approval check:', {
    licenseAddress: dialogData?.licenseAddress,
    tokenId: dialogData?.id,
    approvedAddress,
    secondaryMarketplace: CONTRACTS.SECONDARY_MARKETPLACE.address,
    needsApproval
  })

  // FIXED: Proper transaction polling function
  const pollTransactionStatus = useCallback(async (hash, onSuccess, onFailure, maxAttempts = 30) => {
    let attempts = 0
    
    const poll = async () => {
      try {
        attempts++
        console.log(`🔍 [Dialog] Checking transaction status (attempt ${attempts}/${maxAttempts}):`, hash)
        
        const status = await checkTransactionStatus(hash)
        console.log(`📊 [Dialog] Transaction status:`, status)
        
        if (status === 'success') {
          console.log('✅ [Dialog] Transaction confirmed!')
          // Clear polling timeout
          if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current)
            pollingTimeoutRef.current = null
          }
          onSuccess()
          return
        } else if (status === 'failed') {
          console.log('❌ [Dialog] Transaction failed!')
          // Clear polling timeout
          if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current)
            pollingTimeoutRef.current = null
          }
          onFailure('Transaction failed')
          return
        } else if (attempts >= maxAttempts) {
          console.log('⏰ [Dialog] Transaction polling timeout after', maxAttempts, 'attempts')
          // Clear polling timeout
          if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current)
            pollingTimeoutRef.current = null
          }
          onFailure('Transaction confirmation timeout - please check manually')
          return
        }
        
        // Continue polling every 2 seconds
        console.log(`⏳ [Dialog] Transaction still pending, will check again in 2 seconds...`)
        pollingTimeoutRef.current = setTimeout(poll, 2000)
      } catch (error) {
        console.error('💥 [Dialog] Error polling transaction:', error)
        if (attempts >= maxAttempts) {
          if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current)
            pollingTimeoutRef.current = null
          }
          onFailure('Error checking transaction status')
        } else {
          // Retry on error after a short delay
          pollingTimeoutRef.current = setTimeout(poll, 2000)
        }
      }
    }
    
    // Start polling immediately
    poll()
  }, [checkTransactionStatus])

  // Cleanup polling on unmount or dialog close
  useEffect(() => {
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current)
        pollingTimeoutRef.current = null
        console.log('🧹 [Dialog] Cleaned up polling timeout')
      }
    }
  }, [])

  // Stable input handler
  const handleInputChange = useCallback((e) => {
    const value = e.target.value
    onPriceChange(value)
  }, [onPriceChange])

  const handleApprove = useCallback(async () => {
    if (!dialogData?.licenseAddress) {
      console.error('❌ [Dialog] No license address for approval')
      onUpdateState({ error: 'No license address found' })
      return
    }

    try {
      console.log('📝 [Dialog] Starting approval:', {
        licenseAddress: dialogData.licenseAddress,
        spender: CONTRACTS.SECONDARY_MARKETPLACE.address,
        tokenId: dialogData.id
      })

      onUpdateState({ step: 'approving', error: null })
      
      const hash = await approve(
        dialogData.licenseAddress,
        CONTRACTS.SECONDARY_MARKETPLACE.address,
        dialogData.id
      )

      if (hash) {
        onUpdateState({ txHash: hash })
        console.log('📤 [Dialog] Approval transaction submitted:', hash)

        // FIXED: Use proper polling instead of single timeout
        pollTransactionStatus(
          hash,
          // Success callback - proceed to create offer
          () => {
            console.log('✅ [Dialog] Approval confirmed! Proceeding to create offer...')
            onUpdateState({ step: 'setup', txHash: null })
            // Small delay to ensure state updates, then create offer
            setTimeout(() => {
              handleCreateOffer()
            }, 500)
          },
          // Failure callback
          (errorMessage) => {
            console.error('❌ [Dialog] Approval failed:', errorMessage)
            onUpdateState({ 
              error: `Approval failed: ${errorMessage}`, 
              step: 'setup', 
              txHash: null 
            })
          }
        )
      }
    } catch (error) {
      console.error('💥 [Dialog] Approval transaction submission failed:', error)
      onUpdateState({ 
        error: `Approval failed: ${error.message}`, 
        step: 'setup', 
        txHash: null 
      })
    }
  }, [dialogData, approve, onUpdateState, pollTransactionStatus])

  const handleCreateOffer = useCallback(async () => {
    if (!dialogData?.licenseAddress || !salePrice) {
      console.error('❌ [Dialog] Missing data for offer creation')
      return
    }

    try {
      console.log('🏪 [Dialog] Creating offer:', {
        tokenId: dialogData.id,
        licenseAddress: dialogData.licenseAddress,
        price: salePrice
      })

      onUpdateState({ step: 'listing', error: null })
      
      const hash = await createOffer(
        dialogData.licenseAddress,
        dialogData.id,
        parseEther(salePrice)
      )

      if (hash) {
        onUpdateState({ txHash: hash })
        console.log('📤 [Dialog] Listing transaction submitted:', hash)

        // FIXED: Use proper polling for listing transaction too
        pollTransactionStatus(
          hash,
          // Success callback - show completion
          () => {
            console.log('✅ [Dialog] Listing confirmed!')
            onUpdateState({ step: 'complete', txHash: null })
          },
          // Failure callback
          (errorMessage) => {
            console.error('❌ [Dialog] Listing failed:', errorMessage)
            onUpdateState({ 
              error: `Listing failed: ${errorMessage}`, 
              step: 'setup', 
              txHash: null 
            })
          }
        )
      }
    } catch (error) {
      console.error('💥 [Dialog] Listing transaction submission failed:', error)
      onUpdateState({ 
        error: `Listing failed: ${error.message}`, 
        step: 'setup', 
        txHash: null 
      })
    }
  }, [dialogData, salePrice, createOffer, onUpdateState, pollTransactionStatus])

  const renderContent = () => {
    if (dialogState.step === 'setup') {
      return (
        <>
          <DialogHeader>
            <DialogTitle className="text-gray-900 font-bold">List NFT for Sale</DialogTitle>
            <DialogDescription className="text-gray-700">
              Set a price for your NFT on the secondary marketplace
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-bold text-gray-900">{dialogData.name}</h4>
              <p className="text-sm text-gray-700">{dialogData.description}</p>
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-600">Token ID: #{dialogData.id}</p>
                <p className="text-xs text-gray-600">License ID: #{dialogData.licenseId}</p>
                <p className="text-xs text-gray-600">
                  License Contract: {shortenAddress(dialogData.licenseAddress)}
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="price-input" className="text-gray-800 font-semibold">
                Sale Price (ETH)
              </Label>
              <Input
                ref={inputRef}
                id="price-input"
                type="number"
                step="0.001"
                min="0"
                value={salePrice}
                onChange={handleInputChange}
                placeholder="0.0"
                className="border-gray-300"
                autoComplete="off"
              />
            </div>
            
            {dialogState.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-red-800 text-sm font-medium">{dialogState.error}</span>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={onClose} className="font-semibold">
              Cancel
            </Button>
            <Button 
              onClick={needsApproval ? handleApprove : handleCreateOffer}
              disabled={!salePrice || !dialogData?.licenseAddress || parseFloat(salePrice) <= 0}
              className="bg-blue-600 hover:bg-blue-700 font-bold"
            >
              {needsApproval ? 'Approve & List' : 'List for Sale'}
            </Button>
          </DialogFooter>
        </>
      )
    }

    if (dialogState.step === 'approving' || dialogState.step === 'listing') {
      return (
        <>
          <DialogHeader>
            <DialogTitle className="text-gray-900 font-bold">
              {dialogState.step === 'approving' ? 'Approving NFT' : 'Creating Listing'}
            </DialogTitle>
            <DialogDescription className="text-gray-700">
              {dialogState.step === 'approving' 
                ? 'Waiting for approval transaction confirmation...' 
                : 'Creating your marketplace listing...'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
            <p className="text-sm text-gray-700 font-medium">
              {dialogState.step === 'approving' 
                ? 'Please wait while your approval is confirmed on the blockchain...' 
                : `Creating listing for ${salePrice} ETH...`}
            </p>
            <p className="text-xs text-gray-500">
              This may take a few moments depending on network congestion.
            </p>
            {dialogState.txHash && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800 font-mono break-all">
                  Transaction: {dialogState.txHash.slice(0, 10)}...{dialogState.txHash.slice(-8)}
                </p>
                <a 
                  href={`https://sepolia.etherscan.io/tx/${dialogState.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  View on Etherscan ↗
                </a>
              </div>
            )}
          </div>
        </>
      )
    }

    if (dialogState.step === 'complete') {
      return (
        <>
          <DialogHeader>
            <DialogTitle className="text-gray-900 font-bold">NFT Listed Successfully!</DialogTitle>
            <DialogDescription className="text-gray-700">
              Your NFT is now available on the secondary marketplace
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
            <div>
              <p className="font-bold text-gray-900">NFT #{dialogData.id} is now listed for sale</p>
              <p className="text-sm text-gray-700 font-medium">Price: {salePrice} ETH</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={onClose} className="w-full font-bold bg-blue-600 hover:bg-blue-700">
              Close
            </Button>
          </DialogFooter>
        </>
      )
    }
  }

  return (
    <Dialog open={dialogState.open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        {renderContent()}
      </DialogContent>
    </Dialog>
  )
}