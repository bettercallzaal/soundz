1 · Exhaustive Outline
#	Section	Sub-topics
1	Vision & Objectives	Mission, north-star KPIs, non-goals, glossary.
2	Personas & User Journeys	Indie Artist, Collector, Flipper + failure paths (no bids, auction sniped, failed tx).
3	Functional Scope	Smart-contracts, storage, Web dApp, Farcaster Mini App, indexer, notifications, analytics.
4	System Architecture	Contract call-flow, event → Subgraph → React hooks, Mini App SDK integration, webhook notification flow.
5	Data Schemas	Solidity storage layouts, Subgraph GraphQL types, notification-token DB table.
6	Tech Stack	Solidity 0.8.25, OZ-5, Foundry, Hardhat, Next-14/React-18, Wagmi v2 + @farcaster/frame-wagmi-connector, Frame SDK, The Graph, Postgres (tokens), Vercel, Tenderly.
7	Detailed Functional Requirements	FR-01 … FR-20 with acceptance tests.
8	Non-Functional Reqs	Performance, security, uptime, legal, accessibility, i18n.
9	Risk Register & Mitigations	Ranked by L-I matrix.
10	Implementation Plan	Repo layout, sprint tasks, CI/CD pipeline, test matrix, rollout & rollback.
11	Appendices	Sample contracts, manifest, fc:frame meta, API spec, env-var list.

2 · Ultra-Detailed PRD (v0.4 · 16 May 2025)
2.1 Vision
ZoundZ is the one-tap auction house for 1-of-1 music NFTs on Base. Bidding, commenting, and resale happen directly inside Farcaster via a Mini App; artists keep 90 % of primary and 9 % of secondary sales.

2.2 Glossary
Drop – one ERC-721 token representing a track.

Auction – 24 h English auction starting on first bid, 5 min anti-snipe.

Mini App – Farcaster-embedded modal rendered ≤ 424 × 695 px.

JFS – JSON Farcaster Signature proving domain ownership.

2.3 In-Scope MVP
Domain	Detail
Contracts	ZoundZ721 (proxy, ERC-2981) and AuctionHouse. Key functions: <br/>mintTrack(uri, artist) → tokenId <br/>createAuction(tokenId, reservePrice) (internal) <br/>placeBid(tokenId,string comment) payable <br/>claim(tokenId) <br/>artistCancel(tokenId) (no bids ∧ > 7 days). Events: AuctionStarted, BidPlaced, AuctionExtended, AuctionEnded, AuctionCancelled. Storage: mapping tokenId ⇒ Auction{artist,startTime,endTime,highestBid,bidder,comment}.
Revenue Logic	Primary split: 90 % artist, 10 % feeReceiver. Secondary: royaltyInfo returns (artist, 900) and (feeReceiver, 100) for 10000 bp base.
Storage	Files to NFT.Storage; CID pinned in tokenURI. JSON fields: {name,description,artist,license,bpm,key,image,animation_url}.
Web dApp	• Home: Hero live auction card + Past Drops rail (infinite scroll). <br/>• Drop page: waveform player, live countdown, bid list, comment, “Place Bid”. <br/>• Create: 3-step wizard (upload, preview, sign).
Mini App	Frame SDK ready call sdk.actions.ready() to hide splash. Wallet via sdk.wallet.ethProvider & Wagmi connector. Embed meta: <meta name="fc:frame" …> with "launch_frame" action. Manifest served at /.well-known/farcaster.json with frame, accountAssociation, and webhookUrl for notifications.
Notifications	Optional Neynar webhook; store {fid,token,url} then POST JSON schema when out-bid.
Indexer	Hosted Subgraph with entities:<br/>Token(id,uri,artist)<br/>Auction(id,tokenId,start,end,highestBid,bidder,state)<br/>Bid(id,auctionId,bidder,amount,comment,timestamp).
Compliance	Rights checkbox; AudD fingerprint before mint; DMCA email.

