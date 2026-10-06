import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Download, Upload, Play, CheckCircle2, AlertTriangle, Trash2, ArrowLeft, Copy, Check } from 'lucide-react';
import { MapData, TileType } from '../types/game';
import {
  createEmptyTileGrid,
  MAP_WIDTH,
  MAP_HEIGHT,
  TILE_SIZE,
  validateMap,
  exportMapToFile,
  parseMapFromString,
  MAP_CLASSIC_1995,
} from '../game/mapData';

interface MapEditorProps {
  onBackToMenu: () => void;
  onPlayCustomMap: (map: MapData) => void;
}

const TILE_PALETTE = [
  { type: TileType.EMPTY, label: 'Grass', color: '#17331d', icon: '🌿' },
  { type: TileType.WALL, label: 'Brick Wall', color: '#92400e', icon: '🧱' },
  { type: TileType.STEEL, label: 'Steel Armor', color: '#475569', icon: '🛡️' },
  { type: TileType.BUSH, label: 'Stealth Bush', color: '#15803d', icon: '🌳' },
  { type: TileType.WATER, label: 'Water River', color: '#0284c7', icon: '🌊' },
  { type: TileType.MUD, label: 'Mud Sludge', color: '#713f12', icon: '🟤' },
  { type: TileType.BOOST, label: 'Speed Pad', color: '#22c55e', icon: '⚡' },
  { type: TileType.MINE, label: 'Landmine', color: '#dc2626', icon: '💣' },
  { type: TileType.RED_BASE, label: 'Red Base', color: '#b91c1c', icon: '🔴' },
  { type: TileType.BLUE_BASE, label: 'Blue Base', color: '#1d4ed8', icon: '🔵' },
  { type: TileType.RED_FLAG, label: 'Red Flag', color: '#ef4444', icon: '🚩' },
  { type: TileType.BLUE_FLAG, label: 'Blue Flag', color: '#38bdf8', icon: '🏁' },
  { type: TileType.AMMO_SPAWN, label: 'Ammo Crate', color: '#eab308', icon: '📦' },
  { type: TileType.HEALTH_SPAWN, label: 'Health Kit', color: '#10b981', icon: '➕' },
];

