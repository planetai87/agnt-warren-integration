/**
 * Fractal Tree Loader Utilities
 * Ported from Warren's admin-panel/lib/fractal-loader.ts
 * Reads data from WarrenContainer's fractal tree structure on MegaETH
 */

import { ethers } from "ethers";

// Page ABI for reading chunk data
export const PAGE_ABI = [
  {
    name: 'read',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'bytes', internalType: 'bytes' }],
    stateMutability: 'view',
  },
];

// MIME type mapping
export const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
};

export function getMimeType(path: string): string {
  const ext = path.substring(path.lastIndexOf('.')).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

export async function readPageData(
  provider: ethers.JsonRpcProvider,
  address: string
): Promise<Uint8Array> {
  const pageContract = new ethers.Contract(address, PAGE_ABI, provider);
  const data = await pageContract.read();
  return ethers.getBytes(data);
}

export async function loadFractalTree(
  provider: ethers.JsonRpcProvider,
  rootChunk: string,
  depth: number
): Promise<Uint8Array> {
  if (depth === 0) {
    return await readPageData(provider, rootChunk);
  }

  const nodeData = await readPageData(provider, rootChunk);

  const addresses: string[] = [];
  for (let i = 0; i < nodeData.length; i += 20) {
    if (i + 20 <= nodeData.length) {
      const addrBytes = nodeData.slice(i, i + 20);
      addresses.push(ethers.hexlify(addrBytes));
    }
  }

  const chunks: Uint8Array[] = [];
  for (const addr of addresses) {
    const childData = await loadFractalTree(provider, addr, depth - 1);
    chunks.push(childData);
  }

  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

export const SITE_TYPE = {
  SITE_CONTAINER: 1,
  NFT_CONTAINER: 2,
  UNLINKED: 99,
} as const;

export const DEFAULT_FILES: Record<number, string> = {
  [SITE_TYPE.SITE_CONTAINER]: '/index.html',
  [SITE_TYPE.NFT_CONTAINER]: '/collection.json',
};

export async function findDefaultFile(
  contract: ethers.Contract,
  tokenId: number,
  siteType?: number
): Promise<{ path: string; pathHash: string } | null> {
  try {
    const pathHashes: string[] = await contract.getFilePaths(tokenId);

    if (pathHashes.length === 0) {
      return null;
    }

    if (siteType === SITE_TYPE.NFT_CONTAINER) {
      let firstJson: { path: string; pathHash: string } | null = null;

      for (const pathHash of pathHashes) {
        const path: string = await contract.getPathString(pathHash);
        const normalizedPath = path.startsWith('/') ? path : '/' + path;

        if (normalizedPath === '/collection.json') {
          return { path: normalizedPath, pathHash };
        }

        if (normalizedPath === '/1.json' && !firstJson) {
          firstJson = { path: normalizedPath, pathHash };
        }

        if (!firstJson && path.endsWith('.json')) {
          firstJson = { path: normalizedPath, pathHash };
        }
      }

      return firstJson;
    }

    let firstHtml: { path: string; pathHash: string } | null = null;

    for (const pathHash of pathHashes) {
      const path: string = await contract.getPathString(pathHash);
      const normalizedPath = path.startsWith('/') ? path : '/' + path;

      if (normalizedPath === '/index.html') {
        return { path: normalizedPath, pathHash };
      }

      if (!firstHtml && (path.endsWith('.html') || path.endsWith('.htm'))) {
        firstHtml = { path: normalizedPath, pathHash };
      }
    }

    return firstHtml;
  } catch (error) {
    console.error('[fractal-loader] Error finding default file:', error);
    return null;
  }
}
