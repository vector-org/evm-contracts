import { PinataSDK } from "pinata"

const PINATA_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIwOTQ5NGIxMS0zMGFmLTRjMjgtYWNlOC03ZjdjZjJmNjdjZmIiLCJlbWFpbCI6ImRoYW5hbmpheTIwMDJwYWlAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6IjBjMmMxOWI4MDQ0ODA2YjEwNDE1Iiwic2NvcGVkS2V5U2VjcmV0IjoiZjgyYWQ5NzBhZjNlYjYxNThlY2Q4NTQ4ZDc1ZjJhZDk4MDk3ZmZjNTEwYTU2NmZkN2ZkNzQwNTU3Y2M5NzNlMyIsImV4cCI6MTc4MzcxMTcwNX0.vtNQuvCPs36LBJ7KyC3fGsVZAxjwrPaJkwazp33mCwQ"

const PINATA_GATEWAY = "brown-objective-rook-813.mypinata.cloud"

console.log('🔗 [Pinata] Initializing Pinata SDK with gateway:', PINATA_GATEWAY)

export const pinata_client = new PinataSDK({
  pinataJwt: PINATA_JWT,
  pinataGateway: PINATA_GATEWAY
})

// Generate Pinata gateway URL (using your dedicated gateway)
export const getPinataUrl = (cid) => {
  const url = `https://${PINATA_GATEWAY}/ipfs/${cid}`
  console.log('🔗 [Pinata] Generated dedicated gateway URL:', { cid, url })
  return url
}

// Generate public IPFS gateway URL (fallback)
export const getIPFSUrl = (cid) => {
  const url = `https://gateway.pinata.cloud/ipfs/${cid}`
  console.log('🔗 [Pinata] Generated public gateway URL:', { cid, url })
  return url
}

// Test Pinata connection on initialization
export const testPinataConnection = async () => {
  try {
    console.log('🧪 [Pinata] Testing connection...')
    const testData = { 
      test: 'connection', 
      timestamp: Date.now(),
      gateway: PINATA_GATEWAY
    }
    
    // Upload test data using the new SDK format
    const result = await pinata_client.upload.json(testData)
    
    // Convert CID to URL using your gateway
    const url = await pinata_client.gateways.convert(result.IpfsHash)
    
    console.log('✅ [Pinata] Connection test successful:', {
      cid: result.IpfsHash,
      url: url,
      pinataUrl: getPinataUrl(result.IpfsHash)
    })
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
    console.log('📤 [Pinata] Starting file upload:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    })

    // Simulate progress for UX (Pinata SDK doesn't provide real progress)
    if (onProgress) {
      onProgress(10)
    }

    // Upload file using Pinata SDK
    const result = await pinata_client.upload.file(file)
    
    if (onProgress) {
      onProgress(70)
    }

    // Get the dedicated gateway URL
    const url = getPinataUrl(result.IpfsHash)
    
    if (onProgress) {
      onProgress(100)
    }

    console.log('✅ [Pinata] File uploaded successfully:', {
      cid: result.IpfsHash,
      url: url,
      size: file.size,
      filename: file.name
    })

    return {
      cid: result.IpfsHash,
      url: url,
      path: result.IpfsHash // For compatibility with old IPFS code
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
    console.log('📤 [Pinata] Starting JSON upload:', {
      dataKeys: Object.keys(jsonObject),
      hasName: !!jsonObject.name,
      hasImage: !!jsonObject.image,
      dataSize: JSON.stringify(jsonObject).length
    })
    
    // Upload JSON using Pinata SDK
    const result = await pinata_client.upload.json(jsonObject)
    
    // Get the dedicated gateway URL
    const url = getPinataUrl(result.IpfsHash)
    
    console.log('✅ [Pinata] JSON uploaded successfully:', {
      cid: result.IpfsHash,
      url: url,
      dataKeys: Object.keys(jsonObject)
    })
    
    return {
      cid: result.IpfsHash,
      url: url,
      path: result.IpfsHash // For compatibility with old IPFS code
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
    console.log('📤 [Pinata] Starting data upload:', {
      type: data.constructor.name,
      size: data.size || 'unknown',
      isFile: data instanceof File,
      isBlob: data instanceof Blob,
      isString: typeof data === 'string'
    })

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

    console.log('✅ [Pinata] Data uploaded successfully:', {
      cid: result.IpfsHash,
      url: url,
      dataType: data.constructor.name
    })

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
    console.log('🔄 [Pinata] Converting CID to URL:', cid)
    
    // Try to use Pinata's conversion method
    const url = await pinata_client.gateways.convert(cid)
    
    console.log('✅ [Pinata] CID converted to URL successfully:', {
      cid: cid,
      convertedUrl: url,
      directUrl: getPinataUrl(cid)
    })
    
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