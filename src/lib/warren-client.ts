import { ethers } from 'ethers'

const MEGAETH_MAINNET_CHAIN_ID = 4326
const MEGAETH_MAINNET_RPC_URL = 'https://mainnet.megaeth.com/rpc'

export interface WarrenFeeEstimate {
  totalWei: string
  totalEth: string
  relayerAddress: string
  chunkCount: number
  gasCostEth: string
  feeEth: string
}

export interface WarrenPaymentResult {
  txHash: string
  amount: string
}

export interface WarrenDeployOptions {
  name?: string
  siteType?: string
}

export interface WarrenDeploySiteOptions {
  name?: string
  siteType?: string
}

export interface WarrenDeploySiteResult {
  tokenId: string
  url: string
  containerAddress: string
  ownerAddress: string
  rootChunk: string
  depth: number
  size: number
  gasUsed: number
}

export interface WarrenMintNFTResult {
  tokenId: string
  nftAddress: string
  ownerAddress: string
  txHash: string
}

export interface WarrenDeployResult {
  tokenId: string
  url: string
  rootChunk: string
  depth: number
  size: number
  gasUsed: number
}

interface WarrenApiError {
  error?: string
  message?: string
}

function requireEnv(name: 'WARREN_API_URL' | 'WARREN_PARTNER_KEY' | 'AGNT_MEGAETH_PRIVATE_KEY'): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not configured`)
  }

  return value
}

function partnerHeaders(): Record<string, string> {
  const partnerKey = requireEnv('WARREN_PARTNER_KEY')

  return {
    'Content-Type': 'application/json',
    'X-Warren-Partner-Key': partnerKey,
  }
}

async function getApiErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as WarrenApiError
    if (data.error) {
      return data.error
    }

    if (data.message) {
      return data.message
    }
  } catch {
    // Ignore parsing errors and fall back to status text
  }

  return response.statusText || `HTTP ${response.status}`
}

export function getWarrenWalletAddress(): string {
  const privateKey = requireEnv('AGNT_MEGAETH_PRIVATE_KEY')
  return new ethers.Wallet(privateKey).address
}

export async function estimateWarrenFee(size: number): Promise<WarrenFeeEstimate> {
  if (!Number.isFinite(size) || size <= 0) {
    throw new Error('size must be a positive number')
  }

  const apiUrl = requireEnv('WARREN_API_URL')
  const response = await fetch(`${apiUrl}/api/partner/estimate-fee`, {
    method: 'POST',
    headers: partnerHeaders(),
    body: JSON.stringify({ size }),
  })

  if (!response.ok) {
    const error = await getApiErrorMessage(response)
    throw new Error(`Failed to estimate Warren fee: ${error}`)
  }

  const data = (await response.json()) as Record<string, unknown>
  const relayerAddress = String(data.relayerAddress ?? '')

  if (!ethers.isAddress(relayerAddress)) {
    throw new Error('Warren estimate response returned an invalid relayer address')
  }

  return {
    totalWei: String(data.totalWei ?? ''),
    totalEth: String(data.totalEth ?? ''),
    relayerAddress,
    chunkCount: Number(data.chunkCount ?? 0),
    gasCostEth: String(data.gasCostEth ?? ''),
    feeEth: String(data.feeEth ?? ''),
  }
}

export async function payWarrenRelayer(totalWei: string, relayerAddress: string): Promise<WarrenPaymentResult> {
  if (!totalWei) {
    throw new Error('totalWei is required')
  }

  if (!ethers.isAddress(relayerAddress)) {
    throw new Error('relayerAddress must be a valid address')
  }

  const privateKey = requireEnv('AGNT_MEGAETH_PRIVATE_KEY')
  const provider = new ethers.JsonRpcProvider(MEGAETH_MAINNET_RPC_URL, {
    chainId: MEGAETH_MAINNET_CHAIN_ID,
    name: 'megaeth-mainnet',
  })
  const wallet = new ethers.Wallet(privateKey, provider)

  const tx = await wallet.sendTransaction({
    to: relayerAddress,
    value: BigInt(totalWei),
    chainId: MEGAETH_MAINNET_CHAIN_ID,
  })

  await tx.wait()

  return {
    txHash: tx.hash,
    amount: totalWei,
  }
}

export async function deployToWarren(
  html: string,
  paymentTxHash: string,
  senderAddress: string,
  options?: WarrenDeployOptions
): Promise<WarrenDeployResult> {
  if (!html?.trim()) {
    throw new Error('html is required')
  }

  if (!paymentTxHash) {
    throw new Error('paymentTxHash is required')
  }

  if (!ethers.isAddress(senderAddress)) {
    throw new Error('senderAddress must be a valid address')
  }

  const apiUrl = requireEnv('WARREN_API_URL')
  const body: Record<string, unknown> = {
    html,
    paymentTxHash,
    senderAddress,
  }

  if (options?.name) {
    body.name = options.name
  }

  if (options?.siteType) {
    body.siteType = options.siteType
  }

  const response = await fetch(`${apiUrl}/api/partner/deploy`, {
    method: 'POST',
    headers: partnerHeaders(),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await getApiErrorMessage(response)
    throw new Error(`Failed to deploy to Warren: ${error}`)
  }

  const data = (await response.json()) as Record<string, unknown>

  return {
    tokenId: String(data.tokenId ?? ''),
    url: String(data.url ?? ''),
    rootChunk: String(data.rootChunk ?? ''),
    depth: Number(data.depth ?? 0),
    size: Number(data.size ?? 0),
    gasUsed: Number(data.gasUsed ?? 0),
  }
}

export async function deployMediaToWarren(
  base64Data: string,
  paymentTxHash: string,
  senderAddress: string,
  options?: { name?: string; siteType?: string }
): Promise<WarrenDeployResult> {
  if (!base64Data) {
    throw new Error('base64Data is required')
  }

  if (!paymentTxHash) {
    throw new Error('paymentTxHash is required')
  }

  if (!ethers.isAddress(senderAddress)) {
    throw new Error('senderAddress must be a valid address')
  }

  const apiUrl = requireEnv('WARREN_API_URL')
  const body: Record<string, unknown> = {
    data: base64Data,
    paymentTxHash,
    senderAddress,
    siteType: options?.siteType || 'image',
  }

  if (options?.name) {
    body.name = options.name
  }

  const response = await fetch(`${apiUrl}/api/partner/deploy`, {
    method: 'POST',
    headers: partnerHeaders(),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await getApiErrorMessage(response)
    throw new Error(`Failed to deploy media to Warren: ${error}`)
  }

  const result = (await response.json()) as Record<string, unknown>

  return {
    tokenId: String(result.tokenId ?? ''),
    url: String(result.url ?? ''),
    rootChunk: String(result.rootChunk ?? ''),
    depth: Number(result.depth ?? 0),
    size: Number(result.size ?? 0),
    gasUsed: Number(result.gasUsed ?? 0),
  }
}

export async function deploySiteToWarren(
  content: string,
  paymentTxHash: string,
  senderAddress: string,
  ownerAddress: string,
  options?: WarrenDeploySiteOptions
): Promise<WarrenDeploySiteResult> {
  if (!content?.trim()) {
    throw new Error('content is required')
  }

  if (!paymentTxHash) {
    throw new Error('paymentTxHash is required')
  }

  if (!ethers.isAddress(senderAddress)) {
    throw new Error('senderAddress must be a valid address')
  }

  if (!ethers.isAddress(ownerAddress)) {
    throw new Error('ownerAddress must be a valid address')
  }

  const apiUrl = requireEnv('WARREN_API_URL')
  const body: Record<string, unknown> = {
    html: content,
    paymentTxHash,
    senderAddress,
    ownerAddress,
  }

  if (options?.name) {
    body.name = options.name
  }

  if (options?.siteType) {
    body.siteType = options.siteType
  }

  const response = await fetch(`${apiUrl}/api/partner/deploy-site`, {
    method: 'POST',
    headers: partnerHeaders(),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await getApiErrorMessage(response)
    throw new Error(`Failed to deploy site to Warren: ${error}`)
  }

  const result = (await response.json()) as Record<string, unknown>

  return {
    tokenId: String(result.tokenId ?? ''),
    url: String(result.url ?? ''),
    containerAddress: String(result.containerAddress ?? ''),
    ownerAddress: String(result.ownerAddress ?? ''),
    rootChunk: String(result.rootChunk ?? ''),
    depth: Number(result.depth ?? 0),
    size: Number(result.size ?? 0),
    gasUsed: Number(result.gasUsed ?? 0),
  }
}

export async function mintWarrenNFT(
  ownerAddress: string,
  sourceRegistry: string,
  sourceTokenId: number,
  title: string,
  paymentTxHash: string,
  senderAddress: string
): Promise<WarrenMintNFTResult> {
  if (!ethers.isAddress(ownerAddress)) {
    throw new Error('ownerAddress must be a valid address')
  }

  if (!ethers.isAddress(sourceRegistry)) {
    throw new Error('sourceRegistry must be a valid address')
  }

  if (!title?.trim()) {
    throw new Error('title is required')
  }

  if (!paymentTxHash) {
    throw new Error('paymentTxHash is required')
  }

  if (!ethers.isAddress(senderAddress)) {
    throw new Error('senderAddress must be a valid address')
  }

  const apiUrl = requireEnv('WARREN_API_URL')
  const body: Record<string, unknown> = {
    ownerAddress,
    sourceRegistry,
    sourceTokenId,
    title,
    paymentTxHash,
    senderAddress,
  }

  const response = await fetch(`${apiUrl}/api/partner/mint-nft`, {
    method: 'POST',
    headers: partnerHeaders(),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await getApiErrorMessage(response)
    throw new Error(`Failed to mint NFT on Warren: ${error}`)
  }

  const result = (await response.json()) as Record<string, unknown>

  return {
    tokenId: String(result.tokenId ?? ''),
    nftAddress: String(result.nftAddress ?? ''),
    ownerAddress: String(result.ownerAddress ?? ''),
    txHash: String(result.txHash ?? ''),
  }
}
