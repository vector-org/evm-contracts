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
import { CONTRACT_ADDRESSES } from '../lib/contracts'
import { parseEther } from '../lib/utils'
import { Upload, Loader2, CheckCircle, AlertCircle, Image as ImageIcon, X, FileImage, Camera } from 'lucide-react'

export default function CreateLicense() {
  const { address, isConnected } = useAccount()
  const { useCreateLicense } = useContract()
  const { uploadGameMetadata, isUploading, uploadProgress } = useIPFS() // Use uploadGameMetadata instead of uploadToIPFS
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
  const [dragActive, setDragActive] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [creationStatus, setCreationStatus] = useState(null)
  const [currentTxHash, setCurrentTxHash] = useState(null)
  const [ipfsResults, setIpfsResults] = useState(null)

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
      console.log('🎉 [CreateLicense] License creation successful!', {
        transactionHash: currentTxHash,
        receipt: receipt,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString()
      })
      setCreationStatus('success')
      setIsCreating(false)
      
      // Reset form after successful creation
      setTimeout(() => {
        resetForm()
        setCreationStatus(null)
      }, 3000)
    },
    (error) => {
      console.error('💥 [CreateLicense] License creation failed:', {
        transactionHash: currentTxHash,
        error: error.message
      })
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
    setIpfsResults(null)
    setCurrentTxHash(null)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleImageChange = (file) => {
    if (file && file.type.startsWith('image/')) {
      console.log('📁 [CreateLicense] Image selected:', {
        name: file.name,
        size: file.size,
        type: file.type
      })
      
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => setImagePreview(e.target.result)
      reader.readAsDataURL(file)
    } else {
      alert('Please select a valid image file (PNG, JPG, GIF, etc.)')
    }
  }

  const handleFileInputChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      handleImageChange(file)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleImageChange(files[0])
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
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
        alert(`Invalid ${field} address format`)
        return false
      }
    }
    
    return true
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
      setIsCreating(true)
      setCreationStatus('uploading')
      
      console.log('🚀 [CreateLicense] Starting license creation process...')
      
      // Use uploadGameMetadata which handles both image and metadata upload properly
      console.log('📤 [CreateLicense] Uploading game data and image...')
      const uploadResult = await uploadGameMetadata(formData, imageFile)
      
      console.log('✅ [CreateLicense] Upload completed:', {
        imageHash: uploadResult.imageHash,
        metadataHash: uploadResult.metadataHash,
        imageUrl: uploadResult.imageUrl,
        metadataUrl: uploadResult.metadataUrl
      })
      
      setIpfsResults(uploadResult)
      
      // Create license contract with the metadata URI
      setCreationStatus('creating-contract')
      console.log('📝 [CreateLicense] Creating license contract...')
      
      const licenseInput = {
        name: formData.name.trim(),
        symbol: formData.symbol.trim().toUpperCase(),
        uri: `ipfs://${uploadResult.metadataHash}`, // Use the IPFS URI format
        isActive: true,
        developerFee: formData.developerFee ? parseEther(formData.developerFee) : 0n,
        platformFee: formData.platformFee ? parseEther(formData.platformFee) : 0n,
        publisherFee: formData.publisherFee ? parseEther(formData.publisherFee) : 0n,
        developer: formData.developer.trim(),
        publisher: formData.publisher.trim(),
        platform: formData.platform.trim(),
        primaryMarketplace: CONTRACT_ADDRESSES.PRIMARY_MARKETPLACE,
        secondaryMarketplace: CONTRACT_ADDRESSES.SECONDARY_MARKETPLACE
      }
      
      console.log('🔧 [CreateLicense] License input prepared:', {
        ...licenseInput,
        uri: licenseInput.uri,
        fees: {
          developer: licenseInput.developerFee.toString(),
          platform: licenseInput.platformFee.toString(),
          publisher: licenseInput.publisherFee.toString()
        }
      })
      
      const txHash = await createLicense(licenseInput)
      console.log('📤 [CreateLicense] Transaction submitted:', txHash)
      
      setCurrentTxHash(txHash)
      setCreationStatus('confirming')
      
      addTransaction(txHash, `Creating license: ${formData.name}`, 'create-license')
      
    } catch (error) {
      console.error('💥 [CreateLicense] License creation failed:', {
        error: error.message,
        stack: error.stack,
        formData: formData
      })
      setCreationStatus('error')
      setIsCreating(false)
      
      if (error.message.includes('User rejected')) {
        alert('Transaction cancelled by user')
      } else if (error.message.includes('insufficient funds')) {
        alert('Insufficient funds for transaction')
      } else {
        alert(`Error creating license: ${error.message}`)
      }
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-gray-900">Create Game License</CardTitle>
          <CardDescription className="text-lg text-gray-600">
            Create a new gaming license NFT with rich metadata stored on IPFS
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-8">
            {/* Image Upload */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold text-gray-900">Game Cover Image *</Label>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upload Area */}
                <div
                  className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-200 ${
                    dragActive 
                      ? 'border-blue-500 bg-blue-50' 
                      : imageFile 
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isCreating}
                  />
                  
                  <div className="text-center">
                    {imageFile ? (
                      <div className="space-y-3">
                        <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                        <div>
                          <p className="text-lg font-medium text-green-800">{imageFile.name}</p>
                          <p className="text-sm text-green-600">
                            {(imageFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={removeImage}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                        <div>
                          <p className="text-lg font-medium text-gray-700">
                            Drop your image here or click to browse
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            Supports PNG, JPG, GIF up to 10MB
                          </p>
                        </div>
                        <Button type="button" variant="outline" className="pointer-events-none">
                          <Camera className="h-4 w-4 mr-2" />
                          Choose File
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Preview Area */}
                <div className="flex items-center justify-center">
                  {imagePreview ? (
                    <div className="relative">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="max-w-full max-h-64 rounded-lg shadow-md object-cover"
                      />
                      <div className="absolute -top-2 -right-2">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={removeImage}
                          className="rounded-full h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 w-full border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                      <FileImage className="h-16 w-16 text-gray-300" />
                      <p className="text-gray-500 text-center mt-2">Image preview will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Basic Game Information */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900 border-b pb-2">Game Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">Game Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter your game name"
                    required
                    disabled={isCreating}
                    className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="symbol" className="text-sm font-medium text-gray-700">Token Symbol *</Label>
                  <Input
                    id="symbol"
                    name="symbol"
                    value={formData.symbol}
                    onChange={handleInputChange}
                    placeholder="e.g., GAME"
                    maxLength={10}
                    required
                    disabled={isCreating}
                    className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 uppercase"
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">Description</Label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe your game, its features, gameplay, and what makes it special..."
                  rows={4}
                  disabled={isCreating}
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-50"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="genre" className="text-sm font-medium text-gray-700">Genre</Label>
                  <Input
                    id="genre"
                    name="genre"
                    value={formData.genre}
                    onChange={handleInputChange}
                    placeholder="e.g., Action, RPG, Strategy, Adventure"
                    disabled={isCreating}
                    className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="externalUrl" className="text-sm font-medium text-gray-700">Website URL</Label>
                  <Input
                    id="externalUrl"
                    name="externalUrl"
                    type="url"
                    value={formData.externalUrl}
                    onChange={handleInputChange}
                    placeholder="https://yourgame.com"
                    disabled={isCreating}
                    className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="youtubeUrl" className="text-sm font-medium text-gray-700">Trailer/Demo URL</Label>
                <Input
                  id="youtubeUrl"
                  name="youtubeUrl"
                  type="url"
                  value={formData.youtubeUrl}
                  onChange={handleInputChange}
                  placeholder="https://youtube.com/watch?v=..."
                  disabled={isCreating}
                  className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Stakeholder Information */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900 border-b pb-2">Stakeholder Addresses</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="developer" className="text-sm font-medium text-gray-700">Developer Address *</Label>
                  <Input
                    id="developer"
                    name="developer"
                    value={formData.developer}
                    onChange={handleInputChange}
                    placeholder="0x..."
                    required
                    disabled={isCreating}
                    className="h-12 text-sm font-mono border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="publisher" className="text-sm font-medium text-gray-700">Publisher Address *</Label>
                  <Input
                    id="publisher"
                    name="publisher"
                    value={formData.publisher}
                    onChange={handleInputChange}
                    placeholder="0x..."
                    required
                    disabled={isCreating}
                    className="h-12 text-sm font-mono border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="platform" className="text-sm font-medium text-gray-700">Platform Address *</Label>
                  <Input
                    id="platform"
                    name="platform"
                    value={formData.platform}
                    onChange={handleInputChange}
                    placeholder="0x..."
                    required
                    disabled={isCreating}
                    className="h-12 text-sm font-mono border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Fee Structure */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900 border-b pb-2">Fee Structure (Optional)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="developerFee" className="text-sm font-medium text-gray-700">Developer Fee (ETH)</Label>
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
                    className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="platformFee" className="text-sm font-medium text-gray-700">Platform Fee (ETH)</Label>
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
                    className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="publisherFee" className="text-sm font-medium text-gray-700">Publisher Fee (ETH)</Label>
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
                    className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Status Display */}
            {creationStatus === 'uploading' && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-center space-x-4">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <div className="flex-1">
                    <p className="text-blue-800 font-semibold text-lg">
                      Uploading to IPFS... {uploadProgress}%
                    </p>
                    <p className="text-blue-600">
                      Uploading image and metadata to decentralized storage
                    </p>
                    <div className="w-full bg-blue-200 rounded-full h-2 mt-3">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {creationStatus === 'creating-contract' && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
                <div className="flex items-center space-x-4">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                  <div>
                    <p className="text-orange-800 font-semibold text-lg">Creating license contract...</p>
                    <p className="text-orange-600">Please confirm the transaction in your wallet</p>
                  </div>
                </div>
              </div>
            )}

            {creationStatus === 'confirming' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <div className="flex items-center space-x-4">
                  <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
                  <div>
                    <p className="text-yellow-800 font-semibold text-lg">Confirming transaction...</p>
                    <p className="text-yellow-600">Waiting for blockchain confirmation</p>
                    {currentTxHash && (
                      <p className="text-yellow-600 text-sm mt-1 font-mono">
                        TX: {currentTxHash.slice(0, 10)}...{currentTxHash.slice(-8)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {creationStatus === 'success' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-center space-x-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-green-800 font-semibold text-lg">License created successfully! 🎉</p>
                    <p className="text-green-600">Your gaming license is now available on the marketplace</p>
                    {ipfsResults && (
                      <div className="mt-2 text-sm text-green-600">
                        <p>Image: ipfs://{ipfsResults.imageHash}</p>
                        <p>Metadata: ipfs://{ipfsResults.metadataHash}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {creationStatus === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <div className="flex items-center space-x-4">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                  <div>
                    <p className="text-red-800 font-semibold text-lg">Creation failed</p>
                    <p className="text-red-600">Please try again or check your wallet and connection</p>
                  </div>
                </div>
              </div>
            )}

            {/* Debug Information (only in development) */}
            {process.env.NODE_ENV === 'development' && ipfsResults && (
              <div className="bg-gray-100 rounded-lg p-4 text-sm">
                <details>
                  <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                    🐛 IPFS Upload Results (Dev Only)
                  </summary>
                  <div className="space-y-1 text-gray-600 font-mono text-xs">
                    <div>Image Hash: {ipfsResults.imageHash}</div>
                    <div>Image URL: {ipfsResults.imageUrl}</div>
                    <div>Metadata Hash: {ipfsResults.metadataHash}</div>
                    <div>Metadata URL: {ipfsResults.metadataUrl}</div>
                  </div>
                </details>
              </div>
            )}
          </CardContent>

          <CardFooter className="px-6 py-6 bg-gray-50 rounded-b-lg">
            <Button 
              type="submit" 
              className="w-full h-14 text-lg font-semibold bg-blue-600 hover:bg-blue-700" 
              disabled={isCreating || !isConnected}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                  Creating License...
                </>
              ) : (
                <>
                  <Upload className="mr-3 h-5 w-5" />
                  Create License
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}