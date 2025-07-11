import { useReadContract, useWriteContract } from 'wagmi'
import { useState } from 'react'
import { CONTRACTS } from '../lib/contracts'

export function useContract() {
  const [isLoading, setIsLoading] = useState(false)

  // Factory Contract Functions
  const useCreateLicense = () => {
    const { writeContractAsync, isPending, error } = useWriteContract()
    
    const createLicense = async (licenseInput) => {
      try {
        const hash = await writeContractAsync({
          address: CONTRACTS.FACTORY.address,
          abi: CONTRACTS.FACTORY.abi,
          functionName: 'createLicense',
          args: [licenseInput]
        })
        
        return hash
      } catch (error) {
        throw error
      }
    }
    
    return { createLicense, isPending, error }
  }

  const useGetAllLicenseIds = () => {
    const result = useReadContract({
      address: CONTRACTS.FACTORY.address,
      abi: CONTRACTS.FACTORY.abi,
      functionName: 'getAllLicenseIds',
    })

    // Convert BigInt array to regular numbers
    const data = result.data ? result.data.map(id => Number(id)) : result.data

    return {
      ...result,
      data
    }
  }

  const useGetLicenseFromID = (licenseId) => {
    // Convert BigInt to number if needed
    const numericId = typeof licenseId === 'bigint' ? Number(licenseId) : licenseId
    
    return useReadContract({
      address: CONTRACTS.FACTORY.address,
      abi: CONTRACTS.FACTORY.abi,
      functionName: 'getLicenseFromID',
      args: [numericId],
      query: {
        enabled: numericId !== null && numericId !== undefined,
      }
    })
  }

  // Primary Marketplace Functions
  const useMintLicense = () => {
    const { writeContractAsync, isPending, error } = useWriteContract()
    
    const mintLicense = async ({ licenseId, receiver, metadataURI }) => {
      try {
        const numericId = typeof licenseId === 'bigint' ? Number(licenseId) : licenseId
        
        const hash = await writeContractAsync({
          address: CONTRACTS.PRIMARY_MARKETPLACE.address,
          abi: CONTRACTS.PRIMARY_MARKETPLACE.abi,
          functionName: 'mintLicense',
          args: [numericId, receiver, metadataURI],
          // value: BigInt(value)
        })
        
        return { hash }
      } catch (error) {
        throw error
      }
    }
    
    return { mintLicense, isPending, error }
  }

  const useGetAllNFTIds = () => {
    const result = useReadContract({
      address: CONTRACTS.PRIMARY_MARKETPLACE.address,
      abi: CONTRACTS.PRIMARY_MARKETPLACE.abi,
      functionName: 'getAllNFTIds',
    })

    const data = result.data ? result.data.map(id => Number(id)) : result.data

    return {
      ...result,
      data
    }
  }

  const useGetNFTDetails = (nftId) => {
    const numericId = typeof nftId === 'bigint' ? Number(nftId) : nftId
    
    return useReadContract({
      address: CONTRACTS.PRIMARY_MARKETPLACE.address,
      abi: CONTRACTS.PRIMARY_MARKETPLACE.abi,
      functionName: 'getNFTDetails',
      args: [numericId],
      query: {
        enabled: numericId !== null && numericId !== undefined,
      }
    })
  }

  // Secondary Marketplace Functions
  const useCreateOffer = () => {
    const { writeContractAsync, isPending, error } = useWriteContract()
    
    const createOffer = async (licenseAddress, tokenId, price) => {
      try {
        const numericTokenId = typeof tokenId === 'bigint' ? Number(tokenId) : tokenId
        
        const hash = await writeContractAsync({
          address: CONTRACTS.SECONDARY_MARKETPLACE.address,
          abi: CONTRACTS.SECONDARY_MARKETPLACE.abi,
          functionName: 'createOffer',
          args: [licenseAddress, numericTokenId, BigInt(price)]
        })
        
        return hash
      } catch (error) {
        throw error
      }
    }
    
    return { createOffer, isPending, error }
  }

  const useAcceptOffer = () => {
    const { writeContractAsync, isPending, error } = useWriteContract()
    
    const acceptOffer = async (tokenId, value) => {
      try {
        const numericTokenId = typeof tokenId === 'bigint' ? Number(tokenId) : tokenId
        
        const hash = await writeContractAsync({
          address: CONTRACTS.SECONDARY_MARKETPLACE.address,
          abi: CONTRACTS.SECONDARY_MARKETPLACE.abi,
          functionName: 'acceptOffer',
          args: [numericTokenId],
          value: BigInt(value)
        })
        
        return hash
      } catch (error) {
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
      try {
        const numericTokenId = typeof tokenId === 'bigint' ? Number(tokenId) : tokenId
        
        const hash = await writeContractAsync({
          address: CONTRACTS.SECONDARY_MARKETPLACE.address,
          abi: CONTRACTS.SECONDARY_MARKETPLACE.abi,
          functionName: 'removeOffer',
          args: [numericTokenId]
        })
        
        return hash
      } catch (error) {
        throw error
      }
    }
    
    return { removeOffer, isPending, error }
  }

  // License Contract Functions
  const useApprove = () => {
    const { writeContractAsync, isPending, error } = useWriteContract()
    
    const approve = async (licenseAddress, spender, tokenId) => {
      try {
        const numericTokenId = typeof tokenId === 'bigint' ? Number(tokenId) : tokenId
        
        const hash = await writeContractAsync({
          address: licenseAddress,
          abi: CONTRACTS.LICENSE.abi,
          functionName: 'approve',
          args: [spender, numericTokenId]
        })
        
        return hash
      } catch (error) {
        throw error
      }
    }
    
    return { approve, isPending, error }
  }

  const useGetApproved = (licenseAddress, tokenId) => {
    const numericId = typeof tokenId === 'bigint' ? Number(tokenId) : tokenId
    
    return useReadContract({
      address: licenseAddress,
      abi: CONTRACTS.LICENSE.abi,
      functionName: 'getApproved',
      args: [numericId],
      query: {
        enabled: !!(licenseAddress && numericId !== null && numericId !== undefined),
      }
    })
  }

  const useOwnerOf = (licenseAddress, tokenId) => {
    const numericId = typeof tokenId === 'bigint' ? Number(tokenId) : tokenId
    
    return useReadContract({
      address: licenseAddress,
      abi: CONTRACTS.LICENSE.abi,
      functionName: 'ownerOf',
      args: [numericId],
      query: {
        enabled: !!(licenseAddress && numericId !== null && numericId !== undefined),
      }
    })
  }

  const useTokenURI = (licenseAddress, tokenId) => {
    const numericId = typeof tokenId === 'bigint' ? Number(tokenId) : tokenId
    
    return useReadContract({
      address: licenseAddress,
      abi: CONTRACTS.LICENSE.abi,
      functionName: 'tokenURI',
      args: [numericId],
      query: {
        enabled: !!(licenseAddress && numericId !== null && numericId !== undefined),
      }
    })
  }

  const useGetLicenseTokenURI = (contractAddress, licenseId) => {
    const numericId = typeof licenseId === 'bigint' ? Number(licenseId) : licenseId
    
    return useReadContract({
      address: contractAddress,
      abi: CONTRACTS.LICENSE.abi,
      functionName: 'tokenURI',
      args: [numericId],
      query: {
        enabled: !!(contractAddress && numericId !== null && numericId !== undefined),
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
    useCreateLicense,
    useGetAllLicenseIds,
    useGetLicenseFromID,
    useMintLicense,
    useGetAllNFTIds,
    useGetNFTDetails,
    useCreateOffer,
    useAcceptOffer,
    useGetOpenOffers,
    useRemoveOffer,
    useGetUserTokens,
    useApprove,
    useGetApproved,
    useOwnerOf,
    useTokenURI,
    useGetLicenseTokenURI,
  }
}