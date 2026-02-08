/**
 * Convert IPFS URI to gateway URL
 */
export function ipfsToGateway(uri: string | null): string | null {
  if (!uri) return null;
  
  if (uri.startsWith('ipfs://')) {
    return uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
  }
  
  // Already a URL or relative path
  return uri;
}

/**
 * Convert gateway URL back to IPFS URI
 */
export function gatewayToIpfs(url: string | null): string | null {
  if (!url) return null;
  
  if (url.includes('/ipfs/')) {
    const cid = url.split('/ipfs/')[1];
    return `ipfs://${cid}`;
  }
  
  return url;
}