2.4 Detailed Functional Requirements & Acceptance Criteria
ID	Requirement	Given / When / Then (GWT)	Priority
FR-01	Mint Track	Given connected artist,<br/>When they upload ≤ 100 MB audio + ≤ 10 MB image,<br/>Then mintTrack returns tokenId and emits Transfer.	P0
FR-02	Start on First Bid	Given auction state = Created,<br/>When first valid bid placed,<br/>Then startTime = now, endTime = now+24h, state = Started, AuctionStarted emitted.	P0
FR-03	Anti-Sniping	Given endTime-now ≤ 300 s,<br/>When new bid placed,<br/>Then endTime += 300 s, emit AuctionExtended.	P0
FR-04	Comment Capture	When placeBid succeeds,<br/>Then comment string stored, BidPlaced logs it. Highest bidder comment stored separately.	P0
FR-05	Cancel If No Bids	Given state = Created ∧ now > mintTime+7d,<br/>When artist calls artistCancel,<br/>Then state = Cancelled, NFT unlocked.	P0
FR-06	Revenue Split	When claim executed,<br/>Then 90 % → artist, 10 % → feeReceiver. Secondary: marketplaces call royaltyInfo and get 9 %/1 %.	P0
FR-07	Home Hero	When Subgraph returns an active auction,<br/>Then hero card shows cover, price, countdown, “Bid” CTA (opens Mini App).	P0
FR-08	fc:frame Embed	When any /drop/:id link is shared,<br/>Then Warpcast scrapes meta and renders Bid button launching Mini App.	P0
FR-09	Ready Splash	When React mounted and Wagmi hydrated,<br/>Then call sdk.actions.ready() to dismiss splash.	P0
FR-10	Wallet Provider	Given Wagmi config with frame-wagmi-connector,<br/>Then useAccount() returns FID’s wallet or prompts connect.	P0
FR-11	Notification Token Intake	When Warpcast POSTs frame_added with {url,token} to webhookUrl,<br/>Then server stores token keyed by fid.	P1
FR-12	Out-Bid Push	When new bid supersedes previous highest,<br/>Then backend POSTs to prior bidder’s url with JSON schema (idempotent via notificationId).	P1
FR-13	Search Artists	Subgraph text search on artist string; fuzzy match.	P2
FR-14	Manifest Verification	Domain owner signs manifest via Warpcast tool; file includes icon, splash, colors, webhook, version “1”
.	P0

(Full table continues to FR-20 in repo docs.)

2.5 Non-Functional Targets
Area	Metric	Tooling
Perf	TTFB < 150 ms; hero render < 1 s; polling interval 4 s	Vercel Edge, GraphQL persisted queries
Security	0 high-sev Slither; 100 % Foundry coverage; Echidna fuzz > 20 k runs	Slither, Echidna, Tenderly
Uptime	99.5 % web, 99 % Subgraph, dual RPC	Ankr + Blast fail-over
Accessibility	WCAG 2.1 AA; semantic HTML in Mini App	Lighthouse CI
Legal	DMCA takedown in 72 h; license string embedded	AudD API

2.6 KPIs (90 days)
KPI	Target
Artists dropping ≥ 2 tracks	150
Median first-bid time	≤ 4 h
Mini App installs	≥ 500
Primary volume	≥ 50 ETH
Push-notification opt-in rate	≥ 60 %

2.7 Risk Register
Risk	L	I	Score	Mitigation
DMCA Takedown	M	H	12	AudD scan, KYC lite
Gas war bot sniping	M	M	9	+5 min extension, frontrun guard
RPC outage	L	H	8	Multi-provider, stale-while-revalidate UI
Royalty wash	M	M	9	ERC-2981 + on-chain fee checks

3 · Granular Implementation Plan
3.0 Repo Layout
graphql
Copy
Edit
zoundz/
├─ packages/
│  ├─ contracts/      # Hardhat + Foundry
│  ├─ web/            # Next 14 app/
│  └─ miniapp/        # Mini App SDK build
├─ subgraph/
│  └─ schema.graphql
├─ infra/             # Terraform for RDS + Vercel
└─ .github/
   └─ workflows/ci.yml
3.1 Sprint 0 – Tooling (½ day)
pnpm dlx create-turbo@latest zoundz

Install Foundry, forge init packages/contracts.

