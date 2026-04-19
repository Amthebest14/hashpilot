import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { getLeaderboard, getUserProfile, type UserProfile } from '../services/hpService';
import { getRankFromHP, getRankProgress, getNextRankThreshold } from '../utils/ranks';
import { useHederaId } from '../hooks/useHederaId';

import { Share2 } from 'lucide-react';

export default function LeaderboardPage() {
  const { address, isConnected } = useAccount();
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const activeHederaId = useHederaId(address || undefined);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const [lbData, profileData] = await Promise.all([
        getLeaderboard(),
        isConnected && address ? getUserProfile(address) : Promise.resolve(null)
      ]);
      setLeaderboard(lbData);
      setUserProfile(profileData);
      setIsLoading(false);
    }
    loadData();
  }, [address, isConnected]);

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const displayId = (user: UserProfile) => user.hedera_id || truncateAddress(user.wallet_address);

  const handleShare = () => {
    const rank = getRankFromHP(userProfile?.hp_balance || 0);
    const text = `Just hit ${rank} rank on @HashpilotAi. My AI is trading on Hedera while you sleep. 🚀 Earn Hash Points with me: hashpilot.vercel.app`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="h-full w-full max-w-5xl mx-auto px-6 pt-10 pb-20 overflow-y-auto no-scrollbar">
      <div className="flex flex-col gap-10">
        {/* Header Section */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-medium tracking-wide text-[#5C54E6]">Network Merit</span>
          <h2 className="text-4xl font-bold tracking-wide capitalize">Pilot Leaderboard</h2>
        </div>

        {/* Personal Stat Card */}
        {isConnected && (
          <div className="bg-[#12141C] p-8 rounded-2xl border border-[#222631] relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 p-6 opacity-5">
              <h1 className="text-9xl font-bold italic tracking-tighter -mr-10 -mt-10">RANK</h1>
            </div>

            <div className="absolute top-6 right-6 z-20">
              <button 
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-[#5C54E6] text-white rounded-xl text-[11px] font-medium tracking-wide hover:bg-[#6F68F4] active:scale-95 transition-all shadow-sm"
              >
                <Share2 size={14} />
                Share Rank
              </button>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 relative z-10">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-medium tracking-wide text-[#8B95A5]">Active Pilot</span>
                <span className="text-xl font-medium tracking-wide truncate font-mono text-[#E2E8F0]">{activeHederaId || (address ? truncateAddress(address) : '---')}</span>
              </div>
              
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-medium tracking-wide text-[#8B95A5]">Hash Points (HP)</span>
                <span className="text-3xl font-bold text-[#5C54E6]">{userProfile?.hp_balance || 0}</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-medium tracking-wide text-[#8B95A5]">Dynamic Rank</span>
                <span className="text-xl font-bold tracking-wide text-[#E2E8F0]">{getRankFromHP(userProfile?.hp_balance || 0)}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-8">
              <div className="flex justify-between items-end mb-2">
                <span className="text-[11px] font-medium tracking-wide text-[#8B95A5]">Progression to {getNextRankThreshold(userProfile?.hp_balance || 0) || 'Max Rank'}</span>
                <span className="text-[11px] font-medium text-[#5C54E6]">{getRankProgress(userProfile?.hp_balance || 0)}%</span>
              </div>
              <div className="h-2 w-full bg-[#1A1D27] rounded-full overflow-hidden border border-[#222631]">
                <div 
                  className="h-full bg-[#5C54E6] transition-all duration-1000 ease-out"
                  style={{ width: `${getRankProgress(userProfile?.hp_balance || 0)}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Global Rankings Table */}
        <div className="flex flex-col gap-4">
          <div className="text-[11px] font-medium tracking-wide text-[#8B95A5] ml-2">Top 50 Pilots</div>
          
          <div className="bg-[#12141C] rounded-2xl overflow-hidden border border-[#222631]">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#222631] bg-[#1A1D27] font-medium text-[11px] tracking-wide text-[#8B95A5]">
                  <th className="px-8 py-4">#</th>
                  <th className="px-8 py-4">Pilot ID</th>
                  <th className="px-8 py-4">Rank</th>
                  <th className="px-8 py-4 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222631]">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center text-[11px] font-medium tracking-wide text-[#8B95A5] animate-pulse">Synchronizing Records...</td>
                  </tr>
                ) : leaderboard.length > 0 ? (
                  leaderboard.map((user, index) => (
                    <tr key={user.wallet_address} className={`hover:bg-[#1A1D27] transition-colors ${user.wallet_address === address ? 'bg-[#5C54E6]/10' : ''}`}>
                      <td className="px-8 py-5 font-bold text-[#5C54E6]/60">#{index + 1}</td>
                      <td className="px-8 py-5 font-mono text-sm text-[#E2E8F0]">{displayId(user)}</td>
                      <td className="px-8 py-5 font-bold text-xs tracking-wide text-[#8B95A5]">{getRankFromHP(user.hp_balance)}</td>
                      <td className="px-8 py-5 text-right font-medium text-[#E2E8F0]">{user.hp_balance} HP</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center text-xs text-[#8B95A5]">No data found in network registry.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
