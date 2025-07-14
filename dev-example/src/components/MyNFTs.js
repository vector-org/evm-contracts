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
import { Package, Loader2, AlertCircle, CheckCircle, DollarSign, Gamepad2, ShoppingCart, Tag, ExternalLink } from 'lucide-react'
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
  const [txNotification, setTxNotification] = useState(null)
  
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
  const pollingTimeoutRef = useRef(null)
  const notificationTimeout = useRef(null)
  const inputRef = useRef(null)
  
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

  // Load NFTs when IDs change
  useEffect(() => {
    if (loadingIds) return
    
    if (allNFTIds && allNFTIds.length > 0) {
      const idsString = allNFTIds.join(',')
      if (!processedNFTIds.current.has(idsString)) {
        processedNFTIds.current.add(idsString)
        setNfts(allNFTIds.map(id => ({ id: id.toString() })))
        setLoading(false)
      }
    } else {
      setNfts([])
      setLoading(false)
    }
  }, [allNFTIds, loadingIds])

  // Poll transaction status with cleanup
  const pollTransactionStatus = useCallback(async (hash, onSuccess, onFailure, maxAttempts = 20) => {
    let attempts = 0
    
    const poll = async () => {
      try {
        attempts++
        console.log(`🔍 [Dialog] Checking transaction status (attempt ${attempts}/${maxAttempts}):`, hash)
        
        const status = await checkTransactionStatus(hash)
        
        if (status === 'success') {
          console.log('✅ [Dialog] Transaction confirmed!')
          if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current)
            pollingTimeoutRef.current = null
          }
          onSuccess()
          return
        } else if (status === 'failed') {
          console.log('❌ [Dialog] Transaction failed!')
          if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current)
            pollingTimeoutRef.current = null
          }
          onFailure('Transaction failed')
          return
        } else if (attempts >= maxAttempts) {
          console.log('⏰ [Dialog] Transaction polling timeout after', maxAttempts, 'attempts')
          if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current)
            pollingTimeoutRef.current = null
          }
          onFailure('Transaction confirmation timeout')
          return
        }
        
        console.log(`⏳ [Dialog] Transaction still pending, will check again in 3 seconds...`)
        pollingTimeoutRef.current = setTimeout(poll, 3000)
      } catch (error) {
        console.error('💥 [Dialog] Error polling transaction:', error)
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

  // Cleanup polling on unmount
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

  // Dialog management functions
  const openDialog = useCallback((nft) => {
    setDialogState({
      open: true,
      selectedNFT: nft,
      step: 'setup',
      txHash: null,
      error: null
    })
    setSalePrice('')
  }, [])

  const closeDialog = useCallback(() => {
    setDialogState({
      open: false,
      selectedNFT: null,
      step: 'setup',
      txHash: null,
      error: null
    })
    setSalePrice('')
    
    // Clear any ongoing polling
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current)
      pollingTimeoutRef.current = null
    }
  }, [])

  const updateDialogState = useCallback((updates) => {
    setDialogState(prev => ({ ...prev, ...updates }))
  }, [])

  // Handle input change
  const handlePriceChange = useCallback((value) => {
    setSalePrice(value)
  }, [])

  // Handle approval
  const handleApprove = useCallback(async () => {
    const nft = dialogState.selectedNFT
    if (!nft?.licenseAddress) {
      updateDialogState({ error: 'No license address found' })
      return
    }

    try {
      updateDialogState({ step: 'approving', error: null })
      
      const hash = await approve(
        nft.licenseAddress,
        CONTRACTS.SECONDARY_MARKETPLACE.address,
        nft.id
      )

      if (hash) {
        updateDialogState({ txHash: hash })
        console.log('📤 [Dialog] Approval transaction submitted:', hash)

        pollTransactionStatus(
          hash,
          // Success callback
          () => {
            console.log('✅ [Dialog] Approval confirmed! Proceeding to create offer...')
            updateDialogState({ step: 'listing' })
            handleCreateOffer()
          },
          // Failure callback
          (error) => {
            console.log('❌ [Dialog] Approval failed:', error)
            updateDialogState({ step: 'setup', error })
            showNotification('failed', hash, 'Approval failed')
          }
        )
      }
    } catch (error) {
      console.error('💥 [Dialog] Approval error:', error)
      const errorMsg = error.message.includes('User rejected') ? 'Transaction cancelled' : `Approval failed: ${error.message}`
      updateDialogState({ step: 'setup', error: errorMsg })
    }
  }, [dialogState.selectedNFT, approve, updateDialogState, pollTransactionStatus, showNotification])

  // Handle create offer
  const handleCreateOffer = useCallback(async () => {
    const nft = dialogState.selectedNFT
    if (!nft?.licenseAddress || !salePrice) {
      updateDialogState({ error: 'Missing required data' })
      return
    }

    try {
      if (dialogState.step !== 'listing') {
        updateDialogState({ step: 'listing', error: null })
      }

      const priceInWei = parseEther(salePrice)
      
      const hash = await createOffer(nft.licenseAddress, nft.id, priceInWei)

      if (hash) {
        updateDialogState({ txHash: hash })
        console.log('📤 [Dialog] Create offer transaction submitted:', hash)

        pollTransactionStatus(
          hash,
          // Success callback
          () => {
            console.log('✅ [Dialog] Offer created successfully!')
            updateDialogState({ step: 'complete' })
            showNotification('success', hash, 'Game license listed for sale successfully!')
            
            // Auto-close dialog after success
            setTimeout(() => {
              closeDialog()
              // Refresh the page or refetch data
              window.location.reload()
            }, 2000)
          },
          // Failure callback
          (error) => {
            console.log('❌ [Dialog] Create offer failed:', error)
            updateDialogState({ step: 'setup', error })
            showNotification('failed', hash, 'Failed to list NFT for sale')
          }
        )
      }
    } catch (error) {
      console.error('💥 [Dialog] Create offer error:', error)
      const errorMsg = error.message.includes('User rejected') ? 'Transaction cancelled' : `Listing failed: ${error.message}`
      updateDialogState({ step: 'setup', error: errorMsg })
    }
  }, [dialogState.selectedNFT, dialogState.step, salePrice, createOffer, updateDialogState, pollTransactionStatus, showNotification, closeDialog])

  // NFT Card Component
  const NFTCard = ({ nft }) => {
    const { data: nftDetails, isLoading: loadingDetails } = useGetNFTDetails(nft.id)
    const { data: approvedAddress } = useGetApproved(nftDetails?.licenseAddress, nft.id)
    const [metadata, setMetadata] = useState(null)
    const [imageUrl, setImageUrl] = useState(null)

    // Load metadata
    useEffect(() => {
      if (nftDetails?.uri) {
        MetadataUtils.fetchMetadataEnhanced(nftDetails.uri)
          .then(data => {
            const normalized = MetadataUtils.normalizeImageUrls(data)
            setMetadata(normalized)
            
            if (normalized?.imageUrl) {
              const img = new Image()
              img.onload = () => setImageUrl(normalized.imageUrl)
              img.onerror = () => {
                if (normalized?.imageFallbackUrl) {
                  const fallbackImg = new Image()
                  fallbackImg.onload = () => setImageUrl(normalized.imageFallbackUrl)
                  fallbackImg.src = normalized.imageFallbackUrl
                }
              }
              img.src = normalized.imageUrl
            }
          })
          .catch(error => {
            console.error('Metadata fetch failed:', error)
            setMetadata({
              name: `NFT #${nft.id}`,
              description: 'Gaming NFT'
            })
          })
      }
    }, [nftDetails, nft.id])

    if (loadingDetails) {
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

    if (!nftDetails) return null

    const isListedForSale = nftDetails.listedForSale
    const isApproved = approvedAddress?.toLowerCase() === CONTRACTS.SECONDARY_MARKETPLACE.address?.toLowerCase()

    return (
      <Card className={`overflow-hidden hover:shadow-lg transition-all bg-white border-2 ${
        isListedForSale 
          ? 'border-orange-300 bg-orange-50/50 opacity-75' 
          : 'border-gray-200'
      }`}>
        {/* Image Section */}
        <div className="h-48 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center relative overflow-hidden">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={metadata?.name || 'NFT'} 
              className={`w-full h-full object-cover ${isListedForSale ? 'opacity-60' : ''}`}
              onError={(e) => {
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'flex'
              }}
            />
          ) : null}
          <div className={`${imageUrl ? 'hidden' : 'flex'} w-full h-full items-center justify-center`}>
            <Gamepad2 className={`h-16 w-16 ${isListedForSale ? 'text-blue-600/30' : 'text-blue-600/60'}`} />
          </div>
          
          {/* Status badges */}
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            {isListedForSale && (
              <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1">
                <Tag className="h-3 w-3" />
                Listed
              </span>
            )}
            {isApproved && !isListedForSale && (
              <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                Approved
              </span>
            )}
          </div>
          
          {/* Listed for sale overlay */}
          {isListedForSale && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <div className="bg-white/90 px-3 py-1 rounded-full">
                <span className="text-sm font-bold text-orange-600">Listed for Sale</span>
              </div>
            </div>
          )}
        </div>

        {/* Content Section */}
        <CardHeader className="pb-2">
          <CardTitle className={`text-lg font-bold truncate ${isListedForSale ? 'text-gray-600' : 'text-gray-900'}`}>
            {metadata?.name || `NFT #${nft.id}`}
          </CardTitle>
          <CardDescription className={`text-sm line-clamp-2 ${isListedForSale ? 'text-gray-500' : 'text-gray-600'}`}>
            {metadata?.description || `Gaming NFT from your collection`}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-0 pb-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className={isListedForSale ? 'text-gray-500' : 'text-gray-600'}>Token ID:</span>
              <span className={`font-semibold ${isListedForSale ? 'text-gray-600' : 'text-gray-900'}`}>#{nft.id}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className={isListedForSale ? 'text-gray-500' : 'text-gray-600'}>License ID:</span>
              <span className={`font-semibold ${isListedForSale ? 'text-gray-600' : 'text-gray-900'}`}>#{nftDetails.licenseId}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className={isListedForSale ? 'text-gray-500' : 'text-gray-600'}>Contract:</span>
              <span className={`font-semibold ${isListedForSale ? 'text-gray-600' : 'text-gray-900'}`}>
                {shortenAddress(nftDetails.licenseAddress)}
              </span>
            </div>
            {isListedForSale && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Status:</span>
                <span className="font-semibold text-orange-600">Listed on Marketplace</span>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="pt-0">
          <Button 
            onClick={() => openDialog({
              id: nft.id,
              name: metadata?.name || `NFT #${nft.id}`,
              description: metadata?.description || 'Gaming NFT',
              licenseId: nftDetails.licenseId,
              licenseAddress: nftDetails.licenseAddress,
              imageUrl
            })}
            disabled={isListedForSale}
            className={`w-full font-bold ${
              isListedForSale 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isListedForSale ? (
              <>
                <Tag className="mr-2 h-4 w-4" />
                Already Listed
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 h-4 w-4" />
                List for Sale
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // Dialog content based on current step
  const DialogContent_Internal = ({ dialogData, salePrice, onPriceChange, onClose, dialogState, onUpdateState, needsApproval, handleApprove, handleCreateOffer }) => {
    const inputRef = useRef(null)

    // Stable input handler
    const handleInputChange = useCallback((e) => {
      const value = e.target.value
      onPriceChange(value)
    }, [onPriceChange])

    // Focus input when dialog opens
    useEffect(() => {
      if (dialogState.step === 'setup' && inputRef.current) {
        setTimeout(() => inputRef.current?.focus(), 100)
      }
    }, [dialogState.step])

    if (dialogState.step === 'setup') {
      return (
        <>
          <DialogHeader>
            <DialogTitle className="text-gray-900 font-bold">List NFT for Sale</DialogTitle>
            <DialogDescription className="text-gray-700">
              Set a price and list your NFT on the secondary marketplace
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
              <div className="mt-4">
                <a
                  href={`https://sepolia.etherscan.io/tx/${dialogState.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center justify-center"
                >
                  View Transaction <ExternalLink className="h-3 w-3 ml-1" />
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
            <DialogTitle className="text-green-800 font-bold flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              Successfully Listed!
            </DialogTitle>
            <DialogDescription className="text-gray-700">
              Your NFT has been listed on the secondary marketplace
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto text-green-600" />
            <div>
              <p className="text-lg font-semibold text-gray-900">Game NFT Listed Successfully!</p>
              <p className="text-sm text-gray-600 mt-2">
                Your NFT is now available for purchase at {salePrice} ETH
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={onClose} className="w-full bg-green-600 hover:bg-green-700 font-bold">
              Done
            </Button>
          </DialogFooter>
        </>
      )
    }

    return null
  }

  // Get approval status for selected NFT
  const { data: approvedAddress } = useGetApproved(
    dialogState.selectedNFT?.licenseAddress, 
    dialogState.selectedNFT?.id
  )

  const needsApproval = approvedAddress?.toLowerCase() !== 
    CONTRACTS.SECONDARY_MARKETPLACE.address?.toLowerCase()

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
          <p className="text-gray-600">Loading your NFTs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">My NFTs</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Manage your gaming license NFTs and list them for sale
        </p>
      </div>

      {nfts.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No NFTs Found</h3>
          <p className="text-gray-600">You don't have any gaming license NFTs yet.</p>
          <p className="text-gray-600">Visit the marketplace to mint your first license!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {nfts.map((nft) => (
            <NFTCard key={nft.id} nft={nft} />
          ))}
        </div>
      )}

      {/* Listing Dialog */}
      <Dialog open={dialogState.open} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogContent_Internal
            dialogData={dialogState.selectedNFT}
            salePrice={salePrice}
            onPriceChange={handlePriceChange}
            onClose={closeDialog}
            dialogState={dialogState}
            onUpdateState={updateDialogState}
            needsApproval={needsApproval}
            handleApprove={handleApprove}
            handleCreateOffer={handleCreateOffer}
          />
        </DialogContent>
      </Dialog>

      <TransactionNotification />
    </div>
  )
}