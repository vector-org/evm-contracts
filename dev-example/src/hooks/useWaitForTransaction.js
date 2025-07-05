import { useWaitForTransactionReceipt } from 'wagmi'
import { useEffect, useState } from 'react'

export function useWaitForTransaction({ hash, onSuccess, onError, enabled = true }) {
  const [isWatching, setIsWatching] = useState(false)
  
  const {
    data: receipt,
    isError,
    isLoading,
    isSuccess,
    error
  } = useWaitForTransactionReceipt({
    hash,
    query: {
      enabled: !!hash && enabled,
      retry: 3,
      retryDelay: 2000,
    }
  })

  // Start watching when hash is provided
  useEffect(() => {
    if (hash && enabled) {
      setIsWatching(true)
      console.log('🔍 Starting to watch transaction:', hash)
      console.log('🔗 Etherscan URL:', `https://sepolia.etherscan.io/tx/${hash}`)
    }
  }, [hash, enabled])

  // Handle successful transaction
  useEffect(() => {
    if (isSuccess && receipt && hash) {
      console.log('✅ Transaction confirmed successfully:', {
        hash,
        blockNumber: receipt.blockNumber?.toString(),
        gasUsed: receipt.gasUsed?.toString(),
        status: receipt.status,
        confirmations: receipt.confirmations || 1
      })
      
      setIsWatching(false)
      onSuccess?.(receipt)
    }
  }, [isSuccess, receipt, hash, onSuccess])

  // Handle failed transaction
  useEffect(() => {
    if (isError && hash) {
      console.error('❌ Transaction failed:', {
        hash,
        error: error?.message || 'Unknown error',
        details: error
      })
      
      setIsWatching(false)
      onError?.(error)
    }
  }, [isError, hash, error, onError])

  // Handle pending state
  useEffect(() => {
    if (isLoading && hash) {
      console.log('⏳ Transaction pending confirmation:', hash)
    }
  }, [isLoading, hash])

  return {
    receipt,
    isError,
    isLoading,
    isSuccess,
    isWatching,
    error
  }
}