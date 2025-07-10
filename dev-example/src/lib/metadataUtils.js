import { getIPFSConfig } from './ipfsConfig'

export const MetadataUtils = {
  /**
   * Get configured IPFS gateways
   */
  getIPFSGateways: () => {
    const config = getIPFSConfig()
    return config.ALL_GATEWAYS
  },

  /**
   * Convert IPFS URI to HTTP URL for fetching with multiple gateway support
   * @param {string} uri - The URI to convert
   * @returns {string[]} Array of HTTP URLs to try
   */
  convertURIToFetchURLs: (uri) => {
    if (!uri) return []
    
    let hash = uri
    if (uri.startsWith('ipfs://')) {
      hash = uri.replace('ipfs://', '')
    } else if (!uri.match(/^Qm[1-9A-HJ-NP-Za-km-z]{44}/) && !uri.match(/^ba[A-Za-z2-7]{56}/)) {
      // Not an IPFS hash, return as-is for HTTP URLs
      return uri.startsWith('http') ? [uri] : []
    }

    // Return multiple gateway URLs to try
    const gateways = MetadataUtils.getIPFSGateways()
    return gateways.map(gateway => `${gateway}/${hash}`)
  },

  /**
   * Convert IPFS image URL to HTTP URL for display
   * @param {string} imageUrl - The image URL to convert
   * @returns {string} HTTP URL for displaying images
   */
  convertImageURL: (imageUrl) => {
    if (!imageUrl) return null
    
    console.log('🔍 Converting image URL:', imageUrl)
    
    const gateways = MetadataUtils.getIPFSGateways()
    const primaryGateway = gateways[0] // Use Infura as primary
    
    if (imageUrl.startsWith('ipfs://')) {
      const hash = imageUrl.replace('ipfs://', '')
      const converted = `${primaryGateway}/${hash}`
      console.log('✅ IPFS:// URL converted to gateway:', converted)
      return converted
    }
    
    // Handle bare IPFS hashes (QmXXX... or baXXX...)
    if (imageUrl.match(/^Qm[1-9A-HJ-NP-Za-km-z]{44}/) || imageUrl.match(/^ba[A-Za-z2-7]{56}/)) {
      const converted = `${primaryGateway}/${imageUrl}`
      console.log('✅ Bare IPFS hash converted to gateway:', converted)
      return converted
    }
    
    console.log('➡️ URL returned as-is:', imageUrl)
    return imageUrl
  },

  /**
   * Fetch and parse metadata from a URI with gateway fallbacks
   * @param {string} uri - The metadata URI
   * @returns {Promise<Object>} Parsed metadata object
   */
  fetchMetadata: async (uri) => {
    if (!uri) {
      throw new Error('No URI provided')
    }

    try {
      // Handle base64 encoded JSON
      if (uri.startsWith('data:application/json;base64,')) {
        const base64Data = uri.split(',')[1]
        const decodedData = atob(base64Data)
        return JSON.parse(decodedData)
      }

      // Get multiple URLs to try
      const urlsToTry = MetadataUtils.convertURIToFetchURLs(uri)
      
      if (urlsToTry.length === 0) {
        throw new Error('Invalid URI format')
      }

      console.log('🔍 Trying IPFS gateways for metadata:', urlsToTry)

      // Try each gateway until one works
      let lastError = null
      for (let i = 0; i < urlsToTry.length; i++) {
        const fetchUrl = urlsToTry[i]
        
        try {
          console.log(`🌐 Attempting gateway ${i + 1}/${urlsToTry.length}:`, fetchUrl)
          
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), getIPFSConfig().TIMEOUT)
          
          const response = await fetch(fetchUrl, {
            signal: controller.signal,
            headers: {
              'Accept': 'application/json',
            }
          })
          
          clearTimeout(timeoutId)
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }

          const metadata = await response.json()
          
          // Process image URLs in metadata - convert IPFS hashes to HTTP URLs
          if (metadata.image) {
            const originalImage = metadata.image
            metadata.image = MetadataUtils.convertImageURL(metadata.image)
            console.log('🖼️ Image URL converted:', {
              original: originalImage,
              converted: metadata.image
            })
          }

          console.log('✅ Metadata fetched successfully from gateway:', fetchUrl)
          console.log('📋 Final processed metadata:', metadata)
          return metadata

        } catch (error) {
          console.log(`❌ Gateway ${i + 1} failed:`, fetchUrl, error.message)
          lastError = error
          
          // If this isn't the last gateway, continue to next one
          if (i < urlsToTry.length - 1) {
            console.log(`🔄 Trying next gateway...`)
            continue
          }
        }
      }

      // If we get here, all gateways failed
      throw new Error(`All IPFS gateways failed. Last error: ${lastError?.message}`)

    } catch (error) {
      console.error('Error fetching metadata:', error)
      throw error
    }
  },

  /**
   * Extract license ID from metadata attributes
   * @param {Object} metadata - The metadata object
   * @param {string} fallbackId - Fallback ID if not found in metadata
   * @returns {string} License ID
   */
  extractLicenseId: (metadata, fallbackId) => {
    if (!metadata || !metadata.attributes) {
      return fallbackId
    }

    const licenseAttr = metadata.attributes.find(attr => 
      attr.trait_type === 'License ID' || 
      attr.trait_type === 'License Id' ||
      attr.trait_type === 'LicenseID'
    )

    if (licenseAttr) {
      return licenseAttr.value
    }

    // Try to extract from name
    if (metadata.name) {
      const nameMatch = metadata.name.match(/#(\d+)/)
      if (nameMatch) {
        return nameMatch[1]
      }
    }

    return fallbackId
  },

  /**
   * Create fallback metadata when URI loading fails
   * @param {string} name - Name for the fallback metadata
   * @param {string} description - Description for the fallback metadata
   * @param {string} id - ID to include in attributes
   * @returns {Object} Fallback metadata object
   */
  createFallbackMetadata: (name, description, id) => {
    return {
      name: name || `Gaming License #${id}`,
      description: description || "Gaming license NFT",
      image: null,
      attributes: [
        {
          trait_type: "ID",
          value: id
        },
        {
          trait_type: "Type",
          value: "Gaming License"
        }
      ]
    }
  },

  /**
   * Create metadata for a new license
   * @param {Object} licenseData - License data from form
   * @param {string} imageUrl - IPFS URL of the uploaded image
   * @returns {Object} Complete metadata object
   */
  createLicenseMetadata: (licenseData, imageUrl) => {
    return {
      name: licenseData.name,
      description: licenseData.description || `Gaming license for ${licenseData.name}`,
      image: imageUrl,
      external_url: licenseData.externalUrl || '',
      youtube_url: licenseData.youtubeUrl || '',
      attributes: [
        {
          trait_type: "Symbol",
          value: licenseData.symbol
        },
        {
          trait_type: "Developer",
          value: licenseData.developer
        },
        {
          trait_type: "Publisher", 
          value: licenseData.publisher
        },
        {
          trait_type: "Platform",
          value: licenseData.platform
        },
        {
          trait_type: "Genre",
          value: licenseData.genre || 'Gaming'
        },
        {
          trait_type: "Developer Fee",
          value: licenseData.developerFee || '0'
        },
        {
          trait_type: "Platform Fee",
          value: licenseData.platformFee || '0'
        },
        {
          trait_type: "Publisher Fee",
          value: licenseData.publisherFee || '0'
        },
        {
          trait_type: "Active",
          value: "Yes"
        }
      ]
    }
  },

  /**
   * Create NFT metadata for minting (inherits from license but adds NFT-specific data)
   * @param {Object} licenseMetadata - Original license metadata
   * @param {string} licenseId - License ID
   * @param {string} nftId - NFT ID (if known)
   * @returns {Object} NFT metadata object
   */
  createNFTMetadata: (licenseMetadata, licenseId, nftId = null) => {
    const nftMetadata = {
      ...licenseMetadata,
      name: `${licenseMetadata.name} License #${licenseId}`,
      description: `${licenseMetadata.description} - This is a unique gaming license NFT.`,
      attributes: [
        ...licenseMetadata.attributes,
        {
          trait_type: "License ID",
          value: licenseId
        }
      ]
    }

    if (nftId) {
      nftMetadata.attributes.push({
        trait_type: "NFT ID",
        value: nftId
      })
    }

    return nftMetadata
  },

  /**
   * Validate metadata object structure
   * @param {Object} metadata - Metadata to validate
   * @returns {boolean} True if valid
   */
  validateMetadata: (metadata) => {
    if (!metadata || typeof metadata !== 'object') {
      return false
    }

    // Check required fields
    if (!metadata.name || typeof metadata.name !== 'string') {
      return false
    }

    if (metadata.description && typeof metadata.description !== 'string') {
      return false
    }

    if (metadata.image && typeof metadata.image !== 'string') {
      return false
    }

    if (metadata.attributes && !Array.isArray(metadata.attributes)) {
      return false
    }

    // Validate attributes structure
    if (metadata.attributes) {
      for (const attr of metadata.attributes) {
        if (!attr.trait_type || !attr.value) {
          return false
        }
      }
    }

    return true
  },

  /**
   * Check if a URI is an IPFS URI
   * @param {string} uri - URI to check
   * @returns {boolean} True if IPFS URI
   */
  isIPFSURI: (uri) => {
    return uri && uri.startsWith('ipfs://')
  },

  /**
   * Check if a URI is a data URI
   * @param {string} uri - URI to check
   * @returns {boolean} True if data URI
   */
  isDataURI: (uri) => {
    return uri && uri.startsWith('data:')
  },

  /**
   * Get a short display version of a URI
   * @param {string} uri - URI to shorten
   * @param {number} maxLength - Maximum length (default: 50)
   * @returns {string} Shortened URI for display
   */
  shortenURI: (uri, maxLength = 50) => {
    if (!uri || uri.length <= maxLength) {
      return uri
    }

    if (uri.startsWith('ipfs://')) {
      const hash = uri.replace('ipfs://', '')
      return `ipfs://${hash.slice(0, 8)}...${hash.slice(-8)}`
    }

    if (uri.startsWith('http')) {
      return `${uri.slice(0, maxLength - 3)}...`
    }

    return `${uri.slice(0, maxLength - 3)}...`
  }
}

export default MetadataUtils