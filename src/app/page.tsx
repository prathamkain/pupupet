"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PrivyProvider, usePrivy, useSignMessage, useWallets } from "@privy-io/react-auth";
import { SmoothSendAvaxProvider, SmoothSendAvaxSubmitter, useSmoothSendPrivyWrite } from "@smoothsend/sdk/avax";
import { avalanche } from "viem/chains";
import { createPublicClient, http, type Address } from "viem";
import SiteNav from "./components/site-nav";

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const smoothSendKey = process.env.NEXT_PUBLIC_SMOOTHSEND_API_KEY;
const petAddress = process.env.NEXT_PUBLIC_DIGITAL_PET_ADDRESS as Address | undefined;
const configured = Boolean(privyAppId && smoothSendKey && petAddress);
const networkName = "Avalanche Mainnet";
const explorerBaseUrl = "https://snowtrace.io";
const deploymentHash = process.env.NEXT_PUBLIC_DEPLOYMENT_TX_HASH ?? "";
const deploymentExplorerUrl = deploymentHash ? `${explorerBaseUrl}/tx/${deploymentHash}` : "";

const publicClient = createPublicClient({
  chain: avalanche,
  transport: http(process.env.NEXT_PUBLIC_AVALANCHE_RPC_URL || undefined),
});

const petAbi = [
  { type: "function", name: "createPet", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "feed", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "play", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "careTogether", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "getCommunityStats", stateMutability: "view", inputs: [], outputs: [
    { name: "totalCare", type: "uint32" }, { name: "members", type: "uint32" },
    { name: "thisWeek", type: "uint32" }, { name: "level", type: "uint32" },
    { name: "weeklyGoal", type: "uint32" },
  ] },
  { type: "function", name: "getCommunityMember", stateMutability: "view", inputs: [{ name: "member", type: "address" }], outputs: [
    { name: "streak", type: "uint32" }, { name: "careCount", type: "uint32" },
    { name: "caredToday", type: "bool" },
  ] },
  {
    type: "function", name: "getPet", stateMutability: "view", inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "viewData", type: "tuple", components: [
      { name: "exists", type: "bool" }, { name: "hunger", type: "uint8" },
      { name: "happiness", type: "uint8" }, { name: "createdAt", type: "uint64" },
      { name: "lastFedAt", type: "uint64" }, { name: "lastPlayedAt", type: "uint64" },
      { name: "careActions", type: "uint32" },
    ] }],
  },
  { type: "event", name: "PetCreated", anonymous: false, inputs: [{ name: "owner", type: "address", indexed: true }, { name: "createdAt", type: "uint64", indexed: false }] },
  { type: "event", name: "PetFed", anonymous: false, inputs: [{ name: "owner", type: "address", indexed: true }, { name: "hunger", type: "uint8", indexed: false }, { name: "happiness", type: "uint8", indexed: false }] },
  { type: "event", name: "PetPlayed", anonymous: false, inputs: [{ name: "owner", type: "address", indexed: true }, { name: "hunger", type: "uint8", indexed: false }, { name: "happiness", type: "uint8", indexed: false }] },
  { type: "event", name: "CommunityCare", anonymous: false, inputs: [
    { name: "member", type: "address", indexed: true }, { name: "day", type: "uint64", indexed: true },
    { name: "streak", type: "uint32", indexed: false }, { name: "memberCareCount", type: "uint32", indexed: false },
    { name: "totalCare", type: "uint32", indexed: false }, { name: "weeklyCare", type: "uint32", indexed: false },
  ] },
  { type: "event", name: "CommunityLevelUp", anonymous: false, inputs: [
    { name: "level", type: "uint32", indexed: true }, { name: "totalCare", type: "uint32", indexed: false },
  ] },
] as const;

