import { useState, useEffect, useRef, useCallback } from 'react'
import { usePublicClient } from 'wagmi'

/**
 * Simplified transaction watcher that avoids infinite re-renders
 * Uses controlled polling with proper cleanup
 */
export function useSimpleTransactionWatcher(txHash, onSuccess, onError) {
  const [status, setStatus] = useState('idle')
  const [receipt, setReceipt] = useState(null)
  const [error, setError] = useState(null)
  
  const publicClient = usePublicClient()
  const timeoutRef = useRef(null)
  const processedTxs = useRef(new Set())
  const isWatchingRef = useRef(false)

  // Cleanup function
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    isWatchingRef.current = false
  }, [])

  // Check transaction once (no polling loop)
  const checkTransaction = useCallback(async (hash) => {
    if (!hash || !publicClient || processedTxs.current.has(hash)) {
      return
    }

    try {
      const txReceipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
        timeout: 5000 // 5 second timeout
      })

      if (txReceipt) {
        console.log('✅ Transaction confirmed:', hash)
        processedTxs.current.add(hash)
        setStatus('success')
        setReceipt(txReceipt)
        cleanup()
        
        // Call success callback safely
        if (onSuccess) {
          try {
            onSuccess(txReceipt)
          } catch (callbackError) {
            console.error('Error in success callback:', callbackError)
          }
        }
      }
    } catch (err) {
      // If timeout, try once more after delay
      if (err.name === 'TimeoutError' || err.message.includes('timeout')) {
        console.log('⏳ Transaction still pending, will retry once:', hash)
        
        // Single retry after 5 seconds
        timeoutRef.current = setTimeout(() => {
          checkTransaction(hash)
        }, 5000)
        return
      }
      
      // Real error
      console.error('❌ Transaction failed:', hash, err)
      processedTxs.current.add(hash)
      setStatus('error')
      setError(err)
      cleanup()
      
      // Call error callback safely
      if (onError) {
        try {
          onError(err)
        } catch (callbackError) {
          console.error('Error in error callback:', callbackError)
        }
      }
    }
  }, [publicClient, onSuccess, onError, cleanup])

  // Start watching when txHash is provided
  useEffect(() => {
    if (!txHash || isWatchingRef.current || processedTxs.current.has(txHash)) {
      return
    }

    console.log('🔍 Starting transaction watch for:', txHash)
    isWatchingRef.current = true
    setStatus('pending')
    setReceipt(null)
    setError(null)

    // Check immediately
    checkTransaction(txHash)

    // Cleanup on unmount or txHash change
    return cleanup
  }, [txHash, checkTransaction, cleanup])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

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
 * Enhanced simple transaction manager for tracking multiple transactions
 */
export function useSimpleTransactions() {
  const [transactions, setTransactions] = useState(new Map())
  const maxTransactions = 20

  const addTransaction = useCallback((hash, description, type = 'general') => {
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
      
      // Keep only the most recent transactions
      if (newMap.size > maxTransactions) {
        const sortedTxs = Array.from(newMap.entries())
          .sort(([,a], [,b]) => b.timestamp - a.timestamp)
          .slice(0, maxTransactions)
        return new Map(sortedTxs)
      }
      
      return newMap
    })
    
    return tx
  }, [maxTransactions])

  const updateTransaction = useCallback((hash, updates) => {
    setTransactions(prev => {
      const newMap = new Map(prev)
      const existing = newMap.get(hash)
      if (existing) {
        newMap.set(hash, { ...existing, ...updates })
        console.log('🔄 Transaction updated:', hash, updates.status)
      }
      return newMap
    })
  }, [])

  const getTransaction = useCallback((hash) => {
    return transactions.get(hash)
  }, [transactions])

  const getPendingTransactions = useCallback(() => {
    return Array.from(transactions.values()).filter(tx => tx.status === 'pending')
  }, [transactions])

  const clearTransaction = useCallback((hash) => {
    setTransactions(prev => {
      const newMap = new Map(prev)
      newMap.delete(hash)
      return newMap
    })
  }, [])

  return {
    transactions: Array.from(transactions.values()),
    addTransaction,
    updateTransaction,
    getTransaction,
    getPendingTransactions,
    clearTransaction
  }
}

/**
 * Simple hook for checking transaction status without continuous polling
 */
export function useTransactionChecker() {
  const checkTransactionOnce = useCallback(async (txHash) => {
    if (!txHash || !window.ethereum) {
      return null
    }

    try {
      const receipt = await window.ethereum.request({
        method: 'eth_getTransactionReceipt',
        params: [txHash]
      })
      
      if (receipt) {
        if (receipt.status === '0x1') {
          return 'success'
        } else if (receipt.status === '0x0') {
          return 'failed'
        }
      }
      
      return 'pending'
    } catch (error) {
      console.error('Error checking transaction:', error)
      return 'error'
    }
  }, [])

  return { checkTransactionOnce }
}