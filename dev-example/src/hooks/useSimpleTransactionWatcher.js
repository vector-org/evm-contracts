import { useState, useEffect, useRef } from 'react'
import { usePublicClient } from 'wagmi'

/**
 * Simple transaction watcher that polls for transaction receipt
 * Avoids "stack too deep" error by using simple polling approach
 */
export function useSimpleTransactionWatcher(txHash, onSuccess, onError) {
  const [status, setStatus] = useState('idle') // idle, pending, success, error
  const [receipt, setReceipt] = useState(null)
  const [error, setError] = useState(null)
  
  const publicClient = usePublicClient()
  const intervalRef = useRef(null)
  const processedRef = useRef(new Set())

  useEffect(() => {
    if (!txHash || !publicClient || processedRef.current.has(txHash)) {
      return
    }

    console.log('🔍 Starting simple transaction watcher for:', txHash)
    setStatus('pending')
    setReceipt(null)
    setError(null)

    // Simple polling function
    const checkTransaction = async () => {
      try {
        const txReceipt = await publicClient.waitForTransactionReceipt({
          hash: txHash,
          confirmations: 1,
          timeout: 3000 // 3 second timeout per check
        })

        if (txReceipt) {
          console.log('✅ Transaction successful:', txHash)
          setStatus('success')
          setReceipt(txReceipt)
          processedRef.current.add(txHash)
          
          // Clear polling
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          
          // Call success callback
          if (onSuccess) {
            try {
              onSuccess(txReceipt)
            } catch (callbackError) {
              console.error('Error in success callback:', callbackError)
            }
          }
        }
      } catch (err) {
        // If it's a timeout, continue polling
        if (err.name === 'TimeoutError' || err.message.includes('timeout')) {
          console.log('⏳ Transaction still pending:', txHash)
          return // Continue polling
        }
        
        // Real error occurred
        console.error('❌ Transaction failed:', txHash, err)
        setStatus('error')
        setError(err)
        processedRef.current.add(txHash)
        
        // Clear polling
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        
        // Call error callback
        if (onError) {
          try {
            onError(err)
          } catch (callbackError) {
            console.error('Error in error callback:', callbackError)
          }
        }
      }
    }

    // Start polling every 3 seconds
    intervalRef.current = setInterval(checkTransaction, 3000)
    
    // Also check immediately
    checkTransaction()

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [txHash, publicClient, onSuccess, onError])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    status,
    receipt,
    error,
    isLoading: status === 'pending',
    isSuccess: status === 'success',
    isError: status === 'error'
  }
}

/**
 * Enhanced simple transaction manager
 */
export function useSimpleTransactions() {
  const [transactions, setTransactions] = useState(new Map())

  const addTransaction = (hash, description, type = 'general') => {
    if (!hash || !hash.startsWith('0x')) {
      console.error('❌ Invalid transaction hash:', hash)
      return null
    }

    const tx = {
      hash,
      description,
      type,
      timestamp: Date.now(),
      status: 'pending'
    }
    
    console.log('📝 Adding transaction:', { hash, description, type })
    
    setTransactions(prev => {
      const newMap = new Map(prev)
      newMap.set(hash, tx)
      return newMap
    })
    
    return tx
  }

  const updateTransaction = (hash, updates) => {
    setTransactions(prev => {
      const newMap = new Map(prev)
      const existing = newMap.get(hash)
      if (existing) {
        newMap.set(hash, { ...existing, ...updates })
        console.log('🔄 Transaction updated:', hash, updates.status)
      }
      return newMap
    })
  }

  const getTransaction = (hash) => {
    return transactions.get(hash)
  }

  const getPendingTransactions = () => {
    return Array.from(transactions.values()).filter(tx => tx.status === 'pending')
  }

  // Auto-cleanup old transactions (keep last 20)
  useEffect(() => {
    if (transactions.size > 20) {
      const sortedTxs = Array.from(transactions.entries())
        .sort(([,a], [,b]) => b.timestamp - a.timestamp)
        .slice(0, 20)
      
      setTransactions(new Map(sortedTxs))
    }
  }, [transactions])

  return {
    transactions: Array.from(transactions.values()),
    addTransaction,
    updateTransaction,
    getTransaction,
    getPendingTransactions
  }
}