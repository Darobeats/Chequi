import React from 'react';
import { Link } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { CONSENT_TEXT, CONSENT_VERSION, PRIVACY_PATH, type ConsentRecord } from '@/lib/legal';
import { bogotaDateKey, bogotaTime } from '@/lib/timezone';

interface ConsentCheckboxProps {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Punto del producto donde se recoge el consentimiento (para trazabilidad). */
  source: string;
  disabled?: boolean;
}

/** Construye el registro de consentimiento (fecha/hora Bogotá + versión del texto). */
export const buildConsentRecord = (source: string): ConsentRecord => {
  const now = new Date();
  return {
    accepted: true,
    acceptedAt: now.toISOString(),
    acceptedAtBogota: `${bogotaDateKey(now)} ${bogotaTime(now)} (America/Bogota)`,
    version: CONSENT_VERSION,
    source,
  };
};

const ConsentCheckbox: React.FC<ConsentCheckboxProps> = ({
  id = 'data-consent',
  checked,
  onCheckedChange,
  source,
  disabled,
}) => {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-800 bg-gray-900/40 p-3">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        disabled={disabled}
        aria-describedby={`${id}-description`}
        className="mt-0.5"
      />
      <div className="space-y-1">
        <label htmlFor={id} className="block text-sm text-hueso leading-relaxed cursor-pointer">
          {CONSENT_TEXT} <span className="text-red-400">*</span>
        </label>
        <p id={`${id}-description`} className="text-xs text-gray-400">
          <Link
            to={PRIVACY_PATH}
            target="_blank"
            rel="noopener noreferrer"
            className="text-dorado hover:underline"
          >
            Leer la Política de Privacidad
          </Link>{' '}
          · Versión del texto: {CONSENT_VERSION} · Origen: {source}
        </p>
      </div>
    </div>
  );
};

export default ConsentCheckbox;
