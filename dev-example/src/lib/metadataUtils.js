import { 
  pinata_client, 
  getPinataUrl, 
  getIPFSUrl,
  uploadJSONData 
} from './pinata'

export class MetadataUtils {
  // Enhanced metadata fetching that works with CIDs and IPFS URIs
  static async fetchMetadataEnhanced(uri) {
    // console.log('🔍 [MetadataUtils] Starting enhanced metadata fetch for URI:', {
    //   uri: uri,
    //   uriType: typeof uri,
    //   uriLength: uri?.length
    // })
    
    if (!uri) {
      throw new Error('No URI provided')
    }

    let fetchedMetadata = null
    let sourceType = 'unknown'
    let finalUrl = null

    try {
      // Handle different URI formats
      if (uri.startsWith('data:application/json;base64,')) {
        // Handle base64 encoded metadata
        // console.log('📋 [MetadataUtils] Detected base64 encoded metadata')
        sourceType = 'base64'
        const base64Data = uri.split(',')[1]
        const decodedData = atob(base64Data)
        fetchedMetadata = JSON.parse(decodedData)
        // console.log('✅ [MetadataUtils] Successfully decoded base64 metadata:', fetchedMetadata)
        
      } else if (uri.startsWith('ipfs://')) {
        // Handle full IPFS URIs
        // console.log('🌐 [MetadataUtils] Detected full IPFS URI')
        sourceType = 'ipfs-uri'
        const cid = uri.replace('ipfs://', '')
        fetchedMetadata = await this.fetchFromCID(cid)
        
      } else if (uri.startsWith('http')) {
        // Handle HTTP URLs directly
        // console.log('🌍 [MetadataUtils] Detected HTTP URL')
        sourceType = 'http'
        finalUrl = uri
        const response = await fetch(uri)
        if (response.ok) {
          fetchedMetadata = await response.json()
          // console.log('✅ [MetadataUtils] Successfully fetched from HTTP:', fetchedMetadata)
        } else {
          throw new Error(`HTTP fetch failed: ${response.status} ${response.statusText}`)
        }
        
      } else if (this.isIPFSHash(uri)) {
        // Handle raw CIDs (this is your case!)
        // console.log('🎯 [MetadataUtils] Detected raw IPFS CID:', uri)
        sourceType = 'cid'
        fetchedMetadata = await this.fetchFromCID(uri)
        
      } else {
        // Try direct fetch for unknown formats
        console.log('❓ [MetadataUtils] Unknown URI format, attempting direct fetch')
        sourceType = 'direct'
        finalUrl = uri
        const response = await fetch(uri)
        if (response.ok) {
          fetchedMetadata = await response.json()
          // console.log('✅ [MetadataUtils] Successfully fetched with direct fetch:', fetchedMetadata)
        } else {
          throw new Error(`Direct fetch failed: ${response.status} ${response.statusText}`)
        }
      }

      if (!fetchedMetadata) {
        throw new Error('No metadata found in response')
      }

      // Add source information to metadata
      fetchedMetadata._source = {
        uri: uri,
        type: sourceType,
        fetchedAt: new Date().toISOString(),
        finalUrl: finalUrl
      }

      // console.log('🎉 [MetadataUtils] Metadata fetch completed successfully:', {
      //   source: sourceType,
      //   uri: uri,
      //   finalUrl: finalUrl,
      //   hasImage: !!fetchedMetadata.image,
      //   metadataKeys: Object.keys(fetchedMetadata)
      // })

      return fetchedMetadata

    } catch (error) {
      console.error('💥 [MetadataUtils] Failed to fetch metadata:', {
        uri: uri,
        sourceType: sourceType,
        finalUrl: finalUrl,
        error: error.message,
        stack: error.stack
      })
      throw new Error(`Failed to fetch metadata from ${uri}: ${error.message}`)
    }
  }

