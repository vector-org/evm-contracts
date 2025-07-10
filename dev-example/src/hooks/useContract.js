import { useReadContract, useWriteContract } from 'wagmi'
import { useState } from 'react'
import { CONTRACTS } from '../lib/contracts'

export function useContract() {
  const [isLoading, setIsLoading] = useState(false)

  // Factory Contract Functions
  const useCreateLicense = () => {
    const { writeContractAsync, isPending, error } = useWriteContract()
    
    const createLicense = async (licenseInput) => {
      console.log('🔧 useCreateLicense called with:', licenseInput)
      
      try {
        const hash = await writeContractAsync({
          address: CONTRACTS.FACTORY.address,
          abi: CONTRACTS.FACTORY.abi,
          functionName: 'createLicense',
          args: [licenseInput]
        })
        
        console.log('✅ License creation transaction hash received:', hash)
        return hash
      } catch (error) {
        console.error('💥 License creation failed in hook:', error)
        throw error
      }
    }
    
    return { createLicense, isPending, error }
  }

  const useGetAllLicenseIds = () => {
    return useReadContract({
      address: CONTRACTS.FACTORY.address,
      abi: CONTRACTS.FACTORY.abi,
      functionName: 'getAllLicenseIds',
    })
  }

  const useGetLicenseFromID = (licenseId) => {
    return useReadContract({
      address: CONTRACTS.FACTORY.address,
      abi: CONTRACTS.FACTORY.abi,
      functionName: 'getLicenseFromID',
      args: [licenseId],
      query: {
        enabled: !!licenseId,
      }
    })
  }

  // Primary Marketplace Functions
  const useMintLicense = () => {
    const { writeContractAsync, isPending, error } = useWriteContract()
    
    const mintLicense = async (licenseId, receiver, uri) => {
      console.log('🔧 useMintLicense called with:', { licenseId, receiver, uri })
      
      try {
        const hash = await writeContractAsync({
          address: CONTRACTS.PRIMARY_MARKETPLACE.address,
          abi: CONTRACTS.PRIMARY_MARKETPLACE.abi,
          functionName: 'mintLicense',
          args: [licenseId, receiver, uri]
        })
        
        console.log('✅ Mint transaction hash received:', hash)
        return hash
      } catch (error) {
        console.error('💥 Mint failed in hook:', error)
        throw error
      }
    }
    
    return { mintLicense, isPending, error }
  }

  const useGetAllNFTIds = () => {
    return useReadContract({
      address: CONTRACTS.PRIMARY_MARKETPLACE.address,
      abi: CONTRACTS.PRIMARY_MARKETPLACE.abi,
      functionName: 'getAllNFTIds',
    })
  }

  const useGetNFTDetails = (nftId) => {
    return useReadContract({
      address: CONTRACTS.PRIMARY_MARKETPLACE.address,
      abi: CONTRACTS.PRIMARY_MARKETPLACE.abi,
      functionName: 'getNFTDetails',
      args: [nftId],
      query: {
        enabled: !!nftId,
      }
    })
  }

  // Secondary Marketplace Functions
  const useCreateOffer = () => {
    const { writeContractAsync, isPending, error } = useWriteContract()
    
    const createOffer = async (tokenId, licenseAddress, price) => {
      console.log('🔧 useCreateOffer called with:', { tokenId, licenseAddress, price })
      
      try {
        const hash = await writeContractAsync({
          address: CONTRACTS.SECONDARY_MARKETPLACE.address,
          abi: CONTRACTS.SECONDARY_MARKETPLACE.abi,
          functionName: 'createOffer',
          args: [tokenId, licenseAddress, price]
        })
        
        console.log('✅ Create offer transaction hash received:', hash)
        return hash
      } catch (error) {
        console.error('💥 Create offer failed in hook:', error)
        throw error
      }
    }
    
    return { createOffer, isPending, error }
  }

  const useAcceptOffer = () => {
    const { writeContractAsync, isPending, error } = useWriteContract()
    
    const acceptOffer = async (tokenId, exactPrice) => {
      console.log('🔧 useAcceptOffer called with:', { 
        tokenId, 
        exactPrice: exactPrice.toString(),
        exactPriceType: typeof exactPrice 
      })
      
      try {
        // CRITICAL FIX: Ensure we're sending the exact BigInt price
        // Do not format or convert - use the raw BigInt value from the offer
        const hash = await writeContractAsync({
          address: CONTRACTS.SECONDARY_MARKETPLACE.address,
          abi: CONTRACTS.SECONDARY_MARKETPLACE.abi,
          functionName: 'acceptOffer',
          args: [tokenId],
          value: exactPrice // This should be the exact BigInt value from offer.price
        })
        
        console.log('✅ Accept offer transaction hash received:', hash)
        console.log('💰 Sent exact price (wei):', exactPrice.toString())
        return hash
      } catch (error) {
        console.error('💥 Accept offer failed in hook:', error)
        console.error('💰 Failed with price (wei):', exactPrice.toString())
        throw error
      }
    }
    
    return { acceptOffer, isPending, error }
  }

  const useGetOpenOffers = () => {
    const data = useReadContract({
      address: CONTRACTS.SECONDARY_MARKETPLACE.address,
      abi: CONTRACTS.SECONDARY_MARKETPLACE.abi,
      functionName: 'getOpenOffers',
    })
    console.log('📊 Open offers data:', data)
    return data
  }

  const useRemoveOffer = () => {
    const { writeContractAsync, isPending, error } = useWriteContract()
    
    const removeOffer = async (tokenId) => {
      console.log('🔧 useRemoveOffer called with:', { tokenId })
      
      try {
        const hash = await writeContractAsync({
          address: CONTRACTS.SECONDARY_MARKETPLACE.address,
          abi: CONTRACTS.SECONDARY_MARKETPLACE.abi,
          functionName: 'removeOffer',
          args: [tokenId]
        })
        
        console.log('✅ Remove offer transaction hash received:', hash)
        return hash
      } catch (error) {
        console.error('💥 Remove offer failed in hook:', error)
        throw error
      }
    }
    
    return { removeOffer, isPending, error }
  }

  // License Contract Functions
  const useApprove = () => {
    const { writeContractAsync, isPending, error } = useWriteContract()
    
    const approve = async (licenseAddress, spender, tokenId) => {
      console.log('🔧 useApprove called with:', { licenseAddress, spender, tokenId })
      
      try {
        const hash = await writeContractAsync({
          address: licenseAddress,
          abi: CONTRACTS.LICENSE.abi,
          functionName: 'approve',
          args: [spender, tokenId]
        })
        
        console.log('✅ Approve transaction hash received:', hash)
        return hash
      } catch (error) {
        console.error('💥 Approve failed in hook:', error)
        throw error
      }
    }
    
    return { approve, isPending, error }
  }

  const useGetApproved = (licenseAddress, tokenId) => {
    return useReadContract({
      address: licenseAddress,
      abi: CONTRACTS.LICENSE.abi,
      functionName: 'getApproved',
      args: [tokenId],
      query: {
        enabled: !!(licenseAddress && tokenId),
      }
    })
  }

  const useOwnerOf = (licenseAddress, tokenId) => {
    return useReadContract({
      address: licenseAddress,
      abi: CONTRACTS.LICENSE.abi,
      functionName: 'ownerOf',
      args: [tokenId],
      query: {
        enabled: !!(licenseAddress && tokenId),
      }
    })
  }

  const useTokenURI = (licenseAddress, tokenId) => {
    return useReadContract({
      address: licenseAddress,
      abi: CONTRACTS.LICENSE.abi,
      functionName: 'tokenURI',
      args: [tokenId],
      query: {
        enabled: !!(licenseAddress && tokenId),
      }
    })
  }

  // Add this specific function for license token URI fetching
  const useGetLicenseTokenURI = (contractAddress, licenseId) => {
    return useReadContract({
      address: contractAddress,
      abi: CONTRACTS.LICENSE.abi,
      functionName: 'tokenURI',
      args: [licenseId],
      query: {
        enabled: !!(contractAddress && licenseId),
      }
    })
  }

  const useGetUserTokens = (userAddress) => {
    return useReadContract({
      address: CONTRACTS.PRIMARY_MARKETPLACE.address,
      abi: CONTRACTS.PRIMARY_MARKETPLACE.abi,
      functionName: 'getUserTokens',
      args: [userAddress],
      query: {
        enabled: !!userAddress,
      }
    })
  }

  return {
    isLoading,
    setIsLoading,
    // Factory
    useCreateLicense,
    useGetAllLicenseIds,
    useGetLicenseFromID,
    // Primary Marketplace
    useMintLicense,
    useGetAllNFTIds,
    useGetNFTDetails,
    // Secondary Marketplace
    useCreateOffer,
    useAcceptOffer,
    useGetOpenOffers,
    useRemoveOffer,
    useGetUserTokens,
    // License Contract
    useApprove,
    useGetApproved,
    useOwnerOf,
    useTokenURI,
    useGetLicenseTokenURI, // Add this to the exports
  }
}