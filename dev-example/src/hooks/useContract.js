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

  // Helper function to get license URI directly
  const useGetLicenseURI = (licenseId) => {
    return useReadContract({
      address: CONTRACTS.FACTORY.address,
      abi: CONTRACTS.FACTORY.abi,
      functionName: 'getLicenseURI',
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
    
    const acceptOffer = async (tokenId, value) => {
      console.log('🔧 useAcceptOffer called with:', { tokenId, value })
      
      try {
        const hash = await writeContractAsync({
          address: CONTRACTS.SECONDARY_MARKETPLACE.address,
          abi: CONTRACTS.SECONDARY_MARKETPLACE.abi,
          functionName: 'acceptOffer',
          args: [tokenId],
          value: value
        })
        
        console.log('✅ Accept offer transaction hash received:', hash)
        return hash
      } catch (error) {
        console.error('💥 Accept offer failed in hook:', error)
        throw error
      }
    }
    
    return { acceptOffer, isPending, error }
  }

  const useGetOpenOffers = () => {
    return useReadContract({
      address: CONTRACTS.SECONDARY_MARKETPLACE.address,
      abi: CONTRACTS.SECONDARY_MARKETPLACE.abi,
      functionName: 'getOpenOffers',
    })
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
    
    const approve = async (contractAddress, to, tokenId) => {
      console.log('🔧 useApprove called with:', { contractAddress, to, tokenId })
      
      try {
        const hash = await writeContractAsync({
          address: contractAddress,
          abi: CONTRACTS.LICENSE.abi,
          functionName: 'approve',
          args: [to, tokenId]
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

  const useGetApproved = (contractAddress, tokenId) => {
    return useReadContract({
      address: contractAddress,
      abi: CONTRACTS.LICENSE.abi,
      functionName: 'getApproved',
      args: [tokenId],
      query: {
        enabled: !!(contractAddress && tokenId),
      }
    })
  }

  const useOwnerOf = (contractAddress, tokenId) => {
    return useReadContract({
      address: contractAddress,
      abi: CONTRACTS.LICENSE.abi,
      functionName: 'ownerOf',
      args: [tokenId],
      query: {
        enabled: !!(contractAddress && tokenId),
      }
    })
  }

  const useTokenURI = (contractAddress, tokenId) => {
    return useReadContract({
      address: contractAddress,
      abi: CONTRACTS.LICENSE.abi,
      functionName: 'tokenURI',
      args: [tokenId],
      query: {
        enabled: !!(contractAddress && tokenId),
      }
    })
  }

  // Function to get license token URI for marketplace display
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

  return {
    isLoading,
    setIsLoading,
    // Factory
    useCreateLicense,
    useGetAllLicenseIds,
    useGetLicenseFromID,
    useGetLicenseURI,
    // Primary Marketplace
    useMintLicense,
    useGetAllNFTIds,
    useGetNFTDetails,
    useGetUserTokens,
    // Secondary Marketplace
    useCreateOffer,
    useAcceptOffer,
    useGetOpenOffers,
    useRemoveOffer,
    // License Contract
    useApprove,
    useGetApproved,
    useOwnerOf,
    useTokenURI,
    useGetLicenseTokenURI,
  }
}