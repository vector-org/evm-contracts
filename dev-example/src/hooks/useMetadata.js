import { useState, useEffect, useRef } from 'react'
import { MetadataUtils } from '../lib/metadataUtils'

/**
 * Enhanced metadata hook with proper Pinata support and comprehensive logging
 */
export function useMetadata(uri, fallbackData = {}) {
  const [metadata, setMetadata] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [source, setSource] = useState(null)
  
  const lastUriRef = useRef(null)
  const hasInitializedRef = useRef(false)
  const requestIdRef = useRef(0)

  // Only run when URI actually changes
  useEffect(() => {
    // Generate unique request ID for this fetch attempt
    const currentRequestId = ++requestIdRef.current
    
    console.log(`🎯 [useMetadata-${currentRequestId}] Effect triggered:`, {
      newURI: uri,
      lastURI: lastUriRef.current,
      hasInitialized: hasInitializedRef.current,
      fallbackData: {
        hasLicenseData: !!fallbackData.licenseData,
        licenseId: fallbackData.licenseId,
        name: fallbackData.name
      }
    })

    // If URI is the same as last time, don't do anything
    if (lastUriRef.current === uri && hasInitializedRef.current) {
      console.log(`⏭️ [useMetadata-${currentRequestId}] URI unchanged, skipping fetch`)
      return
    }

    lastUriRef.current = uri
    hasInitializedRef.current = true

    if (uri && uri.trim()) {
      // Fetch from URI
      console.log(`🚀 [useMetadata-${currentRequestId}] Starting metadata fetch for URI:`, {
        uri: uri,
        uriType: typeof uri,
        uriLength: uri.length,
        isIPFSHash: MetadataUtils.isIPFSHash(uri)
      })
      
      setLoading(true)
      setError(null)
      setSource(null)
      
      MetadataUtils.fetchMetadataEnhanced(uri)
        .then(fetchedMetadata => {
          // Check if this is still the current request
          if (currentRequestId !== requestIdRef.current) {
            console.log(`⚠️ [useMetadata-${currentRequestId}] Request outdated, ignoring result`)
            return
          }

          console.log(`📋 [useMetadata-${currentRequestId}] Metadata fetched successfully:`, {
            name: fetchedMetadata.name,
            hasImage: !!fetchedMetadata.image,
            source: fetchedMetadata._source
          })

          const normalizedMetadata = MetadataUtils.normalizeImageUrls(fetchedMetadata)
          
          console.log(`🖼️ [useMetadata-${currentRequestId}] Metadata normalized:`, {
            hasImageUrl: !!normalizedMetadata.imageUrl,
            hasFallbackUrl: !!normalizedMetadata.imageFallbackUrl,
            imageUrl: normalizedMetadata.imageUrl
          })

          setMetadata(normalizedMetadata)
          setSource('uri')
          setLoading(false)
          setError(null)
        })
        .catch(fetchError => {
          // Check if this is still the current request
          if (currentRequestId !== requestIdRef.current) {
            console.log(`⚠️ [useMetadata-${currentRequestId}] Request outdated, ignoring error`)
            return
          }

          console.error(`💥 [useMetadata-${currentRequestId}] Metadata fetch failed:`, {
            uri: uri,
            error: fetchError.message,
            fallbackStrategy: 'creating fallback metadata'
          })
          
          setError(fetchError.message)
          
          // Create fallback on error
          let fallback
          if (fallbackData.licenseData && fallbackData.licenseId !== undefined) {
            console.log(`🔄 [useMetadata-${currentRequestId}] Creating license fallback metadata`)
            fallback = MetadataUtils.createLicenseFallbackMetadata(
              fallbackData.licenseData, 
              fallbackData.licenseId
            )
          } else {
            console.log(`🔄 [useMetadata-${currentRequestId}] Creating general fallback metadata`)
            fallback = MetadataUtils.createFallbackMetadata(
              fallbackData.name,
              fallbackData.description,
              fallbackData.id || fallbackData.licenseId,
              fallbackData
            )
          }
          
          console.log(`✅ [useMetadata-${currentRequestId}] Fallback metadata created:`, {
            name: fallback.name,
            source: fallback._source?.type
          })
          
          setMetadata(fallback)
          setSource('fallback')
          setLoading(false)
        })
    } else {
      // No URI, create fallback immediately
      console.log(`📋 [useMetadata-${currentRequestId}] No URI provided, creating immediate fallback`)
      
      if (fallbackData.name || fallbackData.id || fallbackData.licenseId !== undefined) {
        let fallback
        if (fallbackData.licenseData && fallbackData.licenseId !== undefined) {
          console.log(`🔄 [useMetadata-${currentRequestId}] Creating license fallback (no URI)`)
          fallback = MetadataUtils.createLicenseFallbackMetadata(
            fallbackData.licenseData, 
            fallbackData.licenseId
          )
        } else {
          console.log(`🔄 [useMetadata-${currentRequestId}] Creating general fallback (no URI)`)
          fallback = MetadataUtils.createFallbackMetadata(
            fallbackData.name,
            fallbackData.description,
            fallbackData.id || fallbackData.licenseId,
            fallbackData
          )
        }
        
        console.log(`✅ [useMetadata-${currentRequestId}] Immediate fallback created:`, {
          name: fallback.name,
          source: fallback._source?.type
        })
        
        setMetadata(fallback)
        setSource('fallback')
        setError(null)
        setLoading(false)
      } else {
        console.log(`⚠️ [useMetadata-${currentRequestId}] No URI and insufficient fallback data`)
        setMetadata(null)
        setSource(null)
        setError(null)
        setLoading(false)
      }
    }

    // Cleanup function
    return () => {
      console.log(`🧹 [useMetadata-${currentRequestId}] Cleanup triggered`)
    }
  }, [uri]) // Only depend on URI

  const refresh = () => {
    console.log('🔄 [useMetadata] Manual refresh triggered')
    hasInitializedRef.current = false
    lastUriRef.current = null
    requestIdRef.current++
  }

  return {
    metadata,
    loading,
    error,
    source,
    refresh
  }
}

/**
 * Enhanced license metadata hook with comprehensive logging
 */
export function useLicenseMetadata(tokenURI, licenseData, licenseId) {
  console.log('🎮 [useLicenseMetadata] Hook called with:', {
    tokenURI: tokenURI,
    hasLicenseData: !!licenseData,
    licenseId: licenseId,
    licenseName: licenseData?.name
  })

  const result = useMetadata(tokenURI, {
    licenseData,
    licenseId,
    name: licenseData?.name,
    description: licenseData?.description,
    id: licenseId
  })

  console.log('🎮 [useLicenseMetadata] Hook result:', {
    hasMetadata: !!result.metadata,
    loading: result.loading,
    error: result.error,
    source: result.source,
    metadataName: result.metadata?.name
  })

  return result
}

/**
 * Enhanced NFT metadata hook with comprehensive logging
 */
export function useNFTMetadata(tokenURI, nftData, tokenId) {
  console.log('🖼️ [useNFTMetadata] Hook called with:', {
    tokenURI: tokenURI,
    hasNFTData: !!nftData,
    tokenId: tokenId,
    nftName: nftData?.name
  })

  const result = useMetadata(tokenURI, {
    name: nftData?.name || `NFT #${tokenId}`,
    description: nftData?.description || `NFT Token #${tokenId}`,
    id: tokenId
  })

  console.log('🖼️ [useNFTMetadata] Hook result:', {
    hasMetadata: !!result.metadata,
    loading: result.loading,
    error: result.error,
    source: result.source,
    metadataName: result.metadata?.name
  })

  return result
}

export default useMetadata