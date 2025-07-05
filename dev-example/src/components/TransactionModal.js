"use client";
import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { useTransactions } from '../hooks/useTransactions'
import { getExplorerUrl, shortenAddress } from '../lib/utils'
import { Loader2, CheckCircle, AlertCircle, ExternalLink, Clock } from 'lucide-react'

export default function TransactionModal() {
  const { currentTx, clearCurrentTransaction } = useTransactions()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (currentTx) {
      setIsOpen(true)
    }
  }, [currentTx])

  const handleClose = () => {
    setIsOpen(false)
    clearCurrentTransaction()
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-500" />
      case 'failed':
        return <AlertCircle className="h-8 w-8 text-red-500" />
      default:
        return <Clock className="h-8 w-8 text-gray-500" />
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Transaction Pending'
      case 'success':
        return 'Transaction Successful'
      case 'failed':
        return 'Transaction Failed'
      default:
        return 'Transaction Status'
    }
  }

  const getStatusDescription = (status, description) => {
    switch (status) {
      case 'pending':
        return `${description} - Please wait for confirmation...`
      case 'success':
        return `${description} - Completed successfully!`
      case 'failed':
        return `${description} - Transaction failed. Please try again.`
      default:
        return description
    }
  }

  if (!currentTx) return null

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getStatusIcon(currentTx.status)}
          </div>
          <DialogTitle>{getStatusText(currentTx.status)}</DialogTitle>
          <DialogDescription className="text-center">
            {getStatusDescription(currentTx.status, currentTx.description)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Transaction Hash</span>
              <span className="font-mono text-sm">{shortenAddress(currentTx.hash)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Type</span>
              <span className="text-sm font-medium">{currentTx.type}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Time</span>
              <span className="text-sm">
                {new Date(currentTx.timestamp).toLocaleTimeString()}
              </span>
            </div>

            {currentTx.receipt && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Confirmations</span>
                <span className="text-sm font-medium">
                  {currentTx.receipt.confirmations || 1}
                </span>
              </div>
            )}
          </div>

          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => window.open(getExplorerUrl(currentTx.hash), '_blank')}
              className="flex-1"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View on Explorer
            </Button>
            
            {currentTx.status !== 'pending' && (
              <Button onClick={handleClose} className="flex-1">
                Close
              </Button>
            )}
          </div>

          {currentTx.status === 'pending' && (
            <div className="text-center">
              <p className="text-xs text-gray-500">
                This window will update automatically when the transaction is confirmed
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}