"use client";
import { useState } from 'react'
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
  const { uploadGameMetadata, isUploading, uploadProgress } = useIPFS()
  const { addTransaction } = useTransactions()

  const [formData, setFormData] = useState({
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
  
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [creationStatus, setCreationStatus] = useState(null)

  const { writeContractAsync: createLicense, data: createLicenseData } = useCreateLicense()

  useTransactionWatcher(
    createLicenseData,
    () => {
      setCreationStatus('success')
      setIsCreating(false)
      // Reset form
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
    },
    () => {
      setCreationStatus('error')
      setIsCreating(false)
    }
  )

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
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => setImagePreview(e.target.result)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!isConnected) {
      alert('Please connect your wallet')
      return
    }

    if (!imageFile) {
      alert('Please select an image for your game')
      return
    }

    try {
      setIsCreating(true)
      setCreationStatus('uploading')

      // Upload to IPFS
      const ipfsResult = await uploadGameMetadata(formData, imageFile)
      
      setCreationStatus('creating')

      // Prepare license input
      const licenseInput = {
        name: formData.name,
        symbol: formData.symbol,
        isActive: true,
        developerFee: parseEther(formData.developerFee || "0"),
        platformFee: parseEther(formData.platformFee || "0"),
        publisherFee: parseEther(formData.publisherFee || "0"),
        developer: formData.developer || address,
        publisher: formData.publisher || address,
        platform: formData.platform || address,
        primaryMarketplace: CONTRACT_ADDRESSES.PRIMARY_MARKETPLACE,
        secondaryMarketplace: CONTRACT_ADDRESSES.SECONDARY_MARKETPLACE
      }

      // Create license on blockchain
      const tx = await createLicense({
        address: CONTRACT_ADDRESSES.FACTORY,
        abi: CONTRACTS.FACTORY.abi,
        functionName: 'createLicense',
        args: [licenseInput]
      })

      addTransaction(
        tx,
        `Creating license: ${formData.name}`,
        'create-license'
      )

    } catch (error) {
      console.error('Error creating license:', error)
      setCreationStatus('error')
      setIsCreating(false)
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
            Create a new gaming license NFT contract for your game
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
                className="w-full min-h-[100px] px-3 py-2 border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Stakeholders */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="developer">Developer Address</Label>
                <Input
                  id="developer"
                  name="developer"
                  value={formData.developer}
                  onChange={handleInputChange}
                  placeholder="0x..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="publisher">Publisher Address</Label>
                <Input
                  id="publisher"
                  name="publisher"
                  value={formData.publisher}
                  onChange={handleInputChange}
                  placeholder="0x..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="platform">Platform Address</Label>
                <Input
                  id="platform"
                  name="platform"
                  value={formData.platform}
                  onChange={handleInputChange}
                  placeholder="0x..."
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
                  value={formData.developerFee}
                  onChange={handleInputChange}
                  placeholder="0.0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="platformFee">Platform Fee (ETH)</Label>
                <Input
                  id="platformFee"
                  name="platformFee"
                  type="number"
                  step="0.001"
                  value={formData.platformFee}
                  onChange={handleInputChange}
                  placeholder="0.0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="publisherFee">Publisher Fee (ETH)</Label>
                <Input
                  id="publisherFee"
                  name="publisherFee"
                  type="number"
                  step="0.001"
                  value={formData.publisherFee}
                  onChange={handleInputChange}
                  placeholder="0.0"
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
              />
            </div>

            {/* Status Display */}
            {(isUploading || isCreating) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  <div>
                    {creationStatus === 'uploading' && (
                      <p className="text-blue-800">
                        Uploading to IPFS... {uploadProgress}%
                      </p>
                    )}
                    {creationStatus === 'creating' && (
                      <p className="text-blue-800">Creating license on blockchain...</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {creationStatus === 'success' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="text-green-800">License created successfully!</p>
                </div>
              </div>
            )}

            {creationStatus === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <p className="text-red-800">Failed to create license. Please try again.</p>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter>
            <Button 
              type="submit" 
              disabled={isCreating || isUploading || !formData.name || !imageFile}
              className="w-full"
            >
              {isCreating || isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {creationStatus === 'uploading' ? 'Uploading...' : 'Creating License...'}
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