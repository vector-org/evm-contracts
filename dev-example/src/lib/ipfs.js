import { create } from "ipfs-http-client"

const projectId = '2WCbZ8YpmuPxUtM6PzbFOfY5k4B'
const projectSecretKey = 'c8b676d8bfe769b19d88d8c77a9bd1e2'
const authorization = "Basic " + btoa(projectId + ":" + projectSecretKey)

console.log('🔗 Initializing IPFS client with Infura...')

export const ipfs_client = create({
  host: "ipfs.infura.io",
  port: 5001,
  protocol: "https",
  apiPath: "/api/v0",
  headers: {
    authorization: authorization
  },
})

export const getIPFSUrl = (hash) => {
  const url = `https://ipfs.infura.io/ipfs/${hash}`
  console.log('🔗 Generated IPFS URL:', url)
  return url
}

// Test IPFS connection on initialization
export const testIPFSConnection = async () => {
  try {
    console.log('🧪 Testing IPFS connection...')
    const testData = JSON.stringify({ test: 'connection', timestamp: Date.now() })
    const result = await ipfs_client.add(testData)
    console.log('✅ IPFS connection test successful:', {
      hash: result.path,
      url: getIPFSUrl(result.path)
    })
    return true
  } catch (error) {
    console.error('❌ IPFS connection test failed:', error)
    return false
  }
}