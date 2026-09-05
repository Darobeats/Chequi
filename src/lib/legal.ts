/**
 * Fuente única de verdad para la información legal de Chequi.
 *
 * IMPORTANTE: todos los textos incluidos aquí son PROVISIONALES y están
 * pendientes de revisión por abogado. No contienen afirmaciones de
 * certificación ni garantías de cumplimiento.
 *
 * Para añadir un documento nuevo (DPA, SLA, Política de Seguridad,
 * Retención, IA definitiva, etc.) basta con agregar una entrada a
 * LEGAL_DOCUMENTS: la ruta /legal/:slug y el enlace del pie se generan solos.
 */

import { WHATSAPP_DISPLAY, getWhatsAppUrl } from '@/lib/contact';

export const LEGAL_ENTITY = {
  brand: 'Chequi',
  operator: 'DarocodeIA',
  copyright: '© Chequi / DarocodeIA',
  location: 'Bogotá, Colombia',
  contactChannel: 'WhatsApp',
  contactDisplay: WHATSAPP_DISPLAY,
  contactUrl: getWhatsAppUrl(
    'Hola, tengo una consulta sobre privacidad y tratamiento de datos en Chequi.'
  ),
} as const;

/**
 * Roles en el tratamiento de datos personales.
 * El organizador del evento decide qué datos se recogen y para qué (Responsable).
 * Chequi los procesa por cuenta y siguiendo instrucciones del organizador (Encargado).
 */
export const DATA_ROLES = {
  controller: {
    key: 'controller',
    title: 'Responsable del Tratamiento',
    who: 'Cliente / organizador del evento',
    description:
      'Determina las finalidades y los medios del tratamiento: define qué datos se recogen de los asistentes, con qué propósito y durante cuánto tiempo se conservan. Es el titular de la relación con los asistentes y quien debe atender sus solicitudes de acceso, corrección o supresión.',
  },
  processor: {
    key: 'processor',
    title: 'Encargado del Tratamiento',
    who: 'Chequi / DarocodeIA',
    description:
      'Trata los datos personales por cuenta del organizador, únicamente conforme a sus instrucciones y para prestar el servicio de control de acceso (registro, generación y validación de códigos QR, verificación de documento, reportes del evento). No utiliza los datos para finalidades propias.',
  },
} as const;

/** Versión del texto de autorización mostrado en los formularios. */
export const CONSENT_VERSION = '2026-09-05.v1';

export const CONSENT_TEXT =
  'Autorizo el tratamiento de mis datos personales por parte del organizador del evento (Responsable) y de Chequi como Encargado, con la finalidad exclusiva de gestionar mi registro y control de acceso al evento, conforme a la Política de Privacidad.';

export interface ConsentRecord {
  accepted: boolean;
  /** Marca temporal ISO del momento de aceptación. */
  acceptedAt: string;
  /** Marca temporal legible en hora de Bogotá. */
  acceptedAtBogota: string;
  version: string;
  /** Punto del producto donde se otorgó el consentimiento. */
  source: string;
}

export interface LegalSection {
  id: string;
  title: string;
  paragraphs: string[];
  /** Marca la sección como texto de relleno pendiente de redacción legal. */
  pending?: boolean;
}

export interface LegalDocument {
  slug: string;
  /** Clave corta usada en el pie de página. */
  shortTitle: string;
  title: string;
  description: string;
  version: string;
  updatedAt: string;
  /** Si aparece o no en la lista "Legal" del pie. */
  inFooter: boolean;
  sections: LegalSection[];
}

const PENDING_NOTE =
  'Texto provisional pendiente de revisión legal. Será reemplazado por la redacción definitiva revisada por abogado antes de su uso contractual.';

