import { PinataSDK } from "pinata"

const PINATA_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIwOTQ5NGIxMS0zMGFmLTRjMjgtYWNlOC03ZjdjZjJmNjdjZmIiLCJlbWFpbCI6ImRoYW5hbmpheTIwMDJwYWlAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6IjBjMmMxOWI4MDQ0ODA2YjEwNDE1Iiwic2NvcGVkS2V5U2VjcmV0IjoiZjgyYWQ5NzBhZjNlYjYxNThlY2Q4NTQ4ZDc1ZjJhZDk4MDk3ZmZjNTEwYTU2NmZkN2ZkNzQwNTU3Y2M5NzNlMyIsImV4cCI6MTc4MzcxMTcwNX0.vtNQuvCPs36LBJ7KyC3fGsVZAxjwrPaJkwazp33mCwQ"

const PINATA_GATEWAY = "brown-objective-rook-813.mypinata.cloud"

// console.log('🔗 [Pinata] Initializing Pinata SDK with gateway:', PINATA_GATEWAY)

export const pinata_client = new PinataSDK({
  pinataJwt: PINATA_JWT,
  pinataGateway: PINATA_GATEWAY
})

// Generate Pinata gateway URL (using your dedicated gateway)
export const getPinataUrl = (cid) => {
  const url = `https://${PINATA_GATEWAY}/ipfs/${cid}`
  // console.log('🔗 [Pinata] Generated dedicated gateway URL:', { cid, url })
  return url
}

// Generate public IPFS gateway URL (fallback)
export const getIPFSUrl = (cid) => {
  const url = `https://gateway.pinata.cloud/ipfs/${cid}`
  // console.log('🔗 [Pinata] Generated public gateway URL:', { cid, url })
  return url
}

// Test Pinata connection on initialization
export const testPinataConnection = async () => {
  try {
  // console.log('🧪 [Pinata] Testing connection...')
    const testData = { 
      test: 'connection', 
      timestamp: Date.now(),
      gateway: PINATA_GATEWAY
    }
    
    // Upload test data using the new SDK format
    const result = await pinata_client.upload.json(testData)
    
    // Convert CID to URL using your gateway
    const url = await pinata_client.gateways.convert(result.IpfsHash)
    

    return true
  } catch (error) {
    console.error('❌ [Pinata] Connection test failed:', {
      error: error.message,
      stack: error.stack
    })
    return false
  }
}

// Helper function to upload file with progress tracking
export const uploadFileWithProgress = async (file, onProgress) => {
  try {
    // Simulate progress for UX (Pinata SDK doesn't provide real progress)
    if (onProgress) {
      onProgress(10)
    }

    // Upload file using Pinata SDK
    const result = await pinata_client.upload.public.file(file)
  // console.log('file uploaded to ipfs', result)
    if (onProgress) {
      onProgress(70)
    }

    // Get the dedicated gateway URL
    const url = getPinataUrl(result.cid)
    
    if (onProgress) {
      onProgress(100)
    }



    return {
      cid: result.cid,
      url: url,
      path: result.cid // For compatibility with old IPFS code
    }
  } catch (error) {
    console.error('💥 [Pinata] Error uploading file:', {
      error: error.message,
      stack: error.stack,
      fileName: file.name,
      fileSize: file.size
    })
    throw error
  }
}

// Helper function to upload JSON data
export const uploadJSONData = async (jsonObject) => {
  try {

    
    // Upload JSON using Pinata SDK
    const result = await pinata_client.upload.public.json(jsonObject)
  // console.log('file uploaded to ipfs', result)
    // Get the dedicated gateway URL
    const url = getPinataUrl(result.IpfsHash)
    

    
    return {
      cid: result.cid,
      url: url,
      path: result.cid // For compatibility with old IPFS code
    }
  } catch (error) {
    console.error('💥 [Pinata] Error uploading JSON:', {
      error: error.message,
      stack: error.stack,
      jsonKeys: Object.keys(jsonObject || {})
    })
    throw error
  }
}

// Helper function to upload raw data/text
export const uploadData = async (data) => {
  try {


    let result
    if (typeof data === 'string') {
      // Upload string as JSON with content wrapper
      result = await pinata_client.upload.json({ content: data })
    } else if (data instanceof File || data instanceof Blob) {
      // Upload as file
      result = await pinata_client.upload.file(data)
    } else {
      // Upload as JSON
      result = await pinata_client.upload.json(data)
    }

    const url = getPinataUrl(result.IpfsHash)



    return result.IpfsHash // Return just the CID for compatibility
  } catch (error) {
    console.error('💥 [Pinata] Error uploading data:', {
      error: error.message,
      stack: error.stack,
      dataType: data.constructor.name
    })
    throw error
  }
}

// Enhanced function to get URL from CID with conversion
export const convertCIDToURL = async (cid) => {
  try {
  // console.log('🔄 [Pinata] Converting CID to URL:', cid)
    
    // Try to use Pinata's conversion method
    const url = await pinata_client.gateways.convert(cid)
    

    
    return url
  } catch (error) {
    console.warn('⚠️ [Pinata] Gateway conversion failed, using direct URL:', {
      cid: cid,
      error: error.message
    })
    
    // Fallback to direct URL construction
    return getPinataUrl(cid)
  }
}

// Backward compatibility exports
export const ipfs_client = {
  add: uploadData
}

export { testPinataConnection as testIPFSConnection }