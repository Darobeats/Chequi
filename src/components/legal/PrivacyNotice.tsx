import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { DATA_ROLES, PRIVACY_PATH } from '@/lib/legal';

interface PrivacyNoticeProps {
  /** Finalidad concreta del formulario donde se muestra el aviso. */
  purpose: string;
  className?: string;
}

/** Aviso corto de privacidad para formularios que recogen datos personales. */
const PrivacyNotice: React.FC<PrivacyNoticeProps> = ({ purpose, className = '' }) => (
  <div
    role="note"
    className={`flex gap-2 rounded-lg border border-gray-800 bg-gray-900/40 p-3 text-xs text-gray-400 leading-relaxed ${className}`}
  >
    <ShieldCheck className="h-4 w-4 text-dorado flex-shrink-0 mt-0.5" aria-hidden="true" />
    <p>
      El organizador del evento es el {DATA_ROLES.controller.title} de estos datos y Chequi actúa
      como {DATA_ROLES.processor.title}. Finalidad: {purpose}.{' '}
      <Link
        to={PRIVACY_PATH}
        target="_blank"
        rel="noopener noreferrer"
        className="text-dorado hover:underline"
      >
        Ver Política de Privacidad
      </Link>
      .
    </p>
  </div>
);

export default PrivacyNotice;
