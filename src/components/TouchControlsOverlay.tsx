import React, { useRef, useState, useCallback } from 'react';
import { Zap, Crosshair, RotateCcw, Mic, Users, Megaphone, EyeOff, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Sliders } from 'lucide-react';

interface TouchControlsOverlayProps {
  leftJoyCenter: { x: number; y: number } | null;
  leftJoyPos: { x: number; y: number } | null;
  isLeftJoyActive: boolean;
  onPointerDownLeft: (e: React.PointerEvent) => void;
  onPointerMoveLeft: (e: React.PointerEvent) => void;
  onPointerUpLeft: (e: React.PointerEvent) => void;
  onTouchStartLeft: (e: React.TouchEvent) => void;
  onTouchMoveLeft: (e: React.TouchEvent) => void;
  onTouchEndLeft: (e: React.TouchEvent) => void;
  onSetShooting: (active: boolean) => void;
  onSetDashing: (active: boolean) => void;
  onSetPushToTalk: (active: boolean) => void;
  onReload: () => void;
  onToggleScoreboard: () => void;
  onQuickPing: () => void;
  onSetAimAngle?: (angle: number | null) => void;
  onToggleHide?: () => void;
}

export const TouchControlsOverlay: React.FC<TouchControlsOverlayProps> = ({
  leftJoyCenter,
  leftJoyPos,
  isLeftJoyActive,
  onPointerDownLeft,
  onPointerMoveLeft,
  onPointerUpLeft,
  onTouchStartLeft,
  onTouchMoveLeft,
  onTouchEndLeft,
  onSetShooting,
  onSetDashing,
  onSetPushToTalk,
  onReload,
  onToggleScoreboard,
  onQuickPing,
  onSetAimAngle,
  onToggleHide,
}) => {
  const [isAimingRight, setIsAimingRight] = useState(false);
  const rightTouchStart = useRef<{ x: number; y: number } | null>(null);

  // Transparency level state: default to 30% (ultra translucent glass HUD)
  const [transparencyLevel, setTransparencyLevel] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('ctf95_touch_opacity');
      if (saved) return parseFloat(saved);
    } catch {}
    return 0.3; // 30% default opacity for unobstructed gameplay
  });

  const cycleTransparency = useCallback(() => {
    setTransparencyLevel(prev => {
      let next = 0.3;
      if (prev <= 0.25) next = 0.45;
      else if (prev <= 0.4) next = 0.65;
      else if (prev <= 0.6) next = 0.18; // Super clear glass
      else next = 0.3;
      try {
        localStorage.setItem('ctf95_touch_opacity', String(next));
      } catch {}
      return next;
    });
  }, []);

  // Right-screen aim drag handler (allows sweeping thumb to aim weapon)
  const handleAimPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return; // Ignore if clicking buttons
    const rect = e.currentTarget.getBoundingClientRect();
    rightTouchStart.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setIsAimingRight(true);
  }, []);

  const handleAimPointerMove = useCallback((e: React.PointerEvent) => {
    if (!rightTouchStart.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const dx = currentX - rightTouchStart.current.x;
    const dy = currentY - rightTouchStart.current.y;
    if (Math.hypot(dx, dy) > 10) {
      const angle = Math.atan2(dy, dx);
      onSetAimAngle?.(angle);
    }
  }, [onSetAimAngle]);

  const handleAimPointerUp = useCallback(() => {
    rightTouchStart.current = null;
    setIsAimingRight(false);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-30 flex justify-between touch-none">
      {/* LEFT ZONE: Virtual Movement Joystick */}
      <div
        className="w-1/2 h-full pointer-events-auto relative touch-none"
        onPointerDown={onPointerDownLeft}
        onPointerMove={onPointerMoveLeft}
        onPointerUp={onPointerUpLeft}
        onPointerCancel={onPointerUpLeft}
        onTouchStart={onTouchStartLeft}
        onTouchMove={onTouchMoveLeft}
        onTouchEnd={onTouchEndLeft}
        onTouchCancel={onTouchEndLeft}
      >
        {/* Dynamic active joystick knob following player's thumb */}
        {leftJoyCenter && leftJoyPos ? (
          <div
            className="absolute rounded-full border border-emerald-400/40 bg-emerald-950/15 backdrop-blur-[1px] flex items-center justify-center -translate-x-1/2 -translate-y-1/2 pointer-events-none shadow-[0_0_15px_rgba(16,185,129,0.15)]"
            style={{
              left: `${leftJoyCenter.x}px`,
              top: `${leftJoyCenter.y}px`,
              width: '110px',
              height: '110px',
              opacity: Math.min(1, transparencyLevel + 0.35),
            }}
          >
            {/* Direction guides */}
            <ChevronUp className="w-4 h-4 text-emerald-300/40 absolute top-1" />
            <ChevronDown className="w-4 h-4 text-emerald-300/40 absolute bottom-1" />
            <ChevronLeft className="w-4 h-4 text-emerald-300/40 absolute left-1" />
            <ChevronRight className="w-4 h-4 text-emerald-300/40 absolute right-1" />

            {/* Inner thumb knob - semi-transparent glass */}
            <div
              className="w-12 h-12 rounded-full bg-emerald-400/35 border-2 border-emerald-200/70 shadow-[0_0_12px_rgba(52,211,153,0.4)] absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
              style={{
                left: `${leftJoyPos.x - leftJoyCenter.x + 55}px`,
                top: `${leftJoyPos.y - leftJoyCenter.y + 55}px`,
              }}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-white/50 border border-white/70" />
            </div>
          </div>
        ) : (
          /* Fixed Base Joystick resting in bottom-left when idle - ultra transparent glass */
          <div
            className="absolute bottom-6 left-6 flex flex-col items-center pointer-events-none transition-opacity"
            style={{ opacity: transparencyLevel }}
          >
            <div className="relative w-26 h-26 rounded-full border border-dashed border-emerald-400/40 bg-emerald-950/10 flex items-center justify-center">
              {/* Directional indicators */}
              <span className="absolute top-1 text-[8px] font-pixel text-emerald-300/60">▲</span>
              <span className="absolute bottom-1 text-[8px] font-pixel text-emerald-300/60">▼</span>
              <span className="absolute left-1.5 text-[8px] font-pixel text-emerald-300/60">◄</span>
              <span className="absolute right-1.5 text-[8px] font-pixel text-emerald-300/60">►</span>

              {/* Center Rest Knob */}
              <div className="w-11 h-11 rounded-full bg-emerald-500/15 border border-emerald-400/40 flex flex-col items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-300/60" />
              </div>
            </div>
            <span className="text-[9px] text-emerald-300/60 font-mono mt-1">
              Joy Táctil
            </span>
          </div>
        )}
      </div>

      {/* RIGHT ZONE: Aim Sweep & Action Arcade Buttons */}
      <div
        className="w-1/2 h-full pointer-events-auto relative flex flex-col justify-between items-end p-3 sm:p-5 touch-none"
        onPointerDown={handleAimPointerDown}
        onPointerMove={handleAimPointerMove}
        onPointerUp={handleAimPointerUp}
        onPointerCancel={handleAimPointerUp}
      >
        {/* Top utility row: Opacity, Ping, Scoreboard & Toggle Hide - translucent */}
        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto opacity-70 hover:opacity-100 transition-opacity">
          {/* Opacity level cycler button */}
          <button
            onClick={cycleTransparency}
            className="px-2 py-1 rounded bg-black/30 border border-white/20 text-slate-200 text-[10px] font-mono flex items-center gap-1 active:scale-95 cursor-pointer backdrop-blur-[2px]"
            title="Ajustar transparencia del joystick táctil"
          >
            <Sliders className="w-3 h-3 text-emerald-400" />
            <span>{Math.round(transparencyLevel * 100)}%</span>
          </button>

          {onToggleHide && (
            <button
              onClick={onToggleHide}
              className="px-2 py-1 rounded bg-black/30 border border-white/20 text-slate-300 text-[10px] font-mono flex items-center gap-1 active:scale-95 cursor-pointer backdrop-blur-[2px]"
              title="Ocultar Joystick Virtual"
            >
              <EyeOff className="w-3 h-3" />
              <span>Ocultar</span>
            </button>
          )}

          <button
            onClick={onQuickPing}
            className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center active:scale-90 cursor-pointer backdrop-blur-[2px]"
            title="Radio Tactical Ping"
          >
            <Megaphone className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onToggleScoreboard}
            className="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 flex items-center justify-center active:scale-90 cursor-pointer backdrop-blur-[2px]"
            title="Marcador / Tab"
          >
            <Users className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Aim hint when touching right half */}
        {isAimingRight && (
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 pointer-events-none bg-rose-950/40 border border-rose-500/50 text-rose-300 px-2 py-0.5 rounded text-[10px] font-mono">
            🎯 Apuntando
          </div>
        )}

        {/* Bottom Combat Arcade Controls Cluster - Transparent Glass */}
        <div
          className="flex flex-col items-end gap-2.5 pointer-events-auto mb-2 transition-opacity"
          style={{ opacity: transparencyLevel }}
        >
          {/* Secondary tactical buttons row */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Push-To-Talk Voice button */}
            <button
              onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onSetPushToTalk(true); }}
              onPointerUp={(e) => { e.preventDefault(); e.stopPropagation(); onSetPushToTalk(false); }}
              onPointerCancel={(e) => { e.preventDefault(); e.stopPropagation(); onSetPushToTalk(false); }}
              onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); onSetPushToTalk(true); }}
              onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onSetPushToTalk(false); }}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 flex flex-col items-center justify-center active:bg-emerald-500/60 active:border-emerald-300 cursor-pointer select-none backdrop-blur-[1px]"
            >
              <Mic className="w-3.5 h-3.5" />
              <span className="text-[7px] font-pixel mt-0.5">VOZ</span>
            </button>

            {/* Reload Ammo button */}
            <button
              onClick={(e) => { e.stopPropagation(); onReload(); }}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-sky-500/20 border border-sky-400/50 text-sky-300 flex flex-col items-center justify-center active:bg-sky-500/60 active:border-sky-300 cursor-pointer select-none backdrop-blur-[1px]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-[7px] font-pixel mt-0.5">REC</span>
            </button>

            {/* Sprint / Dash button */}
            <button
              onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onSetDashing(true); }}
              onPointerUp={(e) => { e.preventDefault(); e.stopPropagation(); onSetDashing(false); }}
              onPointerCancel={(e) => { e.preventDefault(); e.stopPropagation(); onSetDashing(false); }}
              onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); onSetDashing(true); }}
              onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onSetDashing(false); }}
              className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-amber-500/25 border-2 border-amber-400/60 text-amber-300 flex flex-col items-center justify-center active:bg-amber-500/70 active:text-black cursor-pointer select-none backdrop-blur-[1px] font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)]"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span className="text-[7px] font-pixel">DASH</span>
            </button>
          </div>

          {/* Primary Action Button: FIRE - Translucent Glass Neon */}
          <div className="flex items-center gap-2">
            <button
              onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onSetShooting(true); }}
              onPointerUp={(e) => { e.preventDefault(); e.stopPropagation(); onSetShooting(false); }}
              onPointerCancel={(e) => { e.preventDefault(); e.stopPropagation(); onSetShooting(false); }}
              onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); onSetShooting(true); }}
              onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onSetShooting(false); }}
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-rose-600/25 border-2 border-rose-400/60 text-rose-200 flex flex-col items-center justify-center active:bg-rose-600/70 active:border-rose-200 cursor-pointer select-none backdrop-blur-[1px] shadow-[0_0_15px_rgba(225,29,72,0.3)]"
            >
              <Crosshair className="w-7 h-7 sm:w-8 sm:h-8 animate-pulse text-rose-300" />
              <span className="text-[8px] sm:text-[9px] font-pixel tracking-wider mt-0.5">DISPARO</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
