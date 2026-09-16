/**
 * Fuente única de verdad para la información legal de Chequi.
 *
 * Los documentos marcados con status 'final' contienen la redacción revisada
 * (versión 1.0). Los marcados como 'draft' muestran el aviso de "pendiente de
 * revisión legal" en la página correspondiente.
 *
 * Para añadir un documento nuevo (DPA, SLA, Política de Seguridad,
 * Retención, etc.) basta con agregar una entrada a LEGAL_DOCUMENTS:
 * la ruta /legal/:slug y el enlace del pie se generan solos.
 */

import { WHATSAPP_DISPLAY, getWhatsAppUrl } from '@/lib/contact';

/** Correo de contacto legal. Se usa únicamente dentro de las páginas legales. */
export const LEGAL_EMAIL = 'info@chequi.online';

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
  email: LEGAL_EMAIL,
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
      'Determina las finalidades y las condiciones del tratamiento: define qué datos se recogen de los asistentes, con qué propósito y las condiciones de participación en el evento. Es el titular de la relación con los asistentes y quien debe atender sus solicitudes de acceso, actualización, rectificación o supresión.',
  },
  processor: {
    key: 'processor',
    title: 'Encargado del Tratamiento',
    who: 'Chequi / DarocodeIA',
    description:
      'Trata los datos personales por cuenta del organizador, únicamente conforme a sus instrucciones y para prestar el servicio contratado (registro, generación y validación de códigos QR, control de acceso y reportes del evento). No utiliza los datos para finalidades propias.',
  },
} as const;

/** Versión del texto de autorización mostrado en los formularios. */
export const CONSENT_VERSION = '1.0 (2026-09)';

export const CONSENT_TEXT =
  'Autorizo el tratamiento de mis datos personales por parte del organizador del evento, como Responsable del Tratamiento, y de Chequi / DarocodeIA como Encargado, con la finalidad exclusiva de gestionar mi registro, la generación y validación de mi código QR y el control de acceso al evento, conforme al Aviso de Privacidad y a la Política de Tratamiento de Datos Personales.';

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
  /** Lista de viñetas opcional que acompaña a la sección. */
  bullets?: string[];
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
  /** 'final' oculta el aviso de revisión pendiente; 'draft' lo muestra. */
  status: 'final' | 'draft';
  /** Si aparece o no en la lista "Legal" del pie. */
  inFooter: boolean;
  sections: LegalSection[];
}

const PENDING_NOTE =
  'Texto provisional pendiente de revisión legal. Será reemplazado por la redacción definitiva revisada por abogado antes de su uso contractual.';

export const LEGAL_DISCLAIMER = PENDING_NOTE;

