import { 
  pinata_client, 
  getPinataUrl, 
  getIPFSUrl, 
  testPinataConnection 
} from './pinata'

// Main configuration object - replaces the old IPFS config
export const getIPFSConfig = () => {
  return {
    // Client instance
    client: pinata_client,
    
    // URL generation functions
    getUrl: getPinataUrl,
    getPublicUrl: getIPFSUrl,
    
    // Connection testing
    testConnection: testPinataConnection,
    
    // Gateway URLs
    gateway: process.env.NEXT_PUBLIC_PINATA_GATEWAY || "your-domain.mypinata.cloud",
    publicGateway: "gateway.pinata.cloud",
    
    // Upload functions for backward compatibility
    upload: {
      file: async (file) => {
        const result = await pinata_client.upload.public.file(file)
        return {
          hash: result.cid,
          cid: result.cid,
          path: result.cid, // For backward compatibility
          url: await pinata_client.gateways.public.convert(result.cid)
        }
      },
      
      json: async (data) => {
        const result = await pinata_client.upload.public.json(data)
        return {
          hash: result.cid,
          cid: result.cid,
          path: result.cid, // For backward compatibility
          url: await pinata_client.gateways.public.convert(result.cid)
        }
      },
      
      data: async (data) => {
        let result
        if (typeof data === 'string') {
          result = await pinata_client.upload.public.json({ content: data })
        } else if (data instanceof File || data instanceof Blob) {
          result = await pinata_client.upload.public.file(data)
        } else {
          result = await pinata_client.upload.public.json(data)
        }
        
        return {
          hash: result.cid,
          cid: result.cid,
          path: result.cid, // For backward compatibility
          url: await pinata_client.gateways.public.convert(result.cid)
        }
      }
    },
    
    // Utility functions
    utils: {
      isValidCid: (cid) => {
        // Basic CID validation - starts with Qm (v0) or b (v1)
        return typeof cid === 'string' && (cid.startsWith('Qm') || cid.startsWith('b'))
      },
      
      convertIpfsUrl: (url) => {
        if (url.startsWith('ipfs://')) {
          const cid = url.replace('ipfs://', '')
          return getPinataUrl(cid)
        }
        return url
      },
      
      extractCidFromUrl: (url) => {
        const ipfsMatch = url.match(/\/ipfs\/([^/?]+)/)
        return ipfsMatch ? ipfsMatch[1] : null
      }
    }
  }
}

// Legacy exports for backward compatibility
export const ipfsConfig = getIPFSConfig()
export const ipfs_client = pinata_client

// Export individual functions that might be imported directly
export { 
  getPinataUrl as getIPFSUrl,
  getIPFSUrl as getPublicIPFSUrl,
  testPinataConnection as testIPFSConnection,
  pinata_client
}

export default getIPFSConfig