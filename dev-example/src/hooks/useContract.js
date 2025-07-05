import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useState } from 'react'
import { CONTRACTS } from '../lib/contracts'

export function useContract() {
  const [isLoading, setIsLoading] = useState(false)

  // Factory Contract Functions
  const useCreateLicense = () => {
    return useWriteContract()
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
    return useWriteContract()
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
    return useWriteContract()
  }

  const useAcceptOffer = () => {
    return useWriteContract()
  }

  const useGetOpenOffers = () => {
    return useReadContract({
      address: CONTRACTS.SECONDARY_MARKETPLACE.address,
      abi: CONTRACTS.SECONDARY_MARKETPLACE.abi,
      functionName: 'getOpenOffers',
    })
  }

  const useRemoveOffer = () => {
    return useWriteContract()
  }

  // License Contract Functions
  const useApprove = (licenseAddress) => {
    return useWriteContract()
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
    // License Contract
    useApprove,
    useGetApproved,
    useOwnerOf,
    useTokenURI,
  }
}