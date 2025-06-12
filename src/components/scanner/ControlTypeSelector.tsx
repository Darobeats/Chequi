
import React from 'react';
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
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Tipo de Control
        </label>
        <div className="bg-gray-800 border border-gray-700 rounded-md h-10 animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="w-full mb-6">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Tipo de Control
      </label>
      <Select value={selectedControlType} onValueChange={onControlTypeChange}>
        <SelectTrigger className="bg-gray-800 border-gray-700 text-hueso">
          <SelectValue placeholder="Selecciona el tipo de control" />
        </SelectTrigger>
        <SelectContent className="bg-gray-800 border-gray-700">
          {controlTypes?.map((controlType) => (
            <SelectItem key={controlType.id} value={controlType.id} className="text-hueso">
              <div className="flex items-center gap-2">
                {getControlIcon(controlType.icon)}
                <span className="capitalize">{controlType.name}</span>
                <span className="text-xs text-gray-400">- {controlType.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ControlTypeSelector;
