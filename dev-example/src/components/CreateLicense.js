"use client";
import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card'
import { useContract } from '../hooks/useContract'
import { useIPFS } from '../hooks/useIPFS'
import { useTransactions, useTransactionWatcher } from '../hooks/useTransactions'
import { CONTRACT_ADDRESSES, CONTRACTS } from '../lib/contracts'
import { parseEther } from '../lib/utils'
import { Upload, Loader2, CheckCircle, AlertCircle, Image as ImageIcon } from 'lucide-react'

export default function CreateLicense() {
  const { address, isConnected } = useAccount()
  const { useCreateLicense } = useContract()
  const { uploadToIPFS, isUploading, uploadProgress } = useIPFS()
  const { addTransaction } = useTransactions()

  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    description: '',
    developer: '',
    publisher: '',
    platform: '',
    developerFee: '',
    platformFee: '',
    publisherFee: '',
    genre: '',
    externalUrl: '',
    youtubeUrl: ''
  })
  
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [creationStatus, setCreationStatus] = useState(null)
  const [currentTxHash, setCurrentTxHash] = useState(null)
  const [ipfsImageUrl, setIpfsImageUrl] = useState(null)
  const [ipfsMetadataUrl, setIpfsMetadataUrl] = useState(null)

  // Update form when address changes
  useEffect(() => {
    if (address && !formData.developer) {
      setFormData(prev => ({
        ...prev,
        developer: address,
        publisher: address,
        platform: address
      }))
    }
  }, [address, formData.developer])

  const { createLicense, isPending: isContractPending } = useCreateLicense()

  useTransactionWatcher(
    currentTxHash,
    (receipt) => {
      console.log('🎉 License creation successful!', {
        transactionHash: currentTxHash,
        receipt: receipt
      })
      setCreationStatus('success')
      setIsCreating(false)
      
      // Reset form after successful creation
      setTimeout(() => {
        resetForm()
        setCreationStatus(null)
      }, 3000)
    },
    () => {
      console.error('💥 License creation failed:', currentTxHash)
      setCreationStatus('error')
      setIsCreating(false)
    }
  )

  const resetForm = () => {
    setFormData({
      name: '',
      symbol: '',
      description: '',
      developer: address || '',
      publisher: address || '',
      platform: address || '',
      developerFee: '',
      platformFee: '',
      publisherFee: '',
      genre: '',
      externalUrl: '',
      youtubeUrl: ''
    })
    setImageFile(null)
    setImagePreview(null)
    setIpfsImageUrl(null)
    setIpfsMetadataUrl(null)
    setCurrentTxHash(null)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      console.log('📁 Image selected:', {
        name: file.name,
        size: file.size,
        type: file.type
      })
      
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => setImagePreview(e.target.result)
      reader.readAsDataURL(file)
    }
  }

  const validateForm = () => {
    const required = ['name', 'symbol', 'developer', 'publisher', 'platform']
    const missing = required.filter(field => !formData[field].trim())
    
    if (missing.length > 0) {
      alert(`Please fill in required fields: ${missing.join(', ')}`)
      return false
    }
    
    if (!imageFile) {
      alert('Please select an image for your game')
      return false
    }
    
    // Validate Ethereum addresses
    const addressFields = ['developer', 'publisher', 'platform']
    for (const field of addressFields) {
      const addr = formData[field]
      if (addr && !addr.match(/^0x[a-fA-F0-9]{40}$/)) {
        alert(`Invalid Ethereum address for ${field}`)
        return false
      }
    }
    
    return true
  }

  const uploadImageToIPFS = async () => {
    console.log('📤 Uploading image to IPFS...')
    setCreationStatus('uploading-image')
    
    try {
      const imageHash = await uploadToIPFS(imageFile)
      const imageUrl = `ipfs://${imageHash}`
      
      console.log('✅ Image uploaded to IPFS:', {
        hash: imageHash,
        url: imageUrl
      })
      
      setIpfsImageUrl(imageUrl)
      return imageUrl
    } catch (error) {
      console.error('💥 Error uploading image to IPFS:', error)
      throw new Error(`Failed to upload image: ${error.message}`)
    }
  }

  const uploadMetadataToIPFS = async (imageUrl) => {
    console.log('📤 Uploading metadata to IPFS...')
    setCreationStatus('uploading-metadata')
    
    try {
      // Create metadata JSON with IPFS image URL
      const metadata = {
        name: formData.name.trim(),
        description: formData.description.trim() || `Gaming license for ${formData.name.trim()}`,
        image: imageUrl,
        external_url: formData.externalUrl.trim() || "",
        animation_url: formData.youtubeUrl.trim() || "",
        attributes: [
          {
            trait_type: "Symbol",
            value: formData.symbol.trim().toUpperCase()
          },
          {
            trait_type: "Genre", 
            value: formData.genre.trim() || "Gaming"
          },
          {
            trait_type: "Developer",
            value: formData.developer.trim()
          },
          {
            trait_type: "Publisher",
            value: formData.publisher.trim()
          },
          {
            trait_type: "Platform",
            value: formData.platform.trim()
          },
          {
            trait_type: "Developer Fee",
            value: `${formData.developerFee || 0} ETH`
          },
          {
            trait_type: "Platform Fee", 
            value: `${formData.platformFee || 0} ETH`
          },
          {
            trait_type: "Publisher Fee",
            value: `${formData.publisherFee || 0} ETH`
          }
        ].filter(attr => attr.value && attr.value !== "0 ETH")
      }

      console.log('📋 Metadata prepared:', metadata)
      
      // Convert metadata to JSON string and upload
      const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], {
        type: 'application/json'
      })
      
      const metadataHash = await uploadToIPFS(metadataBlob)
      const metadataUrl = `ipfs://${metadataHash}`
      
      console.log('✅ Metadata uploaded to IPFS:', {
        hash: metadataHash,
        url: metadataUrl
      })
      
      setIpfsMetadataUrl(metadataUrl)
      return metadataUrl
    } catch (error) {
      console.error('💥 Error uploading metadata to IPFS:', error)
      throw new Error(`Failed to upload metadata: ${error.message}`)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!isConnected) {
      alert('Please connect your wallet')
      return
    }

    if (!validateForm()) {
      return
    }

    try {
      console.log('🚀 Starting license creation process...')
      setIsCreating(true)
      setCurrentTxHash(null)

      // Step 1: Upload image to IPFS
      const imageUrl = await uploadImageToIPFS()
      
      // Step 2: Upload metadata with image URL to IPFS
      const metadataUrl = await uploadMetadataToIPFS(imageUrl)
      
      // Step 3: Create license on blockchain
      setCreationStatus('creating')
      console.log('⛓️ Creating license on blockchain with metadata URL:', metadataUrl)
      
      const licenseInput = {
        name: formData.name.trim(),
        symbol: formData.symbol.trim().toUpperCase(),
        isActive: true,
        developerFee: parseEther(formData.developerFee || "0"),
        platformFee: parseEther(formData.platformFee || "0"),
        publisherFee: parseEther(formData.publisherFee || "0"),
        developer: formData.developer.trim(),
        publisher: formData.publisher.trim(),
        platform: formData.platform.trim(),
        primaryMarketplace: CONTRACT_ADDRESSES.PRIMARY_MARKETPLACE,
        secondaryMarketplace: CONTRACT_ADDRESSES.SECONDARY_MARKETPLACE
      }

      console.log('📋 License input prepared:', licenseInput)
      
      const txHash = await createLicense(licenseInput)
      
      console.log('📝 Transaction submitted successfully:', txHash)
      console.log('🔗 View on Etherscan:', `https://sepolia.etherscan.io/tx/${txHash}`)
      
      setCurrentTxHash(txHash)

      addTransaction(
        txHash,
        `Creating license: ${formData.name}`,
        'create-license'
      )

    } catch (error) {
      console.error('💥 Error creating license:', {
        error: error.message,
        stack: error.stack,
        cause: error.cause
      })
      
      setCreationStatus('error')
      setIsCreating(false)
      
      // Show user-friendly error message
      if (error.message.includes('User rejected') || error.message.includes('user rejected')) {
        alert('Transaction was cancelled by user')
      } else if (error.message.includes('insufficient funds')) {
        alert('Insufficient funds for transaction')
      } else {
        alert(`Error creating license: ${error.message}`)
      }
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
                Please connect your wallet to create a game license
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-6 w-6" />
            <span>Create Game License</span>
          </CardTitle>
          <CardDescription>
            Create a new gaming license NFT contract for your game. All data will be stored on IPFS.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label htmlFor="image">Game Cover Image *</Label>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    required
                    disabled={isCreating}
                  />
                </div>
                {imagePreview && (
                  <div className="w-20 h-20 border rounded-lg overflow-hidden">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
              {imageFile && (
                <p className="text-sm text-gray-500">
                  Selected: {imageFile.name} ({(imageFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Game Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter game name"
                  required
                  disabled={isCreating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="symbol">Token Symbol *</Label>
                <Input
                  id="symbol"
                  name="symbol"
                  value={formData.symbol}
                  onChange={handleInputChange}
                  placeholder="e.g., GAME"
                  maxLength={10}
                  required
                  disabled={isCreating}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe your game..."
                className="w-full min-h-[100px] px-3 py-2 border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                disabled={isCreating}
              />
            </div>

            {/* Stakeholders */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="developer">Developer Address *</Label>
                <Input
                  id="developer"
                  name="developer"
                  value={formData.developer}
                  onChange={handleInputChange}
                  placeholder="0x..."
                  required
                  disabled={isCreating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="publisher">Publisher Address *</Label>
                <Input
                  id="publisher"
                  name="publisher"
                  value={formData.publisher}
                  onChange={handleInputChange}
                  placeholder="0x..."
                  required
                  disabled={isCreating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="platform">Platform Address *</Label>
                <Input
                  id="platform"
                  name="platform"
                  value={formData.platform}
                  onChange={handleInputChange}
                  placeholder="0x..."
                  required
                  disabled={isCreating}
                />
              </div>
            </div>

            {/* Fees */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="developerFee">Developer Fee (ETH)</Label>
                <Input
                  id="developerFee"
                  name="developerFee"
                  type="number"
                  step="0.001"
                  min="0"
                  value={formData.developerFee}
                  onChange={handleInputChange}
                  placeholder="0.0"
                  disabled={isCreating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="platformFee">Platform Fee (ETH)</Label>
                <Input
                  id="platformFee"
                  name="platformFee"
                  type="number"
                  step="0.001"
                  min="0"
                  value={formData.platformFee}
                  onChange={handleInputChange}
                  placeholder="0.0"
                  disabled={isCreating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="publisherFee">Publisher Fee (ETH)</Label>
                <Input
                  id="publisherFee"
                  name="publisherFee"
                  type="number"
                  step="0.001"
                  min="0"
                  value={formData.publisherFee}
                  onChange={handleInputChange}
                  placeholder="0.0"
                  disabled={isCreating}
                />
              </div>
            </div>

            {/* Additional Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="genre">Genre</Label>
                <Input
                  id="genre"
                  name="genre"
                  value={formData.genre}
                  onChange={handleInputChange}
                  placeholder="e.g., Action, RPG, Strategy"
                  disabled={isCreating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="externalUrl">Website URL</Label>
                <Input
                  id="externalUrl"
                  name="externalUrl"
                  type="url"
                  value={formData.externalUrl}
                  onChange={handleInputChange}
                  placeholder="https://..."
                  disabled={isCreating}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="youtubeUrl">Trailer/Demo URL</Label>
              <Input
                id="youtubeUrl"
                name="youtubeUrl"
                type="url"
                value={formData.youtubeUrl}
                onChange={handleInputChange}
                placeholder="https://youtube.com/..."
                disabled={isCreating}
              />
            </div>

            {/* Status Display */}
            {creationStatus === 'uploading-image' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  <div>
                    <p className="text-blue-800 font-medium">
                      Uploading image to IPFS... {uploadProgress}%
                    </p>
                    <p className="text-blue-600 text-sm">
                      This may take a few moments depending on file size
                    </p>
                  </div>
                </div>
              </div>
            )}

            {creationStatus === 'uploading-metadata' && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                  <div>
                    <p className="text-purple-800 font-medium">
                      Uploading metadata to IPFS...
                    </p>
                    <p className="text-purple-600 text-sm">
                      Creating metadata JSON with IPFS image reference
                    </p>
                    {ipfsImageUrl && (
                      <p className="text-purple-600 text-xs mt-1">
                        Image: {ipfsImageUrl}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {creationStatus === 'creating' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Loader2 className="h-5 w-5 animate-spin text-yellow-600" />
                  <div>
                    <p className="text-yellow-800 font-medium">Creating license on blockchain...</p>
                    <p className="text-yellow-600 text-sm">
                      Please wait for transaction confirmation
                    </p>
                    {ipfsMetadataUrl && (
                      <p className="text-yellow-600 text-xs mt-1">
                        Metadata: {ipfsMetadataUrl}
                      </p>
                    )}
                    {currentTxHash && (
                      <div className="mt-2">
                        <p className="text-yellow-600 text-xs">
                          TX: {currentTxHash}
                        </p>
                        <a 
                          href={`https://sepolia.etherscan.io/tx/${currentTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-yellow-700 text-xs underline"
                        >
                          View on Etherscan
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {creationStatus === 'success' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-green-800 font-medium">License created successfully!</p>
                    <p className="text-green-600 text-sm">
                      Your game license is now available in the marketplace
                    </p>
                    {ipfsMetadataUrl && (
                      <p className="text-green-600 text-xs mt-1">
                        Metadata: {ipfsMetadataUrl}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {creationStatus === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-red-800 font-medium">Failed to create license</p>
                    <p className="text-red-600 text-sm">
                      Please check the console for details and try again
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter>
            <Button 
              type="submit" 
              disabled={isCreating || isUploading || !formData.name || !imageFile || isContractPending}
              className="w-full"
            >
              {isCreating || isUploading || isContractPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {creationStatus === 'uploading-image' ? 'Uploading Image...' : 
                   creationStatus === 'uploading-metadata' ? 'Uploading Metadata...' : 
                   'Creating License...'}
                </>
              ) : (
                'Create License'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}