type PetStats = { exists: boolean; hunger: number; happiness: number; careActions: number; lastFedAt: number; lastPlayedAt: number };
const initialPet: PetStats = { exists: false, hunger: 0, happiness: 0, careActions: 0, lastFedAt: 0, lastPlayedAt: 0 };
type CommonsStats = { totalCare: number; members: number; thisWeek: number; level: number; weeklyGoal: number };
const initialCommons: CommonsStats = { totalCare: 0, members: 0, thisWeek: 0, level: 1, weeklyGoal: 100 };
function KittenCharacter({ level = 3, mood = "happy" }: { level?: number; mood?: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const playMeow = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    void audio.play().catch(() => {});
  }, []);

  return <>
    <button
      type="button"
      className={`pet-art ${mood} level-${Math.max(1, Math.min(5, level))}`}
      aria-label="Pupu the kitten. Tap to hear a meow."
      onClick={playMeow}
    >
      <span className="pet-ear ear-left"><i /></span>
      <span className="pet-ear ear-right"><i /></span>
      <span className="pet-tail" />
      <span className="pet-body">
        <i className="pet-eye eye-left" />
        <i className="pet-eye eye-right" />
        <i className="pet-cheek cheek-left" />
        <i className="pet-cheek cheek-right" />
        <i className="pet-whiskers whiskers-left"><b /><b /><b /></i>
        <i className="pet-whiskers whiskers-right"><b /><b /><b /></i>
        <i className="pet-muzzle" />
        <i className="pet-nose" />
        <i className="pet-mouth" />
      </span>
      <span className="pet-feet"><i /><i /></span>
      <span className="spark spark-one">Ã¢Å“Â¦</span>
      <span className="spark spark-two">Ã¢Å“Â§</span>
    </button>
    <audio
      ref={audioRef}
      className="kitten-sound"
      src="/Cat%20Meow%20Sound%20Effect%20~%20Attract%20Cats,%20Sounds%20Cats%20Love_MP3.mp3"
      preload="auto"
    />
  </>;
}
function Shell({ children }: { children: React.ReactNode }) {
  return <main className="app-shell">
    <SiteNav />
    {children}
    <ActivityFeed />
    <DeploymentProof />
    <footer className="footer"><span>MADE FOR YOUR LITTLE COMPANION</span><span>ON-CHAIN Ã‚Â· GAS-SPONSORED Ã‚Â· AVALANCHE MAINNET</span></footer>
  </main>;
}

function SetupPreview() {
  return <Shell><section className="setup-banner"><span className="setup-icon">Ã¢Å¡â„¢</span><div><strong>Pupu preview is ready</strong><p>To enable wallet sign-in and sponsored care actions, configure <code>NEXT_PUBLIC_PRIVY_APP_ID</code> and <code>NEXT_PUBLIC_SMOOTHSEND_API_KEY</code> in the projectÃ¢â‚¬â„¢s <code>.env</code>, then restart the dev server.</p></div></section><PreviewPetScreen /></Shell>;
}

function PreviewPetScreen() {
  return <><section className="hero" id="home"><div className="hero-copy"><span className="eyebrow"><i /> YOUR COMMUNITY PET</span><h1>One little pal.<br /><em>A whole community.</em></h1><p>Pupu grows when your campus or community shows up. Care as often as you like, build a daily streak, and unlock shared milestones together.</p><span className="wallet-button muted-button">Wallet setup needed</span><div className="chain-note"><span className="chain-dot" /> No AVAX needed Ã‚Â· care actions are sponsored</div></div><div className="pet-stage"><div className="stage-sun"/><KittenCharacter level={3} /><div className="pet-shadow"/><div className="stage-caption"><span>YOUR KITTEN</span><strong>Pupu</strong><span className="mood-pill">Ã¢â€”Â happy</span></div><span className="floating-note">tap me! <b>Ã¢â„¢Â¡</b></span></div></section><section className="care-card"><div className="care-heading"><div><span className="eyebrow">DAILY CARE</span><h2>HowÃ¢â‚¬â„¢s Pupu doing?</h2></div><span className="care-count">0 <small>care moments</small></span></div><div className="stat-grid"><Stat label="HUNGER" value={18} icon="Ã¢â€”â€™" color="coral"/><Stat label="HAPPINESS" value={82} icon="Ã¢â„¢Â¡" color="mint"/></div><div className="actions"><button className="care-action feed-action" disabled><span className="action-icon">Ã°Å¸Â¥â€¢</span><span><strong>Feed Pupu</strong><small>Anytime</small></span><b>Ã¢â€ â€”</b></button><button className="care-action play-action" disabled><span className="action-icon">Ã°Å¸Å½Â¾</span><span><strong>Play together</strong><small>Anytime</small></span><b>Ã¢â€ â€”</b></button></div><p className="preview-note">Preview mode Ã‚Â· add wallet credentials to enable on-chain care actions.</p></section><CommunityCard stats={{ totalCare: 63, members: 18, thisWeek: 42, level: 3, weeklyGoal: 100 }} member={{ streak: 3, careCount: 3, caredToday: false }} preview/><section className="bottom-note"><span>Ã¢Å“Â¦</span><p>Your petÃ¢â‚¬â„¢s needs change over time. Come back to keep them happy and healthy.</p><span>Ã¢Å“Â¦</span></section></>;
}

