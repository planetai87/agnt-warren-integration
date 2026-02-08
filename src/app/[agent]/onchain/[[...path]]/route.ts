import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { supabaseAdmin } from "@/lib/supabase";
import { loadFractalTree, getMimeType, findDefaultFile } from "@/lib/fractal-loader";
import WarrenContainerArtifact from "../../../../../public/WarrenContainer.json";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const MEGAETH_RPC_URL = process.env.MEGAETH_RPC_URL || "https://mainnet.megaeth.com/rpc";
const WARREN_CONTAINER_ADDRESS =
  process.env.WARREN_CONTAINER_ADDRESS || "0xF70B6082d0309E93Cc4C83eeA562Fa1E985Ea21f";

type RouteParams = {
  agent: string;
  path?: string[];
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { agent: slug, path } = await params;

    const { data: agentData, error: agentError } = await supabaseAdmin
      .from("agents")
      .select("warren_token_id")
      .eq("slug", slug)
      .single();

    if (agentError || !agentData?.warren_token_id) {
      return NextResponse.json(
        { error: "No on-chain page deployed" },
        { status: 404 }
      );
    }

    const provider = new ethers.JsonRpcProvider(MEGAETH_RPC_URL);
    const contract = new ethers.Contract(
      WARREN_CONTAINER_ADDRESS,
      WarrenContainerArtifact.abi,
      provider
    );

    const tokenId = agentData.warren_token_id;
    const tokenIdBigInt = BigInt(tokenId);

    const siteData = await contract.getSiteData(tokenIdBigInt);
    const siteType = Number(siteData.siteType);

    let filePath: string;
    let pathHash: string;

    if (!path || path.length === 0) {
      const defaultFile = await findDefaultFile(contract, Number(tokenId), siteType);
      if (!defaultFile) {
        return NextResponse.json({ error: "No default file found" }, { status: 404 });
      }

      filePath = defaultFile.path;
      pathHash = defaultFile.pathHash;
    } else {
      filePath = `/${path.join("/")}`;
      pathHash = ethers.keccak256(ethers.toUtf8Bytes(filePath));
    }

    let file = await contract.getFile(tokenIdBigInt, pathHash);

    if (file.chunk === ZERO_ADDRESS) {
      const fallbackPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
      const fallbackHash = ethers.keccak256(ethers.toUtf8Bytes(fallbackPath));
      const fallbackFile = await contract.getFile(tokenIdBigInt, fallbackHash);

      if (fallbackFile.chunk === ZERO_ADDRESS) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }

      file = fallbackFile;
      filePath = fallbackPath;
    }

    const contentBytes = await loadFractalTree(provider, file.chunk, Number(file.depth));
    const mimeType = getMimeType(filePath);

    let responseBody = contentBytes;

    if (mimeType === "text/html") {
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      const baseHref = `/${slug}/onchain/`;
      const baseTag = `<base href="${baseHref}">`;
      let html = decoder.decode(contentBytes);

      if (/<head[^>]*>/i.test(html)) {
        html = html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
      } else {
        html = `${baseTag}${html}`;
      }

      responseBody = encoder.encode(html);
    }

    const responseBuffer = new Uint8Array(responseBody).buffer;

    return new Response(responseBuffer, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Warren-Container": WARREN_CONTAINER_ADDRESS,
        "X-Warren-File": filePath,
      },
    });
  } catch (error) {
    console.error("[onchain-gateway] Failed to load on-chain file:", error);
    return NextResponse.json({ error: "Failed to load on-chain page" }, { status: 500 });
  }
}