export const LEGAL_DISCLAIMER = PENDING_NOTE;

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    slug: 'terminos',
    shortTitle: 'Términos y Condiciones',
    title: 'Términos y Condiciones de Uso',
    description:
      'Condiciones de uso de la plataforma Chequi para el control de acceso a eventos. Documento provisional pendiente de revisión legal.',
    version: '0.1 (borrador)',
    updatedAt: '2026-09-05',
    inFooter: true,
    sections: [
      {
        id: 'objeto',
        title: '1. Objeto',
        paragraphs: [
          'Chequi es una plataforma de control de acceso para eventos que permite registrar asistentes, generar y validar códigos QR, verificar documentos de identidad y consultar reportes de asistencia.',
          'Estos términos regulan el uso de la plataforma por parte del organizador del evento y de las personas que este autorice (administradores, personal de control y escaneo).',
        ],
      },
      {
        id: 'cuentas',
        title: '2. Cuentas y roles de usuario',
        paragraphs: [
          'El acceso a la plataforma es nominal. Cada usuario recibe un rol (administrador, control, escaneo o asistente) con permisos diferenciados y es responsable de la confidencialidad de sus credenciales.',
          'El organizador es responsable de las personas a las que otorga acceso y del uso que estas hagan de la información del evento.',
        ],
      },
      {
        id: 'uso-aceptable',
        title: '3. Uso aceptable',
        paragraphs: [
          'La plataforma debe usarse únicamente para la gestión de acceso de eventos legítimos y con datos obtenidos lícitamente.',
          'No está permitido intentar vulnerar los controles de seguridad, extraer datos de forma masiva por medios no previstos, ni utilizar la información de asistentes para finalidades distintas a las autorizadas.',
        ],
      },
      {
        id: 'disponibilidad',
        title: '4. Disponibilidad del servicio',
        paragraphs: [
          'La plataforma incluye funcionamiento sin conexión con sincronización posterior para escenarios de conectividad limitada.',
          'Los compromisos de disponibilidad, tiempos de respuesta y soporte se acordarán en un documento de niveles de servicio (SLA) independiente.',
        ],
        pending: true,
      },
      {
        id: 'responsabilidad',
        title: '5. Responsabilidad',
        paragraphs: [PENDING_NOTE],
        pending: true,
      },
      {
        id: 'vigencia',
        title: '6. Vigencia y modificaciones',
        paragraphs: [
          'Estos términos pueden actualizarse. La versión vigente es la publicada en esta página, identificada con su número de versión y fecha de actualización.',
        ],
      },
      {
        id: 'contacto-terminos',
        title: '7. Contacto',
        paragraphs: [
          `Cualquier consulta sobre estos términos puede dirigirse por ${LEGAL_ENTITY.contactChannel} al ${LEGAL_ENTITY.contactDisplay}.`,
        ],
      },
    ],
  },
  {
    slug: 'privacidad',
    shortTitle: 'Privacidad',
    title: 'Política de Privacidad y Tratamiento de Datos Personales',
    description:
      'Cómo se tratan los datos personales de los asistentes y usuarios en la plataforma Chequi. Documento provisional pendiente de revisión legal.',
    version: '0.1 (borrador)',
    updatedAt: '2026-09-05',
    inFooter: true,
    sections: [
      {
        id: 'roles',
        title: '1. Roles: Responsable y Encargado',
        paragraphs: [
          `${DATA_ROLES.controller.title} — ${DATA_ROLES.controller.who}: ${DATA_ROLES.controller.description}`,
          `${DATA_ROLES.processor.title} — ${DATA_ROLES.processor.who}: ${DATA_ROLES.processor.description}`,
        ],
      },
      {
        id: 'datos',
        title: '2. Datos que se tratan',
        paragraphs: [
          'Según la configuración de cada evento, pueden tratarse: nombre, número de documento de identidad, categoría de entrada, identificador de ticket y código QR, además de registros de escaneo (fecha, hora, punto de control y dispositivo).',
          'Los datos de cuentas de usuario de la plataforma incluyen correo electrónico y rol asignado, necesarios para la autenticación.',
        ],
      },
      {
        id: 'finalidades',
        title: '3. Finalidades',
        paragraphs: [
          'Registro y acreditación de asistentes, validación de acceso y control de consumos o aforos, generación de reportes de asistencia para el organizador y soporte operativo durante el evento.',
        ],
      },
      {
        id: 'base',
        title: '4. Base de legitimación',
        paragraphs: [
          'El tratamiento se apoya en la autorización del titular recogida en los formularios de registro y en la relación contractual entre el asistente y el organizador del evento.',
        ],
        pending: true,
      },
      {
        id: 'derechos',
        title: '5. Derechos de los titulares',
        paragraphs: [
          'Los titulares pueden solicitar acceso, actualización, rectificación y supresión de sus datos, así como revocar la autorización otorgada.',
          'Las solicitudes deben dirigirse al organizador del evento en su condición de Responsable. Chequi apoyará la atención de esas solicitudes en su rol de Encargado.',
        ],
      },
      {
        id: 'conservacion',
        title: '6. Conservación y eliminación',
        paragraphs: [
          'Los datos se conservan mientras dure la operación del evento y el periodo de cierre y reportes acordado con el organizador.',
          'Los plazos concretos se definirán en la Política de Retención y Eliminación de Datos.',
        ],
        pending: true,
      },
      {
        id: 'seguridad',
        title: '7. Seguridad',
        paragraphs: [
          'La plataforma aplica autenticación por usuario, control de acceso por rol y aislamiento de la información por evento.',
          'El detalle de medidas técnicas y organizativas se documentará en la Política de Seguridad.',
        ],
        pending: true,
      },
      {
        id: 'contacto-privacidad',
        title: '8. Contacto',
        paragraphs: [
          `Consultas sobre privacidad: ${LEGAL_ENTITY.contactChannel} ${LEGAL_ENTITY.contactDisplay}.`,
        ],
      },
    ],
  },
  {
    slug: 'cookies',
    shortTitle: 'Cookies',
    title: 'Política de Cookies y Almacenamiento Local',
    description:
      'Uso de cookies y almacenamiento en el navegador dentro de Chequi. Documento provisional pendiente de revisión legal.',
    version: '0.1 (borrador)',
    updatedAt: '2026-09-05',
    inFooter: true,
    sections: [
      {
        id: 'que-usamos',
        title: '1. Qué se almacena en el navegador',
        paragraphs: [
          'La plataforma utiliza almacenamiento local del navegador para mantener la sesión iniciada, recordar el idioma seleccionado y guardar temporalmente los escaneos realizados sin conexión hasta que se sincronizan.',
        ],
      },
      {
        id: 'finalidad',
        title: '2. Finalidad',
        paragraphs: [
          'Estos elementos son necesarios para el funcionamiento del servicio: sin ellos no es posible mantener la sesión ni operar en modo sin conexión.',
        ],
      },
      {
        id: 'terceros',
        title: '3. Terceros',
        paragraphs: [PENDING_NOTE],
        pending: true,
      },
      {
        id: 'gestion',
        title: '4. Cómo gestionarlas',
        paragraphs: [
          'El usuario puede borrar el almacenamiento del navegador en cualquier momento desde la configuración de su navegador. Al hacerlo se cerrará la sesión y se perderán los escaneos pendientes de sincronizar.',
        ],
      },
    ],
  },
  {
    slug: 'gdpr',
    shortTitle: 'GDPR',
    title: 'GDPR y Privacidad Internacional',
    description:
      'Enfoque de Chequi frente al Reglamento General de Protección de Datos y a asistentes fuera de Colombia. Documento provisional pendiente de revisión legal.',
    version: '0.1 (borrador)',
    updatedAt: '2026-09-05',
    inFooter: true,
    sections: [
      {
        id: 'ambito',
        title: '1. Ámbito',
        paragraphs: [
          'Esta sección aplica cuando el evento involucra asistentes ubicados en el Espacio Económico Europeo o cuando el organizador está sujeto al GDPR.',
        ],
      },
      {
        id: 'roles-gdpr',
        title: '2. Controller y Processor',
        paragraphs: [
          'En términos del GDPR, el organizador del evento actúa como Controller y Chequi como Processor, tratando los datos únicamente según las instrucciones documentadas del organizador.',
        ],
      },
      {
        id: 'dpa',
        title: '3. Acuerdo de Encargo (DPA)',
        paragraphs: [
          'El acuerdo de encargo de tratamiento con las cláusulas exigidas por el artículo 28 del GDPR se incorporará como documento independiente.',
        ],
        pending: true,
      },
      {
        id: 'transferencias',
        title: '4. Transferencias internacionales',
        paragraphs: [PENDING_NOTE],
        pending: true,
      },
      {
        id: 'derechos-gdpr',
        title: '5. Ejercicio de derechos',
        paragraphs: [
          'Las solicitudes de acceso, rectificación, supresión, limitación, portabilidad u oposición se canalizan a través del organizador del evento como Controller.',
        ],
      },
    ],
  },
  {
    slug: 'ia',
    shortTitle: 'Uso de IA',
    title: 'Uso de Inteligencia Artificial (documentación previa)',
    description:
      'Transparencia sobre las funcionalidades de Chequi que utilizan inteligencia artificial. Base para una futura Política de Uso Responsable de IA.',
    version: '0.1 (borrador)',
    updatedAt: '2026-09-05',
    inFooter: true,
    sections: [
      {
        id: 'donde',
        title: '1. Dónde se usa IA hoy',
        paragraphs: [
          'La plataforma ofrece una lectura asistida del documento de identidad a partir de una fotografía, que extrae automáticamente los datos visibles para agilizar el registro.',
          'Ninguna otra función del producto (generación de QR, validación de acceso, reportes) utiliza inteligencia artificial: son cálculos deterministas.',
        ],
      },
      {
        id: 'supervision',
        title: '2. Supervisión humana',
        paragraphs: [
          'El resultado de la lectura asistida siempre se muestra al operador para su verificación y corrección antes de guardarse. No se toman decisiones de acceso de forma automática a partir del modelo.',
        ],
      },
      {
        id: 'datos-ia',
        title: '3. Datos enviados al modelo',
        paragraphs: [
          'La imagen capturada se procesa para extraer los campos del documento. El detalle de proveedores, retención y localización del procesamiento se documentará en la política definitiva.',
        ],
        pending: true,
      },
      {
        id: 'politica-ia',
        title: '4. Política de Uso Responsable de IA',
        paragraphs: [
          'Esta sección es la base de una futura Política de Uso Responsable de IA, que cubrirá evaluación de sesgos, límites de uso, trazabilidad y derechos de las personas frente al tratamiento automatizado.',
        ],
        pending: true,
      },
    ],
  },
];

/** Documentos previstos que aún no tienen página propia. */
export const UPCOMING_LEGAL_DOCUMENTS = [
  'Política de Tratamiento de Datos completa',
  'DPA / Acuerdo de Encargo de Tratamiento',
  'SLA (niveles de servicio)',
  'Política de Seguridad',
  'Política de Retención y Eliminación de Datos',
  'Política de Uso Responsable de IA',
] as const;

export const getLegalDocument = (slug?: string): LegalDocument | undefined =>
  LEGAL_DOCUMENTS.find((doc) => doc.slug === slug);

export const FOOTER_LEGAL_LINKS = LEGAL_DOCUMENTS.filter((d) => d.inFooter).map((d) => ({
  label: d.shortTitle,
  to: `/legal/${d.slug}`,
}));

export const PRIVACY_PATH = '/legal/privacidad';
