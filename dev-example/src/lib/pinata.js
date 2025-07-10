import { PinataSDK } from "pinata"

const PINATA_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIwOTQ5NGIxMS0zMGFmLTRjMjgtYWNlOC03ZjdjZjJmNjdjZmIiLCJlbWFpbCI6ImRoYW5hbmpheTIwMDJwYWlAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6IjBjMmMxOWI4MDQ0ODA2YjEwNDE1Iiwic2NvcGVkS2V5U2VjcmV0IjoiZjgyYWQ5NzBhZjNlYjYxNThlY2Q4NTQ4ZDc1ZjJhZDk4MDk3ZmZjNTEwYTU2NmZkN2ZkNzQwNTU3Y2M5NzNlMyIsImV4cCI6MTc4MzcxMTcwNX0.vtNQuvCPs36LBJ7KyC3fGsVZAxjwrPaJkwazp33mCwQ"

const PINATA_GATEWAY = "brown-objective-rook-813.mypinata.cloud"

console.log('🔗 Initializing Pinata client...')

export const pinata_client = new PinataSDK({
  pinataJwt: PINATA_JWT,
  pinataGateway: PINATA_GATEWAY
})

export const getPinataUrl = (cid) => {
  const url = `https://${PINATA_GATEWAY}/ipfs/${cid}`
  console.log('🔗 Generated Pinata URL:', url)
  return url
}

// Alternative: Use public IPFS gateway as fallback
export const getIPFSUrl = (cid) => {
  const url = `https://gateway.pinata.cloud/ipfs/${cid}`
  console.log('🔗 Generated IPFS URL via Pinata public gateway:', url)
  return url
}

// Test Pinata connection on initialization
export const testPinataConnection = async () => {
  try {
    console.log('🧪 Testing Pinata connection...')
    const testData = JSON.stringify({ test: 'connection', timestamp: Date.now() })
    
    // Upload test data
    const result = await pinata_client.upload.public.json(testData)
    console.log('✅ Pinata connection test successful:', {
      cid: result.cid,
      url: getPinataUrl(result.cid)
    })
    return true
  } catch (error) {
    console.error('❌ Pinata connection test failed:', error)
    return false
  }
}

// Helper function to upload file with progress tracking
export const uploadFileWithProgress = async (file, onProgress) => {
  try {
    console.log('📤 Starting file upload to Pinata:', {
      name: file.name,
      size: file.size,
      type: file.type
    })

    // Note: Pinata SDK doesn't have built-in progress tracking like IPFS
    // We'll simulate progress for UX continuity
    if (onProgress) {
      onProgress(25) // Starting upload
    }

    const result = await pinata_client.upload.public.file(file)
    
    if (onProgress) {
      onProgress(75) // Upload processing
    }

    // Convert CID to usable URL
    const url = await pinata_client.gateways.public.convert(result.cid)
    
    if (onProgress) {
      onProgress(100) // Complete
    }

    console.log('✅ File uploaded successfully to Pinata:', {
      cid: result.cid,
      url: url,
      size: file.size
    })

    return {
      cid: result.cid,
      url: url,
      path: result.cid // For compatibility with old IPFS code
    }
  } catch (error) {
    console.error('💥 Error uploading file to Pinata:', error)
    throw error
  }
}

// Helper function to upload JSON data
export const uploadJSONData = async (jsonObject) => {
  try {
    console.log('📤 Starting JSON upload to Pinata:', jsonObject)
    
    const result = await pinata_client.upload.public.json(jsonObject)
    const url = await pinata_client.gateways.public.convert(result.cid)
    
    console.log('✅ JSON uploaded successfully to Pinata:', {
      cid: result.cid,
      url: url,
      data: jsonObject
    })
    
    return {
      cid: result.cid,
      url: url,
      path: result.cid // For compatibility with old IPFS code
    }
  } catch (error) {
    console.error('💥 Error uploading JSON to Pinata:', error)
    throw error
  }
}

// Helper function to upload raw data/text
export const uploadData = async (data) => {
  try {
    console.log('📤 Starting data upload to Pinata:', {
      type: data.constructor.name,
      size: data.size || 'unknown'
    })

    let result
    if (typeof data === 'string') {
      // Upload as text
      result = await pinata_client.upload.public.json({ content: data })
    } else if (data instanceof File || data instanceof Blob) {
      // Upload as file
      result = await pinata_client.upload.public.file(data)
    } else {
      // Upload as JSON
      result = await pinata_client.upload.public.json(data)
    }

    const url = await pinata_client.gateways.public.convert(result.cid)

    console.log('✅ Data uploaded successfully to Pinata:', {
      cid: result.cid,
      url: url
    })

    return result.cid // Return just the CID for compatibility
  } catch (error) {
    console.error('💥 Error uploading data to Pinata:', error)
    throw error
  }
}

// Backward compatibility exports
export const ipfs_client = {
  add: uploadData
}

export { testPinataConnection as testIPFSConnection }