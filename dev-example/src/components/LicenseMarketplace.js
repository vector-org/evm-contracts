"use client";
import { useState, useEffect, useCallback, useRef } from 'react'
import { useAccount } from 'wagmi'
import { Button } from './ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card'
import { useContract } from '../hooks/useContract'
import { useTransactions, useTransactionWatcher } from '../hooks/useTransactions'
import { formatEther } from '../lib/utils'
import { MetadataUtils } from '../lib/metadataUtils'
import { Loader2, ShoppingCart, ExternalLink, User, Coins, AlertTriangle, Package, Crown, Gamepad2, TrendingUp } from 'lucide-react'

export default function LicenseMarketplace() {
  const { address, isConnected } = useAccount()
  const { 
    useGetAllLicenseIds, 
    useGetLicenseFromID, 
    useMintLicense,
    useGetLicenseTokenURI
  } = useContract()
  const { addTransaction } = useTransactions()

  const [licenses, setLicenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [mintingLicense, setMintingLicense] = useState(null)
  const [currentTxHash, setCurrentTxHash] = useState(null)
  const processedLicenseIds = useRef(null)

  const { data: licenseIds, isLoading: loadingIds, refetch: refetchLicenseIds, error: idsError } = useGetAllLicenseIds()
  const { mintLicense, isPending: isMintPending } = useMintLicense()

  useTransactionWatcher(
    currentTxHash,
    useCallback((receipt) => {
      setMintingLicense(null)
      setCurrentTxHash(null)
      setTimeout(() => refetchLicenseIds(), 2000)
    }, [currentTxHash, refetchLicenseIds]),
    useCallback(() => {
      setMintingLicense(null)
      setCurrentTxHash(null)
    }, [currentTxHash])
  )

  const LicenseCard = ({ licenseId, index }) => {
    const { data: licenseData, isLoading: isLoadingLicense, error: licenseError } = useGetLicenseFromID(licenseId)
    const { data: tokenURI, isLoading: isLoadingTokenURI } = useGetLicenseTokenURI(licenseData?.contractAddress, licenseId)
    
    // Simple metadata state without complex hook
    const [metadata, setMetadata] = useState(null)
    const [metadataLoading, setMetadataLoading] = useState(false)
    const [metadataError, setMetadataError] = useState(null)
    const [metadataSource, setMetadataSource] = useState(null)

    // Handle metadata loading with simple useEffect
    useEffect(() => {
      if (tokenURI && !metadata) {
        // We have a URI, try to fetch
        setMetadataLoading(true)
        MetadataUtils.fetchMetadataEnhanced(tokenURI)
          .then(fetchedMetadata => {
            const normalized = MetadataUtils.normalizeImageUrls(fetchedMetadata)
            setMetadata(normalized)
            setMetadataSource('uri')
            setMetadataLoading(false)
          })
          .catch(error => {
            setMetadataError(error.message)
            // Create fallback on error
            if (licenseData) {
              const fallback = MetadataUtils.createLicenseFallbackMetadata(licenseData, licenseId)
              setMetadata(fallback)
              setMetadataSource('fallback')
            }
            setMetadataLoading(false)
          })
      } else if (!tokenURI && !isLoadingTokenURI && licenseData && !metadata) {
        // No URI, create fallback
        const fallback = MetadataUtils.createLicenseFallbackMetadata(licenseData, licenseId)
        setMetadata(fallback)
        setMetadataSource('fallback')
      }
    }, [tokenURI, isLoadingTokenURI, licenseData, licenseId, metadata])

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
        setMintingLicense(licenseId)
        
        const nftMetadata = {
          name: `${licenseData.name} License NFT`,
          description: `Gaming license NFT for ${licenseData.name} (${licenseData.symbol})`,
          image: metadata?.image || null,
          external_url: metadata?.external_url || '',
          attributes: [
            { trait_type: "License ID", value: licenseId.toString() },
            { trait_type: "License Name", value: licenseData.name },
            { trait_type: "Symbol", value: licenseData.symbol },
            { trait_type: "Owner", value: MetadataUtils.shortenAddress(address) },
            { trait_type: "Minted At", value: new Date().toISOString() }
          ]
        }

        const metadataResult = await MetadataUtils.uploadMetadata(nftMetadata)
        const totalCost = BigInt(licenseData.developerFee || 0) + 
                          BigInt(licenseData.platformFee || 0) + 
                          BigInt(licenseData.publisherFee || 0)

        const tx = await mintLicense({
          licenseId: licenseId,
          metadataURI: `ipfs://${metadataResult.cid}`,
          value: totalCost.toString()
        })

        setCurrentTxHash(tx.hash)
        addTransaction({
          hash: tx.hash,
          description: `Mint ${licenseData.name} License NFT`,
          status: 'pending'
        })

      } catch (error) {
        alert(`Minting failed: ${error.message}`)
        setMintingLicense(null)
      }
    }, [licenseId, licenseData, address, isConnected, mintLicense, metadata, addTransaction])

    if (isLoadingLicense) {
      return (
        <Card className="h-96 bg-gradient-to-br from-gray-50 to-gray-100">
          <CardContent className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center space-y-3">
              <div className="relative">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <div className="absolute inset-0 bg-blue-500 rounded-full opacity-20 animate-pulse"></div>
              </div>
              <span className="text-sm font-medium text-gray-600">Loading license {licenseId}...</span>
            </div>
          </CardContent>
        </Card>
      )
    }

    if (licenseError || !licenseData) {
      return (
        <Card className="h-96 border-dashed border-2 border-gray-300">
          <CardContent className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
              <div>
                <p className="text-sm font-medium text-gray-700">License {licenseId} Unavailable</p>
                <p className="text-xs text-gray-500 mt-1">This license may not be configured properly</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    }

    const totalFee = (BigInt(licenseData.developerFee || 0) + 
                     BigInt(licenseData.platformFee || 0) + 
                     BigInt(licenseData.publisherFee || 0))

    return (
      <Card className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-105 ${
        licenseData.isActive 
          ? 'bg-gradient-to-br from-white via-blue-50 to-purple-50 border-blue-200' 
          : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300'
      }`}>
        {/* Status Indicator */}
        <div className={`absolute top-4 right-4 w-3 h-3 rounded-full ${
          licenseData.isActive ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-red-500'
        }`} />

        {/* Premium Badge */}
        {index < 3 && (
          <div className="absolute top-0 left-0 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-br-lg">
            <Crown className="h-3 w-3 inline mr-1" />
            FEATURED
          </div>
        )}

        <CardHeader className="pb-3">
          <div className="space-y-2">
            <CardTitle className="text-lg leading-tight flex items-center space-x-2">
              <Gamepad2 className="h-5 w-5 text-blue-500" />
              <span>{metadata?.name || licenseData.name || `License #${licenseId}`}</span>
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              {metadata?.description || `Gaming license for ${licenseData.name || `License ${licenseId}`}`}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Metadata Image */}
          {/* Metadata Image with Fallback */}
<div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden group">
  {metadata?.image ? (
    <>
      <img 
        src={metadata.imageUrl || metadata.image} 
        alt={metadata.name}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        onError={(e) => {
          console.log('🖼️ Image failed to load:', metadata.image)
          e.target.style.display = 'none'
          e.target.nextElementSibling.style.display = 'flex'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </>
  ) : (
    /* Fallback display when no image available */
    <div className="flex flex-col items-center justify-center w-full h-full text-gray-400">
      <div className="relative">
        <Gamepad2 className="h-16 w-16 mb-3" />
        <div className="absolute inset-0 bg-blue-500 rounded-full opacity-10 animate-pulse"></div>
      </div>
      <p className="text-sm font-medium text-gray-500">Gaming License</p>
      <p className="text-xs text-gray-400 mt-1">{licenseData.symbol}</p>
    </div>
  )}
  
  {/* License Status Badge */}
  <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium ${
    licenseData.isActive 
      ? 'bg-green-100 text-green-800 border border-green-200' 
      : 'bg-red-100 text-red-800 border border-red-200'
  }`}>
    {licenseData.isActive ? 'Active' : 'Inactive'}
  </div>
  
  {/* Source Indicator */}
  <div className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium ${
    metadataSource === 'uri' 
      ? 'bg-blue-100 text-blue-800 border border-blue-200' 
      : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
  }`}>
    {metadataSource === 'uri' ? '🔗 URI' : '📋 Fallback'}
  </div>
</div>

          {/* License Information Grid */}
          <div className="space-y-3">
            {/* Contract Address */}
            <div className="flex items-center justify-between text-sm bg-white/50 rounded-lg p-3">
              <span className="text-gray-600 flex items-center">
                <Package className="h-4 w-4 mr-2" />
                Contract
              </span>
              <a 
                href={`https://sepolia.etherscan.io/address/${licenseData.contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors font-medium"
              >
                <span>{MetadataUtils.shortenAddress(licenseData.contractAddress)}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* Stakeholders */}
            <div className="grid grid-cols-1 gap-2 text-xs bg-white/50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center">
                  <User className="h-3 w-3 mr-1" />
                  Developer
                </span>
                <span className="font-mono font-medium">{MetadataUtils.shortenAddress(licenseData.developer)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center">
                  <User className="h-3 w-3 mr-1" />
                  Publisher
                </span>
                <span className="font-mono font-medium">{MetadataUtils.shortenAddress(licenseData.publisher)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center">
                  <User className="h-3 w-3 mr-1" />
                  Platform
                </span>
                <span className="font-mono font-medium">{MetadataUtils.shortenAddress(licenseData.platform)}</span>
              </div>
            </div>

            {/* Fee Structure */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2 text-blue-500" />
                  Total Cost
                </span>
                <span className="text-lg font-bold text-blue-600">
                  {formatEther(totalFee.toString())} ETH
                </span>
              </div>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Developer Fee:</span>
                  <span className="font-medium">{formatEther(licenseData.developerFee || 0)} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Fee:</span>
                  <span className="font-medium">{formatEther(licenseData.platformFee || 0)} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span>Publisher Fee:</span>
                  <span className="font-medium">{formatEther(licenseData.publisherFee || 0)} ETH</span>
                </div>
              </div>
            </div>
          </div>

          {/* Metadata Source Indicator */}
          <div className="flex items-center space-x-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${
              metadataSource === 'uri' ? 'bg-green-500' : 'bg-yellow-500'
            }`} />
            <span className="text-gray-500">
              {metadataSource === 'uri' ? 'Metadata from contract' : 'Fallback metadata'}
            </span>
            {metadataError && (
              <AlertTriangle className="h-3 w-3 text-amber-500" />
            )}
          </div>
        </CardContent>

        <CardFooter>
          <Button 
            onClick={handleMint}
            disabled={mintingLicense === licenseId || !licenseData.isActive || isMintPending || metadataLoading}
            className={`w-full transition-all duration-300 ${
              mintingLicense === licenseId || isMintPending
                ? 'bg-gray-400'
                : licenseData.isActive
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl'
                : 'bg-gray-500'
            }`}
          >
            {mintingLicense === licenseId || isMintPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Minting License...
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Mint License ({formatEther(totalFee.toString())} ETH)
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    )
  }

  useEffect(() => {
    if (licenseIds && JSON.stringify(licenseIds) !== JSON.stringify(processedLicenseIds.current)) {
      processedLicenseIds.current = licenseIds
      setLicenses(licenseIds)
      setLoading(false)
    } else if (!loadingIds && !licenseIds) {
      setLoading(false)
    }
  }, [licenseIds?.length, loadingIds])

  if (loading) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto" />
            <div className="absolute inset-0 bg-blue-500 rounded-full opacity-20 animate-pulse"></div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Loading Gaming Licenses</h3>
            <p className="text-gray-600">Fetching available licenses from the blockchain...</p>
          </div>
        </div>
      </div>
    )
  }

  if (idsError) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Connection Error</h3>
        <p className="text-gray-600 mb-4">Unable to load license data from the blockchain.</p>
        <p className="text-red-600 text-sm mb-6">{idsError.message}</p>
        <Button onClick={() => refetchLicenseIds()} className="bg-blue-500 hover:bg-blue-600">
          Try Again
        </Button>
      </div>
    )
  }

  if (licenses.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="relative mb-6">
          <Gamepad2 className="h-20 w-20 text-gray-300 mx-auto" />
          <div className="absolute inset-0 bg-gray-300 rounded-full opacity-20 animate-pulse"></div>
        </div>
        <h3 className="text-xl font-medium text-gray-900 mb-2">No Gaming Licenses Available</h3>
        <p className="text-gray-600">Check back later for new gaming license opportunities.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="relative inline-block">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Gaming License Marketplace
          </h1>
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-lg blur opacity-20"></div>
        </div>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Discover and mint exclusive gaming licenses. Access premium games, earn rewards, and join the future of gaming.
        </p>
        <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
          <div className="flex items-center space-x-2">
            <Package className="h-4 w-4" />
            <span>{licenses.length} Available Licenses</span>
          </div>
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>Verified Developers</span>
          </div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Real-time Pricing</span>
          </div>
        </div>
      </div>

      {/* License Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {licenses.map((licenseId, index) => (
          <LicenseCard key={licenseId} licenseId={licenseId} index={index} />
        ))}
      </div>
    </div>
  )
}