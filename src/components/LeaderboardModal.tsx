import React, { useState, useEffect } from 'react';
import { Trophy, X, RefreshCw, Smartphone, Monitor, Gamepad2, Shield } from 'lucide-react';
import { LeaderboardEntry } from '../types/game';
import { RANK_TIERS } from '../game/constants';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<'all' | 'pc' | 'console' | 'mobile'>('all');

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leaderboard');
      if (res.ok) {
        const data = await res.json();
        setEntries(data.leaderboard || []);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboard();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = entries.filter(e => {
    if (platformFilter === 'all') return true;
    return e.platform === platformFilter;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-amber-500/60 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-[0_0_30px_rgba(245,158,11,0.25)]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-pixel text-sm sm:text-base text-amber-400 crt-glow">GLOBAL LEADERBOARDS '95</h2>
              <p className="text-xs text-slate-400">Real-time worldwide competitive rankings & MMR tiers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filters & Refresh Toolbar */}
        <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-900/80 gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 font-mono mr-1">Platform:</span>
            <button
              onClick={() => setPlatformFilter('all')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
                platformFilter === 'all' ? 'bg-amber-500 text-black font-semibold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setPlatformFilter('pc')}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition cursor-pointer ${
                platformFilter === 'pc' ? 'bg-amber-500 text-black font-semibold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>PC</span>
            </button>
            <button
              onClick={() => setPlatformFilter('console')}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition cursor-pointer ${
                platformFilter === 'console' ? 'bg-amber-500 text-black font-semibold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>Console</span>
            </button>
            <button
              onClick={() => setPlatformFilter('mobile')}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition cursor-pointer ${
                platformFilter === 'mobile' ? 'bg-amber-500 text-black font-semibold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Touch</span>
            </button>
          </div>

          <button
            onClick={fetchLeaderboard}
            disabled={loading}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-slate-200 text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span>Sync Live</span>
          </button>
        </div>

        {/* Leaderboard Table */}
        <div className="flex-1 overflow-y-auto p-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                <th className="pb-2 pl-2">#</th>
                <th className="pb-2">OPERATIVE</th>
                <th className="pb-2">TIER</th>
                <th className="pb-2">SKILL (MMR)</th>
                <th className="pb-2">FLAGS CAPTURED</th>
                <th className="pb-2">W / L</th>
                <th className="pb-2 pr-2">WINRATE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((item) => {
                const isTop3 = item.rank <= 3;
                return (
                  <tr
                    key={item.rank}
                    className={`hover:bg-slate-800/40 transition font-mono ${
                      isTop3 ? 'bg-amber-500/5' : ''
                    }`}
                  >
                    <td className="py-2.5 pl-2">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded font-pixel text-[10px] ${
                          item.rank === 1
                            ? 'bg-amber-400 text-black font-bold'
                            : item.rank === 2
                            ? 'bg-slate-300 text-black'
                            : item.rank === 3
                            ? 'bg-amber-700 text-white'
                            : 'text-slate-400'
                        }`}
                      >
                        {item.rank}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{item.avatar || '🎖️'}</span>
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-100">{item.username}</span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            {item.platform === 'pc' && <Monitor className="w-3 h-3" />}
                            {item.platform === 'console' && <Gamepad2 className="w-3 h-3" />}
                            {item.platform === 'mobile' && <Smartphone className="w-3 h-3" />}
                            <span className="capitalize">{item.platform}</span>
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-pixel">
                        {item.rankTier}
                      </span>
                    </td>
                    <td className="py-2.5 font-semibold text-amber-400">
                      {item.mmr}
                    </td>
                    <td className="py-2.5 text-emerald-400 font-semibold">
                      🚩 {item.flagsCaptured}
                    </td>
                    <td className="py-2.5 text-slate-300">
                      <span className="text-emerald-400">{item.wins}W</span>
                      <span className="text-slate-500 mx-1">/</span>
                      <span className="text-rose-400">{item.losses}L</span>
                    </td>
                    <td className="py-2.5 pr-2 font-semibold text-slate-200">
                      {item.winRate}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-12 text-center text-slate-500 text-xs font-mono">
              No ranked operatives found in this bracket.
            </div>
          )}
        </div>

        {/* Rank Tiers Footer Guide */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 rounded-b-xl flex items-center justify-between text-[11px] overflow-x-auto gap-3">
          <div className="flex items-center gap-1 text-slate-400 font-mono shrink-0">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>Progression Tiers:</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {RANK_TIERS.map(t => (
              <span key={t.tier} className="text-slate-300">
                {t.badge} <span style={{ color: t.color }}>{t.tier}</span> ({t.minMMR}+)
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
