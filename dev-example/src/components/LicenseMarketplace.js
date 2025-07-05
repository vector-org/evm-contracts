"use client";
import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { Button } from './ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card'
import { useContract } from '../hooks/useContract'
import { useTransactions, useTransactionWatcher } from '../hooks/useTransactions'
import { formatEther, shortenAddress } from '../lib/utils'
import { CONTRACT_ADDRESSES, CONTRACTS } from '../lib/contracts'
import { Loader2, ShoppingCart, ExternalLink, User, Calendar, Coins } from 'lucide-react'

export default function LicenseMarketplace() {
  const { address, isConnected } = useAccount()
  const { 
    useGetAllLicenseIds, 
    useGetLicenseFromID, 
    useMintLicense 
  } = useContract()
  const { addTransaction } = useTransactions()

  const [licenses, setLicenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [mintingLicense, setMintingLicense] = useState(null)

  const { data: licenseIds, isLoading: loadingIds } = useGetAllLicenseIds()
  const { writeContractAsync: mintLicense, data: mintLicenseData } = useMintLicense()

  useTransactionWatcher(
    mintLicenseData,
    () => {
      setMintingLicense(null)
    },
    () => {
      setMintingLicense(null)
    }
  )

  const LicenseCard = ({ licenseId }) => {
    const { data: licenseData, isLoading } = useGetLicenseFromID(licenseId)
    const [metadata, setMetadata] = useState(null)
    const [loadingMetadata, setLoadingMetadata] = useState(false)

    useEffect(() => {
      if (licenseData?.contractAddress) {
        loadMetadata()
      }
    }, [licenseData])

    const loadMetadata = async () => {
      try {
        setLoadingMetadata(true)
        // Since we don't have a direct way to get metadata URI from the license,
        // we'll display the basic license information from the contract
        setMetadata({
          name: licenseData.name,
          description: `License for ${licenseData.name}`,
          image: null // Would need to be stored separately or fetched from IPFS
        })
      } catch (error) {
        console.error('Error loading metadata:', error)
      } finally {
        setLoadingMetadata(false)
      }
    }

    const handleMint = async () => {
      if (!isConnected) {
        alert('Please connect your wallet')
        return
      }

      try {
        setMintingLicense(licenseId)
        
        // For demo, we'll use a placeholder URI
        const placeholderURI = "https://ipfs.infura.io/ipfs/QmPlaceholder"
        
        const tx = await mintLicense({
          address: CONTRACT_ADDRESSES.PRIMARY_MARKETPLACE,
          abi: CONTRACTS.PRIMARY_MARKETPLACE.abi,
          functionName: 'mintLicense',
          args: [licenseId, address, placeholderURI]
        })

        addTransaction(
          tx,
          `Minting license: ${licenseData.name}`,
          'mint-license'
        )

      } catch (error) {
        console.error('Error minting license:', error)
        setMintingLicense(null)
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

    if (!licenseData || !licenseData.isActive) {
      return null
    }

    return (
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="h-48 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
          {metadata?.image ? (
            <img 
              src={metadata.image} 
              alt={licenseData.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center">
              <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No image available</p>
            </div>
          )}
        </div>
        
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{licenseData.name}</span>
            <span className="text-sm font-normal text-gray-500">
              {licenseData.symbol}
            </span>
          </CardTitle>
          <CardDescription>
            {metadata?.description || `Gaming license for ${licenseData.name}`}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
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
              <span className="text-gray-500">Fees</span>
              <div className="text-right">
                <div className="flex items-center space-x-1">
                  <Coins className="h-3 w-3" />
                  <span>Dev: {formatEther(licenseData.developerFee)} ETH</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Coins className="h-3 w-3" />
                  <span>Platform: {formatEther(licenseData.platformFee)} ETH</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="space-x-2">
          <Button 
            onClick={handleMint}
            disabled={mintingLicense === licenseId}
            className="flex-1"
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
    if (licenseIds && licenseIds.length > 0) {
      setLicenses(licenseIds.map(id => id.toString()))
      setLoading(false)
    } else if (!loadingIds) {
      setLoading(false)
    }
  }, [licenseIds, loadingIds])

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
      <div className="text-center py-12">
        <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Licenses Available</h3>
        <p className="text-gray-600">
          No game licenses have been created yet. Be the first to create one!
        </p>
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {licenses.map((licenseId) => (
          <LicenseCard key={licenseId} licenseId={licenseId} />
        ))}
      </div>
    </div>
  )
}