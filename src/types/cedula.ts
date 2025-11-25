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
}
