import React, { useState } from 'react';
import { Mic, MicOff, Radio, Volume2, ShieldAlert, Flag, HelpCircle, Eye } from 'lucide-react';
import { TacticalRadioBark } from '../types/game';

interface VoiceChatBarProps {
  micPermission: 'prompt' | 'granted' | 'denied';
  onRequestMic: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isPushToTalkActive: boolean;
  onStartPushToTalk: () => void;
  onStopPushToTalk: () => void;
  voiceVolume: number;
  recentBarks: TacticalRadioBark[];
  onSendRadioBark: (text: string) => void;
  voiceSpeakers: string[];
}

export const VoiceChatBar: React.FC<VoiceChatBarProps> = ({
  micPermission,
  onRequestMic,
  isMuted,
  onToggleMute,
  isPushToTalkActive,
  onStartPushToTalk,
  onStopPushToTalk,
  voiceVolume,
  recentBarks,
  onSendRadioBark,
  voiceSpeakers,
}) => {
  const [showQuickBarks, setShowQuickBarks] = useState(false);

  const quickCallouts = [
    { label: 'I have the flag!', icon: Flag, text: 'I have the enemy flag! Cover me!' },
    { label: 'Defend our base!', icon: ShieldAlert, text: 'Defend our base and protect the flag!' },
    { label: 'Need backup!', icon: HelpCircle, text: 'Under heavy fire, need tactical backup!' },
    { label: 'Enemy spotted!', icon: Eye, text: 'Enemy infiltrator spotted in the bushes!' },
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-700/80 rounded-lg p-2.5 backdrop-blur-sm text-xs flex flex-col gap-2 shadow-lg">
      {/* Voice Controls Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-950/80 border border-emerald-500/50 rounded text-emerald-400 font-medium">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span className="font-pixel text-[10px]">TEAM RADIO '95</span>
          </div>

          {/* Mic permission or mute toggle */}
          {micPermission !== 'granted' ? (
            <button
              onClick={onRequestMic}
              className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Enable Mic</span>
            </button>
          ) : (
            <button
              onClick={onToggleMute}
              className={`px-2 py-1 rounded font-medium flex items-center gap-1.5 transition cursor-pointer ${
                isMuted
                  ? 'bg-rose-900/60 border border-rose-600 text-rose-300'
                  : 'bg-slate-800 border border-slate-600 text-slate-200'
              }`}
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{isMuted ? 'Muted' : 'Mic Active'}</span>
            </button>
          )}

          {/* Push to talk button (Mouse / Touch) */}
          <button
            onMouseDown={onStartPushToTalk}
            onMouseUp={onStopPushToTalk}
            onTouchStart={(e) => { e.preventDefault(); onStartPushToTalk(); }}
            onTouchEnd={(e) => { e.preventDefault(); onStopPushToTalk(); }}
            className={`px-3 py-1 rounded font-pixel text-[9px] uppercase tracking-wider transition select-none cursor-pointer ${
              isPushToTalkActive
                ? 'bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.8)]'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600'
            }`}
          >
            {isPushToTalkActive ? 'TRANSMITTING...' : 'HOLD [V] TO TALK'}
          </button>
        </div>

        {/* Volume VU meter & Active Speakers */}
        <div className="flex items-center gap-2">
          {voiceSpeakers.length > 0 && (
            <div className="flex items-center gap-1 text-emerald-400 font-mono text-[11px] bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-700/50">
              <Volume2 className="w-3.5 h-3.5 animate-bounce" />
              <span>Speaking: {voiceSpeakers.join(', ')}</span>
            </div>
          )}

          {/* Live VU meter */}
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-800">
            <span className="text-[10px] text-slate-400">VU</span>
            <div className="flex gap-0.5 h-3.5 w-16 bg-slate-900 p-0.5 rounded items-end">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-xs transition-all ${
                    (voiceVolume / 10) > i
                      ? i < 6
                        ? 'bg-emerald-400 h-full'
                        : i < 8
                        ? 'bg-amber-400 h-full'
                        : 'bg-rose-500 h-full'
                      : 'bg-slate-800 h-1'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Toggle Quick Tactical Barks */}
          <button
            onClick={() => setShowQuickBarks(prev => !prev)}
            className="px-2 py-1 bg-amber-600/80 hover:bg-amber-500 text-white rounded font-medium flex items-center gap-1 transition cursor-pointer"
          >
            <span>Tactical Barks</span>
          </button>
        </div>
      </div>

      {/* Quick Tactical Radio Barks Panel */}
      {showQuickBarks && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1.5 border-t border-slate-800">
          {quickCallouts.map((bark, idx) => {
            const Icon = bark.icon;
            return (
              <button
                key={idx}
                onClick={() => onSendRadioBark(bark.text)}
                className="flex items-center gap-1.5 p-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-amber-400 rounded text-slate-200 text-[11px] transition text-left cursor-pointer"
              >
                <Icon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">{bark.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Recent Radio Log Feed */}
      {recentBarks.length > 0 && (
        <div className="flex flex-col gap-1 pt-1 border-t border-slate-800/80 font-mono text-[11px]">
          {recentBarks.slice(0, 2).map(b => (
            <div key={b.id} className="flex items-center gap-2 text-slate-300 bg-slate-950/60 px-2 py-0.5 rounded">
              <span className={`font-semibold ${b.team === 'red' ? 'text-rose-400' : 'text-sky-400'}`}>
                [{b.sender}]:
              </span>
              <span className="italic text-slate-200">"{b.text}"</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
