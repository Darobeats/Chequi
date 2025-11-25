import type { CedulaData } from '@/types/cedula';

/**
 * Parsea los datos crudos del PDF417 de una cédula colombiana.
 */
export function parseCedulaData(rawData: string): CedulaData | null {
  try {
    const cleanData = rawData.trim();
    
    let parsed = parseByDelimiters(cleanData);
    
    if (!parsed) {
      parsed = parseByPositions(cleanData);
    }
    
    if (!parsed) {
      console.warn('No se pudo parsear los datos de la cédula:', cleanData);
      return null;
    }
    
    const result: CedulaData = {
      numeroCedula: parsed.numeroCedula || '',
      primerApellido: parsed.primerApellido || '',
      segundoApellido: parsed.segundoApellido || '',
      nombres: parsed.nombres || '',
      nombreCompleto: buildNombreCompleto(parsed),
      fechaNacimiento: parsed.fechaNacimiento || null,
      sexo: parsed.sexo || null,
      rh: parsed.rh || null,
      lugarExpedicion: parsed.lugarExpedicion || null,
      fechaExpedicion: parsed.fechaExpedicion || null,
      rawData: cleanData
    };
    
    return result;
    
  } catch (error) {
    console.error('Error parseando datos de cédula:', error);
    return null;
  }
}

function parseByDelimiters(data: string): Partial<CedulaData> | null {
  const delimiters = ['|', '^', '\x1D', '\x1E', '\x1F', '\n'];
  
  for (const delimiter of delimiters) {
    if (data.includes(delimiter)) {
      const parts = data.split(delimiter).filter(p => p.trim());
      
      if (parts.length >= 4) {
        return {
          numeroCedula: extractCedulaNumber(parts[0]) || parts[0],
          primerApellido: parts[1]?.toUpperCase() || '',
          segundoApellido: parts[2]?.toUpperCase() || '',
          nombres: parts[3]?.toUpperCase() || '',
          fechaNacimiento: parts[4] ? parseDate(parts[4]) : null,
          sexo: parts[5] ? parseSexo(parts[5]) : null,
          rh: parts[6] || null,
          lugarExpedicion: parts[7] || null,
          fechaExpedicion: parts[8] ? parseDate(parts[8]) : null,
        };
      }
    }
  }
  
  return null;
}

function parseByPositions(data: string): Partial<CedulaData> | null {
  const cedulaMatch = data.match(/\d{8,10}/);
  if (!cedulaMatch) return null;
  
  return {
    numeroCedula: cedulaMatch[0],
    primerApellido: '',
    segundoApellido: '',
    nombres: '',
    fechaNacimiento: null,
    sexo: null,
    rh: null,
    lugarExpedicion: null,
    fechaExpedicion: null,
  };
}

function extractCedulaNumber(value: string): string | null {
  const match = value.match(/\d{8,10}/);
  return match ? match[0] : null;
}

function parseDate(dateStr: string): string | null {
  const formats = [
    /^(\d{4})(\d{2})(\d{2})$/,
    /^(\d{2})(\d{2})(\d{4})$/,
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[0]) {
        return `${match[1]}-${match[2]}-${match[3]}`;
      } else {
        return `${match[3]}-${match[2]}-${match[1]}`;
      }
    }
  }
  
  return null;
}

function parseSexo(value: string): 'M' | 'F' | null {
  const upper = value.toUpperCase().trim();
  if (upper === 'M' || upper === 'MASCULINO') return 'M';
  if (upper === 'F' || upper === 'FEMENINO') return 'F';
  return null;
}

function buildNombreCompleto(data: Partial<CedulaData>): string {
  return [data.nombres, data.primerApellido, data.segundoApellido]
    .filter(Boolean)
    .join(' ')
    .trim();
}
