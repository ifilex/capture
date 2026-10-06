import { useState, useEffect, useRef } from 'react';

export interface GamepadState {
  connected: boolean;
  id: string;
  moveX: number;
  moveY: number;
  aimAngle: number | null;
  isShooting: boolean;
  isDashing: boolean;
  isPushToTalk: boolean;
  showScoreboard: boolean;
  quickBark: string | null;
}

export function useGamepad(onQuickBark?: (bark: string) => void) {
  const [gamepadInfo, setGamepadInfo] = useState<{ connected: boolean; name: string }>({
    connected: false,
    name: '',
  });

  const stateRef = useRef<GamepadState>({
    connected: false,
    id: '',
    moveX: 0,
    moveY: 0,
    aimAngle: null,
    isShooting: false,
    isDashing: false,
    isPushToTalk: false,
    showScoreboard: false,
    quickBark: null,
  });

  const lastDpadUp = useRef(false);
  const lastDpadDown = useRef(false);
  const lastDpadLeft = useRef(false);
  const lastDpadRight = useRef(false);
  const onQuickBarkRef = useRef(onQuickBark);
  onQuickBarkRef.current = onQuickBark;

  useEffect(() => {
    const handleConnected = (e: GamepadEvent) => {
      setGamepadInfo({
        connected: true,
        name: e.gamepad.id || 'Console Gamepad',
      });
      stateRef.current.connected = true;
      stateRef.current.id = e.gamepad.id;
    };

    const handleDisconnected = () => {
      setGamepadInfo({
        connected: false,
        name: '',
      });
      stateRef.current.connected = false;
    };

    window.addEventListener('gamepadconnected', handleConnected);
    window.addEventListener('gamepaddisconnected', handleDisconnected);

    let animationFrame: number;

    const pollGamepad = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gamepads[0] || gamepads[1] || gamepads[2] || gamepads[3];

      if (gp && gp.connected) {
        if (!stateRef.current.connected) {
          stateRef.current.connected = true;
          setGamepadInfo({ connected: true, name: gp.id });
        }

        // Left Stick (Axes 0, 1) with Deadzone
        const deadzone = 0.18;
        let lx = gp.axes[0] || 0;
        let ly = gp.axes[1] || 0;
        if (Math.abs(lx) < deadzone) lx = 0;
        if (Math.abs(ly) < deadzone) ly = 0;

        stateRef.current.moveX = lx;
        stateRef.current.moveY = ly;

        // Right Stick (Axes 2, 3) for Aiming
        let rx = gp.axes[2] || 0;
        let ry = gp.axes[3] || 0;
        if (Math.abs(rx) > deadzone || Math.abs(ry) > deadzone) {
          stateRef.current.aimAngle = Math.atan2(ry, rx);
        }

        // RT (Trigger) or Button 7 for Shooting
        const rt = gp.buttons[7]?.pressed || (gp.buttons[7]?.value || 0) > 0.4 || gp.buttons[5]?.pressed;
        stateRef.current.isShooting = !!rt;

        // LT (Trigger) or Button 0 (A) for Sprint / Dash
        const lt = gp.buttons[6]?.pressed || (gp.buttons[6]?.value || 0) > 0.4 || gp.buttons[0]?.pressed;
        stateRef.current.isDashing = !!lt;

        // Button 3 (Y) for Push-to-Talk
        stateRef.current.isPushToTalk = !!gp.buttons[3]?.pressed;

        // Button 8 (Select/Back) for Scoreboard
        stateRef.current.showScoreboard = !!gp.buttons[8]?.pressed;

        // D-Pad for Quick Tactical Radio Barks
        const dpadUp = !!gp.buttons[12]?.pressed;
        const dpadDown = !!gp.buttons[13]?.pressed;
        const dpadLeft = !!gp.buttons[14]?.pressed;
        const dpadRight = !!gp.buttons[15]?.pressed;

        if (dpadUp && !lastDpadUp.current) onQuickBarkRef.current?.('Need backup at base!');
        if (dpadDown && !lastDpadDown.current) onQuickBarkRef.current?.('Defend our flag!');
        if (dpadLeft && !lastDpadLeft.current) onQuickBarkRef.current?.('Enemy spotted on flank!');
        if (dpadRight && !lastDpadRight.current) onQuickBarkRef.current?.('I am taking their flag!');

        lastDpadUp.current = dpadUp;
        lastDpadDown.current = dpadDown;
        lastDpadLeft.current = dpadLeft;
        lastDpadRight.current = dpadRight;
      } else if (stateRef.current.connected) {
        stateRef.current.connected = false;
        setGamepadInfo({ connected: false, name: '' });
      }

      animationFrame = requestAnimationFrame(pollGamepad);
    };

    animationFrame = requestAnimationFrame(pollGamepad);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('gamepadconnected', handleConnected);
      window.removeEventListener('gamepaddisconnected', handleDisconnected);
    };
  }, []);

  const getGamepadState = useRef(() => stateRef.current);

  return {
    gamepadInfo,
    getGamepadState: getGamepadState.current,
  };
}
