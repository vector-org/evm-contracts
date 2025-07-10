import { useState, useEffect, useCallback } from 'react'
import { MetadataUtils } from '../lib/metadataUtils'

export function useMetadata(uri, fallbackData = {}) {
  const [metadata, setMetadata] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadMetadata = useCallback(async (metadataURI) => {
    if (!metadataURI || loading) return

    setLoading(true)
    setError(null)

    try {
      console.log('🔍 Loading metadata from URI:', metadataURI)
      const fetchedMetadata = await MetadataUtils.fetchMetadata(metadataURI)
      
      if (MetadataUtils.validateMetadata(fetchedMetadata)) {
        console.log('✅ Metadata loaded and validated successfully:', fetchedMetadata)
        setMetadata(fetchedMetadata)
        console.log('✅ Metadata state updated')
      } else {
        throw new Error('Invalid metadata structure')
      }
    } catch (err) {
      console.error('❌ Failed to load metadata:', err)
      setError(err.message)
      
      // Create fallback metadata
      const fallback = MetadataUtils.createFallbackMetadata(
        fallbackData.name,
        fallbackData.description,
        fallbackData.id
      )
      setMetadata(fallback)
      console.log('📋 Using fallback metadata:', fallback)
    } finally {
      setLoading(false)
    }
  }, [loading, fallbackData])

  useEffect(() => {
    if (uri && !metadata) {
      loadMetadata(uri)
    } else if (!uri && !metadata && (fallbackData.name || fallbackData.id)) {
      // Create fallback if no URI AND no existing metadata
      const fallback = MetadataUtils.createFallbackMetadata(
        fallbackData.name,
        fallbackData.description,
        fallbackData.id
      )
      setMetadata(fallback)
      setLoading(false)
      setError(null)
    }
  }, [uri, loadMetadata, fallbackData, metadata])

  const retry = useCallback(() => {
    if (uri) {
      setMetadata(null)
      setError(null)
      loadMetadata(uri)
    }
  }, [uri, loadMetadata])

  return {
    metadata,
    loading,
    error,
    retry,
    hasLoaded: !!metadata && !loading
  }
}

// Hook specifically for license metadata
export function useLicenseMetadata(licenseData) {
  const uri = licenseData?.uri
  const fallbackData = {
    name: licenseData?.name,
    description: `Gaming license for ${licenseData?.name || 'Unknown Game'}`,
    id: licenseData?.id || 'unknown'
  }

  return useMetadata(uri, fallbackData)
}

// Hook specifically for NFT metadata  
export function useNFTMetadata(nftDetails, licenseId = null) {
  const uri = nftDetails?.uri
  const fallbackData = {
    name: `Gaming License NFT #${nftDetails?.id || 'unknown'}`,
    description: 'Gaming license NFT',
    id: nftDetails?.id || 'unknown'
  }

  const result = useMetadata(uri, fallbackData)

  // Extract license ID from metadata if available
  const extractedLicenseId = result.metadata ? 
    MetadataUtils.extractLicenseId(result.metadata, licenseId || nftDetails?.id) : 
    licenseId || nftDetails?.id

  return {
    ...result,
    licenseId: extractedLicenseId
  }
}

export default useMetadata