  // Fetch metadata from a CID using Pinata gateway with fallbacks
  static async fetchFromCID(cid) {
    // console.log('📡 [MetadataUtils] Fetching metadata from CID using Pinata:', cid)
    
    // Primary: Use Pinata gateway
    const pinataUrl = getPinataUrl(cid)
    // console.log('🎯 [MetadataUtils] Trying Pinata gateway URL:', pinataUrl)
    
    try {
      const response = await fetch(pinataUrl)
      if (response.ok) {
        const metadata = await response.json()
        // console.log('✅ [MetadataUtils] Successfully fetched from Pinata gateway:', {
        //   cid: cid,
        //   url: pinataUrl,
        //   metadata: metadata
        // })
        return metadata
      } else {
        console.warn('⚠️ [MetadataUtils] Pinata gateway failed:', {
          status: response.status,
          statusText: response.statusText
        })
        throw new Error(`Pinata gateway failed: ${response.status}`)
      }
    } catch (pinataError) {
      console.warn('⚠️ [MetadataUtils] Pinata gateway error, trying public gateway:', pinataError.message)
      
      // Fallback: Use public IPFS gateway
      const publicUrl = getIPFSUrl(cid)
      // console.log('🔄 [MetadataUtils] Trying public IPFS gateway:', publicUrl)
      
      try {
        const fallbackResponse = await fetch(publicUrl)
        if (fallbackResponse.ok) {
          const metadata = await fallbackResponse.json()
          // console.log('✅ [MetadataUtils] Successfully fetched from public IPFS gateway:', {
          //   cid: cid,
          //   url: publicUrl,
          //   metadata: metadata
          // })
          return metadata
        } else {
          throw new Error(`Public gateway failed: ${fallbackResponse.status}`)
        }
      } catch (publicError) {
        console.error('💥 [MetadataUtils] All gateways failed:', {
          pinataError: pinataError.message,
          publicError: publicError.message
        })
        throw new Error(`All IPFS gateways failed. Pinata: ${pinataError.message}, Public: ${publicError.message}`)
      }
    }
  }

  // Normalize image URLs to work with Pinata gateway
  static normalizeImageUrls(metadata) {
    // console.log('🖼️ [MetadataUtils] Normalizing image URLs in metadata:', {
    //   hasMetadata: !!metadata,
    //   hasImage: !!metadata?.image,
    //   originalImage: metadata?.image
    // })
    
    if (!metadata) {
      console.log('⚠️ [MetadataUtils] No metadata provided for image normalization')
      return metadata
    }

    const normalized = { ...metadata }

    // Handle image field
    if (normalized.image) {
      // console.log('🔍 [MetadataUtils] Processing image URL:', normalized.image)
      
      if (normalized.image.startsWith('ipfs://')) {
        // Standard IPFS URI format
        const cid = normalized.image.replace('ipfs://', '')
        normalized.imageUrl = getPinataUrl(cid) // Primary Pinata URL
        normalized.imageFallbackUrl = getIPFSUrl(cid) // Fallback public gateway
        // console.log('✅ [MetadataUtils] Converted IPFS URI to Pinata URLs:', {
        //   original: normalized.image,
        //   cid: cid,
        //   pinataUrl: normalized.imageUrl,
        //   fallbackUrl: normalized.imageFallbackUrl
        // })
      } else if (this.isIPFSHash(normalized.image)) {
        // Raw CID format
        normalized.imageUrl = getPinataUrl(normalized.image)
        normalized.imageFallbackUrl = getIPFSUrl(normalized.image)
        // console.log('✅ [MetadataUtils] Converted raw CID to Pinata URLs:', {
        //   cid: normalized.image,
        //   pinataUrl: normalized.imageUrl,
        //   fallbackUrl: normalized.imageFallbackUrl
        // })
      } else if (normalized.image.startsWith('http')) {
        // Already HTTP URL
        normalized.imageUrl = normalized.image
        // console.log('✅ [MetadataUtils] Using existing HTTP image URL:', normalized.imageUrl)
      } else {
        // Unknown format, keep original
        console.log('⚠️ [MetadataUtils] Unknown image format, keeping original:', normalized.image)
        normalized.imageUrl = normalized.image
      }
    } else {
      console.log('ℹ️ [MetadataUtils] No image field found in metadata')
    }

    // Handle animation_url field similarly
    if (normalized.animation_url) {
      if (normalized.animation_url.startsWith('ipfs://')) {
        const cid = normalized.animation_url.replace('ipfs://', '')
        normalized.animationUrl = getPinataUrl(cid)
        normalized.animationFallbackUrl = getIPFSUrl(cid)
        // console.log('✅ [MetadataUtils] Normalized animation URL:', {
        //   original: normalized.animation_url,
        //   pinataUrl: normalized.animationUrl,
        //   fallbackUrl: normalized.animationFallbackUrl
        // })
      } else if (this.isIPFSHash(normalized.animation_url)) {
        normalized.animationUrl = getPinataUrl(normalized.animation_url)
        normalized.animationFallbackUrl = getIPFSUrl(normalized.animation_url)
      }
    }

    console.log('🎉 [MetadataUtils] Image URL normalization completed:', {
      hasImage: !!normalized.image,
      hasImageUrl: !!normalized.imageUrl,
      hasFallback: !!normalized.imageFallbackUrl,
      finalImageUrl: normalized.imageUrl
    })

    return normalized
  }

