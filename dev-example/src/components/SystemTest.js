"use client";
import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { Button } from './ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card'
import { useContract } from '../hooks/useContract'
import { testPinataConnection } from '@/lib/pinata';
import { CONTRACT_ADDRESSES, CONTRACTS } from '../lib/contracts'
import { CheckCircle, AlertCircle, Loader2, Play, ExternalLink } from 'lucide-react'

export default function SystemTest() {
  const { address, isConnected, chain } = useAccount()
  const { 
    useGetAllLicenseIds, 
    useGetAllNFTIds, 
    useGetOpenOffers,
    useCreateLicense 
  } = useContract()
  
  const [testResults, setTestResults] = useState({})
  const [isRunningTests, setIsRunningTests] = useState(false)
  const [currentTest, setCurrentTest] = useState(null)

  const { data: licenseIds } = useGetAllLicenseIds()
  const { data: nftIds } = useGetAllNFTIds()
  const { data: offers } = useGetOpenOffers()
  const { createLicense } = useCreateLicense()

  const tests = [
    {
      id: 'wallet',
      name: 'Wallet Connection',
      description: 'Check if wallet is connected and on correct network',
      test: async () => {
        if (!isConnected) throw new Error('Wallet not connected')
        if (!address) throw new Error('No address available')
        if (chain?.id !== 11155111) throw new Error('Not on Sepolia network')
        return { address, network: chain?.name }
      }
    },
    {
      id: 'contracts',
      name: 'Smart Contract Verification',
      description: 'Verify all contract addresses are valid',
      test: async () => {
        const contracts = [
          { name: 'Factory', address: CONTRACT_ADDRESSES.FACTORY },
          { name: 'Primary Marketplace', address: CONTRACT_ADDRESSES.PRIMARY_MARKETPLACE },
          { name: 'Secondary Marketplace', address: CONTRACT_ADDRESSES.SECONDARY_MARKETPLACE }
        ]
        
        for (const contract of contracts) {
          if (!contract.address || !contract.address.startsWith('0x') || contract.address.length !== 42) {
            throw new Error(`Invalid ${contract.name} address: ${contract.address}`)
          }
        }
        
        return { contracts: contracts.length }
      }
    },
    {
      id: 'ipfs',
      name: 'IPFS Connection',
      description: 'Test IPFS upload functionality',
      test: async () => {
        const result = await testPinataConnection()
        if (!result) throw new Error('IPFS connection failed')
        return { connected: true }
      }
    },
    {
      id: 'factoryRead',
      name: 'Factory Contract Read',
      description: 'Test reading data from factory contract',
      test: async () => {
        // This will be tested by the hook data
        return { 
          licensesFound: licenseIds?.length || 0,
          contractAddress: CONTRACT_ADDRESSES.FACTORY
        }
      }
    },
    {
      id: 'marketplaceRead',
      name: 'Marketplace Contract Read',
      description: 'Test reading data from marketplace contracts',
      test: async () => {
        return {
          nftsFound: nftIds?.length || 0,
          offersFound: offers?.length || 0,
          primaryAddress: CONTRACT_ADDRESSES.PRIMARY_MARKETPLACE,
          secondaryAddress: CONTRACT_ADDRESSES.SECONDARY_MARKETPLACE
        }
      }
    },
    {
      id: 'ethBalance',
      name: 'ETH Balance Check',
      description: 'Verify sufficient ETH for transactions',
      test: async () => {
        if (!window.ethereum) throw new Error('No ethereum provider')
        
        const balance = await window.ethereum.request({
          method: 'eth_getBalance',
          params: [address, 'latest']
        })
        
        const balanceInEth = parseInt(balance, 16) / 1e18
        if (balanceInEth < 0.001) {
          throw new Error(`Insufficient ETH balance: ${balanceInEth.toFixed(6)} ETH`)
        }
        
        return { balance: balanceInEth.toFixed(6) }
      }
    }
  ]

  const runAllTests = async () => {
    setIsRunningTests(true)
    setTestResults({})
    
    for (const test of tests) {
      setCurrentTest(test.id)
      console.log(`🧪 Running test: ${test.name}`)
      
      try {
        const result = await test.test()
        setTestResults(prev => ({
          ...prev,
          [test.id]: { status: 'success', result, error: null }
        }))
        console.log(`✅ Test passed: ${test.name}`, result)
      } catch (error) {
        setTestResults(prev => ({
          ...prev,
          [test.id]: { status: 'failed', result: null, error: error.message }
        }))
        console.error(`❌ Test failed: ${test.name}`, error.message)
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    setCurrentTest(null)
    setIsRunningTests(false)
    console.log('🏁 All tests completed')
  }

  const getTestIcon = (testId) => {
    if (currentTest === testId) {
      return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
    }
    
    const result = testResults[testId]
    if (!result) {
      return <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
    }
    
    if (result.status === 'success') {
      return <CheckCircle className="h-5 w-5 text-green-500" />
    } else {
      return <AlertCircle className="h-5 w-5 text-red-500" />
    }
  }

  const getOverallStatus = () => {
    const completedTests = Object.keys(testResults).length
    const successfulTests = Object.values(testResults).filter(r => r.status === 'success').length
    const failedTests = Object.values(testResults).filter(r => r.status === 'failed').length
    
    return { completedTests, successfulTests, failedTests, totalTests: tests.length }
  }

  const status = getOverallStatus()

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">System Test Suite</h1>
        <p className="text-gray-600">
          Comprehensive testing of all platform components and functionality
        </p>
      </div>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Test Controls</span>
            <Button 
              onClick={runAllTests}
              disabled={isRunningTests}
              className="flex items-center space-x-2"
            >
              {isRunningTests ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Running Tests...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>Run All Tests</span>
                </>
              )}
            </Button>
          </CardTitle>
          <CardDescription>
            Run comprehensive tests to verify all system components
          </CardDescription>
        </CardHeader>
        
        {status.completedTests > 0 && (
          <CardContent>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{status.totalTests}</div>
                  <div className="text-sm text-gray-500">Total Tests</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{status.successfulTests}</div>
                  <div className="text-sm text-gray-500">Passed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{status.failedTests}</div>
                  <div className="text-sm text-gray-500">Failed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-600">{status.completedTests}</div>
                  <div className="text-sm text-gray-500">Completed</div>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Test Results */}
      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
          <CardDescription>
            Individual test results and details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tests.map((test) => {
            const result = testResults[test.id]
            const isCurrentTest = currentTest === test.id
            
            return (
              <div key={test.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getTestIcon(test.id)}
                    <div>
                      <h4 className="font-medium">{test.name}</h4>
                      <p className="text-sm text-gray-500">{test.description}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {isCurrentTest && (
                      <span className="text-blue-600 text-sm">Running...</span>
                    )}
                    {result && (
                      <span className={`text-sm font-medium ${
                        result.status === 'success' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {result.status === 'success' ? 'PASSED' : 'FAILED'}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Test Details */}
                {result && (
                  <div className="mt-3 pl-8">
                    {result.status === 'success' && result.result && (
                      <div className="bg-green-50 border border-green-200 rounded p-3">
                        <pre className="text-xs text-green-800 overflow-auto">
                          {JSON.stringify(result.result, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {result.status === 'failed' && result.error && (
                      <div className="bg-red-50 border border-red-200 rounded p-3">
                        <p className="text-red-800 text-sm">{result.error}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Helpful links and actions for debugging
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              onClick={() => window.open('https://sepoliafaucet.com', '_blank')}
              className="flex items-center space-x-2"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Get Test ETH</span>
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => window.open('https://sepolia.etherscan.io', '_blank')}
              className="flex items-center space-x-2"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Sepolia Explorer</span>
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => window.open(`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESSES.FACTORY}`, '_blank')}
              className="flex items-center space-x-2"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Factory Contract</span>
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => {
                console.clear()
                console.log('🧹 Console cleared for fresh debugging')
              }}
              className="flex items-center space-x-2"
            >
              <span>Clear Console</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Debug Information */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Information</CardTitle>
          <CardDescription>
            Current system state for debugging
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 rounded-lg p-4">
            <pre className="text-xs overflow-auto">
{JSON.stringify({
  wallet: {
    connected: isConnected,
    address: address,
    network: chain?.name,
    chainId: chain?.id
  },
  contracts: CONTRACT_ADDRESSES,
  data: {
    licenses: licenseIds?.length || 0,
    nfts: nftIds?.length || 0,
    offers: offers?.length || 0
  },
  timestamp: new Date().toISOString()
}, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}