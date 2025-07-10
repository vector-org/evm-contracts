import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatEther(wei) {
  return (parseFloat(wei) / 1e18).toFixed(4)
}

export function parseEther(ether) {
  return (parseFloat(ether) * 1e18).toString()
}

export function shortenAddress(address) {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// Add this missing function
export function shortenURI(uri, maxLength = 40) {
  if (!uri) return ''
  if (uri.length <= maxLength) return uri
  
  const start = Math.floor((maxLength - 3) / 2)
  const end = maxLength - 3 - start
  
  return `${uri.slice(0, start)}...${uri.slice(-end)}`
}

export function formatTimestamp(timestamp) {
  return new Date(timestamp * 1000).toLocaleDateString()
}

export function getExplorerUrl(txHash, network = 'sepolia') {
  const explorers = {
    sepolia: 'https://sepolia.etherscan.io/tx/',
    mainnet: 'https://etherscan.io/tx/'
  }
  return `${explorers[network] || explorers.sepolia}${txHash}`
}

// Create MetadataUtils object for backward compatibility
export const MetadataUtils = {
  shortenURI,
  shortenAddress,
  // Add other utility functions as needed
  formatEther,
  parseEther,
  formatTimestamp,
  getExplorerUrl
}