Add GitHub Actions:

yaml
Copy
Edit
- run: pnpm install
- run: forge test --gas-report
- run: pnpm --filter web run build
- uses: amondnet/vercel-action@v20
3.2 Sprint 1 – Contracts (Days 1-3)
Task	Command / File
Scaffold ZoundZ721.sol	forge create
Implement AuctionHouse.sol (see FR)	packages/contracts/src/
Tests:	forge test -vv
Deploy to Base Sepolia	pnpm exec hardhat run scripts/deploy.ts --network baseSepolia

3.3 Sprint 1 – Web Alpha (Days 3-5)
Wagmi Config

ts
Copy
Edit
import { farcasterFrame } from '@farcaster/frame-wagmi-connector';
export const config = createConfig({ chains:[base], connectors:[farcasterFrame()] });



2. Create Drop Wizard – IPFS upload via import { NFTStorage } from 'nft.storage'.
3. Home Page – useCurrentAuction() (GraphQL) → Hero card; usePastDrops() query paginated.
4. Drop Page – React useEffect to poll Subgraph until now > endTime.

3.4 Sprint 1 – Subgraph (Day 5-6)
graph init --product hosted-service zoundz/zoundz

Add mappings, deploy; store URL in .env.

3.5 Sprint 1 – Mini App (Days 6-8)
pnpm create @farcaster/mini-app 


Copy shared components; constrain max-width 424 px.

Call sdk.actions.ready() after Wagmi hydrates

.

Add <meta name="fc:frame" …> with launch_frame action example

.

Publish /.well-known/farcaster.json; sign via Warpcast tool; include webhookUrl (Neynar)

.

3.6 Sprint 2 – Notification Engine
If managed: register at neynar.com, copy events URL; set in manifest webhookUrl 

.

Store {fid,token,url} table (tokens(id SERIAL, fid BIGINT, token TEXT, url TEXT, client TEXT)); indices on fid.

Lambda /api/outbid handler to POST JSON schema to url (batch ≤ 100).

Idempotency via (fid,notificationId) unique key.

3.7 Sprint 2 – Beta Polish
Dark mode, toast errors.

Blockaid verification for new contracts (false-positive fix)

.

Lighthouse score ≥ 90.

3.8 Sprint 3 – Mainnet & Launch
Hardhat deploy to base via DEPLOY_LIVE=true.

Update manifest homeUrl, iconUrl, splashImageUrl.

Refresh Warpcast cache (Settings → Developer → Domains).

Announce hero drop; push cast with /drop/:id link.

3.9 Rollback & Disaster Recovery
Failure	Action
Critical contract bug	Pause proxy via upgradeTo hotfix; emergency withdraw guard.
Subgraph outage	Web fallback to RPC reads (5 min cache).
Notification spam	Disable webhook in manifest (cache clears in 5 min dev-tool refresh).

4 · Appendices
A. farcaster.json Template (signed)
json
Copy
Edit
{
  "accountAssociation": { "<JFS header/payload/signature>" },
  "frame": {
    "version": "1",
    "name": "ZoundZ",
    "iconUrl": "https://zoundz.xyz/icon.png",
    "homeUrl": "https://zoundz.xyz",
    "imageUrl": "https://zoundz.xyz/og.png",
    "buttonTitle": "Bid",
    "splashImageUrl": "https://zoundz.xyz/splash.png",
    "splashBackgroundColor": "#1a1a1a",
    "webhookUrl": "https://zoundz.xyz/api/events"
  }
}



B. fc:frame Embed (per drop)
html
Copy
Edit
<meta name="fc:frame" content='{"version":"next","imageUrl":"https://zoundz.xyz/covers/123.png","button":{"title":"Bid","action":{"type":"launch_frame","name":"ZoundZ","url":"https://zoundz.xyz/drop/123"}}}' />



C. Notification Payload
json
Copy
Edit
{
  "notificationId": "outbid-123-456",
  "tokens": ["a05059ef2415..."],
  "title": "New highest bid!",
  "body": "Your offer on Track #123 was beaten 🎶",
  "targetUrl": "https://zoundz.xyz/drop/123"
}