  // Create fallback metadata when URI fetch fails
  static createLicenseFallbackMetadata(licenseData, licenseId) {
    console.log('🔄 [MetadataUtils] Creating license fallback metadata:', {
      licenseId: licenseId,
      hasLicenseData: !!licenseData,
      licenseName: licenseData?.name
    })

    const fallbackMetadata = {
      name: licenseData?.name || `Gaming License #${licenseId}`,
      description: `Gaming license for ${licenseData?.name || `License ${licenseId}`} (${licenseData?.symbol || 'N/A'})`,
      image: null, // No image available in fallback
      imageUrl: null,
      imageFallbackUrl: null,
      attributes: [
        {
          trait_type: "License ID",
          value: licenseId.toString()
        },
        {
          trait_type: "License Name",
          value: licenseData?.name || "Unknown"
        },
        {
          trait_type: "Symbol",
          value: licenseData?.symbol || "N/A"
        },
        {
          trait_type: "Developer",
          value: this.shortenAddress(licenseData?.developer)
        },
        {
          trait_type: "Publisher", 
          value: this.shortenAddress(licenseData?.publisher)
        },
        {
          trait_type: "Platform",
          value: this.shortenAddress(licenseData?.platform)
        },
        {
          trait_type: "Active",
          value: licenseData?.isActive ? "Yes" : "No"
        },
        {
          trait_type: "Contract Address",
          value: this.shortenAddress(licenseData?.contractAddress)
        }
      ],
      external_url: "",
      _fallback: true,
      _source: {
        type: 'fallback',
        createdAt: new Date().toISOString(),
        licenseId: licenseId
      }
    }

    // console.log('✅ [MetadataUtils] Created license fallback metadata:', fallbackMetadata)
    return fallbackMetadata
  }

  // Upload metadata to Pinata
  static async uploadMetadata(metadata) {
    // console.log('📤 [MetadataUtils] Starting metadata upload to Pinata:', {
    //   metadataKeys: Object.keys(metadata),
    //   hasImage: !!metadata.image,
    //   hasName: !!metadata.name
    // })
    
    try {
      const result = await uploadJSONData(metadata)
      
      // console.log('✅ [MetadataUtils] Metadata uploaded successfully to Pinata:', {
      //   cid: result.cid,
      //   url: result.url,
      //   metadataKeys: Object.keys(metadata)
      // })
      
      return result
    } catch (error) {
      console.error('💥 [MetadataUtils] Failed to upload metadata to Pinata:', {
        error: error.message,
        stack: error.stack,
        metadata: metadata
      })
      throw error
    }
  }

