
import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Ticket, Utensils, Wine, Crown } from 'lucide-react';

interface ControlType {
  id: string;
  name: string;
  description: string;
  icon: string | null;
}

interface ControlTypeSelectorProps {
  controlTypes?: ControlType[];
  selectedControlType: string;
  onControlTypeChange: (value: string) => void;
  isLoading: boolean;
}

const ControlTypeSelector: React.FC<ControlTypeSelectorProps> = ({
  controlTypes,
  selectedControlType,
  onControlTypeChange,
  isLoading,
}) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('select-open', open);
    return () => {
      document.body.classList.remove('select-open');
    };
  }, [open]);

  const getControlIcon = (iconName: string | null) => {
    switch (iconName) {
      case 'ticket': return <Ticket className="w-6 h-6" />;
      case 'utensils': return <Utensils className="w-6 h-6" />;
      case 'wine': return <Wine className="w-6 h-6" />;
      case 'crown': return <Crown className="w-6 h-6" />;
      default: return <Ticket className="w-6 h-6" />;
    }
  };

  if (isLoading) {
    return (
      <div className="w-full mb-6">
        <label className="block text-sm font-medium text-muted-foreground mb-2">
          Tipo de Control
        </label>
        <div className="bg-input border border-border rounded-md h-10 animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="w-full mb-6">
      <label className="block text-sm font-medium text-muted-foreground mb-2">
        Tipo de Control
      </label>
      <Select 
        value={selectedControlType} 
        onValueChange={(v) => { onControlTypeChange(v); setOpen(false); }}
        open={open}
        onOpenChange={setOpen}
      >
        <SelectTrigger className="bg-input border-border text-foreground">
          <SelectValue placeholder="Selecciona el tipo de control" />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border z-[9999]">
          {controlTypes?.map((controlType) => (
            <SelectItem key={controlType.id} value={controlType.id} className="text-foreground">
              <div className="flex items-center gap-2">
                {getControlIcon(controlType.icon)}
                <span className="capitalize">{controlType.name}</span>
                <span className="text-xs text-muted-foreground">- {controlType.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ControlTypeSelector;
