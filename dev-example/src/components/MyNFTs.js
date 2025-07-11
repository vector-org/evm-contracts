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

export default function MyNFTs() {
  const { address, isConnected } = useAccount()
  const { 
    useGetAllNFTIds, 
    useGetNFTDetails, 
    useGetLicenseFromID,
    useCreateOffer,
    useApprove,
    useGetApproved
  } = useContract()
  
  // Simplified state management
  const [nfts, setNfts] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedNFT, setSelectedNFT] = useState(null)
  const [salePrice, setSalePrice] = useState('')
  const [currentStep, setCurrentStep] = useState('setup')
  const [txHash, setTxHash] = useState(null)
  const [error, setError] = useState(null)
  
  // Refs to prevent re-renders
  const processedNFTIds = useRef(new Set())
  const dialogTimeoutRef = useRef(null)
  
  const { data: allNFTIds, isLoading: loadingIds } = useGetAllNFTIds()
  const { createOffer } = useCreateOffer()
  const { approve } = useApprove()

  // Simple transaction checker
  const checkTransactionStatus = useCallback(async (hash) => {
    if (!hash) return false

    try {
      const receipt = await window.ethereum.request({
        method: 'eth_getTransactionReceipt',
        params: [hash]
      })
      
      if (receipt) {
        if (receipt.status === '0x1') {
          console.log('✅ Transaction successful:', hash)
          return 'success'
        } else {
          console.log('❌ Transaction failed:', hash)
          return 'failed'
        }
      }
      return 'pending'
    } catch (error) {
      console.error('Error checking transaction:', error)
      return 'error'
    }
  }, [])

  // Load NFTs - simplified and stable
  useEffect(() => {
    if (loadingIds) return
    
    if (allNFTIds && allNFTIds.length > 0) {
      const idsString = allNFTIds.join(',')
      if (!processedNFTIds.current.has(idsString)) {
        processedNFTIds.current.add(idsString)
        setNfts(allNFTIds.map(id => id.toString()))
        setLoading(false)
      }
    } else {
      setNfts([])
      setLoading(false)
    }
  }, [allNFTIds, loadingIds])

  const NFTCard = ({ nftId }) => {
    const { data: nftDetails } = useGetNFTDetails(nftId)
    const [gameNFTData, setGameNFTData] = useState(null)
    const [licenseData, setLicenseData] = useState(null)
    const [metadata, setMetadata] = useState(null)
    const [imageUrl, setImageUrl] = useState(null)
    const [dataLoaded, setDataLoaded] = useState(false)
    const [licenseId, setLicenseId] = useState(null)

    // Load gameNFT data and then license contract data
    useEffect(() => {
      if (nftDetails && !dataLoaded) {
        setDataLoaded(true)
        setGameNFTData(nftDetails)
        
        console.log(`📋 [NFT-${nftId}] GameNFT data:`, nftDetails)
        
        // Extract license ID and fetch metadata
        if (nftDetails.uri) {
          MetadataUtils.fetchMetadataEnhanced(nftDetails.uri)
            .then(data => {
              console.log(`✅ [NFT-${nftId}] Metadata loaded:`, data)
              const normalized = MetadataUtils.normalizeImageUrls(data)
              setMetadata(normalized)
              
              // Extract license ID from metadata or use nftId as fallback
              let extractedLicenseId = nftId // Default fallback
              
              // Try to extract license ID from metadata
              if (data?.licenseId) {
                extractedLicenseId = data.licenseId
              } else if (data?.attributes) {
                // Look for license ID in attributes
                const licenseAttr = data.attributes.find(attr => 
                  attr.trait_type?.toLowerCase().includes('license') || 
                  attr.trait_type?.toLowerCase().includes('id')
                )
                if (licenseAttr?.value) {
                  extractedLicenseId = licenseAttr.value
                }
              }
              
              setLicenseId(extractedLicenseId)
              
              // Load image with proper fallback chain
              if (normalized?.imageUrl) {
                const img = new Image()
                img.onload = () => setImageUrl(normalized.imageUrl)
                img.onerror = () => {
                  if (normalized?.imageFallbackUrl) {
                    const fallbackImg = new Image()
                    fallbackImg.onload = () => setImageUrl(normalized.imageFallbackUrl)
                    fallbackImg.onerror = () => console.log('All image URLs failed')
                    fallbackImg.src = normalized.imageFallbackUrl
                  }
                }
                img.src = normalized.imageUrl
              }
            })
            .catch(error => {
              console.error(`💥 [NFT-${nftId}] Metadata fetch failed:`, error)
              // Create better fallback metadata
              setMetadata({
                name: `Gaming License #${nftId}`,
                description: "Gaming license NFT - metadata loading failed"
              })
              setLicenseId(nftId)
            })
        } else {
          // No URI, set fallback data and still try to get license ID
          console.log(`⚠️ [NFT-${nftId}] No URI found, using fallback data`)
          setMetadata({
            name: `Gaming License #${nftId}`,
            description: "Gaming license NFT - no metadata URI"
          })
          setLicenseId(nftId) // Use nftId as license ID fallback
        }
      }
    }, [nftDetails, nftId, dataLoaded])

    // Fetch license contract data using the extracted license ID
    const { data: licenseContractData } = useGetLicenseFromID(licenseId)
    
    useEffect(() => {
      if (licenseContractData) {
        setLicenseData(licenseContractData)
        console.log(`🎮 [NFT-${nftId}] License contract data loaded:`, {
          name: licenseContractData.name,
          symbol: licenseContractData.symbol,
          isActive: licenseContractData.isActive,
          contractAddress: licenseContractData.contractAddress
        })
      }
    }, [licenseContractData, nftId])

    const handleListForSale = useCallback(() => {
      setSelectedNFT({
        id: nftId,
        gameNFTData,
        licenseData,
        metadata,
        licenseId
      })
      setDialogOpen(true)
      setCurrentStep('setup')
      setError(null)
      setTxHash(null)
      setSalePrice('')
    }, [nftId, gameNFTData, licenseData, metadata, licenseId])

    // Show loading state if we don't have basic NFT data yet
    if (!gameNFTData) {
      return (
        <Card className="overflow-hidden bg-white shadow-md border-2 border-gray-200">
          <div className="h-48 bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
          <CardContent className="p-4">
            <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
          </CardContent>
        </Card>
      )
    }

    // Only render if user owns this NFT
    if (!gameNFTData || gameNFTData.owner?.toLowerCase() !== address?.toLowerCase()) {
      return null
    }

    return (
      <Card className="overflow-hidden hover:shadow-lg transition-shadow bg-white border-2 border-gray-200">
        {/* Image Section with IPFS support */}
        <div className="h-48 bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center relative overflow-hidden">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={metadata?.name || `NFT #${nftId}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none'
                setImageUrl(null)
              }}
            />
          ) : (
            <div className="text-center">
              <Gamepad2 className="h-12 w-12 text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-blue-800">Gaming NFT</p>
            </div>
          )}
        </div>

        {/* Content Section */}
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold text-gray-900 truncate">
            {licenseData?.name || metadata?.name || `Gaming License #${nftId}`}
          </CardTitle>
          <CardDescription className="text-sm text-gray-700">
            {licenseData?.symbol ? `${licenseData.symbol} License` : (metadata?.description || "Gaming license NFT")}
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
                {shortenAddress(gameNFTData.owner)}
              </span>
            </div>
            {licenseId && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">License ID:</span>
                <span className="font-mono text-gray-900">#{licenseId}</span>
              </div>
            )}
            {licenseData?.symbol && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Symbol:</span>
                <span className="font-mono text-gray-900">{licenseData.symbol}</span>
              </div>
            )}
            {licenseData?.contractAddress && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Contract:</span>
                <span className="font-mono text-gray-900">
                  {shortenAddress(licenseData.contractAddress)}
                </span>
              </div>
            )}
            {/* {licenseData?.isActive !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-semibold ${licenseData.isActive ? 'text-green-600' : 'text-red-600'}`}>
                  {licenseData.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            )} */}
          </div>
        </CardContent>

        {/* Footer Section */}
        <CardFooter className="px-4 pt-2 pb-4">
          <Button 
            onClick={handleListForSale}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
            disabled={!licenseId || !gameNFTData}
          >
            <DollarSign className="mr-2 h-4 w-4" />
            {licenseData ? 'List for Sale' : 'Loading License Data...'}
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // Stable input handler to prevent flickering - moved outside dialog
  const handlePriceChange = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    const value = e.target.value
    setSalePrice(value)
  }, [])

  // Memoized dialog data to prevent recreation
  const dialogData = useMemo(() => {
    if (!selectedNFT) return null
    return {
      id: selectedNFT.id,
      name: selectedNFT.licenseData?.name || selectedNFT.metadata?.name || `Gaming License #${selectedNFT.id}`,
      description: selectedNFT.licenseData?.symbol ? `${selectedNFT.licenseData.symbol} License` : 
                   (selectedNFT.metadata?.description || "Gaming license NFT"),
      symbol: selectedNFT.licenseData?.symbol,
      contractAddress: selectedNFT.licenseData?.contractAddress,
      isActive: selectedNFT.licenseData?.isActive,
      licenseData: selectedNFT.licenseData
    }
  }, [selectedNFT])

  // Stable close dialog handler
  const closeDialog = useCallback(() => {
    setDialogOpen(false)
    setSelectedNFT(null)
    setSalePrice('')
    setCurrentStep('setup')
    setError(null)
    setTxHash(null)
    
    // Clear any pending timeouts
    if (dialogTimeoutRef.current) {
      clearTimeout(dialogTimeoutRef.current)
    }
  }, [])

  // Listing Dialog Component with stable state management
  const ListingDialog = () => {
    const { data: approvedAddress } = useGetApproved(
      selectedNFT?.licenseData?.contractAddress, 
      selectedNFT?.id
    )

    const needsApproval = approvedAddress?.toLowerCase() !== process.env.NEXT_PUBLIC_SECONDARY_MARKETPLACE_ADDRESS?.toLowerCase()

    const handleApprove = async () => {
      if (!selectedNFT?.licenseData) return

      try {
        setCurrentStep('approving')
        setError(null)
        
        const hash = await approve(
          selectedNFT.licenseData.contractAddress,
          process.env.NEXT_PUBLIC_SECONDARY_MARKETPLACE_ADDRESS,
          selectedNFT.id
        )

        if (hash) {
          setTxHash(hash)
          console.log('📤 Approval submitted:', hash)

          // Single transaction check with timeout
          setTimeout(async () => {
            const status = await checkTransactionStatus(hash)
            if (status === 'success') {
              setCurrentStep('setup')
              setTxHash(null)
              // Brief delay before auto-proceeding to listing
              setTimeout(() => handleCreateOffer(), 500)
            } else if (status === 'failed') {
              setError('Approval transaction failed')
              setCurrentStep('setup')
              setTxHash(null)
            }
          }, 4000)
        }

      } catch (error) {
        setError(`Approval failed: ${error.message}`)
        setCurrentStep('setup')
        setTxHash(null)
      }
    }

    const handleCreateOffer = async () => {
      if (!selectedNFT?.licenseData || !salePrice) return

      try {
        setCurrentStep('listing')
        setError(null)
        
        const hash = await createOffer(
          selectedNFT.id,
          selectedNFT.licenseData.contractAddress,
          parseEther(salePrice)
        )

        if (hash) {
          setTxHash(hash)
          console.log('📤 Listing submitted:', hash)

          // Single transaction check with timeout
          setTimeout(async () => {
            const status = await checkTransactionStatus(hash)
            if (status === 'success') {
              setCurrentStep('complete')
              setTxHash(null)
            } else if (status === 'failed') {
              setError('Listing transaction failed')
              setCurrentStep('setup')
              setTxHash(null)
            }
          }, 4000)
        }

      } catch (error) {
        setError(`Listing failed: ${error.message}`)
        setCurrentStep('setup')
        setTxHash(null)
      }
    }

    const closeDialog = () => {
      setDialogOpen(false)
      setSelectedNFT(null)
      setSalePrice('')
      setCurrentStep('setup')
      setError(null)
      setTxHash(null)
      
      // Clear any pending timeouts
      if (dialogTimeoutRef.current) {
        clearTimeout(dialogTimeoutRef.current)
      }
    }

    const renderContent = () => {
      if (currentStep === 'setup') {
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-gray-900 font-bold">List NFT for Sale</DialogTitle>
              <DialogDescription className="text-gray-700">
                Set a price for your NFT on the secondary marketplace
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {selectedNFT && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-bold text-gray-900">
                    {selectedNFT.licenseData?.name || selectedNFT.metadata?.name || `Gaming License #${selectedNFT.id}`}
                  </h4>
                  <p className="text-sm text-gray-700">
                    {selectedNFT.licenseData?.symbol ? `${selectedNFT.licenseData.symbol} License` : 
                     (selectedNFT.metadata?.description || "Gaming license NFT")}
                  </p>
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-gray-600">Token ID: #{selectedNFT.id}</p>
                    {selectedNFT.licenseData?.symbol && (
                      <p className="text-xs text-gray-600">License Symbol: {selectedNFT.licenseData.symbol}</p>
                    )}
                    {selectedNFT.licenseData?.contractAddress && (
                      <p className="text-xs text-gray-600">
                        Contract: {shortenAddress(selectedNFT.licenseData.contractAddress)}
                      </p>
                    )}
                    {/* {selectedNFT.licenseData?.isActive !== undefined && (
                      <p className={`text-xs font-semibold ${selectedNFT.licenseData.isActive ? 'text-green-600' : 'text-red-600'}`}>
                        Status: {selectedNFT.licenseData.isActive ? 'Active' : 'Inactive'}
                      </p>
                    )} */}
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="price" className="text-gray-800 font-semibold">Sale Price (ETH)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.001"
                  min="0"
                  value={salePrice}
                  onChange={handlePriceChange}
                  placeholder="0.0"
                  className="border-gray-300"
                  autoComplete="off"
                />
              </div>
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-red-800 text-sm font-medium">{error}</span>
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog} className="font-semibold">
                Cancel
              </Button>
              <Button 
                onClick={needsApproval ? handleApprove : handleCreateOffer}
                disabled={!salePrice || !selectedNFT?.licenseData || parseFloat(salePrice) <= 0}
                className="bg-blue-600 hover:bg-blue-700 font-bold"
              >
                {needsApproval ? 'Approve & List' : 'List for Sale'}
              </Button>
            </DialogFooter>
          </>
        )
      }

      if (currentStep === 'approving' || currentStep === 'listing') {
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-gray-900 font-bold">
                {currentStep === 'approving' ? 'Approving NFT' : 'Creating Listing'}
              </DialogTitle>
              <DialogDescription className="text-gray-700">
                {currentStep === 'approving' 
                  ? 'Waiting for approval transaction confirmation...' 
                  : 'Creating your marketplace listing...'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
              <p className="text-sm text-gray-700 font-medium">
                {currentStep === 'approving' 
                  ? 'Please wait while your approval is processed.' 
                  : `Creating listing for ${salePrice} ETH...`}
              </p>
              {txHash && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800 font-mono break-all">
                    Transaction: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                  </p>
                  <a 
                    href={`https://sepolia.etherscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    View on Etherscan
                  </a>
                </div>
              )}
            </div>
          </>
        )
      }

      if (currentStep === 'complete') {
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
                <p className="font-bold text-gray-900">NFT #{selectedNFT?.id} is now listed for sale</p>
                <p className="text-sm text-gray-700 font-medium">Price: {salePrice} ETH</p>
              </div>
            </div>
            
            <DialogFooter>
              <Button onClick={closeDialog} className="w-full font-bold bg-blue-600 hover:bg-blue-700">
                Close
              </Button>
            </DialogFooter>
          </>
        )
      }
    }

    return (
      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-md">
          {renderContent()}
        </DialogContent>
      </Dialog>
    )
  }

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (dialogTimeoutRef.current) {
        clearTimeout(dialogTimeoutRef.current)
      }
    }
  }, [])

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
        <div className="space-y-4">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-gray-800 font-semibold">Loading your NFTs...</p>
          </div>
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

      <ListingDialog />
    </div>
  )
}