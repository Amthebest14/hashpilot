import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { getLeaderboard, getUserProfile, type UserProfile } from '../services/hpService';
import { getRankFromHP, getRankProgress, getNextRankThreshold } from '../utils/ranks';

export default function LeaderboardPage() {
  const { address, isConnected } = useAccount();
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <div className="h-full w-full max-w-5xl mx-auto px-6 pt-10 pb-20 overflow-y-auto no-scrollbar">
      <div className="flex flex-col gap-10">
        {/* Header Section */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-soft-purple">Network Merit</span>
          <h2 className="text-4xl font-black italic tracking-tighter">PILOT LEADERBOARD</h2>
        </div>

        {/* Personal Stat Card */}
        {isConnected && (
          <div className="glass-panel p-8 rounded-3xl border border-white/10 relative overflow-hidden purple-glow">
            <div className="absolute top-0 right-0 p-6 opacity-5">
              <h1 className="text-9xl font-black italic tracking-tighter -mr-10 -mt-10">RANK</h1>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 relative z-10">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Active Pilot</span>
                <span className="text-xl font-bold truncate font-mono">{address ? truncateAddress(address) : '---'}</span>
              </div>
              
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Hash Points (HP)</span>
                <span className="text-3xl font-black text-soft-purple">{userProfile?.hp_balance || 0}</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Dynamic Rank</span>
                <span className="text-xl font-bold italic tracking-tight">{getRankFromHP(userProfile?.hp_balance || 0)}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-8">
              <div className="flex justify-between items-end mb-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Progression to {getNextRankThreshold(userProfile?.hp_balance || 0) || 'Max Rank'}</span>
                <span className="text-[10px] font-black text-soft-purple">{getRankProgress(userProfile?.hp_balance || 0)}%</span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-soft-purple transition-all duration-1000 ease-out"
                  style={{ width: `${getRankProgress(userProfile?.hp_balance || 0)}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Global Rankings Table */}
        <div className="flex flex-col gap-4">
          <div className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Top 50 Pilots</div>
          
          <div className="glass-panel rounded-3xl overflow-hidden border border-white/5">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/5 font-black text-[9px] uppercase tracking-[0.2em] text-white/40">
                  <th className="px-8 py-4">#</th>
                  <th className="px-8 py-4">Wallet</th>
                  <th className="px-8 py-4">Rank</th>
                  <th className="px-8 py-4 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center text-[10px] font-black uppercase tracking-widest text-white/20 animate-pulse">Synchronizing Records...</td>
                  </tr>
                ) : leaderboard.length > 0 ? (
                  leaderboard.map((user, index) => (
                    <tr key={user.wallet_address} className={`hover:bg-white/5 transition-colors ${user.wallet_address === address ? 'bg-soft-purple/10' : ''}`}>
                      <td className="px-8 py-5 font-black text-soft-purple/60 italic">#{index + 1}</td>
                      <td className="px-8 py-5 font-mono text-sm">{truncateAddress(user.wallet_address)}</td>
                      <td className="px-8 py-5 font-bold text-xs italic tracking-tighter text-white/60">{getRankFromHP(user.hp_balance)}</td>
                      <td className="px-8 py-5 text-right font-black text-white">{user.hp_balance} HP</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center text-xs text-white/20">No data found in network registry.</td>
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
