import { useState } from 'react'
import { ipfs_client, getIPFSUrl } from '../lib/ipfs'

export function useIPFS() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const uploadFile = async (file) => {
    try {
      setIsUploading(true)
      setUploadProgress(0)

      console.log('📤 Starting file upload to IPFS:', {
        name: file.name,
        size: file.size,
        type: file.type
      })

      const result = await ipfs_client.add(file, {
        progress: (prog) => {
          const progress = Math.round((prog / file.size) * 100)
          setUploadProgress(progress)
          console.log(`⏳ Upload progress: ${progress}%`)
        }
      })

      console.log('✅ File uploaded successfully:', {
        hash: result.path,
        url: getIPFSUrl(result.path),
        size: file.size
      })

      setUploadProgress(100)
      return {
        hash: result.path,
        url: getIPFSUrl(result.path)
      }
    } catch (error) {
      console.error('💥 Error uploading file to IPFS:', {
        error: error.message,
        fileName: file.name,
        fileSize: file.size
      })
      throw error
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const uploadJSON = async (jsonObject) => {
    try {
      setIsUploading(true)
      
      console.log('📤 Starting JSON upload to IPFS:', jsonObject)
      
      const result = await ipfs_client.add(JSON.stringify(jsonObject, null, 2))
      
      console.log('✅ JSON uploaded successfully:', {
        hash: result.path,
        url: getIPFSUrl(result.path),
        data: jsonObject
      })
      
      return {
        hash: result.path,
        url: getIPFSUrl(result.path)
      }
    } catch (error) {
      console.error('💥 Error uploading JSON to IPFS:', {
        error: error.message,
        data: jsonObject
      })
      throw error
    } finally {
      setIsUploading(false)
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
        name: gameData.name,
        description: gameData.description || `Gaming license for ${gameData.name}`,
        image: imageResult.url,
        attributes: [
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
            trait_type: "Genre",
            value: gameData.genre || "Gaming"
          },
          {
            trait_type: "Symbol",
            value: gameData.symbol || ""
          }
        ],
        external_url: gameData.externalUrl || "",
        animation_url: gameData.animationUrl || "",
        youtube_url: gameData.youtubeUrl || "",
        created_at: new Date().toISOString(),
        developer_fee: gameData.developerFee || "0",
        platform_fee: gameData.platformFee || "0",
        publisher_fee: gameData.publisherFee || "0"
      }

      console.log('📋 Metadata created:', metadata)
      console.log('📤 Step 3: Uploading metadata to IPFS...')
      
      const metadataResult = await uploadJSON(metadata)
      
      const result = {
        imageHash: imageResult.hash,
        imageUrl: imageResult.url,
        metadataHash: metadataResult.hash,
        metadataUrl: metadataResult.url,
        metadata
      }
      
      console.log('🎉 Game metadata upload completed successfully:', {
        imageHash: result.imageHash,
        metadataHash: result.metadataHash,
        imageUrl: result.imageUrl,
        metadataUrl: result.metadataUrl
      })
      
      return result
    } catch (error) {
      console.error('💥 Error uploading game metadata:', {
        error: error.message,
        stack: error.stack,
        gameData: gameData,
        imageFile: imageFile ? {
          name: imageFile.name,
          size: imageFile.size,
          type: imageFile.type
        } : null
      })
      throw error
    } finally {
      setIsUploading(false)
    }
  }

  return {
    uploadFile,
    uploadJSON,
    uploadGameMetadata,
    isUploading,
    uploadProgress
  }
}