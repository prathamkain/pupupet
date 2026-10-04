import "dotenv/config";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { network } from "hardhat";
import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  http,
  type Address,
} from "viem";
import { avalanche } from "viem/chains";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
  createSmoothSendAvaxClient,
  fetchAvaxAaPublicDefaults,
  predictSimpleAccountAddress,
} from "@smoothsend/sdk/avax";

const petAbi = [
  {
    type: "function",
    name: "createPet",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "feed",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "play",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "careTogether",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "getPet",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [
      {
        name: "viewData",
        type: "tuple",
        components: [
          { name: "exists", type: "bool" },
          { name: "hunger", type: "uint8" },
          { name: "happiness", type: "uint8" },
          { name: "createdAt", type: "uint64" },
          { name: "lastFedAt", type: "uint64" },
          { name: "lastPlayedAt", type: "uint64" },
          { name: "careActions", type: "uint32" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getCommunityMember",
    stateMutability: "view",
    inputs: [{ name: "member", type: "address" }],
    outputs: [
      { name: "streak", type: "uint32" },
      { name: "careCount", type: "uint32" },
      { name: "caredToday", type: "bool" },
    ],
  },
] as const;

type DemoWallet = { privateKey: `0x${string}`; address: Address };
const walletFile = ".demo-pet-wallets.json";
const explorerUrl = "https://snowtrace.io/tx/";

function readCount(): number {
  const value = Number(process.env.DEMO_PET_COUNT ?? 3);
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw new Error("DEMO_PET_COUNT must be an integer from 1 to 5.");
  }
  return value;
}

function loadWallets(): DemoWallet[] {
  if (!existsSync(walletFile)) return [];
  return JSON.parse(readFileSync(walletFile, "utf8")) as DemoWallet[];
}

function saveWallets(wallets: DemoWallet[]) {
  writeFileSync(walletFile, `${JSON.stringify(wallets, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
}

async function main() {
  const count = readCount();
  const care = process.env.DEMO_PET_CARE === "1" || process.env.DEMO_PET_CARE === "true";
  const rpcUrl = process.env.AVALANCHE_RPC_URL;
  const petAddress = process.env.NEXT_PUBLIC_DIGITAL_PET_ADDRESS as Address | undefined;
  const apiKey = process.env.SMOOTHSEND_API_KEY;

  if (process.env.DEMO_PET_MAINNET_CONFIRMATION !== "I_UNDERSTAND_MAINNET_COSTS") {
    throw new Error("Set DEMO_PET_MAINNET_CONFIRMATION=I_UNDERSTAND_MAINNET_COSTS to authorize sponsored mainnet demo activity.");
  }
  if (!rpcUrl || !petAddress || !apiKey) {
    throw new Error(
      "Set AVALANCHE_RPC_URL, NEXT_PUBLIC_DIGITAL_PET_ADDRESS, and SMOOTHSEND_API_KEY in .env.",
    );
  }

  await network.create({ network: "avalancheMainnet" });
  const publicClient = createPublicClient({ chain: avalanche, transport: http(rpcUrl) });
  const chainId = await publicClient.getChainId();
  if (chainId !== 43114) throw new Error(`Expected Avalanche mainnet (43114), got chain ${chainId}.`);

  const defaults = await fetchAvaxAaPublicDefaults();
  const factory = defaults.simpleAccountFactoryMainnet;
  if (!factory) throw new Error("SmoothSend did not return its mainnet account factory.");

  const wallets = loadWallets();
  while (wallets.length < count) {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    wallets.push({ privateKey, address: account.address });
  }
  // Normalize generated keys with viem and persist only local, disposable demo accounts.
  for (const wallet of wallets) {
    wallet.address = privateKeyToAccount(wallet.privateKey).address;
  }
  saveWallets(wallets);

  console.log("DEMO ACTIVITY: synthetic mainnet wallets, not organic user activity.");
  console.log(`Contract: ${petAddress}`);
  console.log(`Saved ${count} demo wallet(s) in ${walletFile}; sponsored mainnet activity may consume real credits.`);

  for (const [index, wallet] of wallets.slice(0, count).entries()) {
    const owner = privateKeyToAccount(wallet.privateKey);
    const smartAccount = await predictSimpleAccountAddress({
      publicClient,
      factory,
      owner: owner.address,
    });
    let currentPet = await publicClient.readContract({
      address: petAddress,
      abi: petAbi,
      functionName: "getPet",
      args: [smartAccount],
    });

    console.log(`\n[${index + 1}/${count}] owner ${owner.address}`);
    console.log(`Smart account ${smartAccount}`);

    const walletClient = createWalletClient({
      account: owner,
      chain: avalanche,
      transport: http(rpcUrl),
    });
    const smoothSend = createSmoothSendAvaxClient({
      apiKey,
      network: "mainnet",
      publicClient,
      walletClient,
      ownerAddress: owner.address,
      accountFactory: factory,
    });

    const send = async (functionName: "createPet" | "feed" | "play" | "careTogether") => {
      const data = encodeFunctionData({ abi: petAbi, functionName });
      const result = await smoothSend.submitCall({
        call: { to: petAddress, data },
        mode: "developer-sponsored",
        waitForReceipt: true,
      });
      if (result.receipt && !result.receipt.success) {
        throw new Error(result.receipt.reason ?? `${functionName} transaction failed.`);
      }
      const txHash = result.transactionHash ?? result.receipt?.receipt.transactionHash;
      console.log(`${functionName}: ${txHash ? `${explorerUrl}${txHash}` : `UserOp ${result.userOpHash}`}`);
      return txHash;
    };

    if (!currentPet.exists) {
      await send("createPet");
      currentPet = await publicClient.readContract({
        address: petAddress,
        abi: petAbi,
        functionName: "getPet",
        args: [smartAccount],
      });
    }

    await send("careTogether");

    if (!care) {
      if (currentPet.exists) console.log("Pass --care to feed and play each demo pet again.");
      continue;
    }

    await send("feed");
    await send("play");
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
