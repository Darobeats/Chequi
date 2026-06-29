import React, { useRef, useState } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface KioskToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
  scanCount?: number;
}

/**
 * Toggle for kiosk mode.
 * - Activating: single click.
 * - Deactivating: requires holding the button for ~1.5s to prevent accidental disable.
 */
const KioskToggle: React.FC<KioskToggleProps> = ({ enabled, onToggle, disabled, scanCount = 0 }) => {
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const HOLD_MS = 1500;

  const clearHold = () => {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setHoldProgress(0);
  };

  const startHold = () => {
    if (!enabled) return;
    const start = Date.now();
    intervalRef.current = window.setInterval(() => {
      setHoldProgress(Math.min(100, ((Date.now() - start) / HOLD_MS) * 100));
    }, 40);
    holdTimerRef.current = window.setTimeout(() => {
      clearHold();
      onToggle(false);
    }, HOLD_MS);
  };

  if (!enabled) {
    return (
      <Button
        onClick={() => onToggle(true)}
        disabled={disabled}
        className="w-full max-w-[320px] bg-dorado text-empresarial font-semibold hover:bg-dorado/90 min-h-[48px]"
      >
        <Lock className="w-4 h-4 mr-2" />
        Activar modo kiosko
      </Button>
    );
  }

  return (
    <div className="w-full max-w-[320px] flex flex-col gap-2">
      <div className="bg-green-900/40 border border-green-500/40 rounded-lg px-3 py-2 text-center text-sm">
        <span className="text-green-300 font-semibold">🟢 MODO KIOSKO ACTIVO</span>
        <span className="text-hueso/80 ml-2">· Escaneados: {scanCount}</span>
      </div>
      <Button
        onMouseDown={startHold}
        onMouseUp={clearHold}
        onMouseLeave={clearHold}
        onTouchStart={startHold}
        onTouchEnd={clearHold}
        onTouchCancel={clearHold}
        variant="outline"
        className="w-full min-h-[44px] relative overflow-hidden border-red-500/40 text-red-300 hover:bg-red-900/20"
      >
        <div
          className="absolute inset-0 bg-red-600/30 transition-[width] duration-75"
          style={{ width: `${holdProgress}%` }}
        />
        <span className="relative flex items-center justify-center gap-2">
          <Unlock className="w-4 h-4" />
          {holdProgress > 0 ? 'Mantén presionado…' : 'Mantén para desactivar'}
        </span>
      </Button>
    </div>
  );
};

export default KioskToggle;
