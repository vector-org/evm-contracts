"use client";
import { WagmiProvider, createConfig, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";

const sepolia = {
  id: 11155111,
  name: "Ethereum Sepolia",
  nativeCurrency: {name: 'Ethereum Sepolia', symbol: 'ETH', decimals: 18},
  rpcUrls: {
    default: { http : ["https://sepolia.infura.io/v3/2WCbZ8YpmuPxUtM6PzbFOfY5k4B"] }
  },
  blockExplorers: {
    default: { name: 'Ethereum Sepolia explorer', url: "https://sepolia.etherscan.io/" }
  },
}

const config = createConfig(
  getDefaultConfig({
    chains: [sepolia],
    walletConnectProjectId: "a7a2557c75d9558a9c932d5f99559799",
    appName: "Vector - Gaming License Platform",
    appDescription: "Create, trade and manage gaming licenses as NFTs",
    appUrl: "https://vector.dev",
    appIcon: "https://vector.dev/logo.png",
  }),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 3,
    },
  },
});

export const Web3Provider = ({ children }) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider
          theme="light"
          mode="light"
          customTheme={{
            "--ck-accent-color": "#3b82f6",
            "--ck-accent-text-color": "#ffffff",
            "--ck-border-radius": "8px",
          }}
        >
          {children}
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};