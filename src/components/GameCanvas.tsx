import React, { useRef, useEffect, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { GameEngine } from '../game/engine';
import { GameState, MapData, GameMode, Player, Platform } from '../types/game';
import { soundManager } from '../audio/soundManager';
import { useVoiceChat } from '../hooks/useVoiceChat';
import { useGamepad } from '../hooks/useGamepad';
import { useTouchControls } from '../hooks/useTouchControls';
import { VoiceChatBar } from './VoiceChatBar';
import { TouchControlsOverlay } from './TouchControlsOverlay';
import { AiNeuralModal } from './AiNeuralModal';
import { LocalSimulationEngine } from '../game/localSimulation';
import { AiLearningSystem } from '../game/aiLearning';
import { Flag, Users, Wifi, Volume2, VolumeX, Tv, ArrowLeft, Brain, RefreshCw, AlertTriangle, ShieldAlert, Smartphone } from 'lucide-react';
import { GAME_CONFIG } from '../game/constants';

interface GameCanvasProps {
  roomId: string;
  mode: GameMode;
  map: MapData;
  playerName: string;
  playerRank: string;
  playerMMR: number;
  currentPlatform: Platform;
  botDifficulty?: 'recruit' | 'veteran' | 'nightmare';
  onMatchEnd: (won: boolean, stats: { captures: number; returns: number; tags: number; deaths: number }) => void;
  onLeaveMatch: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  roomId,
  mode: initialMode,
  map,
  playerName,
  playerRank,
  currentPlatform,
  botDifficulty = 'veteran',
  onMatchEnd,
  onLeaveMatch,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const localSimRef = useRef<LocalSimulationEngine | null>(null);

  const [activeMode, setActiveMode] = useState<GameMode>(initialMode);
  const [localPlayerId] = useState<string>(() => `user-${Date.now().toString().slice(-6)}`);
  const [myTeam, setMyTeam] = useState<'red' | 'blue'>('red');
  const [ping, setPing] = useState<number>(activeMode === 'vs_ai' ? 2 : 18);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'local_sim'>(
    activeMode === 'vs_ai' ? 'local_sim' : 'connecting'
  );

  const [showCRT, setShowCRT] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showScoreboard, setShowScoreboard] = useState<boolean>(false);
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [matchEnded, setMatchEnded] = useState<boolean>(false);
  const [matchWinner, setMatchWinner] = useState<'red' | 'blue' | null>(null);
  const [aiLogMessage, setAiLogMessage] = useState<string>(
    'IA Neuronal Activa: Analizando rutas ofensivas y prediciendo disparos balísticos.'
  );

  // Local movement & input refs for 60fps loop
  const keysDown = useRef<Record<string, boolean>>({});
  const mousePos = useRef<{ x: number; y: number }>({ x: 500, y: 300 });
  const isMouseDown = useRef<boolean>(false);
  const lastShotTime = useRef<number>(0);
  const reloadTimer = useRef<number>(0);
  const hudSyncTimer = useRef<number>(0);

  const onMatchEndRef = useRef(onMatchEnd);
  onMatchEndRef.current = onMatchEnd;

  // Default initial Game State
  const [gameState, setGameState] = useState<GameState>(() => {
    const redSpawn = map.redSpawn || { x: 3 * 32 + 16, y: 10 * 32 + 16 };
    const blueSpawn = map.blueSpawn || { x: 28 * 32 + 16, y: 10 * 32 + 16 };
    const redFlagPos = map.redFlagPos || redSpawn;
    const blueFlagPos = map.blueFlagPos || blueSpawn;

    return {
      roomId,
      roomName: roomId,
      mode: activeMode,
      serverRegion: activeMode === 'vs_ai' ? 'local-60hz' : 'us-east',
      score: { red: 0, blue: 0 },
      targetScore: GAME_CONFIG.TARGET_CAPTURES_TO_WIN,
      matchTimeRemaining: GAME_CONFIG.MATCH_DURATION_SECONDS,
      status: 'in_progress',
      winner: null,
      players: {
        [localPlayerId]: {
          id: localPlayerId,
          name: playerName,
          team: 'red',
          x: redSpawn.x,
          y: redSpawn.y,
          vx: 0,
          vy: 0,
          angle: 0,
          health: 100,
          maxHealth: 100,
          stamina: 100,
          maxStamina: 100,
          ammo: 12,
          maxAmmo: 12,
          isCarryingFlag: false,
          carryingTeamFlag: null,
          isDashing: false,
          isStealthed: false,
          isShooting: false,
          score: 0,
          kills: 0,
          deaths: 0,
          captures: 0,
          returns: 0,
          ping: activeMode === 'vs_ai' ? 2 : 18,
          platform: currentPlatform,
          isBot: false,
          rank: playerRank,
          isSpeaking: false,
          respawnTimer: 0,
        },
      },
      flags: {
        red: {
          team: 'red',
          x: redFlagPos.x,
          y: redFlagPos.y,
          baseX: redFlagPos.x,
          baseY: redFlagPos.y,
          isHome: true,
          carriedBy: null,
          dropped: false,
          dropTimer: 0,
        },
        blue: {
          team: 'blue',
          x: blueFlagPos.x,
          y: blueFlagPos.y,
          baseX: blueFlagPos.x,
          baseY: blueFlagPos.y,
          isHome: true,
          carriedBy: null,
          dropped: false,
          dropTimer: 0,
        },
      },
      projectiles: [],
      pickups: [],
      mines: [],
      map,
      killFeed: [],
      voiceSpeakers: [],
    };
  });

  const gameStateRef = useRef<GameState>(gameState);
  gameStateRef.current = gameState;

  // Send packet to WebSocket
  const sendSocketMessage = useCallback((msg: object) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  // Voice Chat Hook
  const voiceChat = useVoiceChat(
    myTeam,
    playerName,
    (speaking) => sendSocketMessage({ type: 'voice_status', speaking }),
    (text) => sendSocketMessage({ type: 'radio_bark', text })
  );
  const voiceChatRef = useRef(voiceChat);
  voiceChatRef.current = voiceChat;

  const handleGamepadBark = useCallback((barkText: string) => {
    voiceChatRef.current?.sendRadioBark(barkText);
  }, []);

  // Gamepad Hook
  const gamepad = useGamepad(handleGamepadBark);
  const gamepadRef = useRef(gamepad);
  gamepadRef.current = gamepad;

  // Touch Controls Hook
  const touch = useTouchControls();
  const touchRef = useRef(touch);
  touchRef.current = touch;

  // Initialize Local Simulation Engine for VS PC or offline fallback
  const startLocalSimulation = useCallback(() => {
    const localSim = new LocalSimulationEngine(
      localPlayerId,
      playerName,
      myTeam,
      map,
      activeMode,
      (botDifficulty || 'veteran') as 'recruit' | 'veteran' | 'nightmare',
      3,
      {
        onScoreChange: () => {
          soundManager.playFlagCaptured();
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
          setGameState({ ...localSim.gameState });
        },
        onMatchEnd: (winner, stats) => {
          setMatchEnded(true);
          setMatchWinner(winner);
          const won = winner === myTeam;
          if (won) confetti({ particleCount: 100, spread: 100, origin: { y: 0.5 } });
          setGameState({ ...localSim.gameState });
          onMatchEndRef.current?.(won, stats);
        },
        onScreenShake: (amount) => {
          engineRef.current?.addScreenShake(amount);
        },
        onAiLog: (log) => {
          setAiLogMessage(log);
        },
        onRadioBark: (sender, text, team) => {
          voiceChatRef.current?.receiveRadioBark({
            id: `${Date.now()}-${Math.random()}`,
            text,
            sender,
            team,
            timestamp: Date.now(),
          });
        },
      }
    );

    localSimRef.current = localSim;
    setGameState(localSim.gameState);
    setConnectionStatus('local_sim');
    setPing(2);
  }, [localPlayerId, playerName, myTeam, map, activeMode, botDifficulty]);

  // WebSocket Connection Lifecycle (Only runs if activeMode !== 'vs_ai')
  useEffect(() => {
    if (activeMode === 'vs_ai') {
      startLocalSimulation();
      return;
    }

    setConnectionStatus('connecting');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const socket = new WebSocket(`${protocol}//${host}/ws`);
    wsRef.current = socket;

    socket.onopen = () => {
      setConnectionStatus('connected');
      socket.send(
        JSON.stringify({
          type: 'join',
          roomId,
          mode: activeMode,
          player: {
            id: localPlayerId,
            name: playerName,
            platform: currentPlatform,
            rank: playerRank,
          },
        })
      );
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'joined') {
          setMyTeam(data.team);
        } else if (data.type === 'state') {
          setGameState(prev => {
            if (data.score.red > prev.score.red || data.score.blue > prev.score.blue) {
              soundManager.playFlagCaptured();
              confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
            }

            if (data.status === 'ended' && !prev.winner && data.winner) {
              setMatchEnded(true);
              setMatchWinner(data.winner);
              const won = data.winner === myTeam;
              if (won) confetti({ particleCount: 100, spread: 100, origin: { y: 0.5 } });
            }

            return {
              ...prev,
              score: data.score,
              matchTimeRemaining: data.matchTimeRemaining,
              status: data.status,
              winner: data.winner,
              players: {
                ...prev.players,
                ...data.players,
              },
              flags: data.flags,
              projectiles: data.projectiles,
              killFeed: data.killFeed || [],
            };
          });
        } else if (data.type === 'pong') {
          const latency = Math.max(8, Date.now() - data.clientTimestamp);
          setPing(latency);
        }
      } catch {}
    };

    socket.onerror = () => {
      setConnectionStatus('disconnected');
    };

    socket.onclose = () => {
      setConnectionStatus('disconnected');
    };

    const pingInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    }, 2000);

    return () => {
      clearInterval(pingInterval);
      socket.close();
    };
  }, [activeMode, roomId, localPlayerId, playerName, currentPlatform, playerRank, startLocalSimulation]);

  // Keyboard & Mouse Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      keysDown.current[e.code] = true;

      if (e.code === 'Tab') {
        e.preventDefault();
        setShowScoreboard(true);
      }
      if (e.code === 'KeyR') {
        handleManualReload();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      keysDown.current[e.code] = false;

      if (e.code === 'Tab') {
        setShowScoreboard(false);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      mousePos.current = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) isMouseDown.current = true;
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) isMouseDown.current = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleManualReload = () => {
    const current = localSimRef.current ? localSimRef.current.gameState : gameStateRef.current;
    const local = current.players[localPlayerId];
    if (local && local.ammo < local.maxAmmo && reloadTimer.current <= 0) {
      reloadTimer.current = GAME_CONFIG.AMMO_RELOAD_TIME;
    }
  };

  // Main 60 FPS Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!engineRef.current) {
      engineRef.current = new GameEngine(canvas);
    }
    const engine = engineRef.current;

    let lastTime = performance.now();
    let animId: number;

    const gameLoop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // Reload timer countdown
      if (reloadTimer.current > 0) {
        reloadTimer.current -= dt;
        if (reloadTimer.current <= 0) {
          const current = localSimRef.current ? localSimRef.current.gameState : gameStateRef.current;
          const p = current.players[localPlayerId];
          if (p) p.ammo = p.maxAmmo;
        }
      }

      // 1. Calculate Human Player Input Movement
      const current = localSimRef.current ? localSimRef.current.gameState : gameStateRef.current;
      const local = current.players[localPlayerId];

      if (local && local.health > 0 && local.respawnTimer <= 0) {
        let dx = 0;
        let dy = 0;

        if (keysDown.current['KeyW'] || keysDown.current['ArrowUp']) dy -= 1;
        if (keysDown.current['KeyS'] || keysDown.current['ArrowDown']) dy += 1;
        if (keysDown.current['KeyA'] || keysDown.current['ArrowLeft']) dx -= 1;
        if (keysDown.current['KeyD'] || keysDown.current['ArrowRight']) dx += 1;

        const gp = gamepadRef.current.getGamepadState();
        if (gp.connected) {
          if (Math.abs(gp.moveX) > 0.1) dx = gp.moveX;
          if (Math.abs(gp.moveY) > 0.1) dy = gp.moveY;
          if (gp.showScoreboard) setShowScoreboard(true);
        }

        const tch = touchRef.current.getState();
        if ((tch.isTouchDevice || tch.showVirtualJoystick) && (Math.abs(tch.moveVector.x) > 0.05 || Math.abs(tch.moveVector.y) > 0.05)) {
          dx = tch.moveVector.x;
          dy = tch.moveVector.y;
        }

        const mag = Math.hypot(dx, dy);
        let moveX = 0;
        let moveY = 0;
        if (mag > 0) {
          moveX = dx / mag;
          moveY = dy / mag;
        }

        let aimAngle = local.angle;
        if (gp.connected && gp.aimAngle !== null) {
          aimAngle = gp.aimAngle;
        } else if (tch.aimAngle !== null) {
          aimAngle = tch.aimAngle;
        } else if ((tch.isTouchDevice || tch.showVirtualJoystick) && mag > 0) {
          aimAngle = Math.atan2(moveY, moveX);
        } else {
          aimAngle = Math.atan2(mousePos.current.y - local.y, mousePos.current.x - local.x);
        }

        const wantsDash = keysDown.current['ShiftLeft'] || gp.isDashing || tch.isDashing;
        let isDashing = false;
        if (wantsDash && local.stamina > 10 && mag > 0) {
          isDashing = true;
          local.stamina = Math.max(0, local.stamina - GAME_CONFIG.STAMINA_DRAIN_RATE * dt);
        } else if (!wantsDash && local.stamina < local.maxStamina) {
          local.stamina = Math.min(local.maxStamina, local.stamina + GAME_CONFIG.STAMINA_RECOVERY_RATE * dt);
        }

        const tileCol = Math.floor(local.x / map.tileSize);
        const tileRow = Math.floor(local.y / map.tileSize);
        const currentTile = map.tiles[tileRow]?.[tileCol];

        let speed = GAME_CONFIG.BASE_SPEED;
        if (local.isCarryingFlag) speed = GAME_CONFIG.CARRIER_SPEED;
        if (isDashing) speed = GAME_CONFIG.DASH_SPEED;
        if (currentTile === 5) speed = GAME_CONFIG.MUD_SPEED;
        if (currentTile === 6) speed = GAME_CONFIG.BOOST_SPEED;

        local.isStealthed = currentTile === 3;

        const newX = local.x + moveX * speed * dt;
        const newY = local.y + moveY * speed * dt;

        const r = GAME_CONFIG.PLAYER_RADIUS;
        const targetCol = Math.floor(newX / map.tileSize);
        const targetRow = Math.floor(newY / map.tileSize);
        const targetTile = map.tiles[targetRow]?.[targetCol];

        if (targetTile !== 1 && targetTile !== 2 && targetTile !== 4) {
          local.x = Math.max(r, Math.min(map.width * map.tileSize - r, newX));
          local.y = Math.max(r, Math.min(map.height * map.tileSize - r, newY));
        }

        local.vx = moveX * speed;
        local.vy = moveY * speed;
        local.angle = aimAngle;
        local.isDashing = isDashing;

        // Shooting logic
        const wantsShoot = isMouseDown.current || gp.isShooting || tch.isShooting;
        if (
          wantsShoot &&
          now - lastShotTime.current > GAME_CONFIG.FIRE_COOLDOWN * 1000 &&
          local.ammo > 0 &&
          reloadTimer.current <= 0
        ) {
          lastShotTime.current = now;
          local.ammo--;
          soundManager.playLaserShot();
          engine.addScreenShake(2.5);

          const spawnX = local.x + Math.cos(aimAngle) * 16;
          const spawnY = local.y + Math.sin(aimAngle) * 16;

          if (localSimRef.current) {
            localSimRef.current.spawnProjectile(localPlayerId, myTeam, spawnX, spawnY, aimAngle);
          } else {
            sendSocketMessage({
              type: 'shoot',
              x: spawnX,
              y: spawnY,
              angle: aimAngle,
            });
          }

          if (local.ammo <= 0) {
            reloadTimer.current = GAME_CONFIG.AMMO_RELOAD_TIME;
          }
        }

        if (!localSimRef.current) {
          sendSocketMessage({
            type: 'input',
            x: local.x,
            y: local.y,
            vx: local.vx,
            vy: local.vy,
            angle: local.angle,
            isDashing: local.isDashing,
            isStealthed: local.isStealthed,
          });
        }
      }

      // 2. Update Local Simulation Engine if active
      if (localSimRef.current) {
        localSimRef.current.update(dt);
        hudSyncTimer.current += dt;
        if (hudSyncTimer.current >= 0.1) {
          hudSyncTimer.current = 0;
          setGameState({ ...localSimRef.current.gameState });
        }
      }

      // 3. Update Particles & Render
      engine.updateParticles(dt);
      const stateToRender = localSimRef.current ? localSimRef.current.gameState : gameStateRef.current;
      engine.render(stateToRender, localPlayerId, showCRT);

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [map, showCRT, localPlayerId, myTeam, sendSocketMessage]);

  const activeState = localSimRef.current ? localSimRef.current.gameState : gameState;
  const localPlayer = activeState.players[localPlayerId];
  const redFlag = activeState.flags.red;
  const blueFlag = activeState.flags.blue;

  const minutes = Math.floor(activeState.matchTimeRemaining / 60);
  const seconds = Math.floor(activeState.matchTimeRemaining % 60);
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center select-none">
      {/* Top Match HUD Bar */}
      <div className="w-full bg-slate-900/95 border border-slate-700/80 rounded-t-xl p-2.5 flex items-center justify-between flex-wrap gap-2 text-xs backdrop-blur-md">
        {/* Left: Leave & Network status */}
        <div className="flex items-center gap-2">
          <button
            onClick={onLeaveMatch}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded flex items-center gap-1.5 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">Leave</span>
          </button>

          {/* Connection Status Badge */}
          {connectionStatus === 'local_sim' ? (
            <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-[11px] bg-slate-950 px-2 py-0.5 rounded border border-cyan-800/80">
              <Brain className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>VS PC (60Hz Local)</span>
            </div>
          ) : connectionStatus === 'connected' ? (
            <div className="flex items-center gap-1 text-emerald-400 font-mono text-[11px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              <Wifi className="w-3 h-3" />
              <span>Online ({ping}ms)</span>
            </div>
          ) : connectionStatus === 'connecting' ? (
            <div className="flex items-center gap-1 text-amber-400 font-mono text-[11px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800 animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Conectando...</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-rose-400 font-mono text-[11px] bg-slate-950 px-2 py-0.5 rounded border border-rose-800">
              <AlertTriangle className="w-3 h-3" />
              <span>Desconectado</span>
            </div>
          )}

          <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">
            Arena: {map.name}
          </span>
        </div>

        {/* Center: SCORE & MATCH CLOCK */}
        <div className="flex items-center gap-3">
          {/* Red Team Score */}
          <div className="flex items-center gap-1.5 bg-rose-950/80 px-2.5 py-1 rounded border border-rose-500/60 font-pixel">
            <span className="text-rose-400 text-xs">RED</span>
            <span className="text-white text-sm font-bold">{activeState.score.red}</span>
          </div>

          {/* Match Timer */}
          <div className="flex flex-col items-center">
            <span className="font-pixel text-xs text-amber-400 crt-glow">{timeFormatted}</span>
            <span className="text-[9px] text-slate-400 font-mono">FIRST TO {activeState.targetScore}</span>
          </div>

          {/* Blue Team Score */}
          <div className="flex items-center gap-1.5 bg-sky-950/80 px-2.5 py-1 rounded border border-sky-500/60 font-pixel">
            <span className="text-white text-sm font-bold">{activeState.score.blue}</span>
            <span className="text-sky-400 text-xs">BLUE</span>
          </div>
        </div>

        {/* Right: AI Neural Modal, CRT Toggle & Audio & Scoreboard */}
        <div className="flex items-center gap-2">
          {/* AI Neural Matrix Button */}
          <button
            onClick={() => setShowAiModal(true)}
            className="px-2 py-1 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-600 text-cyan-300 rounded flex items-center gap-1 text-[11px] font-mono transition cursor-pointer"
            title="Ver Matriz de Aprendizaje de IA"
          >
            <Brain className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Matriz IA</span>
          </button>

          {/* CRT Scanlines Toggle */}
          <button
            onClick={() => setShowCRT(prev => !prev)}
            className={`px-2 py-1 rounded flex items-center gap-1 text-[11px] font-mono transition cursor-pointer ${
              showCRT ? 'bg-emerald-950 border border-emerald-500 text-emerald-300' : 'bg-slate-800 text-slate-400'
            }`}
            title="Toggle CRT Scanline Shader"
          >
            <Tv className="w-3 h-3" />
            <span>CRT {showCRT ? 'ON' : 'OFF'}</span>
          </button>

          {/* Virtual Joystick Touch Toggle */}
          <button
            onClick={touch.toggleVirtualJoystick}
            className={`px-2 py-1 rounded flex items-center gap-1 text-[11px] font-mono transition cursor-pointer ${
              touch.showVirtualJoystick
                ? 'bg-emerald-950 border border-emerald-500 text-emerald-300'
                : 'bg-slate-800 text-slate-400'
            }`}
            title="Activar o desactivar Joystick Virtual Táctil"
          >
            <Smartphone className="w-3 h-3 text-emerald-400" />
            <span>Joy {touch.showVirtualJoystick ? 'ON' : 'OFF'}</span>
          </button>

          {/* Audio toggle */}
          <button
            onClick={() => setIsMuted(soundManager.toggleMute())}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition cursor-pointer"
            title="Toggle Retro Sound Effects"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Scoreboard button */}
          <button
            onClick={() => setShowScoreboard(prev => !prev)}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded flex items-center gap-1 transition cursor-pointer text-[11px]"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Tab</span>
          </button>
        </div>
      </div>

      {/* Flag Status Banner */}
      <div className="w-full bg-slate-950/90 border-x border-b border-slate-800 px-3 py-1 flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center gap-1.5">
          <Flag className="w-3.5 h-3.5 text-rose-500" />
          <span className="text-slate-400">Red Flag:</span>
          {redFlag.carriedBy ? (
            <span className="text-amber-400 font-semibold animate-pulse">CARRIED BY ENEMY!</span>
          ) : redFlag.dropped ? (
            <span className="text-yellow-400 font-semibold">DROPPED ({Math.ceil(redFlag.dropTimer)}s)</span>
          ) : (
            <span className="text-emerald-400">AT BASE</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Flag className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-slate-400">Blue Flag:</span>
          {blueFlag.carriedBy ? (
            <span className="text-amber-400 font-semibold animate-pulse">CARRIED BY ENEMY!</span>
          ) : blueFlag.dropped ? (
            <span className="text-yellow-400 font-semibold">DROPPED ({Math.ceil(blueFlag.dropTimer)}s)</span>
          ) : (
            <span className="text-emerald-400">AT BASE</span>
          )}
        </div>
      </div>

      {/* AI Neural Learning Telemetry HUD Banner */}
      <div className="w-full bg-slate-950 border-x border-b border-cyan-950 px-3 py-1 flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center gap-2 text-cyan-300 overflow-hidden">
          <Brain className="w-3.5 h-3.5 text-cyan-400 shrink-0 animate-pulse" />
          <span className="font-bold text-cyan-400 shrink-0">[IA TÁCTICA v3.2]:</span>
          <span className="text-slate-300 truncate">{aiLogMessage}</span>
        </div>
        <button
          onClick={() => setShowAiModal(true)}
          className="text-[10px] text-cyan-400 hover:text-cyan-200 underline ml-2 shrink-0 cursor-pointer"
        >
          Examinar
        </button>
      </div>

      {/* Online Disconnection Fallback Warning */}
      {connectionStatus === 'disconnected' && activeMode !== 'vs_ai' && (
        <div className="w-full bg-rose-950/90 border-x border-b border-rose-700 p-2 flex items-center justify-between text-xs text-rose-200">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Servidor dedicado no responde. Puedes continuar jugando contra la PC con IA de aprendizaje instantáneamente:</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveMode('vs_ai');
                startLocalSimulation();
              }}
              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-black font-pixel text-[10px] rounded transition cursor-pointer"
            >
              ACTIVAR MODO VS PC (IA)
            </button>
          </div>
        </div>
      )}

      {/* Main Game Screen Canvas Container */}
      <div className="relative w-full aspect-[16/10] bg-slate-950 overflow-hidden shadow-2xl border-x border-slate-700">
        <canvas
          ref={canvasRef}
          width={1024}
          height={640}
          className="w-full h-full pixelated block"
        />

        {/* CRT Scanline and curvature filter */}
        {showCRT && <div className="absolute inset-0 crt-overlay pointer-events-none" />}

        {/* Virtual Joystick / Touch Controls Overlay */}
        {touch.showVirtualJoystick && (
          <TouchControlsOverlay
            leftJoyCenter={touch.leftJoyCenter}
            leftJoyPos={touch.leftJoyPos}
            isLeftJoyActive={touch.isLeftJoyActive}
            onPointerDownLeft={touch.handlePointerDownLeft}
            onPointerMoveLeft={touch.handlePointerMoveLeft}
            onPointerUpLeft={touch.handlePointerUpLeft}
            onTouchStartLeft={touch.handleTouchStartLeft}
            onTouchMoveLeft={touch.handleTouchMoveLeft}
            onTouchEndLeft={touch.handleTouchEndLeft}
            onSetShooting={touch.setShooting}
            onSetDashing={touch.setDashing}
            onSetPushToTalk={touch.setPushToTalk}
            onReload={handleManualReload}
            onToggleScoreboard={() => setShowScoreboard(prev => !prev)}
            onQuickPing={() => voiceChat.sendRadioBark('¡Cubran el flanco norte!')}
            onSetAimAngle={touch.setAimAngle}
            onToggleHide={touch.toggleVirtualJoystick}
          />
        )}

        {/* Killfeed on Top Left */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 pointer-events-none z-10 font-mono text-[11px]">
          {activeState.killFeed.slice(0, 3).map(k => (
            <div
              key={k.id}
              className="bg-slate-950/80 border border-slate-800/80 px-2 py-0.5 rounded flex items-center gap-1 text-slate-200"
            >
              <span className={k.killerTeam === 'red' ? 'text-rose-400 font-semibold' : 'text-sky-400 font-semibold'}>
                {k.killerName}
              </span>
              <span className="text-slate-400 text-[10px]">
                {k.action === 'captured' ? '🏆 captured' : k.action === 'returned' ? '🛡️ returned' : '⚡ tagged'}
              </span>
              <span className={k.victimTeam === 'red' ? 'text-rose-400 font-semibold' : 'text-sky-400 font-semibold'}>
                {k.victimName}
              </span>
            </div>
          ))}
        </div>

        {/* Respawn Countdown Overlay */}
        {localPlayer && localPlayer.respawnTimer > 0 && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center z-30 pointer-events-none">
            <span className="font-pixel text-rose-500 text-base sm:text-xl crt-glow-red animate-pulse">
              TAGGED OUT!
            </span>
            <span className="font-pixel text-white text-sm mt-2">
              RESPAWN IN {Math.ceil(localPlayer.respawnTimer)}s
            </span>
            <span className="text-xs text-slate-400 font-mono mt-1">Re-deploying at team base</span>
          </div>
        )}

        {/* Match Ended Screen */}
        {matchEnded && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center z-40 p-4">
            <div className="bg-slate-900 border-2 border-amber-500 rounded-xl p-6 max-w-md w-full text-center flex flex-col items-center gap-4 shadow-2xl">
              <span className="text-4xl">🏆</span>
              <div>
                <h2 className="font-pixel text-lg sm:text-xl text-amber-400 crt-glow">
                  {matchWinner === myTeam ? 'VICTORY ACHIEVED!' : 'MATCH DEFEATED'}
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  Final Score: Red {activeState.score.red} — Blue {activeState.score.blue}
                </p>
              </div>

              <div className="w-full bg-slate-950 p-3 rounded border border-slate-800 text-xs font-mono grid grid-cols-2 gap-2 text-left">
                <div>
                  <span className="text-slate-500">MMR Rating Change:</span>
                  <span className={`block font-bold ${matchWinner === myTeam ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {matchWinner === myTeam ? '+25 MMR' : '-18 MMR'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Flags Captured:</span>
                  <span className="block text-slate-200 font-bold">{localPlayer?.captures || 0}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  onMatchEnd(matchWinner === myTeam, {
                    captures: localPlayer?.captures || 0,
                    returns: localPlayer?.returns || 0,
                    tags: localPlayer?.kills || 0,
                    deaths: localPlayer?.deaths || 0,
                  });
                }}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-pixel text-xs rounded transition cursor-pointer"
              >
                RETURN TO LOBBY
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Combat Status Bar */}
      <div className="w-full bg-slate-900/95 border-x border-b border-slate-700/80 p-3 flex items-center justify-between gap-4 flex-wrap">
        {/* Health */}
        <div className="flex items-center gap-2">
          <span className="font-pixel text-[10px] text-rose-400">HP</span>
          <div className="w-32 sm:w-44 h-4 bg-slate-950 rounded border border-slate-700 overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all"
              style={{ width: `${Math.max(0, localPlayer?.health || 0)}%` }}
            />
            <span className="absolute inset-0 flex items-center justify-center font-mono text-[10px] font-bold text-white drop-shadow">
              {Math.round(localPlayer?.health || 0)} / 100
            </span>
          </div>
        </div>

        {/* Ammo */}
        <div className="flex items-center gap-2">
          <span className="font-pixel text-[10px] text-yellow-400">AMMO</span>
          <div className="flex gap-1 items-center">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-4 rounded-xs transition-colors ${
                  i < (localPlayer?.ammo || 0) ? 'bg-yellow-400' : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
          <button
            onClick={handleManualReload}
            className="text-[10px] text-slate-400 hover:text-white font-mono underline ml-1 cursor-pointer"
          >
            [R]
          </button>
        </div>

        {/* Stamina */}
        <div className="flex items-center gap-2">
          <span className="font-pixel text-[10px] text-sky-400">STAMINA</span>
          <div className="w-28 sm:w-36 h-3 bg-slate-950 rounded border border-slate-700 overflow-hidden">
            <div
              className="h-full bg-sky-500 transition-all"
              style={{ width: `${Math.max(0, localPlayer?.stamina || 0)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Voice Comms Bar */}
      <div className="w-full mt-2">
        <VoiceChatBar
          micPermission={voiceChat.micPermission}
          onRequestMic={voiceChat.requestMicAccess}
          isMuted={voiceChat.isMuted}
          onToggleMute={voiceChat.toggleMute}
          isPushToTalkActive={voiceChat.isPushToTalkActive}
          onStartPushToTalk={voiceChat.startPushToTalk}
          onStopPushToTalk={voiceChat.stopPushToTalk}
          voiceVolume={voiceChat.voiceVolume}
          recentBarks={voiceChat.recentBarks}
          onSendRadioBark={voiceChat.sendRadioBark}
          voiceSpeakers={activeState.voiceSpeakers || []}
        />
      </div>

      {/* AI Neural Learning Matrix Modal */}
      <AiNeuralModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        onModelReset={() => {
          setAiLogMessage(AiLearningSystem.getInstance().model.lastLog);
        }}
      />

      {/* Scoreboard Overlay */}
      {showScoreboard && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-xl p-5 max-w-2xl w-full shadow-2xl">
            <div className="flex justify-between items-center mb-3">
              <span className="font-pixel text-sm text-slate-200">MATCH SCOREBOARD</span>
              <button
                onClick={() => setShowScoreboard(false)}
                className="text-xs text-slate-400 hover:text-white font-mono cursor-pointer"
              >
                Close [ESC/TAB]
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div>
                <span className="font-pixel text-xs text-rose-400 mb-1 block">RED SQUAD ({activeState.score.red})</span>
                <div className="bg-slate-950 rounded border border-slate-800 divide-y divide-slate-800/60">
                  {(Object.values(activeState.players) as Player[])
                    .filter(p => p.team === 'red')
                    .map(p => (
                      <div key={p.id} className="p-2 flex justify-between items-center text-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{p.name}</span>
                          {p.isBot && <span className="text-[9px] bg-cyan-950 text-cyan-300 px-1 rounded border border-cyan-800">IA</span>}
                          {p.isCarryingFlag && <span className="text-[10px] text-amber-400">🚩 Carrier</span>}
                        </div>
                        <div className="flex gap-4 text-slate-400 text-[11px]">
                          <span>Tags: {p.kills}</span>
                          <span>Deaths: {p.deaths}</span>
                          <span className="text-amber-400">Caps: {p.captures}</span>
                          <span className="text-sky-400 font-semibold">{p.score} pts</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div>
                <span className="font-pixel text-xs text-sky-400 mb-1 block">BLUE SQUAD ({activeState.score.blue})</span>
                <div className="bg-slate-950 rounded border border-slate-800 divide-y divide-slate-800/60">
                  {(Object.values(activeState.players) as Player[])
                    .filter(p => p.team === 'blue')
                    .map(p => (
                      <div key={p.id} className="p-2 flex justify-between items-center text-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{p.name}</span>
                          {p.isBot && <span className="text-[9px] bg-cyan-950 text-cyan-300 px-1 rounded border border-cyan-800">IA</span>}
                          {p.isCarryingFlag && <span className="text-[10px] text-amber-400">🏁 Carrier</span>}
                        </div>
                        <div className="flex gap-4 text-slate-400 text-[11px]">
                          <span>Tags: {p.kills}</span>
                          <span>Deaths: {p.deaths}</span>
                          <span className="text-amber-400">Caps: {p.captures}</span>
                          <span className="text-sky-400 font-semibold">{p.score} pts</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
