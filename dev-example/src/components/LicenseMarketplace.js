"use client";
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { Button } from './ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card'
import { useContract } from '../hooks/useContract'
import { useTransactions, useTransactionWatcher } from '../hooks/useTransactions'
import { formatEther, shortenAddress } from '../lib/utils'
import { CONTRACT_ADDRESSES, CONTRACTS } from '../lib/contracts'
import { Loader2, ShoppingCart, ExternalLink, User, Calendar, Coins, AlertTriangle } from 'lucide-react'

export default function LicenseMarketplace() {
  const { address, isConnected } = useAccount()
  const { 
    useGetAllLicenseIds, 
    useGetLicenseFromID, 
    useMintLicense,
    useGetLicenseTokenURI // You'll need to add this to your useContract hook
  } = useContract()
  const { addTransaction } = useTransactions()

  const [licenses, setLicenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [mintingLicense, setMintingLicense] = useState(null)
  const [currentTxHash, setCurrentTxHash] = useState(null)

  const { data: licenseIds, isLoading: loadingIds, refetch: refetchLicenseIds } = useGetAllLicenseIds()
  const { mintLicense, isPending: isMintPending } = useMintLicense()

  useTransactionWatcher(
    currentTxHash,
    useCallback((receipt) => {
      console.log('🎉 License minted successfully!', {
        transactionHash: currentTxHash,
        receipt: receipt
      })
      setMintingLicense(null)
      setCurrentTxHash(null)
      
      // Refresh the data after successful mint
      setTimeout(() => {
        refetchLicenseIds()
      }, 2000)
    }, [currentTxHash, refetchLicenseIds]),
    useCallback(() => {
      console.error('💥 License minting failed:', currentTxHash)
      setMintingLicense(null)
      setCurrentTxHash(null)
    }, [currentTxHash])
  )

  const LicenseCard = ({ licenseId }) => {
    const { data: licenseData, isLoading } = useGetLicenseFromID(licenseId)
    
    // If you haven't implemented useGetLicenseTokenURI yet, comment out this line
    // const { data: tokenURI } = useGetLicenseTokenURI(licenseData?.contractAddress, licenseId)
    
    const [metadata, setMetadata] = useState(null)
    const [loadingMetadata, setLoadingMetadata] = useState(false)
    const [metadataError, setMetadataError] = useState(null)
    const [metadataLoaded, setMetadataLoaded] = useState(false)

    // Memoize the metadata loading function to prevent recreation on every render
    const loadMetadata = useCallback(async (uri) => {
      if (!uri || loadingMetadata || metadataLoaded) return
      
      try {
        setLoadingMetadata(true)
        setMetadataError(null)
        
        console.log('📋 Loading metadata from URI:', uri)
        
        let fetchedMetadata = null
        
        if (uri.startsWith('data:application/json;base64,')) {
          // Handle base64 encoded metadata
          const base64Data = uri.split(',')[1]
          const decodedData = atob(base64Data)
          fetchedMetadata = JSON.parse(decodedData)
          console.log('✅ Metadata loaded from base64:', fetchedMetadata)
        } else if (uri.startsWith('http')) {
          // Handle HTTP/IPFS URLs
          const response = await fetch(uri)
          if (response.ok) {
            fetchedMetadata = await response.json()
            console.log('✅ Metadata loaded from URL:', fetchedMetadata)
          } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
        } else if (uri.startsWith('ipfs://')) {
          // Handle IPFS URLs - convert to HTTP gateway
          const ipfsHash = uri.replace('ipfs://', '')
          const ipfsUrl = `https://ipfs.io/ipfs/${ipfsHash}`
          const response = await fetch(ipfsUrl)
          if (response.ok) {
            fetchedMetadata = await response.json()
            console.log('✅ Metadata loaded from IPFS:', fetchedMetadata)
          } else {
            throw new Error(`IPFS fetch failed: ${response.status}`)
          }
        } else {
          // Try direct fetch for other URI formats
          const response = await fetch(uri)
          if (response.ok) {
            fetchedMetadata = await response.json()
            console.log('✅ Metadata loaded from direct URI:', fetchedMetadata)
          } else {
            throw new Error(`Failed to fetch URI: ${response.status}`)
          }
        }

        if (fetchedMetadata) {
          // Ensure image URLs are properly formatted for IPFS
          if (fetchedMetadata.image && fetchedMetadata.image.startsWith('ipfs://')) {
            fetchedMetadata.image = fetchedMetadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/')
          }
          
          setMetadata(fetchedMetadata)
          setMetadataLoaded(true)
          console.log('✅ Metadata successfully loaded with image:', fetchedMetadata.image)
        } else {
          throw new Error('No metadata found in response')
        }
        
      } catch (error) {
        console.error('💥 Error loading metadata:', error)
        setMetadataError(error.message)
        
        // Create fallback metadata from license data
        if (licenseData) {
          const fallbackMetadata = {
            name: licenseData?.name || `License #${licenseId}`,
            description: `Gaming license for ${licenseData?.name || `License ${licenseId}`} (${licenseData?.symbol || 'N/A'})`,
            image: null, // Will be null if we can't fetch from IPFS
            attributes: [
              {
                trait_type: "Developer",
                value: shortenAddress(licenseData.developer)
              },
              {
                trait_type: "Publisher", 
                value: shortenAddress(licenseData.publisher)
              },
              {
                trait_type: "Platform",
                value: shortenAddress(licenseData.platform)
              },
              {
                trait_type: "Active",
                value: licenseData.isActive ? "Yes" : "No"
              }
            ]
          }
          
          setMetadata(fallbackMetadata)
          setMetadataLoaded(true)
          console.log('🔄 Set fallback metadata due to error:', fallbackMetadata)
        }
      } finally {
        setLoadingMetadata(false)
      }
    }, [licenseData, licenseId, loadingMetadata, metadataLoaded]) // Fixed dependencies

    // Create basic metadata when license data is available
    const createBasicMetadata = useCallback(() => {
      if (!licenseData || metadata || loadingMetadata || metadataLoaded) return
      
      const basicMetadata = {
        name: licenseData.name || `License #${licenseId}`,
        description: `Gaming license for ${licenseData.name || `License ${licenseId}`} (${licenseData.symbol || 'N/A'})`,
        image: null,
        attributes: [
          {
            trait_type: "Developer",
            value: shortenAddress(licenseData.developer)
          },
          {
            trait_type: "Publisher", 
            value: shortenAddress(licenseData.publisher)
          },
          {
            trait_type: "Platform",
            value: shortenAddress(licenseData.platform)
          },
          {
            trait_type: "Active",
            value: licenseData.isActive ? "Yes" : "No"
          }
        ]
      }
      
      setMetadata(basicMetadata)
      setMetadataLoaded(true)
      console.log('📋 Created basic metadata:', basicMetadata)
    }, [licenseData, licenseId, metadata, loadingMetadata, metadataLoaded])

    // Fixed useEffect with proper dependency management
    useEffect(() => {
      if (!licenseData?.contractAddress || metadataLoaded) return
      
      // If you have implemented useGetLicenseTokenURI and have tokenURI available:
      // if (tokenURI) {
      //   loadMetadata(tokenURI)
      //   return
      // }
      
      // For now, check if there's a way to get metadata URI from your contract
      let potentialURI = null
      
      // Check if your license creation process stores metadata URI somewhere
      // This is a placeholder - adapt based on your contract implementation
      // potentialURI = licenseData.metadataURI
      
      if (potentialURI) {
        loadMetadata(potentialURI)
      } else {
        // Create basic metadata if no URI is available
        createBasicMetadata()
      }
    }, [licenseData?.contractAddress, metadataLoaded, loadMetadata, createBasicMetadata]) // Simplified dependencies

    const handleMint = useCallback(async () => {
      if (!isConnected) {
        alert('Please connect your wallet')
        return
      }

      try {
        console.log('🚀 Starting mint process for license:', licenseId)
        setMintingLicense(licenseId)
        
        // Create metadata for the NFT
        const nftMetadata = {
          name: `${licenseData.name} License`,
          description: `Gaming license NFT for ${licenseData.name}`,
          image: metadata?.image || "https://via.placeholder.com/400x400/3b82f6/ffffff?text=Gaming+License",
          attributes: [
            {
              trait_type: "Game",
              value: licenseData.name
            },
            {
              trait_type: "Symbol",
              value: licenseData.symbol
            },
            {
              trait_type: "License ID",
              value: licenseId.toString()
            },
            {
              trait_type: "Developer",
              value: licenseData.developer
            }
          ],
          external_url: "",
          animation_url: ""
        }

        // Use data URI for metadata
        const metadataURI = `data:application/json;base64,${btoa(JSON.stringify(nftMetadata))}`
        
        console.log('📤 Minting with metadata URI:', metadataURI)
        
        const txHash = await mintLicense(licenseId, address, metadataURI)

        console.log('📝 Mint transaction submitted successfully:', txHash)
        console.log('🔗 View on Etherscan:', `https://sepolia.etherscan.io/tx/${txHash}`)
        
        setCurrentTxHash(txHash)

        addTransaction(
          txHash,
          `Minting license: ${licenseData.name}`,
          'mint-license'
        )

      } catch (error) {
        console.error('💥 Error minting license:', {
          licenseId,
          error: error.message,
          stack: error.stack
        })
        
        setMintingLicense(null)
        
        // Show user-friendly error message
        if (error.message.includes('User rejected') || error.message.includes('user rejected')) {
          alert('Transaction was cancelled by user')
        } else if (error.message.includes('insufficient funds')) {
          alert('Insufficient funds for transaction')
        } else if (error.message.includes('License is not active')) {
          alert('This license is not currently active for minting')
        } else {
          alert(`Error minting license: ${error.message}`)
        }
      }
    }, [isConnected, licenseId, licenseData, address, mintLicense, addTransaction, metadata])

    if (isLoading || (loadingMetadata && !metadata)) {
      return (
        <Card className="animate-pulse">
          <div className="h-48 bg-gray-200 rounded-t-lg"></div>
          <CardContent className="pt-4">
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </CardContent>
        </Card>
      )
    }

    if (!licenseData || !licenseData.isActive) {
      return null // Don't show inactive licenses
    }

    return (
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="h-48 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center relative">
          {metadata?.image ? (
            <img 
              src={metadata.image} 
              alt={licenseData.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                console.log('🖼️ Image failed to load:', metadata.image)
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'flex'
              }}
            />
          ) : null}
          
          {/* Fallback display when no image or image fails to load */}
          <div className={`text-center ${metadata?.image ? 'hidden' : 'flex'} flex-col items-center justify-center w-full h-full`}>
            <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Gaming License</p>
          </div>
          
          {/* License ID Badge */}
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium">
            #{licenseId}
          </div>
        </div>
        
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="truncate">{licenseData.name}</span>
            <span className="text-sm font-normal text-gray-500 ml-2">
              {licenseData.symbol}
            </span>
          </CardTitle>
          <CardDescription>
            {metadata?.description || `Gaming license for ${licenseData.name}`}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-gray-500">Developer</p>
                <p className="font-medium">{shortenAddress(licenseData.developer)}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-gray-500">Created</p>
                <p className="font-medium">
                  {new Date(Number(licenseData.timestamp) * 1000).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t pt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Fee Structure</span>
              <div className="text-right space-y-1">
                <div className="flex items-center space-x-1 text-xs">
                  <Coins className="h-3 w-3" />
                  <span>Dev: {formatEther(licenseData.developerFee)} ETH</span>
                </div>
                <div className="flex items-center space-x-1 text-xs">
                  <Coins className="h-3 w-3" />
                  <span>Platform: {formatEther(licenseData.platformFee)} ETH</span>
                </div>
                <div className="flex items-center space-x-1 text-xs">
                  <Coins className="h-3 w-3" />
                  <span>Publisher: {formatEther(licenseData.publisherFee)} ETH</span>
                </div>
              </div>
            </div>
          </div>

          {metadataError && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <p className="text-yellow-800 text-xs">Metadata: {metadataError}</p>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="space-x-2">
          <Button 
            onClick={handleMint}
            disabled={mintingLicense === licenseId || !licenseData.isActive || isMintPending}
            className="flex-1"
          >
            {mintingLicense === licenseId || isMintPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Minting...
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Mint License
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => window.open(`https://sepolia.etherscan.io/address/${licenseData.contractAddress}`, '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    )
  }

  useEffect(() => {
    console.log('📊 License IDs data updated:', licenseIds)
    
    if (licenseIds && licenseIds.length > 0) {
      const idStrings = licenseIds.map(id => id.toString())
      setLicenses(idStrings)
      setLoading(false)
      
      console.log('✅ Found licenses:', idStrings)
    } else if (!loadingIds) {
      setLoading(false)
      console.log('ℹ️ No licenses found')
    }
  }, [licenseIds, loadingIds])

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <ShoppingCart className="mx-auto h-12 w-12 text-blue-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
              <p className="text-gray-600 mb-4">
                Please connect your wallet to view and mint game licenses
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
          <p className="text-gray-600">Loading licenses...</p>
        </div>
      </div>
    )
  }

  if (licenses.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">License Marketplace</h1>
          <p className="text-gray-600">
            Discover and mint gaming licenses from developers around the world
          </p>
        </div>
        
        <div className="text-center py-12">
          <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Licenses Available</h3>
          <p className="text-gray-600">
            No game licenses have been created yet. Be the first to create one!
          </p>
          <Button 
            onClick={refetchLicenseIds}
            variant="outline"
            className="mt-4"
          >
            Refresh
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">License Marketplace</h1>
        <p className="text-gray-600">
          Discover and mint gaming licenses from developers around the world
        </p>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {licenses.length} license{licenses.length !== 1 ? 's' : ''} available
          </p>
          <Button 
            onClick={refetchLicenseIds}
            variant="outline"
            size="sm"
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {licenses.map((licenseId) => (
          <LicenseCard key={`license-${licenseId}`} licenseId={licenseId} />
        ))}
      </div>

      {/* Loading overlay during minting */}
      {(mintingLicense || isMintPending) && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="max-w-sm mx-4">
            <CardContent className="pt-6">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Minting License</h3>
                <p className="text-sm text-gray-600">
                  Please wait while your license NFT is being minted...
                </p>
                {currentTxHash && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 break-all">
                      TX: {currentTxHash}
                    </p>
                    <a 
                      href={`https://sepolia.etherscan.io/tx/${currentTxHash}`}
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