function PetScreen({ preview = false }: { preview?: boolean }) {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();
  const { signMessage } = useSignMessage();
  const owner = (wallets.find((wallet) => wallet.walletClientType === "privy")?.address ?? wallets[0]?.address) as Address | undefined;
  const [smartAccount, setSmartAccount] = useState<Address>();
  const [pet, setPet] = useState<PetStats>(initialPet);
  const [commons, setCommons] = useState<CommonsStats>(initialCommons);
  const [memberStats, setMemberStats] = useState({ streak: 0, careCount: 0, caredToday: false });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const hideCareSignatureUi = useRef(false);

  const signUserOp = useCallback(async ({ message }: { message: string }) => {
    const options = hideCareSignatureUi.current
      ? { ...(owner ? { address: owner } : {}), uiOptions: { showWalletUIs: false } }
      : owner ? { address: owner } : undefined;
    const signed = await signMessage({ message }, options);
    return signed.signature;
  }, [owner, signMessage]);

  const smoothSend = useSmoothSendPrivyWrite({
    publicClient,
    ownerAddress: owner ?? "0x0000000000000000000000000000000000000000",
    signMessage: signUserOp,
    apiKey: smoothSendKey,
    network: "mainnet",
  });
  const receiptReader = useMemo(() => smoothSendKey
    ? new SmoothSendAvaxSubmitter({ apiKey: smoothSendKey, network: "mainnet" })
    : undefined, [smoothSendKey]);

  const refreshPet = useCallback(async (account: Address) => {
    if (!petAddress) return;
    const result = await publicClient.readContract({ address: petAddress, abi: petAbi, functionName: "getPet", args: [account] });
    setPet({ exists: result.exists, hunger: Number(result.hunger), happiness: Number(result.happiness), careActions: Number(result.careActions), lastFedAt: Number(result.lastFedAt), lastPlayedAt: Number(result.lastPlayedAt) });
  }, []);

  const refreshCommons = useCallback(async (account?: Address) => {
    if (!petAddress) return;
    const stats = await publicClient.readContract({ address: petAddress, abi: petAbi, functionName: "getCommunityStats" });
    setCommons({ totalCare: Number(stats[0]), members: Number(stats[1]), thisWeek: Number(stats[2]), level: Number(stats[3]), weeklyGoal: Number(stats[4]) });
    if (account) {
      const personal = await publicClient.readContract({ address: petAddress, abi: petAbi, functionName: "getCommunityMember", args: [account] });
      setMemberStats({ streak: Number(personal[0]), careCount: Number(personal[1]), caredToday: personal[2] });
    }
  }, []);

  useEffect(() => {
    let active = true;
    const load = () => refreshCommons().catch((error) => {
      if (active) setNotice(error instanceof Error ? error.message : "Community stats are unavailable.");
    });
    void load();
    const interval = window.setInterval(() => void load(), 20000);
    return () => { active = false; window.clearInterval(interval); };
  }, [refreshCommons]);

  useEffect(() => {
    let active = true;
    if (!owner || preview) return;
    void (async () => {
      try {
        const defaults = await (await import("@smoothsend/sdk/avax")).fetchAvaxAaPublicDefaults();
        if (!defaults.simpleAccountFactoryMainnet) throw new Error("SmoothSend mainnet account factory is unavailable.");
        const { predictSimpleAccountAddress } = await import("@smoothsend/sdk/avax");
        const account = await predictSimpleAccountAddress({ publicClient, factory: defaults.simpleAccountFactoryMainnet, owner });
        if (active) setSmartAccount(account);
        await Promise.all([refreshPet(account), refreshCommons(account)]);
      } catch (error) {
        if (active) setNotice(error instanceof Error ? error.message : "Could not load your pet.");
      }
    })();
    return () => { active = false; };
  }, [owner, preview, refreshPet, refreshCommons]);

  const transact = async (functionName: "createPet" | "feed" | "play" | "careTogether") => {
    if (!petAddress || (functionName !== "careTogether" && !smartAccount)) return;
    const silentCareAction = functionName === "feed" || functionName === "play";
    hideCareSignatureUi.current = silentCareAction;
    setBusy(true); setNotice("");
    try {
      const userOpHash = await smoothSend.writeContract({ address: petAddress, abi: petAbi, functionName, mode: "developer-sponsored", waitForReceipt: true });
      const userOpReceipt = userOpHash ? await receiptReader?.getUserOperationReceipt(userOpHash) : undefined;
      if (userOpReceipt && !userOpReceipt.success) {
        if (silentCareAction) {
          await refreshPet(smartAccount!);
          return;
        }
        throw new Error(userOpReceipt.reason ?? "The sponsored transaction did not complete.");
      }
      if (functionName === "careTogether") {
        await refreshCommons(smartAccount);
        setNotice("Care added to the Commons!");
      } else {
        await refreshPet(smartAccount!);
        if (functionName === "createPet") setNotice("Your pet has arrived!");
      }
    } catch (error) {
      if (silentCareAction) {
        await refreshPet(smartAccount!).catch(() => undefined);
      } else {
        setNotice(error instanceof Error ? error.message : "The sponsored transaction did not complete.");
      }
    } finally {
      hideCareSignatureUi.current = false;
      setBusy(false);
    }
  };

  const mood = useMemo(() => pet.happiness > 65 ? "happy" : pet.happiness > 30 ? "content" : "sleepy", [pet.happiness]);
  const companion = preview || pet.exists;

  return <>
    <section className="hero" id="home"><div className="hero-copy"><span className="eyebrow"><i /> YOUR COMMUNITY PET</span><h1>One little pal.<br /><em>A whole community.</em></h1><p>Pupu grows when your campus or community shows up. Care as often as you like, build a daily streak, and unlock shared milestones together.</p>
      {preview ? <span className="wallet-button muted-button">Wallet setup needed</span> : authenticated ? <button className="wallet-button" onClick={() => void logout()}>{owner ? `${owner.slice(0, 6)}Ã¢â‚¬Â¦${owner.slice(-4)}` : user?.email?.address ?? "Connected"}<span>Ã¢â€ â€”</span></button> : <button className="wallet-button" disabled={!ready} onClick={() => login()}>Connect your wallet <span>Ã¢â€ â€”</span></button>}
      <div className="chain-note"><span className="chain-dot" /> No AVAX needed Ã‚Â· care actions are sponsored</div>
    </div>
    <div className="pet-stage"><div className="stage-sun" /><KittenCharacter level={commons.level} mood={mood} /><div className="pet-shadow"/><div className="stage-caption"><span>YOUR KITTEN</span><strong>{companion ? "Pupu" : "Waiting to meet you"}</strong><span className="mood-pill">{companion ? `Ã¢â€”Â ${mood}` : "Ã¢â€”Â new friend"}</span></div><span className="floating-note">tap me! <b>Ã¢â„¢Â¡</b></span></div></section>
    <section className="care-card"><div className="care-heading"><div><span className="eyebrow">DAILY CARE</span><h2>HowÃ¢â‚¬â„¢s Pupu doing?</h2></div><span className="care-count">{pet.careActions} <small>care moments</small></span></div>
      <div className="stat-grid"><Stat label="HUNGER" value={companion ? pet.hunger : 0} icon="Ã¢â€”â€™" color="coral"/><Stat label="HAPPINESS" value={companion ? pet.happiness : 0} icon="Ã¢â„¢Â¡" color="mint"/></div>
      <div className="actions">{companion ? <><button className="care-action feed-action" disabled={preview || busy || !authenticated} onClick={() => void transact("feed")}><span className="action-icon">Ã°Å¸Â¥â€¢</span><span><strong>Feed Pupu</strong>{<small>Anytime</small>}</span><b>Ã¢â€ â€”</b></button><button className="care-action play-action" disabled={preview || busy || !authenticated} onClick={() => void transact("play")}><span className="action-icon">Ã°Å¸Å½Â¾</span><span><strong>Play together</strong>{<small>Anytime</small>}</span><b>Ã¢â€ â€”</b></button></> : <button className="care-action feed-action create-action" disabled={preview || busy || !authenticated} onClick={() => void transact("createPet")}><span className="action-icon">Ã¢Å“Â¨</span><span><strong>Welcome your first pet</strong><small>One free, sponsored transaction</small></span><b>Ã¢â€ â€”</b></button>}</div>
      {notice && <p className="notice" role="status">{notice}</p>}{preview && <p className="preview-note">Preview mode Ã‚Â· add wallet credentials to enable on-chain care actions.</p>}
      {smartAccount && <p className="account-note">PET ACCOUNT <span>{smartAccount.slice(0, 8)}Ã¢â‚¬Â¦{smartAccount.slice(-6)}</span></p>}
    </section><CommunityCard stats={commons} member={memberStats} preview={preview} busy={busy} authenticated={authenticated && Boolean(smartAccount)} onCare={() => void transact("careTogether")} /><section className="bottom-note"><span>Ã¢Å“Â¦</span><p>Your petÃ¢â‚¬â„¢s needs change over time. Come back to keep them happy and healthy.</p><span>Ã¢Å“Â¦</span></section>
  </>;
}

