import { useState, useEffect, useCallback, useRef } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { LobbyBrowser } from './components/LobbyBrowser';
import { MapEditor } from './components/MapEditor';
import { LeaderboardModal } from './components/LeaderboardModal';
import { ProfileModal } from './components/ProfileModal';
import { GameMode, MapData, Platform, PlayerProfile } from './types/game';
import { getRankInfo } from './game/constants';
import { MAP_CLASSIC_1995 } from './game/mapData';

function generateRandomSyncCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'CTF-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  result += '-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const DEFAULT_PROFILE: PlayerProfile = {
  id: `usr-${Date.now().toString().slice(-6)}`,
  username: 'Operative95',
  syncCode: generateRandomSyncCode(),
  mmr: 1250,
  rankTier: 'Sergeant',
  matchesPlayed: 14,
  wins: 9,
  losses: 5,
  flagsCaptured: 18,
  flagsReturned: 12,
  tags: 46,
  deaths: 22,
  accuracy: 72,
  platform: 'pc',
  avatar: '🎖️',
  equippedColor: '#ef4444',
  savedMaps: [],
  lastSynced: new Date().toISOString(),
};

export default function App() {
  const [view, setView] = useState<'lobby' | 'game' | 'editor'>('lobby');
  const [showLeaderboards, setShowLeaderboards] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Active game session configuration
  const [matchConfig, setMatchConfig] = useState<{
    roomId: string;
    mode: GameMode;
    map: MapData;
    botDifficulty?: 'recruit' | 'veteran' | 'nightmare';
  } | null>(null);

  // Platform auto-detection
  const [currentPlatform, setCurrentPlatform] = useState<Platform>('pc');

  // Player profile & cloud progression
  const [profile, setProfile] = useState<PlayerProfile>(() => {
    try {
      const saved = localStorage.getItem('ctf95_profile');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_PROFILE;
  });

  // Custom maps library created in editor
  const [customMaps, setCustomMaps] = useState<MapData[]>(() => {
    try {
      const saved = localStorage.getItem('ctf95_custom_maps');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Hardware detection for cross-play
  useEffect(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch) {
      setCurrentPlatform('mobile');
      setProfile(p => ({ ...p, platform: 'mobile' }));
    }

    const checkGamepad = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      if (gamepads[0] || gamepads[1]) {
        setCurrentPlatform('console');
        setProfile(p => ({ ...p, platform: 'console' }));
      }
    };
    window.addEventListener('gamepadconnected', checkGamepad);
    return () => window.removeEventListener('gamepadconnected', checkGamepad);
  }, []);

  // Keep profile ref to prevent infinite callback recreation
  const profileRef = useRef(profile);
  profileRef.current = profile;

  // Save profile to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('ctf95_profile', JSON.stringify(profile));
    } catch {}
  }, [profile]);

  // Cloud Save API Call
  const handleCloudSync = useCallback(async () => {
    try {
      const res = await fetch('/api/profile/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileRef.current),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(p => (p.lastSynced === data.lastSynced ? p : { ...p, lastSynced: data.lastSynced }));
      }
    } catch {
      // Cloud sync failed, will retry next session
    }
  }, []);

  // Initial cloud sync on startup
  useEffect(() => {
    handleCloudSync();
  }, [handleCloudSync]);

  // Restore Profile from Sync Code
  const handleRestoreFromSyncCode = async (syncCode: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/profile/load?syncCode=${encodeURIComponent(syncCode)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setProfile(data.profile);
          return true;
        }
      }
    } catch {}
    return false;
  };

  // Join match handler
  const handleJoinMatch = useCallback((
    roomId: string,
    mode: GameMode,
    map: MapData,
    botDifficulty?: 'recruit' | 'veteran' | 'nightmare'
  ) => {
    setMatchConfig({ roomId, mode, map, botDifficulty });
    setView('game');
  }, []);

  // Match finished handler
  const handleMatchEnd = useCallback((
    won: boolean,
    stats: { captures: number; returns: number; tags: number; deaths: number }
  ) => {
    setProfile(prev => {
      const mmrChange = won ? 25 : -18;
      const newMMR = Math.max(100, prev.mmr + mmrChange);
      const newRankInfo = getRankInfo(newMMR);

      const updated: PlayerProfile = {
        ...prev,
        mmr: newMMR,
        rankTier: newRankInfo.tier,
        matchesPlayed: prev.matchesPlayed + 1,
        wins: won ? prev.wins + 1 : prev.wins,
        losses: won ? prev.losses : prev.losses + 1,
        flagsCaptured: prev.flagsCaptured + stats.captures,
        flagsReturned: prev.flagsReturned + stats.returns,
        tags: prev.tags + stats.tags,
        deaths: prev.deaths + stats.deaths,
      };

      // Background cloud sync
      fetch('/api/profile/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      }).catch(() => {});

      return updated;
    });

    setView('lobby');
    setMatchConfig(null);
  }, []);

  // Play custom map created in editor
  const handlePlayCustomMap = (map: MapData) => {
    // Save to local custom maps
    setCustomMaps(prev => {
      const filtered = prev.filter(m => m.id !== map.id);
      const next = [map, ...filtered];
      try {
        localStorage.setItem('ctf95_custom_maps', JSON.stringify(next));
      } catch {}
      return next;
    });

    setMatchConfig({
      roomId: `custom-${Date.now().toString().slice(-4)}`,
      mode: 'custom',
      map,
    });
    setView('game');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      {/* Background Retro Grid Pattern */}
      <div
        className="fixed inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-2 sm:p-4">
        {view === 'lobby' && (
          <LobbyBrowser
            currentPlatform={currentPlatform}
            playerRank={profile.rankTier}
            playerMMR={profile.mmr}
            onJoinMatch={handleJoinMatch}
            onOpenMapEditor={() => setView('editor')}
            onOpenLeaderboards={() => setShowLeaderboards(true)}
            onOpenProfile={() => setShowProfile(true)}
            customMaps={customMaps}
          />
        )}

        {view === 'editor' && (
          <MapEditor
            onBackToMenu={() => setView('lobby')}
            onPlayCustomMap={handlePlayCustomMap}
          />
        )}

        {view === 'game' && matchConfig && (
          <GameCanvas
            roomId={matchConfig.roomId}
            mode={matchConfig.mode}
            map={matchConfig.map || MAP_CLASSIC_1995}
            playerName={profile.username}
            playerRank={profile.rankTier}
            playerMMR={profile.mmr}
            currentPlatform={currentPlatform}
            botDifficulty={matchConfig.botDifficulty}
            onMatchEnd={handleMatchEnd}
            onLeaveMatch={() => {
              setView('lobby');
              setMatchConfig(null);
            }}
          />
        )}
      </main>

      {/* Global Real-Time Leaderboards Modal */}
      <LeaderboardModal
        isOpen={showLeaderboards}
        onClose={() => setShowLeaderboards(false)}
      />

      {/* Player Career Profile & Cross-Progression Cloud Sync Modal */}
      <ProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        profile={profile}
        onUpdateProfile={setProfile}
        onCloudSync={handleCloudSync}
        onRestoreFromSyncCode={handleRestoreFromSyncCode}
      />
    </div>
  );
}
