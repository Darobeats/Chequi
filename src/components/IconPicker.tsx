import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield, User, Star, Check, X, Lock, Unlock, 
  Key, CreditCard, Ticket, Heart, Gift, Crown,
  Eye, EyeOff, Bell, Calendar, Clock, MapPin,
  Home, Building, Coffee, Music, Camera, Film,
  Utensils, Wine, Pizza, ShoppingBag, Package,
  Zap, Sparkles, Trophy, Target, Award, Medal,
  Search, Plus, Settings, LogIn, LogOut, DoorOpen,
  Users, UserCheck, UserPlus, Layers, Grid, List
} from 'lucide-react';

const AVAILABLE_ICONS = [
  { name: 'shield', Icon: Shield, label: 'Escudo' },
  { name: 'user', Icon: User, label: 'Usuario' },
  { name: 'star', Icon: Star, label: 'Estrella' },
  { name: 'check', Icon: Check, label: 'Check' },
  { name: 'x', Icon: X, label: 'X' },
  { name: 'lock', Icon: Lock, label: 'Candado' },
  { name: 'unlock', Icon: Unlock, label: 'Abierto' },
  { name: 'key', Icon: Key, label: 'Llave' },
  { name: 'credit-card', Icon: CreditCard, label: 'Tarjeta' },
  { name: 'ticket', Icon: Ticket, label: 'Ticket' },
  { name: 'heart', Icon: Heart, label: 'Corazón' },
  { name: 'gift', Icon: Gift, label: 'Regalo' },
  { name: 'crown', Icon: Crown, label: 'Corona' },
  { name: 'eye', Icon: Eye, label: 'Ojo' },
  { name: 'eye-off', Icon: EyeOff, label: 'Ojo cerrado' },
  { name: 'bell', Icon: Bell, label: 'Campana' },
  { name: 'calendar', Icon: Calendar, label: 'Calendario' },
  { name: 'clock', Icon: Clock, label: 'Reloj' },
  { name: 'map-pin', Icon: MapPin, label: 'Pin' },
  { name: 'home', Icon: Home, label: 'Casa' },
  { name: 'building', Icon: Building, label: 'Edificio' },
  { name: 'coffee', Icon: Coffee, label: 'Café' },
  { name: 'music', Icon: Music, label: 'Música' },
  { name: 'camera', Icon: Camera, label: 'Cámara' },
  { name: 'film', Icon: Film, label: 'Película' },
  { name: 'utensils', Icon: Utensils, label: 'Cubiertos' },
  { name: 'wine', Icon: Wine, label: 'Vino' },
  { name: 'pizza', Icon: Pizza, label: 'Pizza' },
  { name: 'shopping-bag', Icon: ShoppingBag, label: 'Bolsa' },
  { name: 'package', Icon: Package, label: 'Paquete' },
  { name: 'zap', Icon: Zap, label: 'Rayo' },
  { name: 'sparkles', Icon: Sparkles, label: 'Brillos' },
  { name: 'trophy', Icon: Trophy, label: 'Trofeo' },
  { name: 'target', Icon: Target, label: 'Diana' },
  { name: 'award', Icon: Award, label: 'Premio' },
  { name: 'medal', Icon: Medal, label: 'Medalla' },
  { name: 'search', Icon: Search, label: 'Buscar' },
  { name: 'plus', Icon: Plus, label: 'Más' },
  { name: 'settings', Icon: Settings, label: 'Ajustes' },
  { name: 'log-in', Icon: LogIn, label: 'Entrar' },
  { name: 'log-out', Icon: LogOut, label: 'Salir' },
  { name: 'door-open', Icon: DoorOpen, label: 'Puerta' },
  { name: 'users', Icon: Users, label: 'Usuarios' },
  { name: 'user-check', Icon: UserCheck, label: 'Usuario Check' },
  { name: 'user-plus', Icon: UserPlus, label: 'Agregar Usuario' },
  { name: 'layers', Icon: Layers, label: 'Capas' },
  { name: 'grid', Icon: Grid, label: 'Cuadrícula' },
  { name: 'list', Icon: List, label: 'Lista' },
];

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
  label?: string;
}

const IconPicker: React.FC<IconPickerProps> = ({ value, onChange, label = 'Icono' }) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedIcon = AVAILABLE_ICONS.find(icon => icon.name === value);
  const SelectedIconComponent = selectedIcon?.Icon || Shield;

  const filteredIcons = AVAILABLE_ICONS.filter(icon =>
    icon.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    icon.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectIcon = (iconName: string) => {
    onChange(iconName);
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="space-y-2">
      <Label className="text-hueso">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start gap-2 bg-gray-800 border-gray-700 text-hueso hover:bg-gray-700"
          >
            <SelectedIconComponent className="h-4 w-4" />
            <span>{selectedIcon?.label || 'Seleccionar icono...'}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 bg-gray-900 border-gray-800 p-0" align="start">
          <div className="p-4 border-b border-gray-800">
            <Input
              placeholder="Buscar icono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gray-800 border-gray-700 text-hueso"
            />
          </div>
          <ScrollArea className="h-72">
            <div className="grid grid-cols-4 gap-2 p-4">
              {filteredIcons.map((icon) => {
                const IconComponent = icon.Icon;
                const isSelected = icon.name === value;
                return (
                  <button
                    key={icon.name}
                    onClick={() => handleSelectIcon(icon.name)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-dorado text-empresarial'
                        : 'hover:bg-gray-800 text-hueso'
                    }`}
                    title={icon.label}
                  >
                    <IconComponent className="h-5 w-5" />
                    <span className="text-xs truncate w-full text-center">
                      {icon.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {filteredIcons.length === 0 && (
              <div className="p-4 text-center text-gray-400">
                No se encontraron iconos
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default IconPicker;
