import { useState, useEffect } from 'react'
import { useWaitForTransactionReceipt } from 'wagmi'
import { getExplorerUrl } from '../lib/utils'

export function useTransactions() {
  const [transactions, setTransactions] = useState([])
  const [currentTx, setCurrentTx] = useState(null)

  const addTransaction = (hash, description, type = 'general') => {
    const tx = {
      hash,
      description,
      type,
      timestamp: Date.now(),
      status: 'pending'
    }
    
    setTransactions(prev => [tx, ...prev])
    setCurrentTx(tx)
    
    return tx
  }

  const updateTransaction = (hash, updates) => {
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

  // Auto-cleanup old transactions (keep last 10)
  useEffect(() => {
    if (transactions.length > 10) {
      setTransactions(prev => prev.slice(0, 10))
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
  
  const { data, isError, isLoading, isSuccess } = useWaitForTransactionReceipt({
    hash,
    query: {
      enabled: !!hash,
    }
  })

  useEffect(() => {
    if (hash && isSuccess && data) {
      updateTransaction(hash, { 
        status: 'success', 
        receipt: data,
        confirmations: data.confirmations || 1
      })
      onSuccess?.(data)
    }
  }, [hash, isSuccess, data, updateTransaction, onSuccess])

  useEffect(() => {
    if (hash && isError) {
      updateTransaction(hash, { 
        status: 'failed'
      })
      onError?.()
    }
  }, [hash, isError, updateTransaction, onError])

  return {
    data,
    isError,
    isLoading,
    isSuccess
  }
}