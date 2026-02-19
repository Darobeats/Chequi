
import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Ticket, Utensils, Wine, Crown, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ControlType {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  requires_control_id?: string | null;
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
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);

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
          {t('controlTypeSelector.label')}
        </label>
        <div className="bg-input border border-border rounded-md h-10 animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="w-full mb-4 md:mb-6">
      <label className="block text-sm font-medium text-muted-foreground mb-2">
        {t('controlTypeSelector.label')}
      </label>
      <Select 
        value={selectedControlType} 
        onValueChange={(v) => { onControlTypeChange(v); setOpen(false); }}
        open={open}
        onOpenChange={setOpen}
      >
        <SelectTrigger className="bg-input border-border text-foreground min-h-[44px] touch-manipulation">
          <SelectValue placeholder={t('controlTypeSelector.placeholder')} />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border z-[9999] max-h-[300px]">
          {controlTypes?.map((controlType) => {
            const hasPrerequisite = controlType.requires_control_id;
            const requiredControl = hasPrerequisite 
              ? controlTypes.find(ct => ct.id === controlType.requires_control_id)
              : null;
            
            return (
              <SelectItem 
                key={controlType.id} 
                value={controlType.id} 
                className="text-foreground min-h-[44px] touch-manipulation py-2"
              >
                <div className="flex items-center gap-2 w-full">
                  <span className="flex-shrink-0">{getControlIcon(controlType.icon)}</span>
                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <span className="capitalize font-medium text-sm md:text-base">{controlType.name}</span>
                    <span className="text-xs text-muted-foreground truncate w-full">{controlType.description}</span>
                  </div>
                  {requiredControl && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-500 ml-1 flex-shrink-0">
                            <Lock className="h-2 w-2" />
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{t('controlTypeSelector.requires')} {requiredControl.name}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ControlTypeSelector;
