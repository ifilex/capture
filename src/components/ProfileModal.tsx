import React, { useState } from 'react';
import { User, X, Cloud, Copy, Check, Shield, Award, RefreshCw, Smartphone, Monitor, Gamepad2 } from 'lucide-react';
import { PlayerProfile } from '../types/game';
import { getRankInfo, RANK_TIERS } from '../game/constants';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PlayerProfile;
  onUpdateProfile: (updated: PlayerProfile) => void;
  onCloudSync: () => Promise<void>;
  onRestoreFromSyncCode: (code: string) => Promise<boolean>;
}

const AVATAR_OPTIONS = ['🎖️', '⚡', '👑', '🔥', '💀', '🛡️', '🦅', '🚀', '🎯', '🐱'];
const COLOR_OPTIONS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ec4899', '#06b6d4', '#e2e8f0'];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdateProfile,
  onCloudSync,
  onRestoreFromSyncCode,
}) => {
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [restoreCode, setRestoreCode] = useState('');
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentRankInfo = getRankInfo(profile.mmr);
  const nextRankIndex = RANK_TIERS.findIndex(r => r.tier === currentRankInfo.tier) + 1;
  const nextRankInfo = RANK_TIERS[nextRankIndex];

  let progressPercent = 100;
  if (nextRankInfo) {
    const range = nextRankInfo.minMMR - currentRankInfo.minMMR;
    const progress = profile.mmr - currentRankInfo.minMMR;
    progressPercent = Math.min(100, Math.max(0, Math.round((progress / range) * 100)));
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(profile.syncCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSyncCloud = async () => {
    setSyncing(true);
    await onCloudSync();
    setSyncing(false);
  };

  const handleRestore = async () => {
    if (!restoreCode.trim()) return;
    setSyncing(true);
    const success = await onRestoreFromSyncCode(restoreCode.trim());
    setSyncing(false);
    if (success) {
      setRestoreStatus('Progress synced successfully!');
      setRestoreCode('');
    } else {
      setRestoreStatus('Sync code not found or invalid.');
    }
  };

  const winRate = profile.matchesPlayed > 0 ? Math.round((profile.wins / profile.matchesPlayed) * 100) : 0;
  const kdRatio = profile.deaths > 0 ? (profile.tags / profile.deaths).toFixed(2) : profile.tags.toFixed(2);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-sky-500/60 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-[0_0_30px_rgba(14,165,233,0.25)]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-pixel text-sm sm:text-base text-sky-400 crt-glow">OPERATIVE PROFILE '95</h2>
              <p className="text-xs text-slate-400">Career telemetry, cross-progression & cloud continuity</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* Main ID & Rank Card */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-xl border-2 flex items-center justify-center text-3xl shadow-lg relative"
                style={{ borderColor: profile.equippedColor, backgroundColor: `${profile.equippedColor}15` }}
              >
                <span>{profile.avatar}</span>
                <span className="absolute -bottom-1.5 -right-1.5 text-sm">{currentRankInfo.badge}</span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={profile.username}
                    onChange={e => onUpdateProfile({ ...profile, username: e.target.value.slice(0, 16) })}
                    className="font-pixel text-sm text-slate-100 bg-transparent border-b border-slate-700 hover:border-sky-400 focus:outline-hidden"
                  />
                  <span className="text-slate-400 text-xs font-mono">
                    ({profile.platform === 'pc' ? 'PC 🖥️' : profile.platform === 'console' ? 'Console 🎮' : 'Touch 📱'})
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-pixel text-xs" style={{ color: currentRankInfo.color }}>
                    {currentRankInfo.tier.toUpperCase()}
                  </span>
                  <span className="text-slate-400 text-xs font-mono">• {profile.mmr} MMR</span>
                </div>
              </div>
            </div>

            {/* Rank progress */}
            <div className="w-full sm:w-48 flex flex-col gap-1">
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>{currentRankInfo.tier}</span>
                <span>{nextRankInfo ? nextRankInfo.tier : 'Max Rank'}</span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-amber-400 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 text-right font-mono">
                {nextRankInfo ? `${profile.mmr} / ${nextRankInfo.minMMR} MMR` : 'LEGENDARY'}
              </span>
            </div>
          </div>

          {/* Cloud Save & Cross-Progression Box */}
          <div className="bg-sky-950/20 border border-sky-500/30 rounded-lg p-3.5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sky-400 font-pixel text-xs">
                <Cloud className="w-4 h-4" />
                <span>CROSS-PROGRESSION CLOUD SYNC</span>
              </div>
              <button
                onClick={handleSyncCloud}
                disabled={syncing}
                className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span>Cloud Sync Now</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* My Sync Code */}
              <div className="bg-slate-900/90 border border-slate-800 rounded p-2.5 flex flex-col gap-1.5">
                <span className="text-slate-400 text-[11px] font-mono">Your Cloud Sync Key:</span>
                <div className="flex items-center justify-between bg-slate-950 px-2.5 py-1.5 rounded border border-slate-700 font-mono text-emerald-400 font-semibold">
                  <span>{profile.syncCode}</span>
                  <button
                    onClick={handleCopyCode}
                    className="text-slate-400 hover:text-white transition cursor-pointer"
                    title="Copy Key"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-500">
                  Enter this code on your phone, console, or laptop to sync rank and stats seamlessly.
                </span>
              </div>

              {/* Restore code from other device */}
              <div className="bg-slate-900/90 border border-slate-800 rounded p-2.5 flex flex-col gap-1.5">
                <span className="text-slate-400 text-[11px] font-mono">Load from Another Platform:</span>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="e.g. CTF-7X89-KL42"
                    value={restoreCode}
                    onChange={e => setRestoreCode(e.target.value.toUpperCase())}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-xs focus:outline-hidden"
                  />
                  <button
                    onClick={handleRestore}
                    disabled={syncing || !restoreCode}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-slate-200 text-xs font-medium cursor-pointer"
                  >
                    Load
                  </button>
                </div>
                {restoreStatus && (
                  <span className="text-[10px] text-amber-400 font-mono">{restoreStatus}</span>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Statistics Grid */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5">
            <span className="font-pixel text-xs text-slate-300 block mb-3">CAREER TELEMETRY</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              <div className="bg-slate-900/90 p-2.5 rounded border border-slate-800">
                <span className="text-xs text-slate-400 block font-mono">Total Matches</span>
                <span className="font-pixel text-base text-slate-100 mt-1 block">{profile.matchesPlayed}</span>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded border border-slate-800">
                <span className="text-xs text-slate-400 block font-mono">Winrate</span>
                <span className="font-pixel text-base text-emerald-400 mt-1 block">{winRate}%</span>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded border border-slate-800">
                <span className="text-xs text-slate-400 block font-mono">Flags Captured</span>
                <span className="font-pixel text-base text-amber-400 mt-1 block">🚩 {profile.flagsCaptured}</span>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded border border-slate-800">
                <span className="text-xs text-slate-400 block font-mono">Flags Returned</span>
                <span className="font-pixel text-base text-sky-400 mt-1 block">🛡️ {profile.flagsReturned}</span>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded border border-slate-800">
                <span className="text-xs text-slate-400 block font-mono">Tags / Frags</span>
                <span className="font-pixel text-base text-rose-400 mt-1 block">{profile.tags}</span>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded border border-slate-800">
                <span className="text-xs text-slate-400 block font-mono">Deaths</span>
                <span className="font-pixel text-base text-slate-300 mt-1 block">{profile.deaths}</span>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded border border-slate-800">
                <span className="text-xs text-slate-400 block font-mono">K / D Ratio</span>
                <span className="font-pixel text-base text-yellow-300 mt-1 block">{kdRatio}</span>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded border border-slate-800">
                <span className="text-xs text-slate-400 block font-mono">Accuracy</span>
                <span className="font-pixel text-base text-purple-400 mt-1 block">{profile.accuracy}%</span>
              </div>
            </div>
          </div>

          {/* Customization (Avatar & Color) */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 flex flex-col gap-3">
            <span className="font-pixel text-xs text-slate-300">CUSTOMIZE OPERATIVE</span>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <span className="text-slate-400 text-xs font-mono block mb-1.5">Avatar Emblem:</span>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_OPTIONS.map(av => (
                    <button
                      key={av}
                      onClick={() => onUpdateProfile({ ...profile, avatar: av })}
                      className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center border transition cursor-pointer ${
                        profile.avatar === av
                          ? 'border-sky-400 bg-sky-500/20 scale-105'
                          : 'border-slate-800 bg-slate-900 hover:bg-slate-800'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1">
                <span className="text-slate-400 text-xs font-mono block mb-1.5">Suit Color Accents:</span>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map(c => (
                    <button
                      key={c}
                      onClick={() => onUpdateProfile({ ...profile, equippedColor: c })}
                      className={`w-9 h-9 rounded-lg border-2 transition cursor-pointer ${
                        profile.equippedColor === c ? 'scale-110 border-white' : 'border-transparent opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
