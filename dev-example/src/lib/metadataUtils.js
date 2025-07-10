import { getIPFSConfig } from './ipfsConfig'

export const MetadataUtils = {
  /**
   * Create metadata object for NFT/License
   * @param {Object} data - The metadata data
   * @param {string} imageCid - The CID of the uploaded image
   * @returns {Object} - Formatted metadata object
   */
  createMetadata: (data, imageCid = null) => {
    const config = getIPFSConfig()
    
    const metadata = {
      name: data.name || 'Untitled',
      description: data.description || '',
      external_url: data.externalUrl || data.external_url || '',
      attributes: data.attributes || [],
      ...data
    }

    // Add image if CID is provided
    if (imageCid) {
      metadata.image = `ipfs://${imageCid}`
      metadata.imageUrl = config.getUrl(imageCid)
    }

    // Add timestamp
    metadata.created_at = new Date().toISOString()
    
    return metadata
  },

  /**
   * Upload metadata to Pinata
   * @param {Object} metadata - The metadata object to upload
   * @returns {Promise<Object>} - Upload result with CID and URL
   */
  uploadMetadata: async (metadata) => {
    const config = getIPFSConfig()
    
    try {
      console.log('📋 Uploading metadata to Pinata:', metadata)
      const result = await config.upload.json(metadata)
      
      console.log('✅ Metadata uploaded successfully:', {
        cid: result.cid,
        url: result.url
      })
      
      return result
    } catch (error) {
      console.error('💥 Error uploading metadata:', error)
      throw error
    }
  },

  /**
   * Upload image and create metadata with image reference
   * @param {File} imageFile - The image file to upload
   * @param {Object} metadataData - The metadata data
   * @returns {Promise<Object>} - Complete upload result
   */
  uploadImageAndMetadata: async (imageFile, metadataData) => {
    const config = getIPFSConfig()
    
    try {
      console.log('📸 Starting image and metadata upload process')
      
      // Step 1: Upload the image
      console.log('📸 Step 1: Uploading image...')
      const imageResult = await config.upload.file(imageFile)
      
      // Step 2: Create metadata with image reference
      console.log('📋 Step 2: Creating metadata with image reference...')
      const metadata = MetadataUtils.createMetadata(metadataData, imageResult.cid)
      
      // Step 3: Upload metadata
      console.log('📋 Step 3: Uploading metadata...')
      const metadataResult = await MetadataUtils.uploadMetadata(metadata)
      
      const result = {
        image: {
          cid: imageResult.cid,
          url: imageResult.url,
          hash: imageResult.cid // For backward compatibility
        },
        metadata: {
          cid: metadataResult.cid,
          url: metadataResult.url,
          hash: metadataResult.cid, // For backward compatibility
          data: metadata
        }
      }
      
      console.log('🎉 Complete upload successful:', result)
      return result
      
    } catch (error) {
      console.error('💥 Error in uploadImageAndMetadata:', error)
      throw error
    }
  },

  /**
   * Fetch metadata from URI
   * @param {string} uri - The metadata URI (can be IPFS, HTTP, or data URI)
   * @returns {Promise<Object>} - The fetched metadata
   */
  fetchMetadata: async (uri) => {
    try {
      console.log('📋 Fetching metadata from URI:', uri)
      
      if (uri.startsWith('data:application/json;base64,')) {
        // Handle base64 encoded metadata
        const base64Data = uri.split(',')[1]
        const decodedData = atob(base64Data)
        const metadata = JSON.parse(decodedData)
        console.log('✅ Metadata loaded from base64')
        return metadata
        
      } else if (uri.startsWith('ipfs://')) {
        // Handle IPFS URLs
        const config = getIPFSConfig()
        const cid = uri.replace('ipfs://', '')
        const httpUrl = config.getUrl(cid)
        
        const response = await fetch(httpUrl)
        if (!response.ok) {
          throw new Error(`IPFS fetch failed: ${response.status}`)
        }
        
        const metadata = await response.json()
        console.log('✅ Metadata loaded from IPFS')
        return metadata
        
      } else if (uri.startsWith('http')) {
        // Handle HTTP URLs
        const response = await fetch(uri)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const metadata = await response.json()
        console.log('✅ Metadata loaded from HTTP')
        return metadata
        
      } else {
        throw new Error(`Unsupported URI format: ${uri}`)
      }
      
    } catch (error) {
      console.error('💥 Error fetching metadata:', error)
      throw error
    }
  },

  /**
   * Normalize image URLs in metadata for display
   * @param {Object} metadata - The metadata object
   * @returns {Object} - Metadata with normalized image URLs
   */
  normalizeImageUrls: (metadata) => {
    if (!metadata) return metadata
    
    const config = getIPFSConfig()
    const normalized = { ...metadata }
    
    // Handle image field
    if (normalized.image) {
      if (normalized.image.startsWith('ipfs://')) {
        const cid = normalized.image.replace('ipfs://', '')
        normalized.imageUrl = config.getUrl(cid)
        normalized.publicImageUrl = config.getPublicUrl(cid)
      } else if (!normalized.imageUrl) {
        normalized.imageUrl = normalized.image
      }
    }
    
    // Handle animation_url field
    if (normalized.animation_url && normalized.animation_url.startsWith('ipfs://')) {
      const cid = normalized.animation_url.replace('ipfs://', '')
      normalized.animationUrl = config.getUrl(cid)
    }
    
    return normalized
  },

  /**
   * Validate metadata object
   * @param {Object} metadata - The metadata to validate
   * @returns {Object} - Validation result
   */
  validateMetadata: (metadata) => {
    const errors = []
    const warnings = []
    
    if (!metadata) {
      errors.push('Metadata is null or undefined')
      return { valid: false, errors, warnings }
    }
    
    // Required fields
    if (!metadata.name) {
      errors.push('Missing required field: name')
    }
    
    // Recommended fields
    if (!metadata.description) {
      warnings.push('Missing recommended field: description')
    }
    
    if (!metadata.image && !metadata.imageUrl) {
      warnings.push('No image provided')
    }
    
    // Validate attributes
    if (metadata.attributes && !Array.isArray(metadata.attributes)) {
      errors.push('Attributes must be an array')
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  },

  /**
   * Create fallback metadata when URI fetch fails
   * @param {string} name - Name for the metadata
   * @param {string} description - Description for the metadata  
   * @param {string|number} id - ID for the metadata
   * @param {Object} additionalData - Any additional data to include
   * @returns {Object} - Fallback metadata object
   */
  createFallbackMetadata: (name, description, id, additionalData = {}) => {
    return {
      name: name || `Item #${id}`,
      description: description || `Item ${id}`,
      image: null,
      external_url: '',
      attributes: [],
      created_at: new Date().toISOString(),
      fallback: true,
      ...additionalData
    }
  },

  /**
   * Create license fallback metadata specifically
   * @param {Object} licenseData - License data object
   * @param {string|number} licenseId - License ID
   * @returns {Object} - License fallback metadata
   */
  createLicenseFallbackMetadata: (licenseData, licenseId) => {
    if (!licenseData) {
      return MetadataUtils.createFallbackMetadata(
        `License #${licenseId}`,
        `Gaming license #${licenseId}`,
        licenseId
      )
    }

    return {
      name: licenseData.name || `License #${licenseId}`,
      description: `Gaming license for ${licenseData.name || `License ${licenseId}`} (${licenseData.symbol || 'N/A'})`,
      image: null,
      external_url: licenseData.externalUrl || '',
      attributes: [
        {
          trait_type: "Developer",
          value: MetadataUtils.shortenAddress(licenseData.developer)
        },
        {
          trait_type: "Publisher", 
          value: MetadataUtils.shortenAddress(licenseData.publisher)
        },
        {
          trait_type: "Platform",
          value: MetadataUtils.shortenAddress(licenseData.platform)
        },
        {
          trait_type: "Active",
          value: licenseData.isActive ? "Yes" : "No"
        },
        {
          trait_type: "Symbol",
          value: licenseData.symbol || 'N/A'
        }
      ],
      created_at: new Date().toISOString(),
      fallback: true,
      licenseId: licenseId
    }
  },

  /**
   * Enhanced fetch metadata with Pinata support
   * @param {string} uri - The metadata URI
   * @returns {Promise<Object>} - The fetched metadata
   */
  fetchMetadataEnhanced: async (uri) => {
    try {
      console.log('📋 Fetching metadata from URI:', uri)
      
      if (uri.startsWith('data:application/json;base64,')) {
        // Handle base64 encoded metadata
        const base64Data = uri.split(',')[1]
        const decodedData = atob(base64Data)
        const metadata = JSON.parse(decodedData)
        console.log('✅ Metadata loaded from base64')
        return metadata
        
      } else if (uri.startsWith('ipfs://')) {
        // Handle IPFS URLs - use Pinata gateway
        const config = getIPFSConfig()
        const cid = uri.replace('ipfs://', '')
        
        // Try Pinata gateway first
        try {
          const pinataUrl = config.getUrl(cid)
          const response = await fetch(pinataUrl)
          if (response.ok) {
            const metadata = await response.json()
            console.log('✅ Metadata loaded from Pinata gateway')
            return metadata
          }
        } catch (pinataError) {
          console.warn('⚠️ Pinata gateway failed, trying public gateway')
        }
        
        // Fallback to public IPFS gateway
        const publicUrl = config.getPublicUrl(cid)
        const response = await fetch(publicUrl)
        if (!response.ok) {
          throw new Error(`IPFS fetch failed: ${response.status}`)
        }
        
        const metadata = await response.json()
        console.log('✅ Metadata loaded from public IPFS gateway')
        return metadata
        
      } else if (uri.startsWith('http')) {
        // Handle HTTP URLs
        const response = await fetch(uri)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const metadata = await response.json()
        console.log('✅ Metadata loaded from HTTP')
        return metadata
        
      } else {
        throw new Error(`Unsupported URI format: ${uri}`)
      }
      
    } catch (error) {
      console.error('💥 Error fetching metadata:', error)
      throw error
    }
  },

  /**
   * Shorten a URI for display purposes
   * @param {string} uri - The URI to shorten
   * @param {number} maxLength - Maximum length (default: 40)
   * @returns {string} - Shortened URI
   */
  shortenURI: (uri, maxLength = 40) => {
    if (!uri) return ''
    if (uri.length <= maxLength) return uri
    
    const start = Math.floor((maxLength - 3) / 2)
    const end = maxLength - 3 - start
    
    return `${uri.slice(0, start)}...${uri.slice(-end)}`
  },

  /**
   * Shorten an address for display purposes
   * @param {string} address - The address to shorten
   * @returns {string} - Shortened address
   */
  shortenAddress: (address) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  },

  /**
   * Create game license metadata
   * @param {Object} gameData - The game data
   * @param {string} imageCid - The image CID
   * @returns {Object} - Game license metadata
   */
  createGameLicenseMetadata: (gameData, imageCid = null) => {
    const attributes = [
      {
        trait_type: "Developer",
        value: gameData.developer || 'Unknown'
      },
      {
        trait_type: "Publisher", 
        value: gameData.publisher || 'Unknown'
      },
      {
        trait_type: "Platform",
        value: gameData.platform || 'Unknown'
      },
      {
        trait_type: "Genre",
        value: gameData.genre || 'Unknown'
      },
      {
        trait_type: "Symbol",
        value: gameData.symbol || 'N/A'
      }
    ]

    // Add fee attributes if present
    if (gameData.developerFee) {
      attributes.push({
        trait_type: "Developer Fee",
        value: gameData.developerFee,
        display_type: "number"
      })
    }
    
    if (gameData.platformFee) {
      attributes.push({
        trait_type: "Platform Fee", 
        value: gameData.platformFee,
        display_type: "number"
      })
    }

    const metadata = {
      name: gameData.name,
      description: gameData.description || `Gaming license for ${gameData.name}`,
      external_url: gameData.externalUrl || gameData.youtubeUrl || '',
      attributes,
      license_type: "gaming",
      version: "1.0",
      created_at: new Date().toISOString()
    }

    return MetadataUtils.createMetadata(metadata, imageCid)
  }
}

// Legacy exports
export const createMetadata = MetadataUtils.createMetadata
export const uploadMetadata = MetadataUtils.uploadMetadata
export const fetchMetadata = MetadataUtils.fetchMetadataEnhanced // Use enhanced version
export const normalizeImageUrls = MetadataUtils.normalizeImageUrls
export const shortenURI = MetadataUtils.shortenURI
export const shortenAddress = MetadataUtils.shortenAddress
export const createFallbackMetadata = MetadataUtils.createFallbackMetadata
export const createLicenseFallbackMetadata = MetadataUtils.createLicenseFallbackMetadata
export const fetchMetadataEnhanced = MetadataUtils.fetchMetadataEnhanced

export default MetadataUtils