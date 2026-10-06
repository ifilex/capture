import React, { useState, useEffect } from 'react';
import { Swords, Bot, Server, Users, Zap, Shield, Globe, Play, Brain, Target, ShieldAlert, RotateCcw } from 'lucide-react';
import { GameMode, MapData, Platform } from '../types/game';
import { DEDICATED_SERVERS_LIST } from '../game/constants';
import { PRESET_MAPS } from '../game/mapData';
import { AiLearningSystem } from '../game/aiLearning';
import { AiNeuralModal } from './AiNeuralModal';

interface LobbyBrowserProps {
  currentPlatform: Platform;
  playerRank: string;
  playerMMR: number;
  onJoinMatch: (roomId: string, mode: GameMode, map: MapData, botDifficulty?: 'recruit' | 'veteran' | 'nightmare') => void;
  onOpenMapEditor: () => void;
  onOpenLeaderboards: () => void;
  onOpenProfile: () => void;
  customMaps: MapData[];
}

export const LobbyBrowser: React.FC<LobbyBrowserProps> = ({
  currentPlatform,
  playerRank,
  playerMMR,
  onJoinMatch,
  onOpenMapEditor,
  onOpenLeaderboards,
  onOpenProfile,
  customMaps,
}) => {
  const [activeTab, setActiveTab] = useState<'vs_ai' | 'matchmaking' | 'coop' | 'servers'>('vs_ai');
  const [isSearchingRanked, setIsSearchingRanked] = useState(false);
  const [rankedSearchTimer, setRankedSearchTimer] = useState(0);
  const [botDifficulty, setBotDifficulty] = useState<'recruit' | 'veteran' | 'nightmare'>('veteran');
  const [selectedMap, setSelectedMap] = useState<MapData>(PRESET_MAPS[0]);
  const [showAiModal, setShowAiModal] = useState(false);
  const [, setAiVersion] = useState(0);

  const aiSystem = AiLearningSystem.getInstance();
  const aiModel = aiSystem.model;

  // Ranked Matchmaking countdown/queue simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSearchingRanked) {
      interval = setInterval(() => {
        setRankedSearchTimer(prev => {
          if (prev >= 3) {
            setIsSearchingRanked(false);
            onJoinMatch(`ranked-${Date.now().toString().slice(-4)}`, 'ranked', selectedMap);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSearchingRanked, onJoinMatch, selectedMap]);

  const allAvailableMaps = [...PRESET_MAPS, ...customMaps];

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-4">
      {/* Top Banner & Quick Navigation */}
      <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-rose-950/80 border border-rose-500/60 flex items-center justify-center text-rose-400">
            <Swords className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-pixel text-base sm:text-lg text-rose-400 crt-glow-red">
                CAPTURE THE FLAG '95
              </h1>
              <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500 text-emerald-300 font-mono text-[10px]">
                v1.95 LIVE
              </span>
            </div>
            <p className="text-xs text-slate-400">Retro MS-DOS CTF • IA Adaptativa con Aprendizaje • Netcode 60Hz</p>
          </div>
        </div>

        {/* Career Fast-Stats & Modals */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenProfile}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs flex items-center gap-2 transition cursor-pointer"
          >
            <Shield className="w-4 h-4 text-sky-400" />
            <span className="font-mono text-slate-200">{playerRank} ({playerMMR} MMR)</span>
          </button>

          <button
            onClick={onOpenLeaderboards}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs flex items-center gap-1.5 text-amber-400 transition cursor-pointer"
          >
            <span>🏆 Global Ranks</span>
          </button>

          <button
            onClick={onOpenMapEditor}
            className="px-3 py-1.5 bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-600 rounded-lg text-xs text-emerald-200 flex items-center gap-1.5 transition cursor-pointer"
          >
            <span>🗺️ Map Editor</span>
          </button>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 flex-wrap">
        <button
          onClick={() => setActiveTab('vs_ai')}
          className={`px-4 py-2 rounded-lg font-pixel text-xs flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'vs_ai'
              ? 'bg-cyan-600 text-black shadow-[0_0_15px_rgba(6,182,212,0.8)] font-bold'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Brain className="w-4 h-4" />
          <span>VS PC (IA APRENDIZ)</span>
        </button>

        <button
          onClick={() => setActiveTab('matchmaking')}
          className={`px-4 py-2 rounded-lg font-pixel text-xs flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'matchmaking'
              ? 'bg-rose-600 text-white shadow-[0_0_12px_rgba(225,29,72,0.6)]'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Swords className="w-4 h-4" />
          <span>MATCHMAKING ONLINE</span>
        </button>

        <button
          onClick={() => setActiveTab('coop')}
          className={`px-4 py-2 rounded-lg font-pixel text-xs flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'coop'
              ? 'bg-sky-600 text-white shadow-[0_0_12px_rgba(14,165,233,0.6)]'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>CO-OP SQUAD</span>
        </button>

        <button
          onClick={() => setActiveTab('servers')}
          className={`px-4 py-2 rounded-lg font-pixel text-xs flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'servers'
              ? 'bg-amber-600 text-white shadow-[0_0_12px_rgba(245,158,11,0.6)]'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>SERVIDORES DEDICADOS</span>
        </button>
      </div>

      {/* TAB 1: VS PC WITH LEARNING AI (PRIMARY MODE) */}
      {activeTab === 'vs_ai' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-slate-900/95 border border-cyan-800/80 rounded-xl p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-400 font-pixel text-xs">
                <Brain className="w-4 h-4 animate-pulse" />
                <span>MODO EN SOLITARIO: JUGADOR VS COMPUTADORA</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-600 text-cyan-300 font-mono text-[10px]">
                60 FPS LOCAL (0ms LAG)
              </span>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">IA Táctica Evolutiva '95</h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Juega sin depender de la conexión a internet contra un escuadrón de bots que <strong className="text-cyan-300">aprende tus hábitos en tiempo real</strong>:
                analiza qué carril utilizas para atacar (Norte, Centro, Sur), anticipa la trayectoria de tus disparos con predicción balística, castiga tus dashes y realiza emboscadas en arbustos y maniobras de cerco.
              </p>
            </div>

            {/* Difficulty Selector */}
            <div>
              <span className="text-xs text-slate-400 font-mono block mb-2">Nivel de Dificultad de la IA:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  {
                    id: 'recruit',
                    label: 'Recluta',
                    desc: 'IA Estándar: patrulla de base, tiempo de reacción clásico de 1995.',
                    color: 'border-slate-700 hover:border-slate-500',
                  },
                  {
                    id: 'veteran',
                    label: 'Veterano (Adaptativo)',
                    desc: 'Aprende tus rutas favoritas, flanqueo táctico y predicción de puntería.',
                    color: 'border-cyan-500 bg-cyan-950/30',
                  },
                  {
                    id: 'nightmare',
                    label: 'Pesadilla \'95 (Extrema)',
                    desc: 'Anticipación balística 125%, bloqueo total de carriles y kiting defensivo implacable.',
                    color: 'border-rose-500 bg-rose-950/30',
                  },
                ].map(d => (
                  <button
                    key={d.id}
                    onClick={() => setBotDifficulty(d.id as 'recruit' | 'veteran' | 'nightmare')}
                    className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                      botDifficulty === d.id
                        ? `${d.color} text-white ring-1 ring-cyan-400`
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="font-pixel text-xs block mb-1">{d.label}</span>
                    <span className="text-[11px] text-slate-400 block leading-tight">{d.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Map Selection */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
              <span className="text-xs text-slate-400 font-mono block mb-2">Escenario de Combate:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {allAvailableMaps.slice(0, 3).map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMap(m)}
                    className={`p-2 rounded text-left border transition cursor-pointer text-xs ${
                      selectedMap.id === m.id
                        ? 'border-cyan-500 bg-cyan-950/40 text-white font-medium'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="font-semibold block truncate">{m.name}</span>
                    <span className="text-[10px] text-slate-500 block truncate">{m.author}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Launch Button */}
            <button
              onClick={() => onJoinMatch('local-vs-pc', 'vs_ai', selectedMap, botDifficulty)}
              className="py-3.5 bg-cyan-500 hover:bg-cyan-400 text-black font-pixel text-xs rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.8)] flex items-center justify-center gap-2 transition cursor-pointer font-bold tracking-wider"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>INICIAR PARTIDA VS IA DE LA PC</span>
            </button>
          </div>

          {/* AI Neural Memory Status Card */}
          <div className="bg-slate-900/90 border border-cyan-900/80 rounded-xl p-4 flex flex-col justify-between gap-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-pixel text-[11px] text-cyan-400">TELEMETRÍA DE LA IA</span>
                <span className="text-[10px] bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded font-mono">
                  NV. {aiModel.adaptationLevel}/10
                </span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-[11px] font-mono">
                <div className="flex items-center gap-1 text-slate-400 mb-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>Carril preferido detectado:</span>
                </div>
                <span className="text-white font-bold uppercase">
                  {aiModel.preferredDefenseLane === 'top'
                    ? 'Carril Norte'
                    : aiModel.preferredDefenseLane === 'bottom'
                    ? 'Carril Sur'
                    : 'Carril Centro'}
                </span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-[11px] font-mono">
                <div className="flex items-center gap-1 text-slate-400 mb-1">
                  <Target className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Anticipación de Tiro:</span>
                </div>
                <span className="text-cyan-300 font-bold">
                  {Math.round(aiModel.leadFactor * 100)}% velocidad compensada
                </span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-[11px] text-slate-400">
                <span className="text-slate-300 font-semibold block mb-1">Último informe:</span>
                <p className="text-[10px] italic leading-tight text-slate-400">{aiModel.lastLog}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowAiModal(true)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-xs rounded border border-cyan-800/80 transition cursor-pointer"
              >
                Abrir Matriz Neuronal Completa
              </button>

              <button
                onClick={() => {
                  aiSystem.resetMemory();
                  setAiVersion(v => v + 1);
                }}
                className="w-full py-1.5 text-rose-400 hover:text-rose-300 font-mono text-[10px] flex items-center justify-center gap-1 transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reiniciar Aprendizaje</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COMPETITIVE MATCHMAKING */}
      {activeTab === 'matchmaking' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-pixel text-xs text-rose-400">BALANCED MMR MATCHMAKING</span>
                <span className="text-xs text-emerald-400 font-mono">● Servidor Dedicado</span>
              </div>
              <h3 className="text-lg font-bold text-white mt-1">Captura la Bandera Competitivo (4v4)</h3>
              <p className="text-xs text-slate-400 mt-1">
                Juega contra otros jugadores conectados por red. Física del lado del servidor, netcode de baja latencia y chat de voz táctico por radio.
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
              <span className="text-xs text-slate-400 font-mono block mb-2">Arena:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {allAvailableMaps.slice(0, 3).map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMap(m)}
                    className={`p-2 rounded text-left border transition cursor-pointer text-xs ${
                      selectedMap.id === m.id
                        ? 'border-rose-500 bg-rose-950/40 text-white font-medium'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="font-semibold block truncate">{m.name}</span>
                    <span className="text-[10px] text-slate-500 block truncate">{m.author}</span>
                  </button>
                ))}
              </div>
            </div>

            {isSearchingRanked ? (
              <div className="bg-rose-950/80 border-2 border-rose-500 rounded-lg p-4 flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 rounded-full border-3 border-rose-500 border-t-transparent animate-spin" />
                <span className="font-pixel text-xs text-white">BUSCANDO PARTIDA BALANCEADA...</span>
                <span className="text-xs text-rose-300 font-mono">
                  Tiempo: 00:0{rankedSearchTimer} • Rango MMR: [{playerMMR - 150} - {playerMMR + 150}]
                </span>
                <button
                  onClick={() => setIsSearchingRanked(false)}
                  className="mt-2 text-xs text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => setIsSearchingRanked(true)}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-pixel text-xs rounded-lg shadow-[0_0_15px_rgba(225,29,72,0.7)] flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>BUSCAR PARTIDA ONLINE</span>
                </button>

                <button
                  onClick={() => onJoinMatch('casual-1', 'casual', selectedMap)}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-pixel text-xs rounded-lg border border-slate-700 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <span>JUEGO RÁPIDO</span>
                </button>
              </div>
            )}
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3">
            <div>
              <span className="font-pixel text-[10px] text-slate-400">JUEGO CRUZADO ACTIVO</span>
              <div className="flex flex-col gap-2 mt-3 text-xs text-slate-300">
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  PC: Teclado (WASD / Flechas) + Ratón
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  Consola: Soporte Gamepad dual-stick
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  Móvil: Joysticks virtuales táctiles
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded border border-slate-800 text-[11px] text-slate-400">
              <span className="text-emerald-400 font-semibold block mb-1">Dispositivo:</span>
              <span>
                Detectado: <strong className="text-white capitalize">{currentPlatform}</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COOPERATIVE MODE */}
      {activeTab === 'coop' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
          <div>
            <div className="flex items-center gap-2 text-sky-400 font-pixel text-xs">
              <Bot className="w-4 h-4" />
              <span>MISIÓN COOPERATIVA EN RED</span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1">Infiltración Táctica Co-Op</h3>
            <p className="text-xs text-slate-400">
              Forma un escuadrón con otros compañeros online y enfrenten a una facción de bots tácticos en el servidor dedicado.
            </p>
          </div>

          <button
            onClick={() => onJoinMatch(`coop-${Date.now().toString().slice(-4)}`, 'coop', selectedMap, botDifficulty)}
            className="py-3 bg-sky-600 hover:bg-sky-500 text-white font-pixel text-xs rounded-lg shadow-[0_0_15px_rgba(14,165,233,0.7)] flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>LANZAR MISIÓN COOPERATIVA ONLINE</span>
          </button>
        </div>
      )}

      {/* TAB 4: DEDICATED SERVERS BROWSER */}
      {activeTab === 'servers' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-pixel text-xs text-amber-400">SERVIDORES DEDICADOS GLOBALES</span>
            <span className="text-xs text-slate-400 font-mono">Tick Rate 30Hz/60Hz</span>
          </div>

          <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden">
            {DEDICATED_SERVERS_LIST.map(srv => (
              <div
                key={srv.id}
                className="p-3 bg-slate-950/60 hover:bg-slate-800/60 flex items-center justify-between gap-3 flex-wrap transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <div>
                    <span className="font-semibold text-slate-100 text-xs">{srv.name}</span>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                      <span>{srv.location}</span>
                      <span>•</span>
                      <span>{srv.currentMap}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 font-mono text-xs text-emerald-400">
                    <Globe className="w-3.5 h-3.5" />
                    <span>{srv.ping} ms</span>
                  </div>

                  <div className="flex items-center gap-1 font-mono text-xs text-slate-300">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{srv.playersCount} / {srv.maxPlayers}</span>
                  </div>

                  <button
                    onClick={() => onJoinMatch(srv.id, srv.mode, PRESET_MAPS[0])}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-pixel text-[10px] rounded transition cursor-pointer"
                  >
                    CONECTAR
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Neural AI Modal */}
      <AiNeuralModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        onModelReset={() => setAiVersion(v => v + 1)}
      />
    </div>
  );
};
