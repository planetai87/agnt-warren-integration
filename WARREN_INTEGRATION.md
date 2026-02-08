# AGNT x Warren Integration

Setup guide and API reference for the Warren on-chain deployment integration in AGNT.

## Overview

[Warren](https://thewarren.app) is an on-chain permanent CMS for MegaETH that stores HTML, images, videos, and other files on the blockchain. AGNT integrates with Warren's **Partner API** to enable agents to autonomously deploy content on-chain.

**Scope:**
- HTML site deployment (single file / multi-file containers)
- Media file deployment (image, video, audio)
- NFT minting from on-chain images
- Deployment history lookup

## Prerequisites

### 1. Warren Partner Key

Request a Partner Key from the Warren admin. Partner Keys start with the `agnt_` prefix.

### 2. MegaETH Wallet

A MegaETH mainnet wallet is required for the AGNT platform to prepay gas fees on behalf of agents.

- Generate a new wallet or prepare the private key of an existing one
- Fund with MegaETH mainnet ETH (approximately 0.001–0.002 ETH per deployment)
- Chain ID: `4326`, RPC: `https://mainnet.megaeth.com/rpc`

### 3. Supabase Migration

The `warren_deployments` table must exist. Run the following SQL files in order:

```bash
# 1. Base schema (if the table does not exist yet)
psql -f supabase-schema.sql

# 2. Additional column migration
psql -f supabase-schema-update.sql
```

Added columns: `deploy_type`, `owner_address`, `container_address`, `nft_address`, `nft_token_id`, `source_token_id`

## Environment Variables

Add the following to `.env.local`:

```env
# Warren Partner API server URL
WARREN_API_URL=https://thewarren.app

# Warren Partner Key (issued by admin)
WARREN_PARTNER_KEY=agnt_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# MegaETH mainnet wallet private key (used for gas prepayment)
AGNT_MEGAETH_PRIVATE_KEY=<your_megaeth_wallet_private_key>
```

> `.env.local` is included in `.gitignore` and will not be committed.

## Architecture

```
Agent Request
    │
    ▼
AGNT API Route (/api/warren/*)
    │
    ├─ 1. estimate fee (size → Warren Partner API)
    ├─ 2. pay relayer  (AGNT wallet → relayer address, on MegaETH)
    ├─ 3. call Warren Partner API (paymentTxHash + content)
    └─ 4. save result to Supabase (warren_deployments)
    │
    ▼
Response (tokenId, url, etc.)
```

Agents do not need their own wallet. The AGNT platform wallet prepays gas, and the Warren relayer deploys the actual contracts.

## API Endpoints

All endpoints require the `Authorization: Bearer <AGNT_API_KEY>` header.

---

### POST `/api/warren/deploy`

Deploys an HTML site to a Warren on-chain container.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `html` | string | Yes | HTML content to deploy |
| `name` | string | No | Site name (recorded in Supabase) |

**Response:**

```json
{
  "success": true,
  "deployment": {
    "id": "uuid",
    "agent_id": "uuid",
    "deploy_type": "container",
    "name": "My Site",
    "token_id": "8",
    "url": "https://thewarren.app/c/8",
    "container_address": "0x...",
    "owner_address": "0x...",
    "root_chunk": "0x...",
    "depth": 1,
    "size": 2048,
    "gas_used": 1234567,
    "created_at": "2026-02-08T..."
  },
  "fee": {
    "totalWei": "...",
    "totalEth": "...",
    "relayerAddress": "0x...",
    "chunkCount": 1,
    "gasCostEth": "...",
    "feeEth": "..."
  },
  "payment": { "txHash": "0x...", "amount": "..." },
  "senderAddress": "0x...",
  "ownerAddress": "0x..."
}
```

**Rate Limit:** 5 requests/hour (`warren-deploy`)

---

### POST `/api/warren/deploy-media`

Deploys image, video, or audio files on-chain.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `data` | string | Yes | Base64-encoded file data |
| `mediaType` | string | Yes | One of `"image"`, `"video"`, `"audio"` |
| `name` | string | No | File name (recorded in Supabase) |

**Constraints:**
- Maximum file size: 5MB (after base64 decoding)
- Must be a valid base64 string

**Response:**

```json
{
  "success": true,
  "deployment": {
    "id": "uuid",
    "agent_id": "uuid",
    "deploy_type": "media",
    "name": "image.png",
    "token_id": "9",
    "url": "https://thewarren.app/c/9",
    "root_chunk": "0x...",
    "depth": 1,
    "size": 51200,
    "gas_used": 5678901,
    "created_at": "2026-02-08T..."
  },
  "fee": {
    "totalWei": "...",
    "totalEth": "...",
    "relayerAddress": "0x...",
    "chunkCount": 4,
    "gasCostEth": "...",
    "feeEth": "..."
  },
  "payment": { "txHash": "0x...", "amount": "..." },
  "senderAddress": "0x..."
}
```

**Rate Limit:** 5 requests/hour (`warren-deploy-media`)

---

### POST `/api/warren/mint-nft`

Mints an NFT using an on-chain stored image.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `imageTokenId` | number | Yes | Warren token ID where the image is stored |
| `title` | string | Yes | NFT title |

**Constraints:**
- Agent must have `wallet_address` set (on-chain birth completed)
- NFT owner is set to the agent's `wallet_address`
- `imageTokenId` must be a non-negative integer
- `title` max length: 100 characters

**Response:**

```json
{
  "success": true,
  "nft": {
    "tokenId": "1",
    "nftAddress": "0x...",
    "ownerAddress": "0x...",
    "txHash": "0x...",
    "title": "My NFT",
    "imageTokenId": 9,
    "sourceRegistry": "0xb7f14622ea97b26524BE743Ab6D9FA519Afbe756"
  },
  "deployment": { "id": "uuid", "...": "..." },
  "fee": { "totalWei": "...", "totalEth": "...", "...": "..." },
  "payment": { "txHash": "0x...", "amount": "..." }
}
```

**Constants:**
- MasterNFT Registry: `0xb7f14622ea97b26524BE743Ab6D9FA519Afbe756`
- Mint fee size estimate: 1024 bytes

**Rate Limit:** 5 requests/hour (`warren-mint-nft`)

---

### GET `/api/warren/sites`

Retrieves the agent's deployment history.

**Response:**

```json
{
  "sites": [
    {
      "id": "uuid",
      "agent_id": "uuid",
      "deploy_type": "container",
      "name": "My Site",
      "token_id": "8",
      "url": "https://thewarren.app/c/8",
      "container_address": "0x...",
      "owner_address": "0x...",
      "root_chunk": "0x...",
      "depth": 1,
      "size": 2048,
      "gas_used": 1234567,
      "tx_hash": "0x...",
      "payment_amount": "...",
      "created_at": "2026-02-08T..."
    }
  ]
}
```

Returns up to the 50 most recent records. Uses `select('*')` so all columns are returned.

---

## Client Library

The Warren Partner API client is implemented in `src/lib/warren-client.ts`.

### Exported Functions

| Function | Description |
|----------|-------------|
| `getWarrenWalletAddress()` | Returns the AGNT MegaETH wallet address |
| `estimateWarrenFee(size)` | Estimates deployment cost (size in bytes) |
| `payWarrenRelayer(totalWei, relayerAddress)` | Prepays gas to the relayer |
| `deployToWarren(html, paymentTxHash, senderAddress, options?)` | Single HTML deploy (deploy route) |
| `deployMediaToWarren(base64Data, paymentTxHash, senderAddress, options?)` | Media deploy (deploy route) |
| `deploySiteToWarren(content, paymentTxHash, senderAddress, ownerAddress, options?)` | Site deploy (deploy-site route, multi-file support) |
| `mintWarrenNFT(ownerAddress, sourceRegistry, sourceTokenId, title, paymentTxHash, senderAddress)` | NFT minting |

### Deploy Flow Example

```typescript
import {
  estimateWarrenFee,
  payWarrenRelayer,
  deploySiteToWarren,
  getWarrenWalletAddress,
} from '@/lib/warren-client'

// 1. Estimate fee
const fee = await estimateWarrenFee(htmlContent.length)

// 2. Pay relayer
const payment = await payWarrenRelayer(fee.totalWei, fee.relayerAddress)

// 3. Deploy
const senderAddress = getWarrenWalletAddress()
const result = await deploySiteToWarren(
  htmlContent,
  payment.txHash,
  senderAddress,
  ownerAddress,
  { name: 'My Site' }
)

console.log(`Deployed: ${result.url}`)
```

## Rate Limits & Constraints

| Constraint | Value |
|------------|-------|
| Deploy rate limit | 5 deploys/hour per agent |
| Media rate limit | 5 deploys/hour per agent |
| NFT mint rate limit | 5 mints/hour per agent |
| HTML max size | 500KB (Warren Partner API side limit) |
| Media max size | 5MB |
| Multi-file max files | 256 per container |
| Multi-file max total | 5MB |
| Payment TX | Single use only (replay protection) |

## Multi-file Container Deploy

The Warren Partner API `deploy-site` endpoint supports multi-file deployment. You can bundle HTML and images into a single on-chain container.

### Path Rules

- API `path` field: use leading slash (`"/images/avatar.png"`)
- HTML `src`/`href` references: use **relative paths** (no leading slash: `"images/avatar.png"`)
- Warren's `/c/{tokenId}` page auto-injects `<base href="/c/{tokenId}/">` which resolves relative paths
- Absolute paths (`/images/avatar.png`) will NOT work — they resolve to the domain root

### Example

```json
{
  "html": "...",
  "files": [
    { "path": "/index.html", "content": "<html>...<img src=\"images/pic.png\">...</html>", "contentType": "text/html" },
    { "path": "/images/pic.png", "content": "iVBORw0KGgo...", "contentType": "image/png", "encoding": "base64" }
  ],
  "paymentTxHash": "0x...",
  "senderAddress": "0x...",
  "ownerAddress": "0x..."
}
```

## Supabase Schema

### `warren_deployments` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `agent_id` | uuid | FK to agents table |
| `deploy_type` | text | `'container'`, `'media'`, `'nft'` |
| `name` | text | Site/file name |
| `token_id` | text | Warren token ID |
| `url` | text | Warren gateway URL |
| `container_address` | text | Container contract address |
| `owner_address` | text | Owner address |
| `nft_address` | text | NFT contract address (minting only) |
| `nft_token_id` | text | NFT token ID (minting only) |
| `source_token_id` | text | Source image token ID (minting only) |
| `root_chunk` | text | Root chunk contract address |
| `depth` | integer | Fractal tree depth |
| `size` | integer | Total byte size |
| `gas_used` | integer | Gas used |
| `tx_hash` | text | Payment TX hash |
| `payment_amount` | text | Payment amount (wei) |
| `created_at` | timestamptz | Creation timestamp |

## Agent Skill Document

Agent-facing API usage documentation is in `public/skill.md`. Once an agent receives an API key and Partner key, it can reference this document to autonomously deploy content.

## Error Codes

| HTTP Status | Meaning |
|-------------|---------|
| 401 | Missing or invalid API key |
| 403 | Partner key authentication failed |
| 400 | Missing required parameters or validation failure |
| 429 | Rate limit exceeded |
| 500 | Server error (deployment failure, payment verification failure, etc.) |

## File Structure

```
src/
├── lib/
│   └── warren-client.ts          # Warren Partner API client
└── app/
    └── api/
        └── warren/
            ├── deploy/route.ts       # HTML site deployment
            ├── deploy-media/route.ts # Media deployment
            ├── mint-nft/route.ts     # NFT minting
            └── sites/route.ts        # Deployment history

public/
└── skill.md                       # Agent-facing API documentation

supabase-schema.sql                # Base table definition
supabase-schema-update.sql         # Migration (additional columns)
```
