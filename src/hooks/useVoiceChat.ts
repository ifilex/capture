import { useState, useEffect, useRef, useCallback } from 'react';
import { soundManager } from '../audio/soundManager';
import { TacticalRadioBark, Team } from '../types/game';

export function useVoiceChat(
  myTeam: Team,
  myName: string,
  onSendVoiceStatus: (speaking: boolean) => void,
  onSendRadioBark: (text: string) => void
) {
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [isMuted, setIsMuted] = useState(false);
  const [isPushToTalkActive, setIsPushToTalkActive] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(0); // 0 - 100 VU
  const [recentBarks, setRecentBarks] = useState<TacticalRadioBark[]>([]);

  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Request microphone access
  const requestMicAccess = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMicPermission('denied');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      setMicPermission('granted');

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Monitor volume
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const checkVolume = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const vol = Math.min(100, Math.round((avg / 128) * 100));
          setVoiceVolume(vol);
        }
        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };
      checkVolume();
    } catch {
      setMicPermission('denied');
    }
  }, []);

  // Push to talk start
  const startPushToTalk = useCallback(() => {
    if (isMuted) return;
    setIsPushToTalkActive(true);
    soundManager.playRadioClick(true);
    onSendVoiceStatus(true);
  }, [isMuted, onSendVoiceStatus]);

  // Push to talk stop
  const stopPushToTalk = useCallback(() => {
    setIsPushToTalkActive(false);
    soundManager.playRadioClick(false);
    onSendVoiceStatus(false);
  }, [onSendVoiceStatus]);

  // Keyboard shortcut listener: 'V' key for Push-to-Talk
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.code === 'KeyV' && !e.repeat && !isPushToTalkActive) {
        startPushToTalk();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.code === 'KeyV') {
        stopPushToTalk();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPushToTalkActive, startPushToTalk, stopPushToTalk]);

  // Quick Tactical Radio Barks
  const sendRadioBark = useCallback((text: string) => {
    soundManager.playRadioClick(true);
    onSendRadioBark(text);
    const newBark: TacticalRadioBark = {
      id: `${Date.now()}-${Math.random()}`,
      text,
      team: myTeam,
      sender: myName,
      timestamp: Date.now(),
    };
    setRecentBarks(prev => [newBark, ...prev].slice(0, 4));
  }, [myTeam, myName, onSendRadioBark]);

  const receiveRadioBark = useCallback((bark: TacticalRadioBark) => {
    soundManager.playRadioClick(true);
    setRecentBarks(prev => [bark, ...prev].slice(0, 4));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    micPermission,
    requestMicAccess,
    isMuted,
    toggleMute: () => setIsMuted(prev => !prev),
    isPushToTalkActive,
    startPushToTalk,
    stopPushToTalk,
    voiceVolume,
    sendRadioBark,
    receiveRadioBark,
    recentBarks,
  };
}
