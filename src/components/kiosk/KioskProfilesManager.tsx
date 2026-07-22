import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit } from 'lucide-react';
import { useControlTypes } from '@/hooks/useSupabaseData';
import { useKioskProfiles, useUpsertKioskProfile, useDeleteKioskProfile, type KioskProfile } from '@/hooks/useKioskProfiles';

interface Props { eventId: string }

const empty = (
  eventId: string
): Partial<KioskProfile> & { event_id: string; name: string; pin?: string | null } => ({
  event_id: eventId,
  name: '',
  description: '',
  control_type_ids: [],
  default_control_type_id: null,
  auto_select_mode: 'fixed',
  time_schedule: [],
  allow_operator_override: true,
  lock_ui: false,
  auto_resume_ms: 1500,
  pin: '',
  is_active: true,
});

export const KioskProfilesManager: React.FC<Props> = ({ eventId }) => {
  const { data: profiles = [] } = useKioskProfiles(eventId);
  const { data: controlTypes = [] } = useControlTypes();
  const upsert = useUpsertKioskProfile();
  const del = useDeleteKioskProfile();
  const [editing, setEditing] = useState<any | null>(null);

  const save = async () => {
    if (!editing?.name) return;
    await upsert.mutateAsync(editing);
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-dorado">Perfiles de Kiosko</h3>
          <p className="text-sm text-gray-400">Configure el modo autónomo del scanner: control por defecto, horario o rotación secuencial.</p>
        </div>
        <Button onClick={() => setEditing(empty(eventId))} className="bg-dorado text-empresarial hover:bg-dorado/90">
          <Plus className="h-4 w-4 mr-2" />Nuevo perfil
        </Button>
      </div>

      {editing && (
        <Card className="bg-gray-900/50 border-dorado/40">
          <CardHeader><CardTitle className="text-dorado">{editing.id ? 'Editar perfil' : 'Nuevo perfil'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Nombre</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Ej: Ingreso mañana" />
              </div>
              <div>
                <Label>Descripción</Label>
                <Input value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div>
                <Label>Modo de selección automática</Label>
                <Select value={editing.auto_select_mode} onValueChange={(v) => setEditing({ ...editing, auto_select_mode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fijo (usar control por defecto)</SelectItem>
                    <SelectItem value="time_based">Por horario</SelectItem>
                    <SelectItem value="sequential">Secuencial (rota entre controles)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Control por defecto</Label>
                <Select value={editing.default_control_type_id || ''} onValueChange={(v) => setEditing({ ...editing, default_control_type_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                  <SelectContent>
                    {controlTypes.map((ct) => <SelectItem key={ct.id} value={ct.id}>{ct.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {editing.auto_select_mode === 'time_based' && (
              <div className="space-y-2">
                <Label>Horarios (HH:MM)</Label>
                {(editing.time_schedule || []).map((slot: any, i: number) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input type="time" value={slot.from} onChange={(e) => {
                      const s = [...editing.time_schedule]; s[i] = { ...s[i], from: e.target.value };
                      setEditing({ ...editing, time_schedule: s });
                    }} className="w-32" />
                    <span className="text-gray-400">→</span>
                    <Input type="time" value={slot.to} onChange={(e) => {
                      const s = [...editing.time_schedule]; s[i] = { ...s[i], to: e.target.value };
                      setEditing({ ...editing, time_schedule: s });
                    }} className="w-32" />
                    <Select value={slot.control_type_id || ''} onValueChange={(v) => {
                      const s = [...editing.time_schedule]; s[i] = { ...s[i], control_type_id: v };
                      setEditing({ ...editing, time_schedule: s });
                    }}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Control" /></SelectTrigger>
                      <SelectContent>
                        {controlTypes.map((ct) => <SelectItem key={ct.id} value={ct.id}>{ct.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="ghost" onClick={() => {
                      const s = [...editing.time_schedule]; s.splice(i, 1);
                      setEditing({ ...editing, time_schedule: s });
                    }}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => setEditing({ ...editing, time_schedule: [...(editing.time_schedule || []), { from: '08:00', to: '12:00', control_type_id: '' }] })}>
                  <Plus className="w-4 h-4 mr-1" />Añadir franja
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex items-center justify-between p-3 border border-gray-800 rounded">
                <Label>Permitir override del operador</Label>
                <Switch checked={editing.allow_operator_override} onCheckedChange={(v) => setEditing({ ...editing, allow_operator_override: v })} />
              </div>
              <div className="flex items-center justify-between p-3 border border-gray-800 rounded">
                <Label>Bloquear UI</Label>
                <Switch checked={editing.lock_ui} onCheckedChange={(v) => setEditing({ ...editing, lock_ui: v })} />
              </div>
              <div>
                <Label>PIN de desactivación (opcional)</Label>
                <Input value={editing.require_pin || ''} onChange={(e) => setEditing({ ...editing, require_pin: e.target.value || null })} placeholder="4 dígitos" maxLength={6} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button className="bg-dorado text-empresarial hover:bg-dorado/90" onClick={save} disabled={!editing.name || upsert.isPending}>
                {upsert.isPending ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {profiles.length === 0 && !editing && (
          <Card className="bg-gray-900/50 border border-gray-800"><CardContent className="p-6 text-center text-gray-400">Aún no hay perfiles configurados.</CardContent></Card>
        )}
        {profiles.map((p) => (
          <Card key={p.id} className="bg-gray-900/50 border border-gray-800">
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-hueso font-medium">{p.name}</span>
                  <Badge variant="outline">{p.auto_select_mode}</Badge>
                  {p.lock_ui && <Badge variant="outline" className="border-yellow-500 text-yellow-500">UI bloqueada</Badge>}
                  {p.require_pin && <Badge variant="outline">PIN</Badge>}
                </div>
                {p.description && <p className="text-sm text-gray-400">{p.description}</p>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(p)}><Edit className="w-4 h-4" /></Button>
                <Button size="sm" variant="destructive" onClick={() => del.mutate({ id: p.id, eventId })}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default KioskProfilesManager;
