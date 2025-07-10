export const IPFS_CONFIG = {
  // Your Infura IPFS credentials
  INFURA_PROJECT_ID: '2WCbZ8YpmuPxUtM6PzbFOfY5k4B',
  INFURA_PROJECT_SECRET: 'c8b676d8bfe769b19d88d8c77a9bd1e2',
  
  // Primary gateway (Infura dedicated gateway) - REMOVED /ipfs from here
  PRIMARY_GATEWAY: 'https://2WCbZ8YpmuPxUtM6PzbFOfY5k4B.ipfs.dweb.link',
  
  // Fallback gateways in order of preference - REMOVED /ipfs from all
  FALLBACK_GATEWAYS: [
    'https://gateway.pinata.cloud/ipfs',
    'https://cloudflare-ipfs.com/ipfs', 
    'https://dweb.link/ipfs',
    'https://ipfs.io/ipfs'
  ],

  TIMEOUT: 10000,

  RETRY_ATTEMPTS: 2
}

export const getIPFSConfig = () => {
  const projectId = process.env.NEXT_PUBLIC_INFURA_PROJECT_ID || IPFS_CONFIG.INFURA_PROJECT_ID
  const projectSecret = process.env.NEXT_PUBLIC_INFURA_PROJECT_SECRET || IPFS_CONFIG.INFURA_PROJECT_SECRET
  
  return {
    ...IPFS_CONFIG,
    INFURA_PROJECT_ID: projectId,
    INFURA_PROJECT_SECRET: projectSecret,
    PRIMARY_GATEWAY: `https://${projectId}.ipfs.dweb.link`,
    
    ALL_GATEWAYS: [
      `https://${projectId}.ipfs.dweb.link/ipfs`,
      ...IPFS_CONFIG.FALLBACK_GATEWAYS
    ]
  }
}

export default IPFS_CONFIG