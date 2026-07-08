import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lock, Unlock, Zap } from 'lucide-react';
import { useKioskProfiles, type KioskProfile } from '@/hooks/useKioskProfiles';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface Props {
  eventId?: string;
  activeProfileId: string | null;
  onActivate: (profile: KioskProfile | null) => void;
  scanCount: number;
}

const KioskProfileSelector: React.FC<Props> = ({ eventId, activeProfileId, onActivate, scanCount }) => {
  const { data: profiles = [] } = useKioskProfiles(eventId);
  const [selected, setSelected] = useState<string>('');
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const active = profiles.find((p) => p.id === activeProfileId) || null;

  if (profiles.length === 0) return null;

  const attemptDeactivate = () => {
    if (active?.require_pin) { setShowPin(true); return; }
    onActivate(null);
  };

  const confirmPin = () => {
    if (pinInput === active?.require_pin) {
      onActivate(null);
      setShowPin(false);
      setPinInput('');
    } else {
      toast.error('PIN incorrecto');
    }
  };

  if (active) {
    return (
      <div className="w-full max-w-[360px] flex flex-col gap-2">
        <div className="bg-green-900/40 border border-green-500/40 rounded-lg px-3 py-2 text-center text-sm">
          <span className="text-green-300 font-semibold">🟢 KIOSKO: {active.name}</span>
          <div className="text-hueso/80 text-xs mt-1">
            Modo: {active.auto_select_mode} · Escaneados: {scanCount}
          </div>
        </div>
        {showPin ? (
          <div className="flex gap-2">
            <Input type="password" value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder="PIN" className="text-center" />
            <Button onClick={confirmPin} variant="destructive">OK</Button>
          </div>
        ) : (
          <Button onClick={attemptDeactivate} variant="outline" className="border-red-500/40 text-red-300 hover:bg-red-900/20">
            <Unlock className="w-4 h-4 mr-2" />Desactivar kiosko
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-[360px] flex flex-col gap-2">
      <Select value={selected} onValueChange={setSelected}>
        <SelectTrigger><SelectValue placeholder="Selecciona un perfil de kiosko" /></SelectTrigger>
        <SelectContent>
          {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button
        disabled={!selected}
        onClick={() => onActivate(profiles.find((p) => p.id === selected) || null)}
        className="bg-dorado text-empresarial font-semibold hover:bg-dorado/90"
      >
        <Zap className="w-4 h-4 mr-2" />Activar perfil de kiosko
      </Button>
    </div>
  );
};

export default KioskProfileSelector;
