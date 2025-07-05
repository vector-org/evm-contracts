import { useState, useEffect } from 'react'
import { useWaitForTransactionReceipt } from 'wagmi'
import { getExplorerUrl } from '../lib/utils'

export function useTransactions() {
  const [transactions, setTransactions] = useState([])
  const [currentTx, setCurrentTx] = useState(null)

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
    
    console.log('📝 Adding transaction to tracker:', {
      hash,
      description,
      type,
      explorerUrl: getExplorerUrl(hash)
    })
    
    setTransactions(prev => [tx, ...prev])
    setCurrentTx(tx)
    
    return tx
  }

  const updateTransaction = (hash, updates) => {
    console.log('🔄 Updating transaction:', hash, updates)
    
    setTransactions(prev => 
      prev.map(tx => 
        tx.hash === hash ? { ...tx, ...updates } : tx
      )
    )
    
    if (currentTx?.hash === hash) {
      setCurrentTx(prev => ({ ...prev, ...updates }))
    }
  }

  const clearCurrentTransaction = () => {
    console.log('🧹 Clearing current transaction')
    setCurrentTx(null)
  }

  const getTransactionStatus = (hash) => {
    return transactions.find(tx => tx.hash === hash)?.status || 'unknown'
  }

  const getPendingTransactions = () => {
    return transactions.filter(tx => tx.status === 'pending')
  }

  const getTransactionUrl = (hash) => {
    return getExplorerUrl(hash)
  }

  // Auto-cleanup old transactions (keep last 20)
  useEffect(() => {
    if (transactions.length > 20) {
      setTransactions(prev => prev.slice(0, 20))
    }
  }, [transactions])

  return {
    transactions,
    currentTx,
    addTransaction,
    updateTransaction,
    clearCurrentTransaction,
    getTransactionStatus,
    getPendingTransactions,
    getTransactionUrl
  }
}

export function useTransactionWatcher(hash, onSuccess, onError) {
  const { updateTransaction } = useTransactions()
  
  const { 
    data: receipt, 
    isError, 
    isLoading, 
    isSuccess,
    error 
  } = useWaitForTransactionReceipt({
    hash,
    query: {
      enabled: !!hash && hash.startsWith('0x'),
      retry: 5,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    }
  })

  // Log when starting to watch
  useEffect(() => {
    if (hash && hash.startsWith('0x')) {
      console.log('🔍 Watching transaction:', {
        hash,
        explorerUrl: `https://sepolia.etherscan.io/tx/${hash}`
      })
    }
  }, [hash])

  // Handle successful transaction
  useEffect(() => {
    if (hash && isSuccess && receipt) {
      console.log('✅ Transaction successful:', {
        hash,
        receipt: {
          blockNumber: receipt.blockNumber?.toString(),
          gasUsed: receipt.gasUsed?.toString(),
          status: receipt.status,
          confirmations: receipt.confirmations || 1
        }
      })
      
      updateTransaction(hash, { 
        status: 'success', 
        receipt: receipt,
        confirmations: receipt.confirmations || 1,
        completedAt: Date.now()
      })
      
      onSuccess?.(receipt)
    }
  }, [hash, isSuccess, receipt, updateTransaction, onSuccess])

  // Handle failed transaction
  useEffect(() => {
    if (hash && isError) {
      console.error('❌ Transaction failed:', {
        hash,
        error: error?.message || 'Unknown error',
        errorDetails: error
      })
      
      updateTransaction(hash, { 
        status: 'failed',
        error: error?.message || 'Transaction failed',
        failedAt: Date.now()
      })
      
      onError?.(error)
    }
  }, [hash, isError, error, updateTransaction, onError])

  // Handle pending state
  useEffect(() => {
    if (hash && isLoading) {
      console.log('⏳ Transaction pending:', hash)
      updateTransaction(hash, { 
        status: 'pending',
        lastChecked: Date.now()
      })
    }
  }, [hash, isLoading, updateTransaction])

  return {
    receipt,
    isError,
    isLoading,
    isSuccess,
    error
  }
}