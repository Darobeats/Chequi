import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Kiosk mode: keep scanner camera permanently active and auto-resume after every scan.
 * - Persists toggle per (eventId, controlTypeId) in localStorage.
 * - Acquires Screen Wake Lock so the device does not sleep.
 * - Tracks per-session scan counter.
 */

interface WakeLockSentinelLike {
  release: () => Promise<void>;
  addEventListener: (type: 'release', listener: () => void) => void;
}

const storageKey = (eventId?: string, controlTypeId?: string) =>
  `chequi:kiosk:${eventId || 'na'}:${controlTypeId || 'na'}`;

export function useKioskMode(eventId?: string, controlTypeId?: string) {
  const [enabled, setEnabled] = useState<boolean>(false);
  const [scanCount, setScanCount] = useState<number>(0);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);

  // Load from localStorage when event/control changes
  useEffect(() => {
    if (!eventId || !controlTypeId) return;
    try {
      const v = localStorage.getItem(storageKey(eventId, controlTypeId));
      setEnabled(v === '1');
    } catch {
      // ignore
    }
  }, [eventId, controlTypeId]);

  const acquireWakeLock = useCallback(async () => {
    try {
      const nav: any = navigator;
      if (nav?.wakeLock?.request) {
        const sentinel = await nav.wakeLock.request('screen');
        wakeLockRef.current = sentinel;
        sentinel.addEventListener?.('release', () => {
          wakeLockRef.current = null;
        });
      }
    } catch (e) {
      console.warn('[kiosk] wake lock failed', e);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    try {
      await wakeLockRef.current?.release();
    } catch {
      // ignore
    }
    wakeLockRef.current = null;
  }, []);

  // Re-acquire wake lock when tab becomes visible again
  useEffect(() => {
    if (!enabled) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current) {
        void acquireWakeLock();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [enabled, acquireWakeLock]);

  // Acquire/release wake lock when toggling
  useEffect(() => {
    if (enabled) {
      void acquireWakeLock();
    } else {
      void releaseWakeLock();
    }
    return () => {
      void releaseWakeLock();
    };
  }, [enabled, acquireWakeLock, releaseWakeLock]);

  const setKiosk = useCallback(
    (value: boolean) => {
      setEnabled(value);
      try {
        if (eventId && controlTypeId) {
          localStorage.setItem(storageKey(eventId, controlTypeId), value ? '1' : '0');
        }
      } catch {
        // ignore
      }
      if (value) {
        setScanCount(0);
      }
    },
    [eventId, controlTypeId]
  );

  const incrementScans = useCallback(() => {
    setScanCount((n) => n + 1);
  }, []);

  return {
    kioskMode: enabled,
    setKioskMode: setKiosk,
    scanCount,
    incrementScans,
  };
}