export const MapEditor: React.FC<MapEditorProps> = ({ onBackToMenu, onPlayCustomMap }) => {
  const [mapName, setMapName] = useState('My Custom CTF Arena');
  const [author, setAuthor] = useState('Commander');
  const [description, setDescription] = useState('Custom tactical arena built in CTF 1995 editor.');
  const [selectedTile, setSelectedTile] = useState<TileType>(TileType.WALL);
  const [grid, setGrid] = useState<number[][]>(() => createEmptyTileGrid());
  const [copied, setCopied] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPaintingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Redraw the editor grid canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < MAP_HEIGHT; r++) {
      for (let c = 0; c < MAP_WIDTH; c++) {
        const tile = grid[r]?.[c] ?? TileType.EMPTY;
        const x = c * TILE_SIZE;
        const y = r * TILE_SIZE;

        // Base grass color
        ctx.fillStyle = (r + c) % 2 === 0 ? '#1b3b22' : '#17331d';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        switch (tile) {
          case TileType.WALL:
            ctx.fillStyle = '#92400e';
            ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            ctx.strokeStyle = '#78350f';
            ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            break;
          case TileType.STEEL:
            ctx.fillStyle = '#475569';
            ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            ctx.strokeStyle = '#94a3b8';
            ctx.strokeRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
            break;
          case TileType.BUSH:
            ctx.fillStyle = '#15803d';
            ctx.beginPath();
            ctx.arc(x + 16, y + 16, 12, 0, Math.PI * 2);
            ctx.fill();
            break;
          case TileType.WATER:
            ctx.fillStyle = '#0284c7';
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(x + 4, y + 10, 10, 2);
            break;
          case TileType.MUD:
            ctx.fillStyle = '#713f12';
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            break;
          case TileType.BOOST:
            ctx.fillStyle = '#064e3b';
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(x + 12, y + 8, 8, 16);
            break;
          case TileType.MINE:
            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.arc(x + 16, y + 16, 6, 0, Math.PI * 2);
            ctx.fill();
            break;
          case TileType.RED_BASE:
            ctx.fillStyle = '#450a0a';
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = '#ef4444';
            ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            break;
          case TileType.BLUE_BASE:
            ctx.fillStyle = '#082f49';
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = '#38bdf8';
            ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            break;
          case TileType.RED_FLAG:
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(x + 14, y + 4, 12, 8);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x + 12, y + 4, 2, 20);
            break;
          case TileType.BLUE_FLAG:
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(x + 14, y + 4, 12, 8);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x + 12, y + 4, 2, 20);
            break;
          case TileType.AMMO_SPAWN:
            ctx.fillStyle = '#eab308';
            ctx.fillRect(x + 8, y + 8, 16, 16);
            break;
          case TileType.HEALTH_SPAWN:
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x + 8, y + 8, 16, 16);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(x + 14, y + 10, 4, 12);
            ctx.fillRect(x + 10, y + 14, 12, 4);
            break;
        }

        // Grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
      }
    }
  }, [grid]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Handle painting onto grid
  const paintAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);

    if (row >= 0 && row < MAP_HEIGHT && col >= 0 && col < MAP_WIDTH) {
      setGrid(prev => {
        const next = prev.map(r => [...r]);
        // Don't overwrite outer border steel walls unless explicitly cleared
        if ((row === 0 || row === MAP_HEIGHT - 1 || col === 0 || col === MAP_WIDTH - 1) && selectedTile !== TileType.STEEL) {
          return prev;
        }
        next[row][col] = selectedTile;
        return next;
      });
    }
  };

  const constructCurrentMap = (): MapData => {
    let redSpawn = { x: 3 * TILE_SIZE + 16, y: 10 * TILE_SIZE + 16 };
    let blueSpawn = { x: 28 * TILE_SIZE + 16, y: 10 * TILE_SIZE + 16 };
    let redFlagPos = { x: 2 * TILE_SIZE + 16, y: 10 * TILE_SIZE + 16 };
    let blueFlagPos = { x: 29 * TILE_SIZE + 16, y: 10 * TILE_SIZE + 16 };

    for (let r = 0; r < MAP_HEIGHT; r++) {
      for (let c = 0; c < MAP_WIDTH; c++) {
        const t = grid[r][c];
        if (t === TileType.RED_FLAG) redFlagPos = { x: c * TILE_SIZE + 16, y: r * TILE_SIZE + 16 };
        if (t === TileType.BLUE_FLAG) blueFlagPos = { x: c * TILE_SIZE + 16, y: r * TILE_SIZE + 16 };
        if (t === TileType.RED_BASE) redSpawn = { x: c * TILE_SIZE + 16, y: r * TILE_SIZE + 16 };
        if (t === TileType.BLUE_BASE) blueSpawn = { x: c * TILE_SIZE + 16, y: r * TILE_SIZE + 16 };
      }
    }

    return {
      id: `custom-${Date.now()}`,
      name: mapName,
      author,
      description,
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
      tileSize: TILE_SIZE,
      tiles: grid,
      redSpawn,
      blueSpawn,
      redFlagPos,
      blueFlagPos,
      createdAt: new Date().toISOString(),
    };
  };

  const handleExportFile = () => {
    const map = constructCurrentMap();
    const v = validateMap(map);
    if (!v.valid) {
      setValidationError(v.error || 'Map validation failed.');
      return;
    }
    setValidationError(null);
    exportMapToFile(map);
  };

  const handleCopyCode = () => {
    const map = constructCurrentMap();
    navigator.clipboard.writeText(JSON.stringify(map));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const imported = parseMapFromString(content);
        setMapName(imported.name);
        setAuthor(imported.author);
        setDescription(imported.description || '');
        setGrid(imported.tiles);
        setValidationError(null);
      } catch (err: unknown) {
        setValidationError(err instanceof Error ? err.message : 'Failed to import map file');
      }
    };
    reader.readAsText(file);
  };

  const handlePlayNow = () => {
    const map = constructCurrentMap();
    const v = validateMap(map);
    if (!v.valid) {
      setValidationError(v.error || 'Map validation failed. Add both Red and Blue flags first.');
      return;
    }
    setValidationError(null);
    onPlayCustomMap(map);
  };

  const handleLoadClassicPreset = () => {
    setMapName(MAP_CLASSIC_1995.name);
    setAuthor(MAP_CLASSIC_1995.author);
    setDescription(MAP_CLASSIC_1995.description);
    setGrid(MAP_CLASSIC_1995.tiles);
  };

  const handleClearAll = () => {
    if (confirm('Clear entire canvas?')) {
      setGrid(createEmptyTileGrid());
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 flex flex-col gap-4">
      {/* Top Header & Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-slate-900/90 border border-slate-700/80 p-3 rounded-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToMenu}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-slate-200 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Main Menu</span>
          </button>
          <div>
            <h1 className="font-pixel text-sm text-emerald-400">RETRO MAP EDITOR '95</h1>
            <p className="text-xs text-slate-400">Create, test, export and share community CTF arenas</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Preset button */}
          <button
            onClick={handleLoadClassicPreset}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-slate-200 text-xs font-medium transition cursor-pointer"
          >
            Load 1995 Preset
          </button>

          {/* Import file */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 bg-sky-900/60 hover:bg-sky-800/80 border border-sky-600 rounded text-sky-200 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import .ctf95</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.ctf95.json"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Copy code */}
          <button
            onClick={handleCopyCode}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-slate-200 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Code'}</span>
          </button>

          {/* Export file */}
          <button
            onClick={handleExportFile}
            className="px-3 py-1.5 bg-emerald-900/60 hover:bg-emerald-800/80 border border-emerald-600 rounded text-emerald-200 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export File</span>
          </button>

          {/* Test Play */}
          <button
            onClick={handlePlayNow}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-pixel text-xs rounded shadow-[0_0_12px_rgba(245,158,11,0.6)] flex items-center gap-1.5 transition cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>TEST PLAY</span>
          </button>
        </div>
      </div>

      {/* Validation banner if any */}
      {validationError && (
        <div className="bg-rose-950/80 border border-rose-600 text-rose-200 p-2.5 rounded flex items-center gap-2 text-xs">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Metadata Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/80 border border-slate-800 p-3 rounded-lg text-xs">
        <div>
          <label className="block text-slate-400 mb-1 font-mono">Map Title</label>
          <input
            type="text"
            value={mapName}
            onChange={e => setMapName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:outline-emerald-500"
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1 font-mono">Author Name</label>
          <input
            type="text"
            value={author}
            onChange={e => setAuthor(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:outline-emerald-500"
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1 font-mono">Description / Notes</label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:outline-emerald-500"
          />
        </div>
      </div>

      {/* Main Workspace: Palette & Grid Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Tile Palette (Left Sidebar) */}
        <div className="lg:col-span-3 bg-slate-900/90 border border-slate-800 p-3 rounded-lg flex flex-col gap-2">
          <div className="flex items-center justify-between mb-1">
            <span className="font-pixel text-[10px] text-slate-300">TILE PALETTE</span>
            <button
              onClick={handleClearAll}
              className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5 max-h-[480px] overflow-y-auto pr-1">
            {TILE_PALETTE.map(t => {
              const isSelected = selectedTile === t.type;
              return (
                <button
                  key={t.type}
                  onClick={() => setSelectedTile(t.type)}
                  className={`flex items-center gap-2 p-2 rounded text-left transition cursor-pointer text-xs border ${
                    isSelected
                      ? 'bg-emerald-950/80 border-emerald-400 text-white font-medium shadow-[0_0_8px_rgba(52,211,153,0.3)]'
                      : 'bg-slate-950/60 hover:bg-slate-800 border-slate-800 text-slate-300'
                  }`}
                >
                  <span className="text-base">{t.icon}</span>
                  <span className="truncate">{t.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-auto p-2 bg-slate-950 rounded border border-slate-800 text-[11px] text-slate-400 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Map Requirements:</span>
            </div>
            <span>• 1x RED Flag Stand (🚩)</span>
            <span>• 1x BLUE Flag Stand (🏁)</span>
            <span>• Bases & tactical covers recommended</span>
          </div>
        </div>

        {/* Canvas Drawing Area */}
        <div className="lg:col-span-9 bg-slate-950 border border-slate-800 rounded-lg p-3 flex flex-col items-center justify-center overflow-x-auto">
          <canvas
            ref={canvasRef}
            width={MAP_WIDTH * TILE_SIZE}
            height={MAP_HEIGHT * TILE_SIZE}
            onMouseDown={e => {
              isPaintingRef.current = true;
              paintAt(e.clientX, e.clientY);
            }}
            onMouseMove={e => {
              if (isPaintingRef.current) {
                paintAt(e.clientX, e.clientY);
              }
            }}
            onMouseUp={() => {
              isPaintingRef.current = false;
            }}
            onMouseLeave={() => {
              isPaintingRef.current = false;
            }}
            onTouchStart={e => {
              isPaintingRef.current = true;
              paintAt(e.touches[0].clientX, e.touches[0].clientY);
            }}
            onTouchMove={e => {
              if (isPaintingRef.current && e.touches[0]) {
                paintAt(e.touches[0].clientX, e.touches[0].clientY);
              }
            }}
            onTouchEnd={() => {
              isPaintingRef.current = false;
            }}
            className="border-2 border-slate-700 rounded shadow-2xl cursor-crosshair max-w-full h-auto pixelated"
          />
          <span className="text-[10px] text-slate-500 mt-2 font-mono">
            Grid Resolution: 32x20 tiles (1024x640px) • Click or drag to paint selected tile
          </span>
        </div>
      </div>
    </div>
  );
};
