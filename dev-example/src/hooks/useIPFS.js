import { useState } from 'react'
import { 
  pinata_client, 
  getPinataUrl, 
  getIPFSUrl,
  uploadFileWithProgress,
  uploadJSONData,
  uploadData
} from '../lib/pinata'

export function useIPFS() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const uploadFile = async (file) => {
    try {
      setIsUploading(true)
      setUploadProgress(0)

      console.log('📤 Starting file upload to Pinata:', {
        name: file.name,
        size: file.size,
        type: file.type
      })

      const result = await uploadFileWithProgress(file, (progress) => {
        setUploadProgress(progress)
        console.log(`⏳ Upload progress: ${progress}%`)
      })

      console.log('✅ File uploaded successfully:', {
        cid: result.cid,
        url: result.url,
        size: file.size
      })

      setUploadProgress(100)
      return {
        hash: result.cid, // For backward compatibility
        cid: result.cid,
        url: result.url
      }
    } catch (error) {
      console.error('💥 Error uploading file to Pinata:', {
        error: error.message,
        fileName: file.name,
        fileSize: file.size
      })
      throw error
    } finally {
      setIsUploading(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }

  const uploadJSON = async (jsonObject) => {
    try {
      setIsUploading(true)
      
      console.log('📤 Starting JSON upload to Pinata:', jsonObject)
      
      const result = await uploadJSONData(jsonObject)
      
      console.log('✅ JSON uploaded successfully:', {
        cid: result.cid,
        url: result.url,
        data: jsonObject
      })
      
      return {
        hash: result.cid, // For backward compatibility
        cid: result.cid,
        url: result.url
      }
    } catch (error) {
      console.error('💥 Error uploading JSON to Pinata:', {
        error: error.message,
        data: jsonObject
      })
      throw error
    } finally {
      setIsUploading(false)
    }
  }

  // Generic upload function that can handle both files and blobs
  const uploadToIPFS = async (data) => {
    try {
      setIsUploading(true)
      setUploadProgress(0)

      console.log('📤 Starting upload to Pinata:', {
        type: data.constructor.name,
        size: data.size || 'unknown'
      })

      let result
      if (data instanceof File) {
        // Use the file upload function with progress
        result = await uploadFileWithProgress(data, (progress) => {
          setUploadProgress(progress)
          console.log(`⏳ Upload progress: ${progress}%`)
        })
        return result.cid // Return just the CID for compatibility
      } else {
        // Use the generic data upload
        const cid = await uploadData(data)
        setUploadProgress(100)
        return cid // Return just the CID for compatibility
      }

    } catch (error) {
      console.error('💥 Error uploading to Pinata:', {
        error: error.message,
        dataType: data.constructor.name
      })
      throw error
    } finally {
      setIsUploading(false)
      setTimeout(() => setUploadProgress(0), 1000) // Reset progress after a delay
    }
  }

  const uploadGameMetadata = async (gameData, imageFile) => {
    try {
      setIsUploading(true)
      
      console.log('🎮 Starting game metadata upload process:', {
        gameName: gameData.name,
        imageFile: {
          name: imageFile.name,
          size: imageFile.size,
          type: imageFile.type
        }
      })
      
      // Step 1: Upload the image
      console.log('📸 Step 1: Uploading game image...')
      const imageResult = await uploadFile(imageFile)
      
      // Step 2: Create and upload the metadata
      console.log('📋 Step 2: Creating metadata...')
      const metadata = {
        ...gameData,
        image: imageResult.url, // Use the Pinata URL
        imageHash: imageResult.cid,
        uploadedAt: new Date().toISOString(),
        version: "1.0"
      }
      
      console.log('📋 Step 3: Uploading metadata...')
      const metadataResult = await uploadJSON(metadata)
      
      console.log('🎉 Game metadata upload complete:', {
        imageHash: imageResult.cid,
        imageUrl: imageResult.url,
        metadataHash: metadataResult.cid,
        metadataUrl: metadataResult.url
      })
      
      return {
        image: {
          hash: imageResult.cid,
          url: imageResult.url
        },
        metadata: {
          hash: metadataResult.cid,
          url: metadataResult.url
        },
        // For backward compatibility
        imageHash: imageResult.cid,
        metadataHash: metadataResult.cid
      }
    } catch (error) {
      console.error('💥 Error uploading game metadata:', {
        error: error.message,
        gameName: gameData.name,
        imageFile: imageFile.name
      })
      throw error
    } finally {
      setIsUploading(false)
    }
  }

  // Additional helper function to get URL from CID
  const getCIDUrl = (cid, usePublicGateway = false) => {
    return usePublicGateway ? getIPFSUrl(cid) : getPinataUrl(cid)
  }

  // Function to upload metadata with image reference
  const uploadMetadataWithImage = async (metadata, imageCid) => {
    try {
      setIsUploading(true)
      
      const metadataWithImage = {
        ...metadata,
        image: `ipfs://${imageCid}`, // Standard IPFS format
        imageUrl: getPinataUrl(imageCid), // Direct URL for display
        uploadedAt: new Date().toISOString()
      }
      
      const result = await uploadJSON(metadataWithImage)
      
      return {
        hash: result.cid,
        cid: result.cid,
        url: result.url,
        metadata: metadataWithImage
      }
    } catch (error) {
      console.error('💥 Error uploading metadata with image:', error)
      throw error
    } finally {
      setIsUploading(false)
    }
  }

  // Function to upload file and get both IPFS URI and HTTP URL
  const uploadFileWithURIs = async (file) => {
    try {
      const result = await uploadFile(file)
      
      return {
        cid: result.cid,
        ipfsUri: `ipfs://${result.cid}`,
        httpUrl: result.url,
        pinataUrl: getPinataUrl(result.cid),
        publicUrl: getIPFSUrl(result.cid),
        // For backward compatibility
        hash: result.cid,
        url: result.url
      }
    } catch (error) {
      console.error('💥 Error uploading file with URIs:', error)
      throw error
    }
  }

  return {
    // Core functions (same interface as before)
    uploadFile,
    uploadJSON,
    uploadToIPFS,
    uploadGameMetadata,
    
    // New Pinata-specific functions
    uploadMetadataWithImage,
    uploadFileWithURIs,
    getCIDUrl,
    
    // State
    isUploading,
    uploadProgress,
    
    // Client access (for advanced usage)
    pinataClient: pinata_client
  }
}