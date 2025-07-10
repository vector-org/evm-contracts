"use client";
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { Button } from './ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card'
import { useContract } from '../hooks/useContract'
import { useLicenseMetadata } from '../hooks/useMetadata'
import { useSimpleTransactions, useSimpleTransactionWatcher } from '../hooks/useSimpleTransactionWatcher'
import { formatEther, shortenAddress } from '../lib/utils'
import { MetadataUtils } from '../lib/metadataUtils'
import { Loader2, ShoppingCart, ExternalLink, User, Calendar, Coins, AlertTriangle, RefreshCw } from 'lucide-react'

export default function LicenseMarketplace() {
  const { address, isConnected } = useAccount()
  const { 
    useGetAllLicenseIds, 
    useGetLicenseFromID, 
    useMintLicense
  } = useContract()
  const { addTransaction, updateTransaction } = useSimpleTransactions()

  const [licenses, setLicenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [mintingLicense, setMintingLicense] = useState(null)
  const [currentTxHash, setCurrentTxHash] = useState(null)

  const { data: licenseIds, isLoading: loadingIds, refetch: refetchLicenseIds } = useGetAllLicenseIds()
  const { mintLicense, isPending: isMintPending } = useMintLicense()

  // Simple transaction watcher
  useSimpleTransactionWatcher(
    currentTxHash,
    useCallback((receipt) => {
      console.log('🎉 License minted successfully!', receipt)
      updateTransaction(currentTxHash, { status: 'success', receipt })
      setMintingLicense(null)
      setCurrentTxHash(null)
      // Refresh license data
      setTimeout(() => refetchLicenseIds(), 2000)
    }, [currentTxHash, updateTransaction, refetchLicenseIds]),
    useCallback((error) => {
      console.error('💥 License mint failed', error)
      updateTransaction(currentTxHash, { status: 'error', error: error.message })
      setMintingLicense(null)
      setCurrentTxHash(null)
    }, [currentTxHash, updateTransaction])
  )

  // Load licenses
  useEffect(() => {
    if (licenseIds?.length > 0) {
      setLicenses(licenseIds.map(id => id.toString()))
      setLoading(false)
    } else if (!loadingIds) {
      setLoading(false)
    }
  }, [licenseIds, loadingIds])

  const LicenseCard = ({ licenseId }) => {
    const { data: licenseData, isLoading: isLoadingLicense } = useGetLicenseFromID(licenseId)
    
    // Create stable license data for the hook to prevent re-renders
    const stableLicenseData = useMemo(() => {
      if (!licenseData) return null
      return {
        ...licenseData,
        id: licenseId
      }
    }, [licenseData, licenseId])

    const { metadata, loading: loadingMetadata, error: metadataError, retry } = useLicenseMetadata(stableLicenseData)

    // Define state variables first - simplified logic
    const hasMetadata = !!metadata
    const hasImage = hasMetadata && !!metadata.image
    const showMetadataLoading = loadingMetadata
    const hasMetadataError = !!metadataError

    // Debug log to track metadata changes
    useEffect(() => {
      console.log(`🎯 License ${licenseId} state:`, {
        loadingMetadata,
        hasMetadata,
        hasImage,
        metadataName: metadata?.name,
        metadataImage: metadata?.image,
        imageUrl: metadata?.image
      })
    }, [metadata, loadingMetadata, licenseId, hasMetadata, hasImage])

    const handleMint = useCallback(async () => {
      if (!isConnected) {
        alert('Please connect your wallet')
        return
      }

      if (!licenseData) {
        alert('License data not loaded')
        return
      }

      try {
        console.log('🚀 Starting mint process for license:', licenseId)
        setMintingLicense(licenseId)
        
        // Use the license URI from the factory data as the NFT metadata URI
        let nftURI = licenseData.uri || ''
        
        if (!nftURI) {
          console.warn('⚠️ No URI available for license, minting without metadata')
        }
        
        console.log('📤 Minting with URI:', nftURI)
        
        const hash = await mintLicense(licenseId, address, nftURI)
        
        console.log('✅ Mint transaction submitted:', hash)
        setCurrentTxHash(hash)
        
        addTransaction(
          hash,
          `Minting license: ${licenseData.name}`,
          'mint-license'
        )
        
      } catch (error) {
        console.error('💥 Mint failed:', error)
        setMintingLicense(null)
        
        if (error.message.includes('User rejected')) {
          alert('Transaction cancelled by user')
        } else if (error.message.includes('insufficient funds')) {
          alert('Insufficient funds for transaction')
        } else if (error.message.includes('License is not active')) {
          alert('This license is not currently active for minting')
        } else {
          alert(`Error minting license: ${error.message}`)
        }
      }
    }, [isConnected, licenseId, licenseData, address, mintLicense, addTransaction])

    // Loading state
    if (isLoadingLicense) {
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

    // Don't show inactive licenses
    if (!licenseData || !licenseData.isActive) {
      return null
    }

    return (
      <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
        <div className="h-48 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center relative flex-shrink-0">
          {/* Debug: Show current state */}
          <div className="absolute top-2 left-2 bg-black/70 text-white text-xs p-1 rounded z-10">
            M:{hasMetadata ? '✓' : '✗'} I:{hasImage ? '✓' : '✗'} L:{loadingMetadata ? '⏳' : '✓'}
          </div>
          
          {hasImage ? (
            <img 
              src={metadata.image} 
              alt={metadata.name || licenseData.name}
              className="w-full h-full object-cover"
              onLoad={() => {
                console.log('✅ Image loaded successfully:', metadata.image)
              }}
              onError={(e) => {
                console.log('❌ Primary image URL failed:', metadata.image)
                
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
                document.querySelector(`#fallback-${licenseId}`).style.display = 'flex'
              }}
            />
          ) : null}
          
          {/* Fallback display */}
          <div 
            id={`fallback-${licenseId}`}
            className={`text-center flex flex-col items-center justify-center w-full h-full ${hasImage ? 'hidden' : ''}`}
          >
            <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Gaming License</p>
            {showMetadataLoading && (
              <div className="mt-2">
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                <p className="text-xs text-gray-400 mt-1">Loading metadata...</p>
              </div>
            )}
            {hasMetadata && !hasImage && (
              <p className="text-xs text-gray-400 mt-1">No image available</p>
            )}
          </div>
          
          {/* License ID Badge */}
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium">
            #{licenseId}
          </div>
          
          {/* Metadata Status Badge */}
          {licenseData.uri && (
            <div className={`absolute bottom-2 left-2 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium ${
              showMetadataLoading 
                ? 'bg-yellow-100/90 text-yellow-800' 
                : hasMetadataError 
                  ? 'bg-red-100/90 text-red-800' 
                  : hasMetadata
                    ? 'bg-green-100/90 text-green-800'
                    : 'bg-gray-100/90 text-gray-800'
            }`}>
              {showMetadataLoading ? (
                <div className="flex items-center">
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Loading...
                </div>
              ) : hasMetadataError ? (
                'Error'
              ) : hasMetadata ? (
                'Metadata ✓'
              ) : (
                'No Metadata'
              )}
            </div>
          )}
        </div>
        
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center justify-between">
            <span className="truncate">
              {hasMetadata ? metadata.name : licenseData.name}
            </span>
            <span className="text-sm font-normal text-gray-500 ml-2 flex-shrink-0">
              {licenseData.symbol}
            </span>
          </CardTitle>
          <CardDescription className="line-clamp-2">
            {hasMetadata ? metadata.description : `Gaming license for ${licenseData.name}`}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 flex-grow">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-gray-500">Developer</p>
                <p className="font-medium truncate">{shortenAddress(licenseData.developer)}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-gray-500">Created</p>
                <p className="font-medium">
                  {new Date(Number(licenseData.timestamp) * 1000).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* URI Information */}
          {licenseData.uri && (
            <div className="border-t pt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Metadata</span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded truncate max-w-24">
                    {MetadataUtils.shortenURI(licenseData.uri, 20)}
                  </span>
                  {MetadataUtils.isIPFSURI(licenseData.uri) && (
                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                      IPFS
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="border-t pt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Contract</span>
              <a 
                href={`https://sepolia.etherscan.io/address/${licenseData.contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
              >
                <span className="font-medium">{shortenAddress(licenseData.contractAddress)}</span>
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
              </a>
            </div>
          </div>

          {metadata?.attributes && (
            <div className="border-t pt-3">
              <p className="text-sm text-gray-500 mb-2">Attributes</p>
              <div className="grid grid-cols-2 gap-2">
                {metadata.attributes.slice(0, 4).map((attr, index) => (
                  <div key={index} className="text-xs min-w-0">
                    <span className="text-gray-500 block truncate">{attr.trait_type}</span>
                    <span className="font-medium truncate block">{attr.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasMetadataError && (
            <div className="border-t pt-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-yellow-600">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">Metadata failed to load</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={retry}
                  className="h-6 px-2 flex-shrink-0"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex-shrink-0">
          <Button 
            onClick={handleMint}
            disabled={mintingLicense === licenseId || isMintPending || !isConnected}
            className="w-full"
          >
            {mintingLicense === licenseId ? (
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
        </CardFooter>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading licenses...</p>
        </div>
      </div>
    )
  }

  if (licenses.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center py-8">
          <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Licenses Available</h3>
          <p className="text-gray-500">There are no gaming licenses available for minting at the moment.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Gaming License Marketplace</h2>
          <p className="text-lg text-gray-600">Discover and mint gaming licenses from developers around the world</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
          {licenses.map((licenseId) => (
            <LicenseCard key={licenseId} licenseId={licenseId} />
          ))}
        </div>
      </div>
    </div>
  )
}