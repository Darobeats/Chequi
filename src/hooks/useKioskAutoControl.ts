import { useEffect } from 'react';
import type { KioskProfile } from './useKioskProfiles';

/**
 * Applies the kiosk profile's auto-selection strategy to the current control type.
 *  - fixed: keeps default_control_type_id
 *  - time_based: matches the current HH:mm window in time_schedule
 *  - sequential: rotates via `bump()` each scan
 */
export function useKioskAutoControl(
  profile: KioskProfile | null,
  setControlType: (id: string) => void,
  active: boolean,
) {
  useEffect(() => {
    if (!active || !profile) return;
    const apply = () => {
      if (profile.auto_select_mode === 'fixed' && profile.default_control_type_id) {
        setControlType(profile.default_control_type_id);
        return;
      }
      if (profile.auto_select_mode === 'time_based') {
        const now = new Date();
        const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const match = (profile.time_schedule || []).find((s) => hhmm >= s.from && hhmm <= s.to);
        if (match) setControlType(match.control_type_id);
        else if (profile.default_control_type_id) setControlType(profile.default_control_type_id);
      }
    };
    apply();
    const int = window.setInterval(apply, 30_000);
    return () => window.clearInterval(int);
  }, [profile, active, setControlType]);
}
