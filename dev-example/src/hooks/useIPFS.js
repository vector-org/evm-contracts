import { useState } from 'react'
import { ipfs_client, getIPFSUrl } from '../lib/ipfs'

export function useIPFS() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const uploadFile = async (file) => {
    try {
      setIsUploading(true)
      setUploadProgress(0)

      const result = await ipfs_client.add(file, {
        progress: (prog) => {
          setUploadProgress(Math.round((prog / file.size) * 100))
        }
      })

      setUploadProgress(100)
      return {
        hash: result.path,
        url: getIPFSUrl(result.path)
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      throw error
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const uploadJSON = async (jsonObject) => {
    try {
      setIsUploading(true)
      
      const result = await ipfs_client.add(JSON.stringify(jsonObject))
      
      return {
        hash: result.path,
        url: getIPFSUrl(result.path)
      }
    } catch (error) {
      console.error('Error uploading JSON:', error)
      throw error
    } finally {
      setIsUploading(false)
    }
  }

  const uploadGameMetadata = async (gameData, imageFile) => {
    try {
      setIsUploading(true)
      
      // First upload the image
      const imageResult = await uploadFile(imageFile)
      
      // Then create and upload the metadata
      const metadata = {
        name: gameData.name,
        description: gameData.description,
        image: imageResult.url,
        attributes: [
          {
            trait_type: "Developer",
            value: gameData.developer
          },
          {
            trait_type: "Publisher", 
            value: gameData.publisher
          },
          {
            trait_type: "Platform",
            value: gameData.platform
          },
          {
            trait_type: "Genre",
            value: gameData.genre || "Gaming"
          }
        ],
        external_url: gameData.externalUrl || "",
        animation_url: gameData.animationUrl || "",
        youtube_url: gameData.youtubeUrl || ""
      }

      const metadataResult = await uploadJSON(metadata)
      
      return {
        imageHash: imageResult.hash,
        imageUrl: imageResult.url,
        metadataHash: metadataResult.hash,
        metadataUrl: metadataResult.url,
        metadata
      }
    } catch (error) {
      console.error('Error uploading game metadata:', error)
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