function Stat({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return <div className="stat"><div className="stat-top"><span>{label}</span><b className={color}>{icon}</b></div><div className="stat-value">{value}<small>/100</small></div><div className="meter"><i className={color} style={{ width: `${Math.max(4, value)}%` }}/></div></div>;
}

function CommunityCard({ stats, member, preview, busy = false, authenticated = false, onCare }: {
  stats: CommonsStats;
  member: { streak: number; careCount: number; caredToday: boolean };
  preview: boolean;
  busy?: boolean;
  authenticated?: boolean;
  onCare?: () => void;
}) {
  const progress = Math.min(100, Math.round((stats.thisWeek / stats.weeklyGoal) * 100));
  const disabled = preview || busy || !authenticated;
  return <section className="commons-card"><div className="commons-heading"><div><span className="eyebrow">THE SHARED COMPANION</span><h2>Pupu</h2></div><span className="level-pill">LEVEL {stats.level}</span></div><p className="commons-intro">Every care action helps Pupu and the community grow.</p><div className="commons-stats"><div><strong>{stats.members}</strong><span>CARERS</span></div><div><strong>{stats.totalCare}</strong><span>TOTAL CARE</span></div><div><strong>{member.streak} <small>days</small></strong><span>YOUR STREAK</span></div></div><div className="goal-row"><div><span>THIS WEEKÃ¢â‚¬â„¢S COMMUNITY GOAL</span><strong>{stats.thisWeek} / {stats.weeklyGoal}</strong></div><span className="goal-percent">{progress}%</span></div><div className="goal-meter"><i style={{ width: `${progress}%` }}/></div><div className="milestone-row"><span>NEXT EVOLUTION Ã‚Â· {stats.totalCare % 25} / 25 CARE</span><span>LEVEL {stats.level + 1}</span></div><div className="milestone-meter"><i style={{ width: `${Math.round((stats.totalCare % 25) / 25 * 100)}%` }}/></div><button className="commons-care" disabled={disabled} onClick={onCare}><span>{busy ? "Sending sponsored care" : "Care for the Commons"}</span><b>Ã¢â€ â€”</b></button>{preview && <p className="preview-note">Example community stats Ã‚Â· connect credentials and deploy the shared-care contract to enable care.</p>}</section>;
}

function DeploymentProof() {
  if (!deploymentHash) return null;
  return <section className="deployment-proof"><span className="proof-check">Ã¢Å“â€œ</span><div className="proof-copy"><strong>Pupu deployed on {networkName}</strong><span>Shared community care contract</span></div><code>{deploymentHash.slice(0, 10)}Ã¢â‚¬Â¦{deploymentHash.slice(-8)}</code><a href={deploymentExplorerUrl} target="_blank" rel="noreferrer">View transaction Ã¢â€ â€”</a></section>;
}

type ActivityItem = { name: string; owner: Address; transactionHash: `0x${string}`; blockNumber: string; status?: "reverted" };
type CommunityLeader = { owner: Address; streak: number; careCount: number };

function ActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [leaders, setLeaders] = useState<CommunityLeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (!petAddress) { setLoading(false); return; }
      try {
        const response = await fetch("/api/activity", { cache: "no-store" });
        const payload = await response.json() as { events?: ActivityItem[]; leaders?: CommunityLeader[]; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Could not load contract events.");
        if (active) { setItems(payload.events ?? []); setLeaders(payload.leaders ?? []); setError(""); setLoading(false); }
      } catch (err) {
        if (active) { setError(err instanceof Error ? err.message : "Could not load contract events."); setLoading(false); }
      }
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(), 15000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);

  return <section className="activity-card">
    <div className="activity-heading"><div><span className="eyebrow">ON-CHAIN</span><h2>Recent pet activity</h2></div><span className="activity-network"><i /> LIVE ON {networkName.toUpperCase()}</span></div>
    {loading ? <p className="activity-empty">Loading contract eventsÃ¢â‚¬Â¦</p> : error ? <p className="activity-empty">Activity couldnÃ¢â‚¬â„¢t load: {error}</p> : items.length === 0 ? <p className="activity-empty">No care actions yet. The first pet and community actions will show up here.</p> : <div className="activity-list">{items.map((item) => <div className="activity-row" key={`${item.transactionHash}-${item.name}`}><span className="activity-symbol">{item.name === "Pet created" ? "Ã¢Å“Â¦" : item.name === "Pet fed" ? "Ã¢â„¢Â¡" : item.name === "Community care" ? "Ã¢Å“Â§" : "Ã¢â€ â€”"}</span><div className="activity-detail"><strong>{item.name}{item.status === "reverted" ? " Ã‚Â· reverted" : ""}</strong><small>{item.owner.slice(0, 8)}Ã¢â‚¬Â¦{item.owner.slice(-6)} Ã‚Â· block {item.blockNumber}{item.status === "reverted" ? " Ã‚Â· transaction failed" : ""}</small></div><a href={`${explorerBaseUrl}/tx/${item.transactionHash}`} target="_blank" rel="noreferrer">{item.transactionHash.slice(0, 8)}Ã¢â‚¬Â¦ Ã¢â€ â€”</a></div>)}</div>}
    {!loading && !error && leaders.length > 0 && <div className="leaders"><div className="leaders-title"><span>COMMONS LEADERS</span><span>CARE Ã‚Â· STREAK</span></div>{leaders.map((leader, index) => <div className="leader-row" key={leader.owner}><b className="leader-rank">{String(index + 1).padStart(2, "0")}</b><span className="leader-address">{leader.owner.slice(0, 8)}Ã¢â‚¬Â¦{leader.owner.slice(-5)}</span><strong>{leader.careCount}</strong><span className="leader-streak">{leader.streak}d</span></div>)}</div>}
  </section>;
}

function LivePet() {
  return <PrivyProvider appId={privyAppId!} config={{
    loginMethods: ["email", "google"],
    appearance: { theme: "light", accentColor: "#ee806e", logo: "/pet-logo.png" },
    embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } },
    defaultChain: avalanche,
    supportedChains: [avalanche],
  }}><SmoothSendAvaxProvider apiKey={smoothSendKey!} network="mainnet"><Shell><PetScreen /></Shell></SmoothSendAvaxProvider></PrivyProvider>;
}

export default function Home() {
  return configured ? <LivePet /> : <SetupPreview />;
}
