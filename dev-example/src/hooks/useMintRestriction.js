import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { useContract } from './useContract'

/**
 * Hook to track user's minted licenses and prevent duplicate minting
 */
export function useMintRestriction() {
  const { address, isConnected } = useAccount()
  const { useGetAllNFTIds, useGetNFTDetails } = useContract()
  
  const [userMintedLicenses, setUserMintedLicenses] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [checkedAddresses, setCheckedAddresses] = useState(new Set())

  const { data: allNFTIds, isLoading: loadingNFTs } = useGetAllNFTIds()

  // Check which licenses the current user has already minted
  useEffect(() => {
    if (!address || !isConnected || checkedAddresses.has(address)) {
      setLoading(false)
      return
    }

    if (allNFTIds && allNFTIds.length > 0) {
      console.log('🔍 Checking user minted licenses for:', address)
      setLoading(true)

      // Check each NFT to see if user owns it
      const checkUserNFTs = async () => {
        const userLicenses = new Set()
        
        for (const nftId of allNFTIds) {
          try {
            // We'll need to get NFT details to check ownership
            // This is a simplified check - you might need to adjust based on your contract structure
            const response = await fetch(`/api/nft/${nftId}/owner`) // Adjust API endpoint as needed
            if (response.ok) {
              const data = await response.json()
              if (data.owner?.toLowerCase() === address?.toLowerCase()) {
                // Extract license ID from NFT metadata
                userLicenses.add(data.licenseId || nftId)
              }
            }
          } catch (error) {
            console.error(`Error checking NFT ${nftId}:`, error)
          }
        }

        setUserMintedLicenses(userLicenses)
        setCheckedAddresses(prev => new Set([...prev, address]))
        setLoading(false)
        
        console.log('✅ User minted licenses:', Array.from(userLicenses))
      }

      checkUserNFTs()
    } else if (!loadingNFTs) {
      setLoading(false)
    }
  }, [address, isConnected, allNFTIds, loadingNFTs, checkedAddresses])

  // Alternative approach using contract calls (more reliable)
  const checkUserMintedLicensesViaContract = useCallback(async () => {
    if (!address || !isConnected || !allNFTIds) return

    console.log('🔍 Checking minted licenses via contract for:', address)
    const userLicenses = new Set()

    // Check each NFT ID to see if user owns it
    for (const nftId of allNFTIds) {
      try {
        // You'll need to implement this hook in your useContract
        // const { data: nftDetails } = useGetNFTDetails(nftId)
        // if (nftDetails?.owner?.toLowerCase() === address?.toLowerCase()) {
        //   userLicenses.add(nftDetails.licenseId || nftId)
        // }
      } catch (error) {
        console.error(`Error checking NFT ownership ${nftId}:`, error)
      }
    }

    setUserMintedLicenses(userLicenses)
    setLoading(false)
  }, [address, isConnected, allNFTIds])

  // Check if user has already minted a specific license
  const hasUserMintedLicense = useCallback((licenseId) => {
    return userMintedLicenses.has(licenseId?.toString())
  }, [userMintedLicenses])

  // Add a license to the minted set (call after successful mint)
  const markLicenseAsMinted = useCallback((licenseId) => {
    setUserMintedLicenses(prev => new Set([...prev, licenseId?.toString()]))
    console.log('✅ Marked license as minted:', licenseId)
  }, [])

  // Reset when user disconnects
  useEffect(() => {
    if (!isConnected) {
      setUserMintedLicenses(new Set())
      setCheckedAddresses(new Set())
      setLoading(false)
    }
  }, [isConnected])

  return {
    userMintedLicenses: Array.from(userMintedLicenses),
    hasUserMintedLicense,
    markLicenseAsMinted,
    loading: loading || loadingNFTs,
    checkUserMintedLicensesViaContract
  }
}

/**
 * Enhanced version that works with your existing contract structure
 */
export function useMintRestrictionEnhanced() {
  const { address, isConnected } = useAccount()
  const { useGetAllNFTIds } = useContract()
  
  const [userMintedLicenses, setUserMintedLicenses] = useState(new Set())
  const [loading, setLoading] = useState(true)

  const { data: allNFTIds, isLoading: loadingNFTs } = useGetAllNFTIds()

  // Use multiple NFT detail hooks to check ownership
  const NFTOwnershipChecker = ({ nftIds, onComplete }) => {
    const [checkedCount, setCheckedCount] = useState(0)
    const [ownedLicenses, setOwnedLicenses] = useState(new Set())

    useEffect(() => {
      if (checkedCount === nftIds.length && onComplete) {
        onComplete(ownedLicenses)
      }
    }, [checkedCount, nftIds.length, ownedLicenses, onComplete])

    return null // This is a logic-only component
  }

  // Check ownership when NFT IDs are available
  useEffect(() => {
    if (!address || !isConnected || !allNFTIds) {
      setLoading(false)
      return
    }

    // Simple approach: store in localStorage for quick access
    const storageKey = `minted_licenses_${address.toLowerCase()}`
    const cached = localStorage.getItem(storageKey)
    
    if (cached) {
      try {
        const cachedSet = new Set(JSON.parse(cached))
        setUserMintedLicenses(cachedSet)
        console.log('📋 Loaded cached minted licenses:', Array.from(cachedSet))
      } catch (error) {
        console.error('Error loading cached licenses:', error)
      }
    }

    setLoading(false)
  }, [address, isConnected, allNFTIds])

  const hasUserMintedLicense = useCallback((licenseId) => {
    return userMintedLicenses.has(licenseId?.toString())
  }, [userMintedLicenses])

  const markLicenseAsMinted = useCallback((licenseId) => {
    const licenseIdStr = licenseId?.toString()
    setUserMintedLicenses(prev => {
      const newSet = new Set([...prev, licenseIdStr])
      
      // Cache to localStorage
      if (address) {
        const storageKey = `minted_licenses_${address.toLowerCase()}`
        localStorage.setItem(storageKey, JSON.stringify(Array.from(newSet)))
      }
      
      return newSet
    })
    console.log('✅ Marked license as minted:', licenseId)
  }, [address])

  // Clear cache when user disconnects
  useEffect(() => {
    if (!isConnected) {
      setUserMintedLicenses(new Set())
      setLoading(false)
    }
  }, [isConnected])

  return {
    userMintedLicenses: Array.from(userMintedLicenses),
    hasUserMintedLicense,
    markLicenseAsMinted,
    loading: loading || loadingNFTs
  }
}

/**
 * Contract-based approach for checking user's minted licenses
 */
export function useContractMintRestriction() {
  const { address } = useAccount()
  const [userMintedLicenses, setUserMintedLicenses] = useState(new Set())
  
  // This would use a contract method to check if user has minted a license
  // You'll need to implement this in your smart contract
  const checkUserMintedLicense = useCallback(async (licenseId) => {
    if (!address || !licenseId) return false

    try {
      // Example contract call (adjust based on your contract)
      // const hasUserMinted = await contract.hasUserMintedLicense(address, licenseId)
      // return hasUserMinted
      
      // For now, return false - implement based on your contract
      return userMintedLicenses.has(licenseId.toString())
    } catch (error) {
      console.error('Error checking user minted license:', error)
      return false
    }
  }, [address, userMintedLicenses])

  return {
    checkUserMintedLicense,
    userMintedLicenses: Array.from(userMintedLicenses)
  }
}