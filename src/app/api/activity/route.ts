import { NextResponse } from "next/server";
import { createPublicClient, http, parseAbiItem, type Address } from "viem";
import { avalanche } from "viem/chains";

export const dynamic = "force-dynamic";

const contractAddress = process.env.NEXT_PUBLIC_DIGITAL_PET_ADDRESS as Address | undefined;
const networkName = "mainnet";
const chainId = 43114;
const deployedAtBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK ?? "0");
const client = createPublicClient({
  chain: avalanche,
  transport: http(process.env.NEXT_PUBLIC_AVALANCHE_RPC_URL || undefined),
});

const eventDefinitions = [
  ["Pet created", parseAbiItem("event PetCreated(address indexed owner, uint64 createdAt)")],
  ["Pet fed", parseAbiItem("event PetFed(address indexed owner, uint8 hunger, uint8 happiness)")],
  ["Played with pet", parseAbiItem("event PetPlayed(address indexed owner, uint8 hunger, uint8 happiness)")],
] as const;
const communityEvent = parseAbiItem("event CommunityCare(address indexed member, uint64 indexed day, uint32 streak, uint32 memberCareCount, uint32 totalCare, uint32 weeklyCare)");
const userOperationRevertReasonTopic = "0x1c4fada7374c0a9ee8841fc38afe82932dc0f8e69012e927f061a8bae611a201";

type IndexedInternalOperation = {
  blockNumber: number;
  txHash: `0x${string}`;
  from: Address;
  to: Address;
  methodId?: string;
};

export async function GET() {
  if (!contractAddress) {
    return NextResponse.json({ error: "The DigitalPet contract address is not configured." }, { status: 503 });
  }

  try {
    const eventGroups = await Promise.all(eventDefinitions.map(async ([name, event]) => {
      const logs = await client.getLogs({ address: contractAddress, event, fromBlock: deployedAtBlock, toBlock: "latest" });
      return logs.map((log) => ({
        name,
        owner: log.args.owner,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber?.toString(),
        logIndex: log.logIndex,
      }));
    }));

    const communityLogs = await client.getLogs({ address: contractAddress, event: communityEvent, fromBlock: deployedAtBlock, toBlock: "latest" });
    const communityEvents = communityLogs.map((log) => ({
      name: "Community care",
      owner: log.args.member,
      transactionHash: log.transactionHash,
      blockNumber: log.blockNumber?.toString(),
      logIndex: log.logIndex,
    }));

    // SmoothSend submits sponsored smart-account operations. Routescan indexes
    // their inner calls separately, while reverted user operations have no
    // PetFed/PetPlayed contract event to pick up above. Surface those attempts
    // as reverted, with the original transaction hash for inspection.
    let revertedCareAttempts: Array<{
      name: string;
      owner: Address;
      transactionHash: `0x${string}`;
      blockNumber: string;
      status: "reverted";
    }> = [];

    try {
      const internalResponse = await fetch(
        `https://api.routescan.io/v2/network/${networkName}/evm/${chainId}/address/${contractAddress}/internal-operations?sort=desc&limit=50`,
        { cache: "no-store" },
      );
      if (internalResponse.ok) {
        const internalData = await internalResponse.json() as { items?: IndexedInternalOperation[] };
        const careCalls = (internalData.items ?? []).filter((operation) =>
          operation.to.toLowerCase() === contractAddress.toLowerCase()
          && (operation.methodId === "0x37a7b7d8" || operation.methodId === "0x93e84cd9")
          && operation.blockNumber >= Number(deployedAtBlock),
        );

        const checkedCalls = await Promise.all(careCalls.map(async (operation) => {
          try {
            const receipt = await client.getTransactionReceipt({ hash: operation.txHash });
            const reverted = receipt.logs.some((log) => log.topics[0]?.toLowerCase() === userOperationRevertReasonTopic);
            if (!reverted) return undefined;
            return {
              name: operation.methodId === "0x37a7b7d8" ? "Pet feed" : "Played with pet",
              owner: operation.from,
              transactionHash: operation.txHash,
              blockNumber: String(operation.blockNumber),
              status: "reverted" as const,
            };
          } catch {
            return undefined;
          }
        }));
        revertedCareAttempts = checkedCalls.filter((item) => item !== undefined);
      }
    } catch {
      // The contract event feed remains available if Routescan is unavailable.
    }

    const events = [...eventGroups.flat(), ...communityEvents, ...revertedCareAttempts]
      .filter((event) => event.owner && event.transactionHash && event.blockNumber)
      .sort((a, b) => Number(BigInt(b.blockNumber!) - BigInt(a.blockNumber!)))
      .slice(0, 12);

    const latestByMember = new Map<string, { owner: string; streak: number; careCount: number }>();
    for (const log of communityLogs) {
      if (!log.args.member) continue;
      latestByMember.set(log.args.member.toLowerCase(), {
        owner: log.args.member,
        streak: Number(log.args.streak),
        careCount: Number(log.args.memberCareCount),
      });
    }
    const leaders = [...latestByMember.values()].sort((a, b) => b.careCount - a.careCount).slice(0, 5);

    return NextResponse.json({ events, leaders }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load contract events.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
