export interface CedulaData {
  numeroCedula: string;
  primerApellido: string;
  segundoApellido: string;
  nombres: string;
  nombreCompleto: string;
  fechaNacimiento: string | null;
  sexo: 'M' | 'F' | null;
  rh: string | null;
  lugarExpedicion: string | null;
  fechaExpedicion: string | null;
  rawData: string;
}

export interface CedulaRegistro {
  id: string;
  event_id: string;
  numero_cedula: string;
  primer_apellido: string;
  segundo_apellido: string | null;
  nombres: string;
  nombre_completo: string;
  fecha_nacimiento: string | null;
  sexo: string | null;
  rh: string | null;
  lugar_expedicion: string | null;
  fecha_expedicion: string | null;
  raw_data: string;
  scanned_at: string;
  scanned_by: string | null;
  device_info: string | null;
  created_at: string;
}

export interface InsertCedulaRegistro {
  event_id: string;
  numero_cedula: string;
  primer_apellido: string;
  segundo_apellido?: string;
  nombres: string;
  fecha_nacimiento?: string;
  sexo?: 'M' | 'F';
  rh?: string;
  lugar_expedicion?: string;
  fecha_expedicion?: string;
  raw_data: string;
  scanned_by?: string;
  device_info?: string;
  was_on_whitelist?: boolean;
}

// Tipos para lista blanca
export interface CedulaAutorizada {
  id: string;
  event_id: string;
  numero_cedula: string;
  nombre_completo: string | null;
  categoria: string | null;
  empresa: string | null;
  notas: string | null;
  created_at: string;
  created_by: string | null;
}

export interface InsertCedulaAutorizada {
  event_id: string;
  numero_cedula: string;
  nombre_completo?: string;
  categoria?: string;
  empresa?: string;
  notas?: string;
  created_by?: string;
}

export interface CedulaAccessLog {
  id: string;
  event_id: string;
  numero_cedula: string;
  nombre_detectado: string | null;
  access_result: 'authorized' | 'denied' | 'duplicate';
  denial_reason: string | null;
  scanned_by: string | null;
  device_info: string | null;
  created_at: string;
}

export interface InsertCedulaAccessLog {
  event_id: string;
  numero_cedula: string;
  nombre_detectado?: string;
  access_result: 'authorized' | 'denied' | 'duplicate';
  denial_reason?: string;
  scanned_by?: string;
  device_info?: string;
}

// Resultado de verificación de autorización
export interface AuthorizationResult {
  isAuthorized: boolean;
  isDuplicate: boolean;
  autorizado?: CedulaAutorizada;
  message: string;
}
