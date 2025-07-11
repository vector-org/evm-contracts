import { useState } from 'react'
import { 
  pinata_client, 
  getPinataUrl, 
  getIPFSUrl,
  uploadFileWithProgress,
  uploadJSONData,
  uploadData
} from '../lib/pinata'
import { MetadataUtils } from '../lib/metadataUtils'

export function useIPFS() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const uploadFile = async (file) => {
    try {
      setIsUploading(true)
      setUploadProgress(0)

      console.log('📤 [useIPFS] Starting file upload to Pinata:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified).toISOString()
      })

      const result = await uploadFileWithProgress(file, (progress) => {
        setUploadProgress(progress)
        console.log(`⏳ [useIPFS] Upload progress: ${progress}%`)
      })

      console.log('✅ [useIPFS] File uploaded successfully:', {
        cid: result.cid,
        url: result.url,
        size: file.size,
        pinataUrl: getPinataUrl(result.cid),
        ipfsUrl: getIPFSUrl(result.cid)
      })

      setUploadProgress(100)
      return {
        hash: result.cid, // For backward compatibility
        cid: result.cid,
        url: result.url,
        pinataUrl: getPinataUrl(result.cid),
        ipfsUrl: getIPFSUrl(result.cid)
      }
    } catch (error) {
      console.error('💥 [useIPFS] Error uploading file to Pinata:', {
        error: error.message,
        stack: error.stack,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      })
      throw new Error(`File upload failed: ${error.message}`)
    } finally {
      setIsUploading(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }

  const uploadJSON = async (jsonObject) => {
    try {
      setIsUploading(true)
      
      console.log('📤 [useIPFS] Starting JSON upload to Pinata:', {
        dataType: typeof jsonObject,
        keys: Object.keys(jsonObject),
        size: JSON.stringify(jsonObject).length
      })
      
      const result = await uploadJSONData(jsonObject)
      
      console.log('✅ [useIPFS] JSON uploaded successfully:', {
        cid: result.cid,
        url: result.url,
        dataKeys: Object.keys(jsonObject),
        pinataUrl: getPinataUrl(result.cid),
        ipfsUrl: getIPFSUrl(result.cid)
      })
      
      return {
        hash: result.cid, // For backward compatibility
        cid: result.cid,
        url: result.url,
        pinataUrl: getPinataUrl(result.cid),
        ipfsUrl: getIPFSUrl(result.cid)
      }
    } catch (error) {
      console.error('💥 [useIPFS] Error uploading JSON to Pinata:', {
        error: error.message,
        stack: error.stack,
        data: jsonObject
      })
      throw new Error(`JSON upload failed: ${error.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  // Generic upload function that can handle both files and blobs
  const uploadToIPFS = async (data) => {
    try {
      setIsUploading(true)
      setUploadProgress(0)

      console.log('📤 [useIPFS] Starting generic upload to Pinata:', {
        type: data.constructor.name,
        size: data.size || 'unknown',
        isFile: data instanceof File,
        isBlob: data instanceof Blob
      })

      let result
      if (data instanceof File) {
        // Use the file upload function with progress
        result = await uploadFileWithProgress(data, (progress) => {
          setUploadProgress(progress)
          console.log(`⏳ [useIPFS] Upload progress: ${progress}%`)
        })
        console.log('✅ [useIPFS] File uploaded via generic upload:', result)
        return result.cid // Return just the CID for compatibility
      } else {
        // Use the generic data upload
        const cid = await uploadData(data)
        setUploadProgress(100)
        console.log('✅ [useIPFS] Data uploaded via generic upload:', { cid })
        return cid // Return just the CID for compatibility
      }

    } catch (error) {
      console.error('💥 [useIPFS] Error uploading to Pinata:', {
        error: error.message,
        stack: error.stack,
        dataType: data.constructor.name,
        dataSize: data.size
      })
      throw new Error(`Generic upload failed: ${error.message}`)
    } finally {
      setIsUploading(false)
      setTimeout(() => setUploadProgress(0), 1000) // Reset progress after a delay
    }
  }

  const uploadGameMetadata = async (gameData, imageFile) => {
    try {
      setIsUploading(true)
      
      console.log('🎮 [useIPFS] Starting game metadata upload process:', {
        gameName: gameData.name,
        gameDescription: gameData.description,
        imageFile: {
          name: imageFile.name,
          size: imageFile.size,
          type: imageFile.type
        },
        gameDataKeys: Object.keys(gameData)
      })
      
      // Step 1: Upload the image
      console.log('📸 [useIPFS] Step 1: Uploading game image...')
      const imageResult = await uploadFile(imageFile)
      
      // Step 2: Create and upload the metadata with enhanced structure
      console.log('📋 [useIPFS] Step 2: Creating enhanced game metadata...')
      const metadata = {
        name: gameData.name,
        description: gameData.description || `Gaming license for ${gameData.name}`,
        image: `ipfs://${imageResult.cid}`, // Standard IPFS format
        imageUrl: imageResult.url, // Direct Pinata URL for display
        imageHash: imageResult.cid,
        imagePinataUrl: imageResult.pinataUrl,
        imageIPFSUrl: imageResult.ipfsUrl,
        uploadedAt: new Date().toISOString(),
        version: "1.1", // Updated version
        platform: "Gaming License Marketplace",
        network: "Ethereum Sepolia",
        // Enhanced metadata structure
        external_url: gameData.externalUrl || "",
        animation_url: gameData.animationUrl || "",
        youtube_url: gameData.youtubeUrl || "",
        attributes: [
          {
            trait_type: "Symbol",
            value: gameData.symbol || ""
          },
          {
            trait_type: "Genre",
            value: gameData.genre || "Gaming"
          },
          {
            trait_type: "Developer",
            value: gameData.developer || "Unknown"
          },
          {
            trait_type: "Publisher", 
            value: gameData.publisher || "Unknown"
          },
          {
            trait_type: "Platform",
            value: gameData.platform || "Unknown"
          },
          {
            trait_type: "Developer Fee",
            value: `${gameData.developerFee || "0"} ETH`
          },
          {
            trait_type: "Platform Fee",
            value: `${gameData.platformFee || "0"} ETH`
          },
          {
            trait_type: "Publisher Fee",
            value: `${gameData.publisherFee || "0"} ETH`
          },
          {
            trait_type: "Upload Method",
            value: "Pinata IPFS"
          },
          {
            trait_type: "Uploaded At",
            value: new Date().toISOString()
          },
          {
            trait_type: "Image Format",
            value: imageFile.type
          },
          {
            trait_type: "Image Size",
            value: `${(imageFile.size / 1024 / 1024).toFixed(2)} MB`
          }
        ].filter(attr => attr.value && attr.value !== "0 ETH")
      }
      
      console.log('📋 [useIPFS] Step 3: Uploading enhanced metadata to Pinata...')
      const metadataResult = await uploadJSON(metadata)
      
      const finalResult = {
        // Standard format for backward compatibility
        imageHash: imageResult.cid,
        metadataHash: metadataResult.cid,
        imageUrl: imageResult.url,
        metadataUrl: metadataResult.url,
        
        // Enhanced format with multiple URLs
        image: {
          hash: imageResult.cid,
          url: imageResult.url,
          pinataUrl: imageResult.pinataUrl,
          ipfsUrl: imageResult.ipfsUrl
        },
        metadata: {
          hash: metadataResult.cid,
          url: metadataResult.url,
          pinataUrl: metadataResult.pinataUrl,
          ipfsUrl: metadataResult.ipfsUrl,
          data: metadata
        }
      }
      
      console.log('🎉 [useIPFS] Game metadata upload completed successfully:', {
        imageHash: finalResult.imageHash,
        metadataHash: finalResult.metadataHash,
        imageUrl: finalResult.imageUrl,
        metadataUrl: finalResult.metadataUrl,
        totalSize: `${(imageFile.size / 1024 / 1024).toFixed(2)} MB`,
        uploadDuration: 'N/A' // Could add timing if needed
      })
      
      return finalResult
    } catch (error) {
      console.error('💥 [useIPFS] Error uploading game metadata:', {
        error: error.message,
        stack: error.stack,
        gameName: gameData.name,
        imageFile: imageFile ? {
          name: imageFile.name,
          size: imageFile.size,
          type: imageFile.type
        } : null,
        gameDataKeys: Object.keys(gameData || {})
      })
      throw new Error(`Game metadata upload failed: ${error.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  // Additional helper function to get URL from CID with multiple options
  const getCIDUrl = (cid, usePublicGateway = false) => {
    const pinataUrl = getPinataUrl(cid)
    const ipfsUrl = getIPFSUrl(cid)
    
    console.log('🔗 [useIPFS] Generated URLs for CID:', {
      cid: cid,
      pinataUrl: pinataUrl,
      ipfsUrl: ipfsUrl,
      selectedUrl: usePublicGateway ? ipfsUrl : pinataUrl
    })
    
    return usePublicGateway ? ipfsUrl : pinataUrl
  }

  // Function to upload metadata with image reference using MetadataUtils
  const uploadMetadataWithImage = async (metadata, imageCid) => {
    try {
      setIsUploading(true)
      
      console.log('📋 [useIPFS] Uploading metadata with image reference:', {
        imageCid: imageCid,
        metadataKeys: Object.keys(metadata)
      })
      
      const enhancedMetadata = {
        ...metadata,
        image: `ipfs://${imageCid}`, // Standard IPFS format
        imageUrl: getPinataUrl(imageCid), // Direct URL for display
        imageIPFSUrl: getIPFSUrl(imageCid), // Public gateway URL
        uploadedAt: new Date().toISOString(),
        version: "1.1"
      }
      
      const result = await uploadJSON(enhancedMetadata)
      
      console.log('✅ [useIPFS] Metadata with image uploaded successfully:', {
        metadataCid: result.cid,
        metadataUrl: result.url,
        imageCid: imageCid,
        imageUrl: enhancedMetadata.imageUrl
      })
      
      return {
        hash: result.cid,
        cid: result.cid,
        url: result.url,
        metadata: enhancedMetadata,
        pinataUrl: result.pinataUrl,
        ipfsUrl: result.ipfsUrl
      }
    } catch (error) {
      console.error('💥 [useIPFS] Error uploading metadata with image:', {
        error: error.message,
        stack: error.stack,
        imageCid: imageCid,
        metadataKeys: Object.keys(metadata || {})
      })
      throw new Error(`Metadata with image upload failed: ${error.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  // Function to upload file and get both IPFS URI and HTTP URL
  const uploadFileWithURIs = async (file) => {
    try {
      console.log('📤 [useIPFS] Uploading file with comprehensive URI response:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      })
      
      const result = await uploadFile(file)
      
      const comprehensiveResult = {
        cid: result.cid,
        ipfsUri: `ipfs://${result.cid}`,
        httpUrl: result.url,
        pinataUrl: getPinataUrl(result.cid),
        publicUrl: getIPFSUrl(result.cid),
        // For backward compatibility
        hash: result.cid,
        url: result.url
      }
      
      console.log('✅ [useIPFS] File uploaded with comprehensive URIs:', {
        cid: comprehensiveResult.cid,
        uriCount: Object.keys(comprehensiveResult).length,
        urls: {
          ipfsUri: comprehensiveResult.ipfsUri,
          httpUrl: comprehensiveResult.httpUrl,
          pinataUrl: comprehensiveResult.pinataUrl,
          publicUrl: comprehensiveResult.publicUrl
        }
      })
      
      return comprehensiveResult
    } catch (error) {
      console.error('💥 [useIPFS] Error uploading file with URIs:', {
        error: error.message,
        stack: error.stack,
        fileName: file.name
      })
      throw new Error(`File upload with URIs failed: ${error.message}`)
    }
  }

  // Enhanced metadata fetching function that integrates with MetadataUtils
  const fetchMetadata = async (uri) => {
    try {
      console.log('🔍 [useIPFS] Fetching metadata using MetadataUtils:', uri)
      
      const metadata = await MetadataUtils.fetchMetadataEnhanced(uri)
      const normalizedMetadata = MetadataUtils.normalizeImageUrls(metadata)
      
      console.log('✅ [useIPFS] Metadata fetched and normalized:', {
        uri: uri,
        hasImage: !!normalizedMetadata.image,
        hasImageUrl: !!normalizedMetadata.imageUrl,
        source: normalizedMetadata._source
      })
      
      return normalizedMetadata
    } catch (error) {
      console.error('💥 [useIPFS] Error fetching metadata:', {
        error: error.message,
        uri: uri
      })
      throw error
    }
  }

  // Test connection function
  const testConnection = async () => {
    try {
      console.log('🧪 [useIPFS] Testing Pinata connection...')
      
      const testData = {
        test: 'connection',
        timestamp: Date.now(),
        source: 'useIPFS hook'
      }
      
      const result = await uploadJSON(testData)
      
      console.log('✅ [useIPFS] Connection test successful:', {
        cid: result.cid,
        url: result.url
      })
      
      return {
        success: true,
        cid: result.cid,
        url: result.url
      }
    } catch (error) {
      console.error('❌ [useIPFS] Connection test failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  return {
    // Core functions (same interface as before)
    uploadFile,
    uploadJSON,
    uploadToIPFS,
    uploadGameMetadata,
    
    // Enhanced Pinata-specific functions
    uploadMetadataWithImage,
    uploadFileWithURIs,
    getCIDUrl,
    fetchMetadata,
    testConnection,
    
    // State
    isUploading,
    uploadProgress,
    
    // Client access (for advanced usage)
    pinataClient: pinata_client,
    
    // Utility functions
    getPinataUrl,
    getIPFSUrl
  }
}