const UPDATED = 'septiembre de 2026';
const VERSION = '1.0';

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    slug: 'terminos',
    shortTitle: 'Términos y Condiciones',
    title: 'Términos y Condiciones de Uso de Chequi',
    description:
      'Condiciones de uso de la plataforma Chequi para el registro, la generación y validación de códigos QR y el control de acceso a eventos.',
    version: VERSION,
    updatedAt: UPDATED,
    status: 'final',
    inFooter: true,
    sections: [
      {
        id: 'identificacion',
        title: '1. Identificación',
        paragraphs: [
          'Chequi es una plataforma tecnológica desarrollada y operada por DarocodeIA, actualmente bajo operación de su titular como persona natural con domicilio en Bogotá, Colombia.',
          `Para consultas relacionadas con la plataforma, contratación, soporte o asuntos relacionados con estas condiciones: ${LEGAL_EMAIL}.`,
          'La identificación legal completa del prestador será incorporada y actualizada en este documento una vez se formalice la estructura jurídica correspondiente.',
        ],
      },
      {
        id: 'objeto',
        title: '2. Objeto de Chequi',
        paragraphs: [
          'Chequi es una herramienta tecnológica destinada a facilitar la gestión de registro, generación y validación de códigos QR, control de acceso, registro de usos y generación de información y reportes relacionados con eventos.',
          'Chequi actúa como proveedor tecnológico y no como organizador del evento.',
          'Las condiciones particulares de cada evento, incluyendo fecha, lugar, población, requisitos de ingreso, categorías, autorizaciones y demás reglas aplicables, corresponden al organizador o cliente que contrata el servicio.',
        ],
      },
      {
        id: 'organizador',
        title: '3. Relación con el organizador del evento',
        paragraphs: ['El organizador que contrata Chequi es responsable de definir:'],
        bullets: [
          'Los datos que serán suministrados.',
          'Las finalidades para las cuales serán utilizados.',
          'Las condiciones de participación del evento.',
          'Las autorizaciones requeridas para el tratamiento de datos personales.',
          'Las condiciones de acceso y utilización de los códigos QR.',
        ],
      },
      {
        id: 'qr',
        title: '4. Generación y utilización de códigos QR',
        paragraphs: [
          'Chequi puede generar códigos QR individuales asociados a los registros suministrados por el organizador.',
          'La generación de un código QR no significa por sí misma que una persona haya asistido al evento.',
          'El estado de utilización del código dependerá de los registros realizados durante la operación del evento.',
          'Las condiciones de uso, número de usos permitidos, categorías y puntos de control podrán variar de acuerdo con la configuración definida por el organizador.',
        ],
      },
      {
        id: 'reportes',
        title: '5. Información y reportes',
        paragraphs: [
          'Chequi puede generar información relacionada con la operación del evento, incluyendo, según la configuración contratada:',
        ],
        bullets: [
          'Registros de utilización de códigos QR.',
          'Fechas y horas de validación.',
          'Tipo de acceso.',
          'Punto o estación de control.',
          'Estadísticas generales.',
          'Reportes de operación.',
        ],
      },
      {
        id: 'responsabilidad-informacion',
        title: '6. Responsabilidad sobre la información suministrada',
        paragraphs: [
          'El cliente garantiza que cuenta con las facultades, autorizaciones y bases jurídicas necesarias para suministrar a Chequi la información requerida para la prestación del servicio.',
          'El cliente será responsable de la legitimidad, exactitud y pertinencia de los datos que suministre.',
          'Chequi no utilizará la información de los asistentes para finalidades diferentes a las necesarias para prestar el servicio contratado.',
        ],
      },
      {
        id: 'menores',
        title: '7. Menores de edad',
        paragraphs: [
          'Chequi puede ser utilizado en eventos cuya población incluya niños, niñas o adolescentes.',
          'La determinación de la población del evento corresponde exclusivamente al organizador.',
          'Cuando un evento incluya menores de edad, el organizador será responsable de garantizar las autorizaciones y condiciones legalmente requeridas para la recopilación y tratamiento de sus datos.',
          'Chequi no determina ni controla la composición demográfica del evento.',
        ],
      },
      {
        id: 'disponibilidad',
        title: '8. Disponibilidad del servicio',
        paragraphs: [
          'Chequi realizará esfuerzos razonables para mantener disponible la plataforma y prestar el servicio contratado.',
          'Sin embargo, pueden presentarse interrupciones derivadas de mantenimiento, fallas de conectividad, infraestructura de terceros, fuerza mayor, problemas de dispositivos o circunstancias ajenas al control razonable de Chequi.',
        ],
      },
      {
        id: 'uso-adecuado',
        title: '9. Uso adecuado',
        paragraphs: [
          'El usuario y el cliente se comprometen a utilizar Chequi exclusivamente para fines lícitos y relacionados con los servicios contratados. Está prohibido utilizar la plataforma para:',
        ],
        bullets: [
          'Acceder de forma no autorizada a información.',
          'Intentar alterar o vulnerar los sistemas.',
          'Introducir información falsa con fines fraudulentos.',
          'Interferir con el funcionamiento de la plataforma.',
          'Utilizar la plataforma para finalidades contrarias a la ley.',
        ],
      },
      {
        id: 'propiedad-intelectual',
        title: '10. Propiedad intelectual',
        paragraphs: [
          'Chequi, su software, código, arquitectura, diseño, interfaces, elementos gráficos, documentación, nombre comercial y demás componentes propios pertenecen a sus respectivos titulares y están protegidos por las normas aplicables de propiedad intelectual.',
          'El acceso a Chequi no implica transferencia de propiedad sobre el software.',
        ],
      },
      {
        id: 'confidencialidad',
        title: '11. Información confidencial',
        paragraphs: [
          'Las partes deberán mantener la confidencialidad sobre la información a la que tengan acceso como consecuencia de la prestación del servicio, especialmente aquella que no sea pública y que tenga carácter comercial, técnico, operativo o personal.',
        ],
      },
      {
        id: 'finalizacion',
        title: '12. Finalización del servicio',
        paragraphs: [
          'Una vez finalizado el evento y entregado el informe de cierre correspondiente, Chequi procederá con la eliminación de los datos operativos del evento de sus sistemas activos, de acuerdo con sus procedimientos de conservación y eliminación.',
          'La información que deba mantenerse por obligaciones legales, contables, contractuales, de seguridad o defensa de derechos podrá conservarse durante el período correspondiente.',
        ],
      },
      {
        id: 'modificaciones',
        title: '13. Modificaciones',
        paragraphs: [
          'Chequi podrá actualizar estos Términos y Condiciones cuando sea necesario debido a cambios legales, tecnológicos, operativos o comerciales.',
          'Las modificaciones serán publicadas en esta página indicando su fecha de actualización.',
        ],
      },
      {
        id: 'jurisdiccion',
        title: '14. Legislación y jurisdicción',
        paragraphs: [
          'Estos términos se regirán por las leyes de la República de Colombia.',
          'Cualquier controversia derivada de la relación contractual o del uso de Chequi estará sujeta a la jurisdicción de las autoridades competentes de Colombia, salvo disposición legal en contrario.',
        ],
      },
      {
        id: 'contacto-terminos',
        title: '15. Contacto',
        paragraphs: [`Para consultas relacionadas con estos términos: ${LEGAL_EMAIL}.`],
      },
    ],
  },
  {
    slug: 'aviso',
    shortTitle: 'Aviso de Privacidad',
    title: 'Aviso de Privacidad',
    description:
      'Aviso de privacidad de Chequi: quién trata los datos de los asistentes, con qué finalidad y cómo ejercer los derechos como titular.',
    version: VERSION,
    updatedAt: UPDATED,
    status: 'final',
    inFooter: true,
    sections: [
      {
        id: 'aviso',
        title: 'Aviso de Privacidad — Chequi',
        paragraphs: [
          'Los datos personales suministrados para la participación en un evento serán tratados por el organizador del evento, quien determina las finalidades y condiciones del tratamiento.',
          'Chequi, como proveedor tecnológico y cuando corresponda como Encargado del Tratamiento, podrá procesar dichos datos exclusivamente para prestar los servicios de registro, generación y validación de códigos QR, control de acceso y generación de reportes asociados al evento.',
          'Los datos serán tratados conforme a la legislación colombiana aplicable y a la Política de Tratamiento de Datos Personales correspondiente.',
          `El titular puede consultar la política completa y ejercer sus derechos escribiendo a ${LEGAL_EMAIL}.`,
        ],
      },
      {
        id: 'importante',
        title: 'Importante',
        paragraphs: [
          'La participación en el evento y el tratamiento de los datos se encuentran sujetos a las condiciones y autorizaciones establecidas por el organizador del evento.',
          'La Superintendencia de Industria y Comercio (SIC) señala que el aviso de privacidad debe informar al titular sobre las finalidades del tratamiento y la forma de acceder a la política de tratamiento.',
        ],
      },
    ],
  },
  {
    slug: 'privacidad',
    shortTitle: 'Privacidad',
    title: 'Política de Tratamiento de Datos Personales',
    description:
      'Lineamientos aplicables al tratamiento de datos personales realizado a través de Chequi: roles, finalidades, conservación, seguridad y derechos de los titulares.',
    version: VERSION,
    updatedAt: UPDATED,
    status: 'final',
    inFooter: true,
    sections: [
      {
        id: 'responsable-politica',
        title: '1. Responsable de la política',
        paragraphs: [
          'Esta Política establece los lineamientos aplicables al tratamiento de datos personales realizado a través de Chequi.',
          'Chequi es una solución tecnológica desarrollada y operada por DarocodeIA, actualmente bajo operación de su titular como persona natural, con domicilio en Bogotá, Colombia.',
          `Correo de contacto: ${LEGAL_EMAIL}.`,
          'Esta política deberá entenderse conjuntamente con los contratos celebrados con los organizadores de cada evento.',
        ],
      },
      {
        id: 'roles',
        title: '2. Roles en el tratamiento de datos',
        paragraphs: [
          'En la prestación del servicio pueden intervenir dos roles diferentes:',
          `${DATA_ROLES.controller.title}: el organizador o cliente que contrata Chequi y determina los fines y condiciones para los cuales se recopilan y utilizan los datos de los asistentes.`,
          `${DATA_ROLES.processor.title}: Chequi / DarocodeIA, cuando procesa los datos suministrados por el organizador exclusivamente para prestar los servicios contratados.`,
          'La distribución concreta de responsabilidades se establecerá en el contrato correspondiente.',
        ],
      },
      {
        id: 'datos',
        title: '3. Información que puede ser tratada',
        paragraphs: [
          'Dependiendo de la configuración del evento, Chequi puede procesar información suministrada por el organizador, incluyendo datos como:',
        ],
        bullets: [
          'Nombre.',
          'Información de identificación suministrada por el cliente.',
          'Categoría o tipo de entrada.',
          'Identificador del registro.',
          'Código QR asociado.',
          'Información relacionada con la utilización del QR.',
          'Fecha y hora de validación.',
          'Tipo de acceso.',
          'Punto o estación de control.',
        ],
      },
      {
        id: 'lectura-documento',
        title: '4. Lectura asistida del documento de identidad',
        paragraphs: [
          'Cuando el organizador lo habilita, la plataforma ofrece una función opcional de lectura asistida del documento de identidad a partir de una fotografía, que extrae los datos visibles para agilizar el registro manual.',
          'El resultado siempre se muestra al operador para su verificación y corrección antes de guardarse; la decisión de acceso nunca se toma de forma automática a partir de esa lectura.',
          'Chequi no realiza reconocimiento facial ni identificación biométrica.',
          'Cualquier nueva funcionalidad que implique categorías adicionales de datos será objeto de la evaluación y actualización correspondiente.',
        ],
      },
      {
        id: 'finalidades',
        title: '5. Finalidades',
        paragraphs: [
          'Los datos suministrados a Chequi podrán ser tratados exclusivamente para las finalidades necesarias para prestar el servicio contratado, incluyendo:',
        ],
        bullets: [
          'Registrar asistentes.',
          'Generar códigos QR.',
          'Asociar códigos con registros proporcionados por el cliente.',
          'Validar códigos durante el evento.',
          'Registrar la utilización de los códigos.',
          'Controlar accesos conforme a las reglas configuradas por el organizador.',
          'Generar estadísticas y reportes del evento.',
          'Atender solicitudes relacionadas con la operación del servicio.',
          'Garantizar la seguridad y funcionamiento de la plataforma.',
        ],
      },
      {
        id: 'clientes',
        title: '6. Datos de los organizadores y clientes comerciales',
        paragraphs: [
          'Para las relaciones comerciales, Chequi puede tratar información de contacto de organizadores y clientes, como nombre, empresa u organización, número telefónico, WhatsApp, correo electrónico cuando sea suministrado e información necesaria para gestionar la relación comercial.',
          'Estos datos podrán utilizarse para atender solicitudes, preparar propuestas, prestar soporte, gestionar contratos y mantener la relación comercial.',
          'Chequi no utilizará los datos de los asistentes para publicidad propia, venta de bases de datos o finalidades comerciales independientes del servicio contratado.',
        ],
      },
      {
        id: 'menores',
        title: '7. Tratamiento de datos de menores',
        paragraphs: [
          'Cuando un evento incluya niños, niñas o adolescentes, el organizador será responsable de garantizar que el tratamiento de sus datos cumple las condiciones legales aplicables.',
          'Chequi actuará únicamente dentro de las instrucciones y finalidades definidas por el organizador.',
          'El tratamiento de datos de niños, niñas y adolescentes estará sujeto a la protección reforzada prevista por la legislación colombiana. La Superintendencia de Industria y Comercio (SIC) reconoce expresamente esta protección especial.',
        ],
      },
      {
        id: 'conservacion',
        title: '8. Conservación y eliminación',
        paragraphs: [
          'Los datos operativos de cada evento serán tratados durante el período necesario para ejecutar el servicio, generar el informe correspondiente y realizar las actividades de cierre.',
          'Una vez terminado el servicio y entregado el informe de cierre, Chequi procederá a eliminar los datos operativos del evento de sus sistemas activos conforme a sus procedimientos internos de eliminación.',
          'Los datos que deban conservarse por razones legales, contables, contractuales, de seguridad o defensa de derechos podrán mantenerse durante el período necesario para dichas finalidades.',
        ],
      },
      {
        id: 'seguridad',
        title: '9. Seguridad',
        paragraphs: [
          'Chequi implementará medidas técnicas y organizativas razonables para proteger la información contra pérdida, modificación, acceso, consulta, uso o divulgación no autorizados.',
          'La información puede almacenarse y procesarse mediante proveedores tecnológicos contratados para soportar la infraestructura del servicio. Actualmente Chequi utiliza infraestructura tecnológica proporcionada por Supabase.',
        ],
      },
      {
        id: 'encargados',
        title: '10. Encargados y proveedores tecnológicos',
        paragraphs: [
          'Chequi podrá utilizar proveedores tecnológicos necesarios para prestar sus servicios.',
          'Cuando corresponda, estos proveedores estarán sujetos a obligaciones de seguridad, confidencialidad y tratamiento limitado a las finalidades necesarias para prestar el servicio.',
        ],
      },
      {
        id: 'derechos',
        title: '11. Derechos de los titulares',
        paragraphs: ['Los titulares de los datos personales tienen derecho a:'],
        bullets: [
          'Conocer los datos que están siendo tratados.',
          'Solicitar la actualización o rectificación de información.',
          'Solicitar la supresión cuando legalmente proceda.',
          'Consultar la autorización otorgada y las finalidades del tratamiento.',
          'Presentar consultas y reclamos.',
          'Solicitar información sobre el uso de sus datos.',
          'Revocar la autorización cuando legalmente proceda.',
        ],
      },
      {
        id: 'reclamos',
        title: '12. Consultas y reclamos',
        paragraphs: [
          `Las consultas o reclamos relacionados con datos personales podrán enviarse a ${LEGAL_EMAIL}.`,
          'La solicitud deberá identificar al titular y describir claramente la petición.',
          'Chequi tramitará las solicitudes dentro de los términos establecidos por la legislación colombiana aplicable.',
        ],
      },
      {
        id: 'vigencia',
        title: '13. Vigencia',
        paragraphs: [
          'Esta política entra en vigencia a partir de su publicación.',
          'Cualquier modificación será publicada indicando la correspondiente fecha de actualización.',
        ],
      },
    ],
  },
  {
    slug: 'cookies',
    shortTitle: 'Cookies',
    title: 'Política de Cookies',
    description:
      'Uso de cookies y tecnologías similares en Chequi: finalidades, proveedores externos y cómo gestionarlas.',
    version: VERSION,
    updatedAt: UPDATED,
    status: 'final',
    inFooter: true,
    sections: [
      {
        id: 'que-son',
        title: '1. ¿Qué son las cookies?',
        paragraphs: [
          'Las cookies son pequeños archivos o tecnologías similares que pueden almacenarse en el dispositivo del usuario cuando visita un sitio web.',
          'Pueden utilizarse para permitir el funcionamiento del sitio, recordar determinadas configuraciones y, cuando corresponda, obtener información sobre el uso del sitio.',
        ],
      },
      {
        id: 'cookies-chequi',
        title: '2. Cookies utilizadas por Chequi',
        paragraphs: [
          'Chequi priorizará el uso de tecnologías estrictamente necesarias para:',
        ],
        bullets: [
          'Mantener la seguridad.',
          'Permitir la navegación.',
          'Mantener sesiones de usuario.',
          'Garantizar el funcionamiento de la plataforma.',
        ],
      },
      {
        id: 'consentimiento-cookies',
        title: '3. Tecnologías que requieren consentimiento',
        paragraphs: [
          'Cuando se incorporen herramientas de análisis, personalización o publicidad que requieran consentimiento, Chequi implementará los mecanismos correspondientes antes de activar dichas tecnologías, cuando legalmente sea requerido.',
        ],
      },
      {
        id: 'terceros',
        title: '4. Cookies de terceros',
        paragraphs: [
          'Algunas funcionalidades pueden depender de proveedores tecnológicos externos.',
          'Estos proveedores pueden utilizar tecnologías propias de acuerdo con sus respectivas políticas de privacidad y condiciones de servicio.',
          'Actualmente Chequi utiliza infraestructura de Supabase para determinados componentes de backend y almacenamiento de información.',
        ],
      },
      {
        id: 'control',
        title: '5. Control de cookies',
        paragraphs: [
          'El usuario podrá gestionar las cookies mediante las opciones proporcionadas por su navegador.',
          'Cuando una tecnología requiera consentimiento previo conforme a la legislación aplicable, Chequi implementará mecanismos para obtener y gestionar dicho consentimiento.',
        ],
      },
      {
        id: 'actualizaciones',
        title: '6. Actualizaciones',
        paragraphs: [
          'Esta política podrá modificarse cuando se incorporen nuevas tecnologías, herramientas o servicios.',
        ],
      },
    ],
  },
  {
    slug: 'gdpr',
    shortTitle: 'GDPR',
    title: 'Privacidad internacional y GDPR',
    description:
      'Enfoque de Chequi frente a normativas internacionales de protección de datos, incluido el GDPR de la Unión Europea.',
    version: VERSION,
    updatedAt: UPDATED,
    status: 'final',
    inFooter: true,
    sections: [
      {
        id: 'ambito',
        title: '1. Ámbito',
        paragraphs: [
          'Chequi es una plataforma desarrollada y operada desde Colombia y su operación principal se encuentra sujeta a la legislación colombiana aplicable.',
          'Cuando un servicio de Chequi se utilice en una jurisdicción en la que resulte aplicable una normativa adicional de protección de datos personales, incluyendo el Reglamento General de Protección de Datos de la Unión Europea (GDPR), se evaluarán y adoptarán las obligaciones correspondientes según las circunstancias concretas del tratamiento.',
        ],
      },
      {
        id: 'proveedores',
        title: '2. Tratamiento internacional',
        paragraphs: [
          'El tratamiento internacional podrá implicar la participación de proveedores tecnológicos ubicados en diferentes jurisdicciones.',
          'Chequi implementará medidas razonables destinadas a proteger los datos personales y limitar su tratamiento a las finalidades necesarias para prestar el servicio contratado.',
        ],
      },
      {
        id: 'contratos',
        title: '3. Disposiciones contractuales adicionales',
        paragraphs: [
          'Cuando corresponda, las relaciones contractuales con clientes internacionales podrán incluir disposiciones adicionales sobre:',
        ],
        bullets: [
          'Roles de las partes.',
          'Finalidades del tratamiento.',
          'Categorías de datos.',
          'Períodos de conservación.',
          'Seguridad.',
          'Subencargados.',
          'Transferencias internacionales.',
          'Derechos de los titulares.',
          'Gestión de incidentes.',
        ],
      },
      {
        id: 'contacto-gdpr',
        title: '4. Contacto',
        paragraphs: [`Para consultas: ${LEGAL_EMAIL}.`],
      },
    ],
  },
  {
    slug: 'ia',
    shortTitle: 'Uso de IA',
    title: 'Política sobre Uso de Inteligencia Artificial',
    description:
      'Transparencia sobre el uso de inteligencia artificial en Chequi: qué procesos la utilizan y cuáles no.',
    version: VERSION,
    updatedAt: UPDATED,
    status: 'final',
    inFooter: true,
    sections: [
      {
        id: 'desarrollo',
        title: '1. Herramientas de desarrollo',
        paragraphs: [
          'Chequi es desarrollado y mantenido con apoyo de herramientas tecnológicas que pueden incorporar capacidades de inteligencia artificial.',
          'El uso de herramientas de inteligencia artificial durante procesos internos de desarrollo no significa que los datos personales de los asistentes sean enviados a sistemas de inteligencia artificial para la validación de códigos QR o el control de acceso.',
        ],
      },
      {
        id: 'qr-sin-ia',
        title: '2. Los códigos QR no utilizan inteligencia artificial',
        paragraphs: [
          'La generación y validación de códigos QR de Chequi se realizan mediante la lógica y los sistemas propios de la plataforma, con procesos deterministas.',
          'El control de acceso, el conteo de usos y los reportes tampoco utilizan inteligencia artificial.',
        ],
      },
      {
        id: 'lectura-cedula',
        title: '3. Lectura asistida del documento de identidad',
        paragraphs: [
          'La plataforma incluye una función opcional, habilitada por el organizador, que permite extraer los datos visibles de una fotografía del documento de identidad para agilizar el registro manual. Esta función sí utiliza un modelo de inteligencia artificial de un proveedor tecnológico.',
          'El resultado se muestra siempre al operador para su verificación y corrección antes de guardarse. La decisión de acceso nunca se toma automáticamente a partir de esa lectura.',
          'La imagen se utiliza únicamente para extraer los campos del documento en el momento del registro.',
        ],
      },
      {
        id: 'sin-biometria',
        title: '4. Sin biometría ni reconocimiento facial',
        paragraphs: [
          'Chequi no utiliza inteligencia artificial para realizar reconocimiento facial ni identificación biométrica.',
        ],
      },
      {
        id: 'futuro',
        title: '5. Funcionalidades futuras',
        paragraphs: [
          'Si en el futuro se incorporan funcionalidades basadas en inteligencia artificial que impliquen tratamiento adicional de datos personales, Chequi evaluará previamente sus implicaciones de privacidad, seguridad y cumplimiento normativo y actualizará la información correspondiente.',
        ],
      },
    ],
  },
];

/** Documentos previstos que aún no tienen página propia. */
export const UPCOMING_LEGAL_DOCUMENTS = [
  'DPA / Acuerdo de Encargo de Tratamiento',
  'SLA (niveles de servicio)',
  'Política de Seguridad',
  'Política de Retención y Eliminación de Datos',
] as const;

export const getLegalDocument = (slug?: string): LegalDocument | undefined =>
  LEGAL_DOCUMENTS.find((doc) => doc.slug === slug);

export const FOOTER_LEGAL_LINKS = LEGAL_DOCUMENTS.filter((d) => d.inFooter).map((d) => ({
  label: d.shortTitle,
  to: `/legal/${d.slug}`,
}));

export const PRIVACY_PATH = '/legal/privacidad';
export const PRIVACY_NOTICE_PATH = '/legal/aviso';
