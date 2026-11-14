import React, { useRef, useState, useCallback, useEffect } from 'react';

interface VirtualJoystickProps {
  onMove: (x: number, y: number) => void;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = React.memo(({ onMove }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);
  const isActiveRef = useRef(false);
  const activeTouchId = useRef<number | null>(null);
  const centerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastKnobRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  const radiusRef = useRef<number>(48);

  const updateKnobFromCoords = useCallback((clientX: number, clientY: number) => {
    const radius = radiusRef.current;
    const dx = clientX - centerRef.current.x;
    const dy = clientY - centerRef.current.y;
    const dist = Math.hypot(dx, dy);

    let kx = dx;
    let ky = dy;
    if (dist > radius && dist > 0) {
      const scale = radius / dist;
      kx = dx * scale;
      ky = dy * scale;
    }

    if (
      Math.abs(kx - lastKnobRef.current.x) < 0.4 &&
      Math.abs(ky - lastKnobRef.current.y) < 0.4
    ) {
      return;
    }

    lastKnobRef.current.x = kx;
    lastKnobRef.current.y = ky;
    setKnobPos({ x: kx, y: ky });
    onMoveRef.current(kx / radius, ky / radius);
  }, []);

  const handlePointerDown = useCallback(
    (clientX: number, clientY: number, touchId?: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      centerRef.current.x = rect.left + rect.width / 2;
      centerRef.current.y = rect.top + rect.height / 2;
      radiusRef.current = Math.max(28, rect.width * 0.38);

      isActiveRef.current = true;
      setIsActive(true);
      if (touchId !== undefined) {
        activeTouchId.current = touchId;
      }

      lastKnobRef.current.x = 9999; // force initial dispatch even near center
      updateKnobFromCoords(clientX, clientY);
    },
    [updateKnobFromCoords]
  );

  const handlePointerMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isActiveRef.current) return;
      updateKnobFromCoords(clientX, clientY);
    },
    [updateKnobFromCoords]
  );

  const handlePointerUp = useCallback(() => {
    isActiveRef.current = false;
    setIsActive(false);
    activeTouchId.current = null;
    lastKnobRef.current.x = 0;
    lastKnobRef.current.y = 0;
    setKnobPos({ x: 0, y: 0 });
    onMoveRef.current(0, 0);
  }, []);

  // Touch event handlers attached with passive: false to prevent scrolling
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      if (!touch) return;
      handlePointerDown(touch.clientX, touch.clientY, touch.identifier);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (activeTouchId.current === null) return;
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === activeTouchId.current) {
          handlePointerMove(touch.clientX, touch.clientY);
          break;
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (activeTouchId.current === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchId.current) {
          handlePointerUp();
          break;
        }
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [handlePointerDown, handlePointerMove, handlePointerUp]);

  return (
    <div
      ref={containerRef}
      data-interactive-ui="true"
      className="relative flex items-center justify-center w-24 h-24 [@media(min-height:500px)]:w-28 [@media(min-height:500px)]:h-28 [@media(min-height:680px)]:w-32 [@media(min-height:680px)]:h-32 rounded-full bg-slate-950/65 border-2 border-slate-700/80 shadow-2xl backdrop-blur-none select-none touch-none"
      onMouseDown={(e) => {
        handlePointerDown(e.clientX, e.clientY);
        const move = (ev: MouseEvent) => handlePointerMove(ev.clientX, ev.clientY);
        const up = () => {
          handlePointerUp();
          window.removeEventListener('mousemove', move);
          window.removeEventListener('mouseup', up);
        };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
      }}
    >
      {/* Outer directional indicators */}
      <div className="absolute top-2 w-1.5 h-1.5 rounded-full bg-slate-500" />
      <div className="absolute bottom-2 w-1.5 h-1.5 rounded-full bg-slate-500" />
      <div className="absolute left-2 w-1.5 h-1.5 rounded-full bg-slate-500" />
      <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-slate-500" />

      {/* Floating Joystick Thumb Knob */}
      <div
        className={`w-10 h-10 [@media(min-height:500px)]:w-12 [@media(min-height:500px)]:h-12 [@media(min-height:680px)]:w-14 [@media(min-height:680px)]:h-14 rounded-full flex items-center justify-center border-2 shadow-lg ${
          isActive
            ? 'bg-amber-500 border-amber-300 shadow-amber-500/50'
            : 'bg-slate-800/90 border-slate-500 shadow-black/40 transition-transform duration-150'
        }`}
        style={{
          transform: `translate3d(${knobPos.x}px, ${knobPos.y}px, 0)`,
          willChange: 'transform',
        }}
      >
        <div className={`w-4 h-4 [@media(min-height:680px)]:w-5 [@media(min-height:680px)]:h-5 rounded-full ${isActive ? 'bg-amber-100' : 'bg-slate-400'}`} />
      </div>
    </div>
  );
});