  // Test image URL availability with comprehensive logging
  static async testImageUrl(imageUrl) {
    if (!imageUrl) {
      console.log('⚠️ [MetadataUtils] No image URL provided for testing')
      return false
    }
    
    // console.log('🧪 [MetadataUtils] Testing image URL availability:', imageUrl)
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      const response = await fetch(imageUrl, { 
        method: 'HEAD',
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      const isAvailable = response.ok
      
      console.log(`${isAvailable ? '✅' : '❌'} [MetadataUtils] Image URL test result:`, {
        url: imageUrl,
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length'),
        available: isAvailable
      })
      
      return isAvailable
    } catch (error) {
      console.log('❌ [MetadataUtils] Image URL test failed:', {
        url: imageUrl,
        error: error.message,
        errorName: error.name
      })
      return false
    }
  }

  // Get the best available image URL with fallback testing
  static async getBestImageUrl(metadata) {
    // console.log('🎯 [MetadataUtils] Finding best available image URL for metadata:', {
    //   hasImageUrl: !!metadata?.imageUrl,
    //   hasFallbackUrl: !!metadata?.imageFallbackUrl,
    //   hasOriginalImage: !!metadata?.image
    // })
    
    if (!metadata) {
      console.log('❌ [MetadataUtils] No metadata provided')
      return null
    }

    const urlsToTry = [
      metadata.imageUrl,
      metadata.imageFallbackUrl,
      metadata.image
    ].filter(Boolean)

    // console.log('🔍 [MetadataUtils] URLs to test in order:', urlsToTry)

    for (let i = 0; i < urlsToTry.length; i++) {
      const url = urlsToTry[i]
      // console.log(`🧪 [MetadataUtils] Testing URL ${i + 1}/${urlsToTry.length}:`, url)
      
      const isAvailable = await this.testImageUrl(url)
      if (isAvailable) {
        // console.log('✅ [MetadataUtils] Found working image URL:', url)
        return url
      }
    }

    console.log('❌ [MetadataUtils] No working image URLs found')
    return null
  }

  // Check if string is IPFS hash
  static isIPFSHash(string) {
    if (!string || typeof string !== 'string') {
      return false
    }
    
    // Check for common IPFS hash formats (CIDv0 and CIDv1)
    const ipfsHashRegex = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[A-Za-z2-7]{58}|B[A-Z2-7]{58}|z[1-9A-HJ-NP-Za-km-z]{48}|F[0-9A-F]{50}|baf[a-z0-9]{50,})$/
    const isHash = ipfsHashRegex.test(string)
    
    // console.log('🔍 [MetadataUtils] IPFS hash validation:', {
    //   string: string.substring(0, 20) + (string.length > 20 ? '...' : ''),
    //   length: string.length,
    //   isHash: isHash
    // })
    
    return isHash
  }

  // Utility function to shorten addresses
  static shortenAddress(address) {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Create general fallback metadata
  static createFallbackMetadata(name, description, id, additionalData = {}) {
    // console.log('🔄 [MetadataUtils] Creating general fallback metadata:', {
    //   name: name,
    //   id: id,
    //   hasAdditionalData: Object.keys(additionalData).length > 0
    // })

    const fallbackMetadata = {
      name: name || `Item #${id}`,
      description: description || `Item ${id}`,
      image: null,
      imageUrl: null,
      imageFallbackUrl: null,
      external_url: "",
      attributes: [],
      _fallback: true,
      _source: {
        type: 'fallback',
        createdAt: new Date().toISOString(),
        id: id
      },
      ...additionalData
    }

    // console.log('✅ [MetadataUtils] Created general fallback metadata:', fallbackMetadata)
    return fallbackMetadata
  }
}