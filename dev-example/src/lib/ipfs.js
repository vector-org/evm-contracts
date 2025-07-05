import { create } from "ipfs-http-client"

const projectId = '2WCbZ8YpmuPxUtM6PzbFOfY5k4B'
const projectSecretKey = 'c8b676d8bfe769b19d88d8c77a9bd1e2'
const authorization = "Basic " + btoa(projectId + ":" + projectSecretKey)

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
  return `https://ipfs.infura.io/ipfs/${hash}`
}