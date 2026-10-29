export type RegFieldType = 'text' | 'email' | 'tel' | 'cedula' | 'number' | 'date' | 'select';

export interface RegField {
  key: string;
  label: string;
  type: RegFieldType;
  required: boolean;
  options?: string[];
}

export const DEFAULT_FIELDS: RegField[] = [
  { key: 'nombres', label: 'Nombres y apellidos', type: 'text', required: true },
  { key: 'correo', label: 'Correo electrónico', type: 'email', required: true },
  { key: 'empresa', label: 'Empresa', type: 'text', required: false },
  { key: 'celular', label: 'Celular', type: 'tel', required: true },
  { key: 'cedula', label: 'Cédula', type: 'cedula', required: true },
];

export const FIELD_TYPE_LABELS: Record<RegFieldType, string> = {
  text: 'Texto', email: 'Correo', tel: 'Celular', cedula: 'Cédula',
  number: 'Número', date: 'Fecha', select: 'Lista de opciones',
};

export const slugKey = (label: string) =>
  label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'campo';

export const registrationUrl = (eventId: string) =>
  `https://chequi.online/registro/${eventId}`;

export const functionUrl = () =>
  `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/registration-form`;
