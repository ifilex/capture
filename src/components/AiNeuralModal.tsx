import React from 'react';
import { Brain, RotateCcw, X, ShieldAlert, Target, Zap, Activity } from 'lucide-react';
import { AiLearningSystem, AiLearningModel } from '../game/aiLearning';

interface AiNeuralModalProps {
  isOpen: boolean;
  onClose: () => void;
  onModelReset: () => void;
}

export const AiNeuralModal: React.FC<AiNeuralModalProps> = ({ isOpen, onClose, onModelReset }) => {
  if (!isOpen) return null;

  const aiSystem = AiLearningSystem.getInstance();
  const model: AiLearningModel = aiSystem.model;

  const totalLaneHits = (model.laneStats.top || 1) + (model.laneStats.mid || 1) + (model.laneStats.bottom || 1);
  const topPct = Math.round(((model.laneStats.top || 1) / totalLaneHits) * 100);
  const midPct = Math.round(((model.laneStats.mid || 1) / totalLaneHits) * 100);
  const botPct = Math.round(((model.laneStats.bottom || 1) / totalLaneHits) * 100);

  const leadPct = Math.round((model.leadFactor || 1.15) * 100);

  const handleReset = () => {
    aiSystem.resetMemory();
    onModelReset();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-cyan-500/80 rounded-xl p-5 max-w-lg w-full shadow-[0_0_30px_rgba(6,182,212,0.3)] flex flex-col gap-4 font-mono text-xs text-slate-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-cyan-400">
            <Brain className="w-5 h-5 animate-pulse" />
            <h3 className="font-pixel text-sm text-cyan-300">MATRIZ NEURONAL DE IA TÁCTICA</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Overview */}
        <div className="bg-slate-950 p-3 rounded-lg border border-cyan-900/60 flex items-center justify-between">
          <div>
            <span className="text-slate-400 block text-[11px]">Nivel de Adaptación Global:</span>
            <span className="font-pixel text-base text-cyan-300">NIVEL {model.adaptationLevel} / 10</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block text-[11px]">Partidas Registradas:</span>
            <span className="text-white font-bold text-sm">{model.gamesAnalyzed} enfrentamientos</span>
          </div>
        </div>

        {/* Real-time Telemetry Log */}
        <div className="bg-slate-950/80 p-2.5 rounded border border-slate-800 text-[11px] text-cyan-200">
          <div className="flex items-center gap-1.5 text-cyan-400 mb-1 font-bold">
            <Activity className="w-3.5 h-3.5" />
            <span>Última Deducción Táctica:</span>
          </div>
          <p className="text-slate-300 leading-relaxed font-sans">{model.lastLog}</p>
        </div>

        {/* Lane Analysis */}
        <div>
          <div className="flex items-center gap-1.5 text-amber-400 mb-2 font-bold">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Distribución de Carriles Ofensivos del Jugador:</span>
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span>Carril Norte (Superior)</span>
                <span className={model.preferredDefenseLane === 'top' ? 'text-rose-400 font-bold' : ''}>
                  {topPct}% {model.preferredDefenseLane === 'top' ? '★ CENTINELA ASIGNADO' : ''}
                </span>
              </div>
              <div className="h-2 bg-slate-950 rounded overflow-hidden border border-slate-800">
                <div className="h-full bg-rose-500" style={{ width: `${topPct}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span>Carril Central</span>
                <span className={model.preferredDefenseLane === 'mid' ? 'text-amber-400 font-bold' : ''}>
                  {midPct}% {model.preferredDefenseLane === 'mid' ? '★ CENTINELA ASIGNADO' : ''}
                </span>
              </div>
              <div className="h-2 bg-slate-950 rounded overflow-hidden border border-slate-800">
                <div className="h-full bg-amber-500" style={{ width: `${midPct}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span>Carril Sur (Inferior)</span>
                <span className={model.preferredDefenseLane === 'bottom' ? 'text-sky-400 font-bold' : ''}>
                  {botPct}% {model.preferredDefenseLane === 'bottom' ? '★ CENTINELA ASIGNADO' : ''}
                </span>
              </div>
              <div className="h-2 bg-slate-950 rounded overflow-hidden border border-slate-800">
                <div className="h-full bg-sky-500" style={{ width: `${botPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Tactical Parameters */}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="bg-slate-950 p-2 rounded border border-slate-800">
            <div className="flex items-center gap-1 text-cyan-400 mb-1">
              <Target className="w-3 h-3" />
              <span>Anticipación Balística:</span>
            </div>
            <span className="text-white font-bold">{leadPct}% (Compensación de velocidad)</span>
          </div>

          <div className="bg-slate-950 p-2 rounded border border-slate-800">
            <div className="flex items-center gap-1 text-emerald-400 mb-1">
              <Zap className="w-3 h-3" />
              <span>Contramedida de Asalto:</span>
            </div>
            <span className="text-white font-bold">
              {model.antiRusherKiting ? 'ACTIVA (Kiting & Retroceso)' : 'INACTIVA'}
            </span>
          </div>

          <div className="bg-slate-950 p-2 rounded border border-slate-800">
            <span className="text-slate-400 block mb-1">Detección en Arbustos:</span>
            <span className={model.bushReconEnabled ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
              {model.bushReconEnabled ? 'Reconocimiento a Ciegas Activado' : 'Estándar'}
            </span>
          </div>

          <div className="bg-slate-950 p-2 rounded border border-slate-800">
            <span className="text-slate-400 block mb-1">Esquivas Zig-Zag Registradas:</span>
            <span className="text-white font-bold">{model.jukeCount} jukes analizados</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-700 text-rose-300 rounded flex items-center gap-1.5 transition cursor-pointer text-[11px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reiniciar Memoria de IA</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-black font-pixel text-[11px] rounded transition cursor-pointer"
          >
            ENTENDIDO
          </button>
        </div>
      </div>
    </div>
  );
};
