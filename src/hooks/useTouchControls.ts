import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface TouchControlsState {
  isTouchDevice: boolean;
  showVirtualJoystick: boolean;
  moveVector: { x: number; y: number };
  aimAngle: number | null;
  isShooting: boolean;
  isDashing: boolean;
  isPushToTalk: boolean;
}

export function useTouchControls() {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [showVirtualJoystick, setShowVirtualJoystick] = useState(() => {
    try {
      const saved = localStorage.getItem('ctf95_touch_enabled');
      if (saved !== null) return saved === 'true';
    } catch {}
    // Default to true if mobile/touch detected or smaller screen
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.innerWidth <= 1024
    );
  });

  const stateRef = useRef<TouchControlsState>({
    isTouchDevice: false,
    showVirtualJoystick: false,
    moveVector: { x: 0, y: 0 },
    aimAngle: null,
    isShooting: false,
    isDashing: false,
    isPushToTalk: false,
  });

  // Keep stateRef updated with showVirtualJoystick & isTouchDevice
  useEffect(() => {
    stateRef.current.showVirtualJoystick = showVirtualJoystick;
  }, [showVirtualJoystick]);

  // Touch joystick tracking
  const [leftJoyCenter, setLeftJoyCenter] = useState<{ x: number; y: number } | null>(null);
  const [leftJoyPos, setLeftJoyPos] = useState<{ x: number; y: number } | null>(null);
  const [isLeftJoyActive, setIsLeftJoyActive] = useState(false);
  const leftPointerId = useRef<number | null>(null);

  // Right Aim Stick tracking (optional twin-stick mode)
  const [rightJoyCenter, setRightJoyCenter] = useState<{ x: number; y: number } | null>(null);
  const [rightJoyPos, setRightJoyPos] = useState<{ x: number; y: number } | null>(null);
  const rightPointerId = useRef<number | null>(null);

  useEffect(() => {
    const hasTouch =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.innerWidth <= 1024;
    setIsTouchDevice(hasTouch);
    stateRef.current.isTouchDevice = hasTouch;
  }, []);

  const toggleVirtualJoystick = useCallback(() => {
    setShowVirtualJoystick((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ctf95_touch_enabled', String(next));
      } catch {}
      return next;
    });
  }, []);

  // Left Joystick (Movement) - Pointer Event Handlers
  const handlePointerDownLeft = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    leftPointerId.current = e.pointerId;

    const rect = e.currentTarget.getBoundingClientRect();
    const touchX = e.clientX - rect.left;
    const touchY = e.clientY - rect.top;

    setLeftJoyCenter({ x: touchX, y: touchY });
    setLeftJoyPos({ x: touchX, y: touchY });
    setIsLeftJoyActive(true);
    stateRef.current.moveVector = { x: 0, y: 0 };
  }, []);

  const handlePointerMoveLeft = useCallback(
    (e: React.PointerEvent) => {
      if (leftPointerId.current !== e.pointerId || !leftJoyCenter) return;
      e.preventDefault();

      const rect = e.currentTarget.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      const dx = currentX - leftJoyCenter.x;
      const dy = currentY - leftJoyCenter.y;
      const dist = Math.hypot(dx, dy);
      const maxRadius = 48; // Maximum thumbstick throw distance

      let nx = dx;
      let ny = dy;
      if (dist > maxRadius) {
        nx = (dx / dist) * maxRadius;
        ny = (dy / dist) * maxRadius;
      }

      setLeftJoyPos({ x: leftJoyCenter.x + nx, y: leftJoyCenter.y + ny });

      // Apply deadzone of 5px
      if (dist > 5) {
        const vx = nx / maxRadius;
        const vy = ny / maxRadius;
        stateRef.current.moveVector = { x: vx, y: vy };
      } else {
        stateRef.current.moveVector = { x: 0, y: 0 };
      }
    },
    [leftJoyCenter]
  );

  const handlePointerUpLeft = useCallback((e: React.PointerEvent) => {
    if (leftPointerId.current === e.pointerId || e.pointerId === undefined) {
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {}
      leftPointerId.current = null;
      setLeftJoyCenter(null);
      setLeftJoyPos(null);
      setIsLeftJoyActive(false);
      stateRef.current.moveVector = { x: 0, y: 0 };
    }
  }, []);

  // Also support standard touch events as robust fallback
  const handleTouchStartLeft = useCallback((e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    leftPointerId.current = touch.identifier;
    const rect = e.currentTarget.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;

    setLeftJoyCenter({ x: touchX, y: touchY });
    setLeftJoyPos({ x: touchX, y: touchY });
    setIsLeftJoyActive(true);
    stateRef.current.moveVector = { x: 0, y: 0 };
  }, []);

  const handleTouchMoveLeft = useCallback(
    (e: React.TouchEvent) => {
      if (!leftJoyCenter) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === leftPointerId.current) {
          const rect = e.currentTarget.getBoundingClientRect();
          const currentX = touch.clientX - rect.left;
          const currentY = touch.clientY - rect.top;

          const dx = currentX - leftJoyCenter.x;
          const dy = currentY - leftJoyCenter.y;
          const dist = Math.hypot(dx, dy);
          const maxRadius = 48;

          let nx = dx;
          let ny = dy;
          if (dist > maxRadius) {
            nx = (dx / dist) * maxRadius;
            ny = (dy / dist) * maxRadius;
          }

          setLeftJoyPos({ x: leftJoyCenter.x + nx, y: leftJoyCenter.y + ny });

          if (dist > 5) {
            stateRef.current.moveVector = {
              x: nx / maxRadius,
              y: ny / maxRadius,
            };
          } else {
            stateRef.current.moveVector = { x: 0, y: 0 };
          }
          break;
        }
      }
    },
    [leftJoyCenter]
  );

  const handleTouchEndLeft = useCallback((e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === leftPointerId.current) {
        leftPointerId.current = null;
        setLeftJoyCenter(null);
        setLeftJoyPos(null);
        setIsLeftJoyActive(false);
        stateRef.current.moveVector = { x: 0, y: 0 };
        break;
      }
    }
  }, []);

  // Combat action triggers
  const setShooting = useCallback((active: boolean) => {
    stateRef.current.isShooting = active;
    if (active && navigator.vibrate) {
      try {
        navigator.vibrate(15);
      } catch {}
    }
  }, []);

  const setDashing = useCallback((active: boolean) => {
    stateRef.current.isDashing = active;
    if (active && navigator.vibrate) {
      try {
        navigator.vibrate(25);
      } catch {}
    }
  }, []);

  const setPushToTalk = useCallback((active: boolean) => {
    stateRef.current.isPushToTalk = active;
  }, []);

  const setAimAngle = useCallback((angle: number | null) => {
    stateRef.current.aimAngle = angle;
  }, []);

  // Fixed Joypad center in fixed mode (optional)
  const setFixedVector = useCallback((vx: number, vy: number) => {
    stateRef.current.moveVector = { x: vx, y: vy };
  }, []);

  const getState = useRef(() => stateRef.current);

  return {
    isTouchDevice,
    setIsTouchDevice,
    showVirtualJoystick,
    setShowVirtualJoystick,
    toggleVirtualJoystick,
    getState: getState.current,
    leftJoyCenter,
    leftJoyPos,
    isLeftJoyActive,
    handlePointerDownLeft,
    handlePointerMoveLeft,
    handlePointerUpLeft,
    handleTouchStartLeft,
    handleTouchMoveLeft,
    handleTouchEndLeft,
    setShooting,
    setDashing,
    setPushToTalk,
    setAimAngle,
    setFixedVector,
  };
}
