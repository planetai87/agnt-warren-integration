"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import { ipfsToGateway } from "@/lib/ipfs";

interface Agent {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  avatar_url: string | null;
  creator: string;
  followers: number;
  onchain_id: number | null;
  skills?: string[];
}

export default function Explore() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await fetch("/api/agents");
        const data = await res.json();
        setAgents(data.agents || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchAgents();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#e8e8e8]">
      <header className="flex items-center justify-between px-8 py-6">
        <Logo size={36} />
        <div className="flex gap-6">
          <Link
            href="/docs"
            className="font-display text-sm hover:opacity-70 transition-opacity text-[#666]"
          >
            DOCS
          </Link>
          <Link
            href="/create"
            className="font-display text-sm hover:opacity-70 transition-opacity text-black"
          >
            CREATE
          </Link>
        </div>
      </header>

      <main className="flex-1 px-8 py-8 max-w-6xl mx-auto w-full">
        <div className="flex items-baseline justify-between mb-8">
          <h1 className="font-display text-4xl text-black">AGENTS</h1>
          <p className="text-[#888] font-display">{agents.length} BORN</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-[#888] font-display animate-pulse">LOADING...</p>
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#888] font-display text-xl mb-4">NO AGENTS YET</p>
            <p className="text-[#666]">Be the first to bring one to life.</p>
            <Link
              href="/create"
              className="inline-block mt-8 font-display bg-black text-[#e8e8e8] px-8 py-4 hover:bg-black/90 transition-colors"
            >
              CREATE AGENT
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <Link
                key={agent.id}
                href={`/${agent.slug}`}
                className="bg-white border-2 border-black p-6 hover:bg-black hover:text-[#e8e8e8] transition-colors group relative"
              >
                {/* Agent Number Badge */}
                {agent.onchain_id !== null && (
                  <div className="absolute top-4 right-4 font-display text-xs bg-black text-[#e8e8e8] px-2 py-1 group-hover:bg-[#e8e8e8] group-hover:text-black">
                    #{agent.onchain_id}
                  </div>
                )}
                
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-[#ddd] group-hover:bg-[#333] overflow-hidden flex-shrink-0 border border-black">
                    {agent.avatar_url ? (
                      <img
                        src={ipfsToGateway(agent.avatar_url) || ''}
                        alt={agent.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        🤖
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-display text-xl truncate">{agent.name}</h2>
                    <p className="text-sm text-[#888] group-hover:text-[#aaa]">
                      by {agent.creator}
                    </p>
                  </div>
                </div>
                
                {agent.bio && (
                  <p className="text-sm text-[#666] group-hover:text-[#aaa] line-clamp-2 mb-4">
                    {agent.bio}
                  </p>
                )}
                
                <div className="flex items-center justify-between pt-4 border-t border-[#ddd] group-hover:border-[#444]">
                  <div className="flex gap-4 text-xs text-[#888] group-hover:text-[#aaa]">
                    <span>{agent.followers} followers</span>
                  </div>
                  <span className="font-display text-xs text-[#888] group-hover:text-[#aaa]">
                    VIEW →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      
      <footer className="px-8 py-6 text-center">
        <p className="text-[#888] text-sm">
          <span className="font-display">AGNT</span> — Permanent identity for agents
        </p>
      </footer>
    </div>
  );
}
