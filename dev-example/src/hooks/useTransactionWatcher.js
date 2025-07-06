import { useEffect, useRef, useCallback } from 'react'
import { useWaitForTransaction } from 'wagmi'

export function useTransactionWatcher(txHash, onSuccess, onError, options = {}) {
  // Use refs to store callbacks to prevent dependency issues
  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)
  const processedRef = useRef(new Set())

  // Update refs when callbacks change
  useEffect(() => {
    onSuccessRef.current = onSuccess
  }, [onSuccess])

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  const {
    data: receipt,
    isError,
    isLoading,
    isSuccess,
    error
  } = useWaitForTransaction({
    hash: txHash,
    enabled: !!txHash && !processedRef.current.has(txHash),
    ...options
  })

  // Memoized success handler
  const handleSuccess = useCallback((receipt) => {
    if (!txHash || processedRef.current.has(txHash)) return
    
    processedRef.current.add(txHash)
    console.log('✅ Transaction successful:', txHash)
    
    if (onSuccessRef.current) {
      try {
        onSuccessRef.current(receipt)
      } catch (error) {
        console.error('Error in success callback:', error)
      }
    }
  }, [txHash])

  // Memoized error handler
  const handleError = useCallback((error) => {
    if (!txHash || processedRef.current.has(txHash)) return
    
    processedRef.current.add(txHash)
    console.error('💥 Transaction failed:', txHash, error)
    
    if (onErrorRef.current) {
      try {
        onErrorRef.current(error)
      } catch (callbackError) {
        console.error('Error in error callback:', callbackError)
      }
    }
  }, [txHash])

  // Handle transaction completion
  useEffect(() => {
    if (!txHash) return

    if (isSuccess && receipt) {
      handleSuccess(receipt)
    } else if (isError && error) {
      handleError(error)
    }
  }, [isSuccess, isError, receipt, error, txHash, handleSuccess, handleError])

  // Cleanup processed transactions after some time to prevent memory leaks
  useEffect(() => {
    const cleanup = () => {
      const now = Date.now()
      const threshold = 5 * 60 * 1000 // 5 minutes
      
      processedRef.current.forEach(hash => {
        // In a real implementation, you'd track timestamps
        // For now, just clear old entries periodically
        if (processedRef.current.size > 100) {
          processedRef.current.clear()
        }
      })
    }

    const interval = setInterval(cleanup, 60000) // Clean up every minute
    return () => clearInterval(interval)
  }, [])

  return {
    receipt,
    isError,
    isLoading,
    isSuccess,
    error
  }
}

// Enhanced transaction state management hook
export function useTransactionState() {
  const [transactions, setTransactions] = useState(new Map())

  const addTransaction = useCallback((hash, description, type) => {
    if (!hash) return

    setTransactions(prev => {
      const newMap = new Map(prev)
      newMap.set(hash, {
        hash,
        description,
        type,
        status: 'pending',
        timestamp: Date.now()
      })
      return newMap
    })
  }, [])

  const updateTransaction = useCallback((hash, updates) => {
    if (!hash) return

    setTransactions(prev => {
      const newMap = new Map(prev)
      const existing = newMap.get(hash)
      if (existing) {
        newMap.set(hash, { ...existing, ...updates })
      }
      return newMap
    })
  }, [])

  const removeTransaction = useCallback((hash) => {
    if (!hash) return

    setTransactions(prev => {
      const newMap = new Map(prev)
      newMap.delete(hash)
      return newMap
    })
  }, [])

  const getTransaction = useCallback((hash) => {
    return transactions.get(hash)
  }, [transactions])

  const getPendingTransactions = useCallback(() => {
    return Array.from(transactions.values()).filter(tx => tx.status === 'pending')
  }, [transactions])

  return {
    transactions: Array.from(transactions.values()),
    addTransaction,
    updateTransaction,
    removeTransaction,
    getTransaction,
    getPendingTransactions
  }
}