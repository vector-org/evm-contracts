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