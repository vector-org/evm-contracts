import { useState, useEffect, useRef } from 'react'
import { MetadataUtils } from '../lib/metadataUtils'

/**
 * Minimal metadata hook that prevents infinite loops
 */
export function useMetadata(uri, fallbackData = {}) {
  const [metadata, setMetadata] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [source, setSource] = useState(null)
  
  const lastUriRef = useRef(null)
  const hasInitializedRef = useRef(false)

  // Only run when URI actually changes
  useEffect(() => {
    // If URI is the same as last time, don't do anything
    if (lastUriRef.current === uri && hasInitializedRef.current) {
      return
    }

    lastUriRef.current = uri
    hasInitializedRef.current = true

    if (uri) {
      // Fetch from URI
      setLoading(true)
      setError(null)
      
      MetadataUtils.fetchMetadataEnhanced(uri)
        .then(fetchedMetadata => {
          const normalizedMetadata = MetadataUtils.normalizeImageUrls(fetchedMetadata)
          setMetadata(normalizedMetadata)
          setSource('uri')
          setLoading(false)
        })
        .catch(fetchError => {
          setError(fetchError.message)
          
          // Create fallback on error
          let fallback
          if (fallbackData.licenseData && fallbackData.licenseId !== undefined) {
            fallback = MetadataUtils.createLicenseFallbackMetadata(
              fallbackData.licenseData, 
              fallbackData.licenseId
            )
          } else {
            fallback = MetadataUtils.createFallbackMetadata(
              fallbackData.name,
              fallbackData.description,
              fallbackData.id || fallbackData.licenseId,
              fallbackData
            )
          }
          
          setMetadata(fallback)
          setSource('fallback')
          setLoading(false)
        })
    } else {
      // No URI, create fallback immediately
      if (fallbackData.name || fallbackData.id || fallbackData.licenseId !== undefined) {
        let fallback
        if (fallbackData.licenseData && fallbackData.licenseId !== undefined) {
          fallback = MetadataUtils.createLicenseFallbackMetadata(
            fallbackData.licenseData, 
            fallbackData.licenseId
          )
        } else {
          fallback = MetadataUtils.createFallbackMetadata(
            fallbackData.name,
            fallbackData.description,
            fallbackData.id || fallbackData.licenseId,
            fallbackData
          )
        }
        
        setMetadata(fallback)
        setSource('fallback')
        setError(null)
      }
    }
  }, [uri]) // Only depend on URI

  return {
    metadata,
    loading,
    error,
    source,
    refresh: () => {
      hasInitializedRef.current = false
      lastUriRef.current = null
    }
  }
}

/**
 * Simple license metadata hook
 */
export function useLicenseMetadata(tokenURI, licenseData, licenseId) {
  return useMetadata(tokenURI, {
    licenseData,
    licenseId,
    name: licenseData?.name,
    description: licenseData?.description,
    id: licenseId
  })
}

/**
 * Simple NFT metadata hook
 */
export function useNFTMetadata(tokenURI, nftData, tokenId) {
  return useMetadata(tokenURI, {
    name: nftData?.name || `NFT #${tokenId}`,
    description: nftData?.description || `NFT Token #${tokenId}`,
    id: tokenId
  })
}

export default useMetadata