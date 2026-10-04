import "dotenv/config";
import { createPublicClient, http, parseAbiItem, type Address } from "viem";
import { avalanche } from "viem/chains";

const address = process.env.NEXT_PUBLIC_DIGITAL_PET_ADDRESS as Address | undefined;
const fromBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK ?? "0");
const rpcUrl = process.env.AVALANCHE_RPC_URL;

if (!address || !rpcUrl) {
  throw new Error("Set NEXT_PUBLIC_DIGITAL_PET_ADDRESS and AVALANCHE_RPC_URL in .env.");
}

const client = createPublicClient({ chain: avalanche, transport: http(rpcUrl) });
const toBlock = await client.getBlockNumber();
const events = [
  ["petCreated", parseAbiItem("event PetCreated(address indexed owner, uint64 createdAt)")],
  ["petFed", parseAbiItem("event PetFed(address indexed owner, uint8 hunger, uint8 happiness)")],
  ["petPlayed", parseAbiItem("event PetPlayed(address indexed owner, uint8 hunger, uint8 happiness)")],
  ["communityCare", parseAbiItem("event CommunityCare(address indexed member, uint64 indexed day, uint32 streak, uint32 memberCareCount, uint32 totalCare, uint32 weeklyCare)")],
] as const;

const counts: Record<string, number> = {};
for (const [name, event] of events) {
  const logs = await client.getLogs({ address, event, fromBlock, toBlock });
  counts[name] = logs.length;
}

console.log(JSON.stringify({
  chainId: await client.getChainId(),
  contract: address,
  fromBlock: fromBlock.toString(),
  toBlock: toBlock.toString(),
  counts,
  totalInteractions: Object.values(counts).reduce((sum, count) => sum + count, 0),
}, null, 2));
