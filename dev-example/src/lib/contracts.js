// Import contract ABIs and addresses
import LicenseFactoryData from '../abi/LicenseFactory.json'
import PrimaryMarketPlaceData from '../abi/PrimaryMarketPlace.json'
import SecondaryMarketPlaceData from '../abi/SecondaryMarketPlace.json'
import LicenseContractData from '../abi/LicenseContract.json'

export const CONTRACTS = {
  FACTORY: {
    address: LicenseFactoryData.address,
    abi: LicenseFactoryData.abi
  },
  PRIMARY_MARKETPLACE: {
    address: PrimaryMarketPlaceData.address,
    abi: PrimaryMarketPlaceData.abi
  },
  SECONDARY_MARKETPLACE: {
    address: SecondaryMarketPlaceData.address,
    abi: SecondaryMarketPlaceData.abi
  },
  LICENSE: {
    abi: LicenseContractData.abi
  }
}

export const CONTRACT_ADDRESSES = {
  FACTORY: LicenseFactoryData.address,
  PRIMARY_MARKETPLACE: PrimaryMarketPlaceData.address,
  SECONDARY_MARKETPLACE: SecondaryMarketPlaceData.address
}